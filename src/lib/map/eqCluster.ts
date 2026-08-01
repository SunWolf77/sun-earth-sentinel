/**
 * Lightweight EQ clustering + spiderfy pins for co-located events.
 * No leaflet.markercluster dependency — pure lat/lon grid at current zoom.
 */

import type { EqFeature } from "@/lib/feeds/usgs";

export type EqPoint = {
  f: EqFeature;
  lat: number;
  lon: number;
  mag: number;
};

export type EqCluster = {
  key: string;
  lat: number;
  lon: number;
  points: EqPoint[];
  maxMag: number;
};

/** Approximate meters-per-pixel at equator for Web Mercator. */
function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

/**
 * Cluster events that sit within ~`pixelRadius` map pixels of each other.
 * Uses a simple grid + merge so dense swarms collapse to one badge.
 */
export function clusterEqPoints(
  points: EqPoint[],
  zoom: number,
  pixelRadius = 28,
): EqCluster[] {
  if (!points.length) return [];

  // Cell size in degrees from mid-latitude of the set
  const midLat =
    points.reduce((s, p) => s + p.lat, 0) / Math.max(1, points.length);
  const mpp = metersPerPixel(midLat, Math.max(0, Math.min(20, zoom)));
  const cellM = Math.max(200, mpp * pixelRadius);
  const cellLat = cellM / 111_320;
  const cellLon = cellM / (111_320 * Math.max(0.2, Math.cos((midLat * Math.PI) / 180)));

  type Bucket = { points: EqPoint[]; latSum: number; lonSum: number };
  const buckets = new Map<string, Bucket>();

  for (const p of points) {
    const gy = Math.floor(p.lat / cellLat);
    const gx = Math.floor(p.lon / cellLon);
    // 9-cell soft merge: snap to existing neighbor if close
    let key = `${gx}:${gy}`;
    let found: string | null = null;
    for (let dy = -1; dy <= 1 && !found; dy++) {
      for (let dx = -1; dx <= 1 && !found; dx++) {
        const k = `${gx + dx}:${gy + dy}`;
        const b = buckets.get(k);
        if (!b) continue;
        const clat = b.latSum / b.points.length;
        const clon = b.lonSum / b.points.length;
        const dLatM = (p.lat - clat) * 111_320;
        const dLonM =
          (p.lon - clon) * 111_320 * Math.cos((p.lat * Math.PI) / 180);
        if (dLatM * dLatM + dLonM * dLonM <= cellM * cellM) {
          found = k;
        }
      }
    }
    if (found) key = found;
    let b = buckets.get(key);
    if (!b) {
      b = { points: [], latSum: 0, lonSum: 0 };
      buckets.set(key, b);
    }
    b.points.push(p);
    b.latSum += p.lat;
    b.lonSum += p.lon;
  }

  const out: EqCluster[] = [];
  for (const [key, b] of buckets) {
    const lat = b.latSum / b.points.length;
    const lon = b.lonSum / b.points.length;
    let maxMag = -Infinity;
    for (const p of b.points) maxMag = Math.max(maxMag, p.mag);
    // Stable key from sorted ids for expand state
    const stable = b.points
      .map((p) => String(p.f.id ?? `${p.lat},${p.lon},${p.f.properties.time ?? 0}`))
      .sort()
      .join("|");
    out.push({
      key: stable || key,
      lat,
      lon,
      points: b.points.sort((a, c) => c.mag - a.mag),
      maxMag: Number.isFinite(maxMag) ? maxMag : 0,
    });
  }
  return out;
}

/** Even radial offsets (degrees) for spiderfied pins around cluster center. */
export function spiderfyOffsets(
  n: number,
  baseKm = 3.6,
): { dLat: number; dLon: number }[] {
  if (n <= 0) return [];
  if (n === 1) return [{ dLat: 0, dLon: 0 }];
  // Longer legs + extra rings so stacked events stay visually separable
  const ringR = baseKm * (1 + Math.floor((n - 1) / 7) * 0.72);
  const out: { dLat: number; dLon: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    // Alternate ring radii so neighbors don't sit on the same arc
    const ring = 1 + (i % 3) * 0.22 + Math.floor(i / Math.max(6, n / 2)) * 0.35;
    const km = ringR * ring;
    out.push({
      dLat: (km * Math.sin(a)) / 111.32,
      dLon: (km * Math.cos(a)) / 111.32,
    });
  }
  return out;
}

export function spiderPinLatLon(
  clusterLat: number,
  clusterLon: number,
  dLat: number,
  dLon: number,
): [number, number] {
  const cos = Math.max(0.2, Math.cos((clusterLat * Math.PI) / 180));
  return [clusterLat + dLat, clusterLon + dLon / cos];
}


/** Haversine distance in km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR;
  const dLon = (lon2 - lon1) * toR;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Greedy sphere clustering by km radius — for 3D globe (no map zoom).
 * Larger radius when camera is far → fewer, bigger stacks.
 */
export function clusterEqPointsByKm(points: EqPoint[], radiusKm: number): EqCluster[] {
  if (!points.length) return [];
  const r = Math.max(40, radiusKm);
  const used = new Set<number>();
  const out: EqCluster[] = [];

  // Process strongest first so max mag anchors the cluster center preference
  const order = points
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.mag - a.p.mag);

  for (const { p, i } of order) {
    if (used.has(i)) continue;
    const members: EqPoint[] = [p];
    used.add(i);
    for (const { p: q, i: j } of order) {
      if (used.has(j)) continue;
      if (haversineKm(p.lat, p.lon, q.lat, q.lon) <= r) {
        members.push(q);
        used.add(j);
      }
    }
    let lat = 0;
    let lon = 0;
    let maxMag = -Infinity;
    for (const m of members) {
      lat += m.lat;
      lon += m.lon;
      maxMag = Math.max(maxMag, m.mag);
    }
    lat /= members.length;
    lon /= members.length;
    const stable = members
      .map((m) => String(m.f.id ?? `${m.lat},${m.lon},${m.f.properties.time ?? 0}`))
      .sort()
      .join("|");
    out.push({
      key: stable,
      lat,
      lon,
      points: members.sort((a, b) => b.mag - a.mag),
      maxMag: Number.isFinite(maxMag) ? maxMag : 0,
    });
  }
  return out;
}

/** Camera radius → cluster radius (km). Farther camera = larger merge. */
export function globeClusterRadiusKm(cameraRadius: number): number {
  // default cam ~2.85 → ~360km; zoomed ~1.5 → ~90km; far ~5 → ~750km
  return Math.max(55, Math.min(850, (cameraRadius - 1.15) * 210));
}
