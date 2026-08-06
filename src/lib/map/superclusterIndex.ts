/**
 * Supercluster for SES — hierarchical zoom clustering with max-mag reduce.
 *
 * Caching strategy:
 *  - Catalog signature (count + id/mag/time fingerprint + sample caps)
 *  - Index entry holds: fair-sampled points + built Supercluster
 *  - Camera zoom only re-queries getClusters (cheap) — no rebuild on recluster
 *  - Small LRU (3 entries) for focus-node / mag-filter switches
 *  - Invalidate when fingerprint changes (new pulse / window / filters)
 */

import Supercluster from "supercluster";
import type { EqFeature } from "@/lib/feeds/usgs";
import type { EqCluster, EqPoint } from "@/lib/map/eqCluster";

/** Properties stored on each loaded point / reduced into clusters. */
export type SesClusterProps = {
  index: number;
  mag: number;
  maxMag: number;
  newest: number;
  id: string;
};

export type SesClusterFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: SesClusterProps & {
    cluster?: boolean;
    cluster_id?: number;
    point_count?: number;
    point_count_abbreviated?: string;
  };
};

export type SuperclusterBuildOpts = {
  /** Pixel radius at each zoom (default 48 — slightly open for EQ stacks). */
  radius?: number;
  maxZoom?: number;
  minZoom?: number;
  minPoints?: number;
};

const DEFAULT_OPTS: Required<SuperclusterBuildOpts> = {
  radius: 48,
  maxZoom: 16,
  minZoom: 0,
  minPoints: 2,
};

const GLOBE_BUILD_OPTS: Required<SuperclusterBuildOpts> = {
  radius: 52,
  maxZoom: 16,
  minZoom: 0,
  minPoints: 2,
};

// ─── Cache ───────────────────────────────────────────────────────────────────

export type SuperclusterCacheStats = {
  hits: number;
  misses: number;
  rebuilds: number;
  queries: number;
  entries: number;
  lastSig: string | null;
  lastBuildMs: number | null;
};

type IndexEntry = {
  sig: string;
  optsKey: string;
  points: EqPoint[];
  index: Supercluster<SesClusterProps, SesClusterProps>;
  builtAt: number;
  buildMs: number;
  hits: number;
};

const MAX_ENTRIES = 3;
const cacheOrder: string[] = [];
const cacheMap = new Map<string, IndexEntry>();

const stats: SuperclusterCacheStats = {
  hits: 0,
  misses: 0,
  rebuilds: 0,
  queries: 0,
  entries: 0,
  lastSig: null,
  lastBuildMs: null,
};

function optsKey(opts: Required<SuperclusterBuildOpts>): string {
  return `${opts.radius}|${opts.maxZoom}|${opts.minZoom}|${opts.minPoints}`;
}

/**
 * Fast catalog fingerprint — not cryptographic.
 * Mixes count, id samples, mag/time sums so pulses change the sig.
 */
export function catalogFingerprint(
  points: EqPoint[],
  maxMarkers: number,
): string {
  const n = points.length;
  if (n === 0) return `0|${maxMarkers}`;
  let magSum = 0;
  let timeXor = 0;
  let idHash = 0;
  // Sample ends + stride through middle (O(1)–O(n/stride))
  const stride = Math.max(1, Math.floor(n / 48));
  for (let i = 0; i < n; i += stride) {
    const p = points[i]!;
    magSum += p.mag;
    const t = p.f.properties.time ?? 0;
    timeXor ^= t >>> 0;
    const id = String(p.f.id ?? "");
    for (let k = 0; k < id.length; k++) idHash = (idHash * 31 + id.charCodeAt(k)) | 0;
  }
  // Always include newest + strongest for pulse sensitivity
  let newest = 0;
  let maxMag = -Infinity;
  for (const p of points) {
    const t = p.f.properties.time ?? 0;
    if (t > newest) newest = t;
    if (p.mag > maxMag) maxMag = p.mag;
  }
  return [
    n,
    maxMarkers,
    magSum.toFixed(2),
    timeXor >>> 0,
    idHash >>> 0,
    newest,
    maxMag.toFixed(2),
  ].join("|");
}

function cacheKey(sig: string, oKey: string): string {
  return `${sig}::${oKey}`;
}

function touch(key: string) {
  const i = cacheOrder.indexOf(key);
  if (i >= 0) cacheOrder.splice(i, 1);
  cacheOrder.push(key);
  while (cacheOrder.length > MAX_ENTRIES) {
    const evict = cacheOrder.shift();
    if (evict) cacheMap.delete(evict);
  }
  stats.entries = cacheMap.size;
}

/**
 * Get or build Supercluster index for a point set.
 * Rebuilds only when catalog fingerprint or build opts change.
 */
export function getOrBuildSesSupercluster(
  points: EqPoint[],
  opts: SuperclusterBuildOpts = {},
  /** Precomputed fingerprint of the *pre-sample* set when available */
  fingerprint?: string,
): { index: Supercluster<SesClusterProps, SesClusterProps>; points: EqPoint[]; fromCache: boolean } {
  const o = { ...DEFAULT_OPTS, ...opts };
  const oKey = optsKey(o);
  const sig = fingerprint ?? catalogFingerprint(points, points.length);
  const key = cacheKey(sig, oKey);
  const hit = cacheMap.get(key);
  if (hit) {
    stats.hits++;
    hit.hits++;
    touch(key);
    stats.lastSig = sig;
    return { index: hit.index, points: hit.points, fromCache: true };
  }

  stats.misses++;
  stats.rebuilds++;
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const index = buildSesSuperclusterUncached(points, o);
  const buildMs =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  stats.lastBuildMs = buildMs;
  stats.lastSig = sig;

  const entry: IndexEntry = {
    sig,
    optsKey: oKey,
    points,
    index,
    builtAt: Date.now(),
    buildMs,
    hits: 0,
  };
  cacheMap.set(key, entry);
  touch(key);
  return { index, points, fromCache: false };
}

export function getSuperclusterCacheStats(): SuperclusterCacheStats {
  return { ...stats, entries: cacheMap.size };
}

export function clearSuperclusterCache(): void {
  cacheMap.clear();
  cacheOrder.length = 0;
  stats.entries = 0;
  stats.lastSig = null;
  stats.lastBuildMs = null;
}

// ─── Build / query ───────────────────────────────────────────────────────────

function toPointFeature(p: EqPoint, index: number): SesClusterFeature {
  const t = p.f.properties.time ?? 0;
  const id = String(p.f.id ?? `${p.lat},${p.lon},${t}`);
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lon, p.lat] },
    properties: {
      index,
      mag: p.mag,
      maxMag: p.mag,
      newest: typeof t === "number" ? t : 0,
      id,
    },
  };
}

function buildSesSuperclusterUncached(
  points: EqPoint[],
  o: Required<SuperclusterBuildOpts>,
): Supercluster<SesClusterProps, SesClusterProps> {
  const index = new Supercluster<SesClusterProps, SesClusterProps>({
    radius: o.radius,
    maxZoom: o.maxZoom,
    minZoom: o.minZoom,
    minPoints: o.minPoints,
    map: (props) => ({
      index: props.index,
      mag: props.mag,
      maxMag: props.mag,
      newest: props.newest,
      id: props.id,
    }),
    reduce: (acc, props) => {
      acc.maxMag = Math.max(acc.maxMag ?? 0, props.maxMag ?? props.mag ?? 0);
      acc.newest = Math.max(acc.newest ?? 0, props.newest ?? 0);
      if (acc.index == null) acc.index = props.index;
      if (!acc.id) acc.id = props.id;
    },
  });
  const features = points.map((p, i) => toPointFeature(p, i));
  index.load(features as Parameters<typeof index.load>[0]);
  return index;
}

/**
 * Build a Supercluster index (uncached — prefer getOrBuildSesSupercluster).
 */
export function buildSesSupercluster(
  points: EqPoint[],
  opts: SuperclusterBuildOpts = {},
): Supercluster<SesClusterProps, SesClusterProps> {
  return getOrBuildSesSupercluster(points, opts).index;
}

/**
 * Map 3D camera radius → Supercluster zoom (inverse of “farther = bigger merge”).
 * cam ~1.5 (close) → z~12; cam ~2.85 (home) → z~5; cam ~5 (far) → z~2
 */
export function cameraRadiusToClusterZoom(cameraRadius: number): number {
  const r = Math.max(1.2, Math.min(6, cameraRadius));
  const z = Math.round(18 - r * 4.2);
  return Math.max(0, Math.min(16, z));
}

/** World bbox for full-globe queries (slightly padded). */
export const WORLD_BBOX: [number, number, number, number] = [-180, -85, 180, 85];

/**
 * Convert Supercluster getClusters result → EqCluster[] for existing SES draw path.
 */
export function superclusterToEqClusters(
  index: Supercluster<SesClusterProps, SesClusterProps>,
  points: EqPoint[],
  bbox: [number, number, number, number],
  zoom: number,
): EqCluster[] {
  stats.queries++;
  const z = Math.max(0, Math.min(16, Math.floor(zoom)));
  const raw = index.getClusters(bbox, z) as SesClusterFeature[];
  const out: EqCluster[] = [];

  for (const f of raw) {
    const [lon, lat] = f.geometry.coordinates;
    const props = f.properties;
    if (props.cluster && props.cluster_id != null) {
      const leaves = index.getLeaves(props.cluster_id, 80, 0) as SesClusterFeature[];
      const members: EqPoint[] = [];
      for (const leaf of leaves) {
        const idx = leaf.properties.index;
        if (typeof idx === "number" && points[idx]) members.push(points[idx]!);
      }
      if (!members.length) continue;
      members.sort((a, b) => b.mag - a.mag);
      const stable = members
        .map((m) => String(m.f.id ?? `${m.lat},${m.lon}`))
        .sort()
        .join("|");
      out.push({
        key: `sc:${props.cluster_id}:${stable.slice(0, 48)}`,
        lat,
        lon,
        points: members,
        maxMag: props.maxMag ?? members[0]!.mag,
      });
    } else {
      const idx = props.index;
      const p = typeof idx === "number" ? points[idx] : null;
      if (!p) continue;
      out.push({
        key: String(p.f.id ?? `sc-pt:${idx}`),
        lat: p.lat,
        lon: p.lon,
        points: [p],
        maxMag: p.mag,
      });
    }
  }
  return out;
}

/**
 * One-shot 3D path: points + camera radius → EqCluster[] (index cached by fingerprint).
 */
export function clusterEqPointsSupercluster(
  points: EqPoint[],
  cameraRadius: number,
  opts?: SuperclusterBuildOpts,
  fingerprint?: string,
): EqCluster[] {
  if (!points.length) return [];
  const { index, points: pts } = getOrBuildSesSupercluster(points, opts, fingerprint);
  const zoom = cameraRadiusToClusterZoom(cameraRadius);
  return superclusterToEqClusters(index, pts, WORLD_BBOX, zoom);
}

/**
 * Geographic fair sample — keep up to `perCell` strongest+newest per lon/lat cell
 * so Pacific swarms cannot monopolize the marker budget before clustering.
 */
export function fairSampleEqPoints(
  points: EqPoint[],
  maxTotal: number,
  opts?: { cellDeg?: number; perCell?: number },
): EqPoint[] {
  if (points.length <= maxTotal) return points;
  const cellDeg = opts?.cellDeg ?? 15;
  const perCell = opts?.perCell ?? Math.max(2, Math.ceil(maxTotal / 40));

  type Cell = EqPoint[];
  const cells = new Map<string, Cell>();
  for (const p of points) {
    const gx = Math.floor((p.lon + 180) / cellDeg);
    const gy = Math.floor((p.lat + 90) / cellDeg);
    const k = `${gx}:${gy}`;
    let arr = cells.get(k);
    if (!arr) {
      arr = [];
      cells.set(k, arr);
    }
    arr.push(p);
  }

  const picked: EqPoint[] = [];
  for (const arr of cells.values()) {
    arr.sort((a, b) => {
      const dm = b.mag - a.mag;
      if (Math.abs(dm) > 0.05) return dm;
      return (b.f.properties.time ?? 0) - (a.f.properties.time ?? 0);
    });
    picked.push(...arr.slice(0, perCell));
  }

  if (picked.length < maxTotal) {
    const seen = new Set(picked.map((p) => p.f.id ?? `${p.lat},${p.lon}`));
    const rest = points
      .filter((p) => !seen.has(p.f.id ?? `${p.lat},${p.lon}`))
      .sort((a, b) => b.mag - a.mag);
    for (const p of rest) {
      if (picked.length >= maxTotal) break;
      picked.push(p);
    }
  }

  if (picked.length > maxTotal) {
    picked.sort((a, b) => {
      const dm = b.mag - a.mag;
      if (Math.abs(dm) > 0.05) return dm;
      return (b.f.properties.time ?? 0) - (a.f.properties.time ?? 0);
    });
    return picked.slice(0, maxTotal);
  }
  return picked;
}

/**
 * Full 3D pipeline with caching:
 * filter → fingerprint raw set → fair sample → getOrBuild index → query at zoom
 *
 * Camera recluster: same fingerprint → **cache hit**, only getClusters runs.
 * New pulse / mag / window: fingerprint changes → rebuild once.
 */
export function clusterEqForGlobePrototype(
  features: EqFeature[],
  cameraRadius: number,
  maxMarkers: number,
  minMag: number,
  maxMag: number,
): EqCluster[] {
  const raw: EqPoint[] = [];
  for (const f of features) {
    const mag = f.properties.mag ?? 0;
    if (mag < minMag || mag > maxMag) continue;
    const [lon, lat] = f.geometry.coordinates;
    if (lat == null || lon == null) continue;
    raw.push({ f, lat, lon, mag });
  }
  if (!raw.length) return [];

  // Fingerprint raw filtered catalog + caps (before sample) so sample is deterministic per catalog
  const preSig = [
    catalogFingerprint(raw, maxMarkers),
    minMag,
    maxMag,
    maxMarkers,
  ].join("#");

  // Include fair-sample params in cache key via opts + preSig
  // Sample is pure given raw+maxMarkers — cache stores post-sample points
  const oKey = optsKey(GLOBE_BUILD_OPTS);
  const key = cacheKey(preSig, oKey);
  const hit = cacheMap.get(key);
  if (hit) {
    stats.hits++;
    hit.hits++;
    touch(key);
    stats.lastSig = preSig;
    const zoom = cameraRadiusToClusterZoom(cameraRadius);
    return superclusterToEqClusters(hit.index, hit.points, WORLD_BBOX, zoom);
  }

  const sampled = fairSampleEqPoints(raw, maxMarkers);
  // Build under preSig so next camera pass hits
  stats.misses++;
  stats.rebuilds++;
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const index = buildSesSuperclusterUncached(sampled, GLOBE_BUILD_OPTS);
  const buildMs =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  stats.lastBuildMs = buildMs;
  stats.lastSig = preSig;

  cacheMap.set(key, {
    sig: preSig,
    optsKey: oKey,
    points: sampled,
    index,
    builtAt: Date.now(),
    buildMs,
    hits: 0,
  });
  touch(key);

  const zoom = cameraRadiusToClusterZoom(cameraRadius);
  return superclusterToEqClusters(index, sampled, WORLD_BBOX, zoom);
}

/** Debug snapshot of index stats at a zoom (uses cache when possible). */
export function superclusterDebugSummary(
  points: EqPoint[],
  cameraRadius: number,
): {
  nPoints: number;
  zoom: number;
  nClusters: number;
  nSingles: number;
  maxCount: number;
  cache: SuperclusterCacheStats;
  sample: Array<{ n: number; maxMag: number; lat: number; lon: number }>;
} {
  const { index } = getOrBuildSesSupercluster(points);
  const zoom = cameraRadiusToClusterZoom(cameraRadius);
  const raw = index.getClusters(WORLD_BBOX, zoom) as SesClusterFeature[];
  let nClusters = 0;
  let nSingles = 0;
  let maxCount = 1;
  const sample: Array<{ n: number; maxMag: number; lat: number; lon: number }> = [];
  for (const f of raw) {
    const n = f.properties.cluster ? f.properties.point_count ?? 0 : 1;
    if (f.properties.cluster) nClusters++;
    else nSingles++;
    maxCount = Math.max(maxCount, n);
    if (sample.length < 8) {
      const [lon, lat] = f.geometry.coordinates;
      sample.push({
        n,
        maxMag: f.properties.maxMag ?? f.properties.mag ?? 0,
        lat,
        lon,
      });
    }
  }
  return {
    nPoints: points.length,
    zoom,
    nClusters,
    nSingles,
    maxCount,
    cache: getSuperclusterCacheStats(),
    sample,
  };
}
