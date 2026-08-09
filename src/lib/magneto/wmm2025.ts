/**
 * World Magnetic Model 2025 (WMM-2025).
 * Coefficients: NOAA NCEI / BGS (epoch 2025.0, valid through 2030.0).
 */

import {
  clampLatLon,
  computeMainField,
  decimalYearNow,
  loadCoeffMatrices,
  type GaussRow,
} from "@/lib/magneto/magneticField";

export const WMM2025_EPOCH = 2025.0;
export const WMM2025_MAX_YEAR = 2030.0;
export const WMM2025_DEGREE = 12;
export const WMM2025_HEADER = "2025.0            WMM-2025     11/13/2024";

/** n, m, g, h, gdot, hdot — from official WMM2025.COF */
export const WMM2025_COF: GaussRow[] = [
  [1, 0, -29351.8, 0.0, 12.0, 0.0],
  [1, 1, -1410.8, 4545.4, 9.7, -21.5],
  [2, 0, -2556.6, 0.0, -11.6, 0.0],
  [2, 1, 2951.1, -3133.6, -5.2, -27.7],
  [2, 2, 1649.3, -815.1, -8.0, -12.1],
  [3, 0, 1361.0, 0.0, -1.3, 0.0],
  [3, 1, -2404.1, -56.6, -4.2, 4.0],
  [3, 2, 1243.8, 237.5, 0.4, -0.3],
  [3, 3, 453.6, -549.5, -15.6, -4.1],
  [4, 0, 895.0, 0.0, -1.6, 0.0],
  [4, 1, 799.5, 278.6, -2.4, -1.1],
  [4, 2, 55.7, -133.9, -6.0, 4.1],
  [4, 3, -281.1, 212.0, 5.6, 1.6],
  [4, 4, 12.1, -375.6, -7.0, -4.4],
  [5, 0, -233.2, 0.0, 0.6, 0.0],
  [5, 1, 368.9, 45.4, 1.4, -0.5],
  [5, 2, 187.2, 220.2, 0.0, 2.2],
  [5, 3, -138.7, -122.9, 0.6, 0.4],
  [5, 4, -142.0, 43.0, 2.2, 1.7],
  [5, 5, 20.9, 106.1, 0.9, 1.9],
  [6, 0, 64.4, 0.0, -0.2, 0.0],
  [6, 1, 63.8, -18.4, -0.4, 0.3],
  [6, 2, 76.9, 16.8, 0.9, -1.6],
  [6, 3, -115.7, 48.8, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.9, 0.9],
  [6, 5, 14.9, 10.9, 0.3, 0.7],
  [6, 6, -60.7, 72.7, 0.9, 0.9],
  [7, 0, 79.5, 0.0, -0.0, 0.0],
  [7, 1, -77.0, -48.9, -0.1, 0.6],
  [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1.0, 0.5, -0.8],
  [7, 4, 15.8, 23.4, -0.1, 0.0],
  [7, 5, 2.5, -7.4, -0.8, -1.0],
  [7, 6, -11.1, -25.1, -0.8, 0.6],
  [7, 7, 14.2, -2.3, 0.8, -0.2],
  [8, 0, 23.2, 0.0, -0.1, 0.0],
  [8, 1, 10.8, 7.1, 0.2, -0.2],
  [8, 2, -17.5, -12.6, 0.0, 0.5],
  [8, 3, 2.0, 11.4, 0.5, -0.4],
  [8, 4, -21.7, -9.7, -0.1, 0.4],
  [8, 5, 16.9, 12.7, 0.3, -0.5],
  [8, 6, 15.0, 0.7, 0.2, -0.6],
  [8, 7, -16.8, -5.2, -0.0, 0.3],
  [8, 8, 0.9, 3.9, 0.2, 0.2],
  [9, 0, 4.6, 0.0, -0.0, 0.0],
  [9, 1, 7.8, -24.8, -0.1, -0.3],
  [9, 2, 3.0, 12.2, 0.1, 0.3],
  [9, 3, -0.2, 8.3, 0.3, -0.3],
  [9, 4, -2.5, -3.3, -0.3, 0.3],
  [9, 5, -13.1, -5.2, 0.0, 0.2],
  [9, 6, 2.4, 7.2, 0.3, -0.1],
  [9, 7, 8.6, -0.6, -0.1, -0.2],
  [9, 8, -8.7, 0.8, 0.1, 0.4],
  [9, 9, -12.9, 10.0, -0.1, 0.1],
  [10, 0, -1.3, 0.0, 0.1, 0.0],
  [10, 1, -6.4, 3.3, 0.0, 0.0],
  [10, 2, 0.2, 0.0, 0.1, -0.0],
  [10, 3, 2.0, 2.4, 0.1, -0.2],
  [10, 4, -1.0, 5.3, -0.0, 0.1],
  [10, 5, -0.6, -9.1, -0.3, -0.1],
  [10, 6, -0.9, 0.4, 0.0, 0.1],
  [10, 7, 1.5, -4.2, -0.1, 0.0],
  [10, 8, 0.9, -3.8, -0.1, -0.1],
  [10, 9, -2.7, 0.9, -0.0, 0.2],
  [10, 10, -3.9, -9.1, -0.0, -0.0],
  [11, 0, 2.9, 0.0, 0.0, 0.0],
  [11, 1, -1.5, 0.0, -0.0, -0.0],
  [11, 2, -2.5, 2.9, 0.0, 0.1],
  [11, 3, 2.4, -0.6, 0.0, -0.0],
  [11, 4, -0.6, 0.2, 0.0, 0.1],
  [11, 5, -0.1, 0.5, -0.1, -0.0],
  [11, 6, -0.6, -0.3, 0.0, -0.0],
  [11, 7, -0.1, -1.2, -0.0, 0.1],
  [11, 8, 1.1, -1.7, -0.1, -0.0],
  [11, 9, -1.0, -2.9, -0.1, 0.0],
  [11, 10, -0.2, -1.8, -0.1, 0.0],
  [11, 11, 2.6, -2.3, -0.1, 0.0],
  [12, 0, -2.0, 0.0, 0.0, 0.0],
  [12, 1, -0.2, -1.3, 0.0, -0.0],
  [12, 2, 0.3, 0.7, -0.0, 0.0],
  [12, 3, 1.2, 1.0, -0.0, -0.1],
  [12, 4, -1.3, -1.4, -0.0, 0.1],
  [12, 5, 0.6, -0.0, -0.0, -0.0],
  [12, 6, 0.6, 0.6, 0.1, -0.0],
  [12, 7, 0.5, -0.1, -0.0, -0.0],
  [12, 8, -0.1, 0.8, 0.0, 0.0],
  [12, 9, -0.4, 0.1, 0.0, -0.0],
  [12, 10, -0.2, -1.0, -0.1, -0.0],
  [12, 11, -1.3, 0.1, -0.0, 0.0],
  [12, 12, -0.7, 0.2, -0.1, -0.1],
];

const mats = loadCoeffMatrices(WMM2025_COF, WMM2025_DEGREE);

export type WmmResult = {
  model: "WMM2025";
  epoch: number;
  decimalYear: number;
  lat: number;
  lon: number;
  altKm: number;
  decl: number;
  incl: number;
  H: number;
  X: number;
  Y: number;
  Z: number;
  F: number;
  dDecl: number;
  dIncl: number;
  dH: number;
  dX: number;
  dY: number;
  dZ: number;
  dF: number;
};

export function evaluateWmm2025(opts: {
  lat: number;
  lon: number;
  altKm?: number;
  decimalYear?: number;
}): WmmResult {
  const { lat, lon } = clampLatLon(opts.lat, opts.lon);
  const altKm = opts.altKm ?? 0;
  const year = opts.decimalYear ?? decimalYearNow();
  const a = computeMainField(lat, lon, altKm, year, WMM2025_EPOCH, WMM2025_DEGREE, mats);
  const b = computeMainField(lat, lon, altKm, year + 1, WMM2025_EPOCH, WMM2025_DEGREE, mats);
  return {
    model: "WMM2025",
    epoch: WMM2025_EPOCH,
    decimalYear: year,
    lat,
    lon,
    altKm,
    ...a,
    dDecl: b.decl - a.decl,
    dIncl: b.incl - a.incl,
    dH: b.H - a.H,
    dX: b.X - a.X,
    dY: b.Y - a.Y,
    dZ: b.Z - a.Z,
    dF: b.F - a.F,
  };
}

export { decimalYearNow };

export function isWmmYearInRange(y: number): boolean {
  return y >= WMM2025_EPOCH && y <= WMM2025_MAX_YEAR;
}

export const WMM2025_TEST_POINTS = [
  { y: 2025.0, alt: 66, lat: 14, lon: 143, decl: -0.19, F: 35898.700342 },
  { y: 2025.0, alt: 18, lat: 0, lon: 21, decl: 1.29, F: 32594.761714 },
  { y: 2025.0, alt: 39, lat: -59, lon: -8, decl: -15.75, F: 28589.818346 },
] as const;

export function wmm2025SelfTest(tolF = 50, tolDecl = 0.25) {
  const samples: { label: string; dF: number; dDecl: number; ok: boolean }[] = [];
  let ok = true;
  for (const t of WMM2025_TEST_POINTS) {
    const r = evaluateWmm2025({
      lat: t.lat,
      lon: t.lon,
      altKm: t.alt,
      decimalYear: t.y,
    });
    const dF = Math.abs(r.F - t.F);
    const dDecl = Math.abs(r.decl - t.decl);
    const pass = Number.isFinite(r.F) && dF <= tolF && dDecl <= tolDecl;
    if (!pass) ok = false;
    samples.push({ label: `${t.lat},${t.lon}`, dF, dDecl, ok: pass });
  }
  return { ok, samples };
}
