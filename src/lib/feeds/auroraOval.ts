/**
 * Approximate aurora oval polygons from planetary Kp (geomagnetic).
 * Not OVATION grid — educational sky-context ring for map/globe.
 * Official aurora products: NOAA SWPC / OVATION.
 */

export type AuroraOval = {
  kp: number;
  /** Equatorward boundary magnetic latitude (deg) */
  boundaryMagLat: number;
  northRing: { lat: number; lon: number }[];
  southRing: { lat: number; lon: number }[];
  level: "quiet" | "elevated" | "storm";
  label: string;
};

/** Rough geomagnetic north pole (IGRF-ish modern). */
const GMP_N = { lat: 80.65, lon: -72.68 };
const GMP_S = { lat: -80.65, lon: 107.32 };

/** Nightside equatorward boundary vs Kp (classic rule-of-thumb). */
export function boundaryMagLatFromKp(kp: number): number {
  const k = Math.max(0, Math.min(9, kp));
  // ~67° at Kp0 → ~50° at Kp9
  return 67.5 - 1.9 * k;
}

function ringAroundPole(
  pole: { lat: number; lon: number },
  colatDeg: number,
  steps = 72,
): { lat: number; lon: number }[] {
  // colatDeg = 90 - magLat boundary → angular distance from pole
  const δ = (colatDeg * Math.PI) / 180;
  const φ1 = (pole.lat * Math.PI) / 180;
  const λ1 = (pole.lon * Math.PI) / 180;
  const out: { lat: number; lon: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const θ = (2 * Math.PI * i) / steps;
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
    );
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
      );
    out.push({
      lat: (φ2 * 180) / Math.PI,
      lon: ((((λ2 * 180) / Math.PI) + 540) % 360) - 180,
    });
  }
  return out;
}

export function buildAuroraOval(kp: number): AuroraOval {
  const k = Math.max(0, Math.min(9, Number.isFinite(kp) ? kp : 0));
  const boundary = boundaryMagLatFromKp(k);
  const colat = 90 - boundary;
  const northRing = ringAroundPole(GMP_N, colat);
  const southRing = ringAroundPole(GMP_S, colat);
  const level = k >= 5 ? "storm" : k >= 3 ? "elevated" : "quiet";
  const label =
    level === "storm"
      ? `Aurora oval expanded (Kp ${k.toFixed(1)})`
      : level === "elevated"
        ? `Aurora active (Kp ${k.toFixed(1)})`
        : `Aurora quiet (Kp ${k.toFixed(1)})`;
  return {
    kp: k,
    boundaryMagLat: Math.round(boundary * 10) / 10,
    northRing,
    southRing,
    level,
    label,
  };
}

export function latestKp(points: { kp?: number; Kp?: number }[]): number {
  if (!points?.length) return 0;
  const last = points[points.length - 1]!;
  const v = last.kp ?? last.Kp ?? 0;
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}
