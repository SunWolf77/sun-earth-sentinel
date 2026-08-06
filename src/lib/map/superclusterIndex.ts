/**
 * Supercluster prototype for SES — hierarchical zoom clustering with max-mag reduce.
 *
 * Use for:
 *  - 2D: bbox + Leaflet zoom → getClusters
 *  - 3D: camera radius → synthetic zoom → getClusters(world bbox)
 *  - Fair pre-sample: geographic grid quota before load (empty-continent fix)
 *
 * Converts Supercluster GeoJSON output into EqCluster used by Globe3D spiderfy/badges.
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

/**
 * Build a Supercluster index from EQ points (already mag-filtered).
 * map/reduce keep maxMag + newest for badge coloring without scanning leaves.
 */
export function buildSesSupercluster(
  points: EqPoint[],
  opts: SuperclusterBuildOpts = {},
): Supercluster<SesClusterProps, SesClusterProps> {
  const o = { ...DEFAULT_OPTS, ...opts };
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
      // keep first index/id for singleton path; clusters use cluster_id
      if (acc.index == null) acc.index = props.index;
      if (!acc.id) acc.id = props.id;
    },
  });
  const features = points.map((p, i) => toPointFeature(p, i));
  index.load(features as Parameters<typeof index.load>[0]);
  return index;
}

/**
 * Map 3D camera radius → Supercluster zoom (inverse of “farther = bigger merge”).
 * cam ~1.5 (close) → z~12; cam ~2.85 (home) → z~5; cam ~5 (far) → z~2
 */
export function cameraRadiusToClusterZoom(cameraRadius: number): number {
  const r = Math.max(1.2, Math.min(6, cameraRadius));
  // Linear-ish map: closer camera → higher zoom (less clustering)
  const z = Math.round(18 - r * 4.2);
  return Math.max(0, Math.min(16, z));
}

/** World bbox for full-globe queries (slightly padded). */
export const WORLD_BBOX: [number, number, number, number] = [-180, -85, 180, 85];

/**
 * Convert Supercluster getClusters result → EqCluster[] for existing SES draw path.
 * Singletons (n=1) and multi-member clusters both supported; spiderfy uses points[].
 */
export function superclusterToEqClusters(
  index: Supercluster<SesClusterProps, SesClusterProps>,
  points: EqPoint[],
  bbox: [number, number, number, number],
  zoom: number,
): EqCluster[] {
  const z = Math.max(0, Math.min(16, Math.floor(zoom)));
  const raw = index.getClusters(bbox, z) as SesClusterFeature[];
  const out: EqCluster[] = [];

  for (const f of raw) {
    const [lon, lat] = f.geometry.coordinates;
    const props = f.properties;
    if (props.cluster && props.cluster_id != null) {
      // Pull leaves (cap for perf — spiderfy already limits usefulness past ~40)
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
 * One-shot 3D path: points + camera radius → EqCluster[] via Supercluster hierarchy.
 */
export function clusterEqPointsSupercluster(
  points: EqPoint[],
  cameraRadius: number,
  opts?: SuperclusterBuildOpts,
): EqCluster[] {
  if (!points.length) return [];
  const index = buildSesSupercluster(points, opts);
  const zoom = cameraRadiusToClusterZoom(cameraRadius);
  return superclusterToEqClusters(index, points, WORLD_BBOX, zoom);
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
      // Prefer strong, then recent
      const dm = b.mag - a.mag;
      if (Math.abs(dm) > 0.05) return dm;
      return (b.f.properties.time ?? 0) - (a.f.properties.time ?? 0);
    });
    picked.push(...arr.slice(0, perCell));
  }

  // Global fill: remaining strongest not yet picked
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

  // If still over (dense cell count), trim by mag then time
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
 * Full prototype pipeline for 3D:
 * fair sample → Supercluster → EqCluster[]
 */
export function clusterEqForGlobePrototype(
  features: EqFeature[],
  cameraRadius: number,
  maxMarkers: number,
  minMag: number,
  maxMag: number,
): EqCluster[] {
  let points: EqPoint[] = [];
  for (const f of features) {
    const mag = f.properties.mag ?? 0;
    if (mag < minMag || mag > maxMag) continue;
    const [lon, lat] = f.geometry.coordinates;
    if (lat == null || lon == null) continue;
    points.push({ f, lat, lon, mag });
  }
  // Fair geographic sample before hierarchical cluster
  points = fairSampleEqPoints(points, maxMarkers);
  return clusterEqPointsSupercluster(points, cameraRadius, {
    radius: 52,
    minPoints: 2,
  });
}

/** Debug snapshot of index stats at a zoom. */
export function superclusterDebugSummary(
  points: EqPoint[],
  cameraRadius: number,
): {
  nPoints: number;
  zoom: number;
  nClusters: number;
  nSingles: number;
  maxCount: number;
  sample: Array<{ n: number; maxMag: number; lat: number; lon: number }>;
} {
  const index = buildSesSupercluster(points);
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
  return { nPoints: points.length, zoom, nClusters, nSingles, maxCount, sample };
}
