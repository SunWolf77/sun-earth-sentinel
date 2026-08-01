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
  baseKm = 2.2,
): { dLat: number; dLon: number }[] {
  if (n <= 0) return [];
  if (n === 1) return [{ dLat: 0, dLon: 0 }];
  const ringR = baseKm * (1 + Math.floor((n - 1) / 8) * 0.55);
  const out: { dLat: number; dLon: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const km = ringR * (0.85 + (i % 3) * 0.08);
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
