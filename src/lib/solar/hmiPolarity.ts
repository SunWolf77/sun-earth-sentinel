/**
 * Line-of-sight field at each NOAA point on the HMI magnetogram.
 * White in the JPEG is toward Earth. Black is away.
 * This is the field at that point today, not the polarity the region kept on the far side.
 */

import { decode } from "jpeg-js";

export type HmiSign = "toward" | "away" | "mixed" | "quiet" | "limb";

export type HmiPoint = {
  id: number;
  lat: number;
  lon: number;
  sign: HmiSign;
  /** 0–100, how far the patch sits from neutral gray. */
  strength: number;
  x: number;
  y: number;
};

export type HmiPolarity = {
  points: HmiPoint[];
};

type RegionRow = {
  region?: number;
  latitude?: number;
  longitude?: number;
  observed_date?: string;
};

export function readHmiPolarity(jpeg: Uint8Array, regions: unknown): HmiPolarity {
  const img = decode(jpeg, { useTArray: true, formatAsRGBA: true });
  const { width, height, data } = img;
  const disk = measureDisk(data, width, height);
  const latest = latestDate(regions);
  const rows = Array.isArray(regions) ? (regions as RegionRow[]) : [];
  const today = rows.filter(
    (r) =>
      r.observed_date === latest &&
      r.region != null &&
      r.latitude != null &&
      r.longitude != null &&
      Math.abs(r.longitude) <= 90,
  );
  const points = today.map((r) => {
    const lon = (r.longitude! * Math.PI) / 180;
    const lat = (r.latitude! * Math.PI) / 180;
    const px = disk.cx - Math.sin(lon) * Math.cos(lat) * disk.r;
    const py = disk.cy - Math.sin(lat) * disk.r;
    const limb = Math.hypot(px - disk.cx, py - disk.cy) > disk.r * 0.82;
    const sample = limb ? null : samplePatch(data, width, height, px, py);
    return {
      id: r.region!,
      lat: r.latitude!,
      lon: r.longitude!,
      sign: limb || !sample ? "limb" : sample.sign,
      strength: sample?.strength ?? 0,
      x: (px / width) * 200,
      y: (py / height) * 200,
    } satisfies HmiPoint;
  });
  return { points };
}

function latestDate(regions: unknown): string | null {
  if (!Array.isArray(regions)) return null;
  const dates = (regions as RegionRow[])
    .map((r) => r.observed_date)
    .filter((d): d is string => !!d)
    .sort();
  return dates.at(-1) ?? null;
}

function measureDisk(data: Uint8Array, width: number, height: number): { cx: number; cy: number; r: number } {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let n = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4]! < 40) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      n++;
    }
  }
  if (n < 100) return { cx: width / 2, cy: height / 2, r: width * 0.45 };
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, r: Math.min(maxX - minX, maxY - minY) / 2 };
}

function samplePatch(
  data: Uint8Array,
  width: number,
  height: number,
  px: number,
  py: number,
): { sign: HmiSign; strength: number } {
  let toward = 0;
  let away = 0;
  let sum = 0;
  let n = 0;
  const x0 = Math.round(px);
  const y0 = Math.round(py);
  for (let y = y0 - 3; y <= y0 + 3; y++) {
    for (let x = x0 - 3; x <= x0 + 3; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const v = data[(y * width + x) * 4]!;
      sum += v;
      n++;
      if (v >= 150) toward++;
      else if (v <= 100) away++;
    }
  }
  if (!n) return { sign: "quiet", strength: 0 };
  const mean = sum / n;
  const strength = Math.max(0, Math.min(100, Math.round(Math.abs(mean - 128) * 1.6)));
  if (toward >= 4 && away >= 4) return { sign: "mixed", strength };
  if (toward > away && toward >= 4) return { sign: "toward", strength };
  if (away > toward && away >= 4) return { sign: "away", strength };
  return { sign: "quiet", strength };
}
