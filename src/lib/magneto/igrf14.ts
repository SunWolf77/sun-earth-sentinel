/**
 * IGRF-14 (14th generation International Geomagnetic Reference Field).
 * Source: IAGA / NCEI igrf14coeffs.txt — main field 2025.0 + SV 2025–2030.
 * Degree 13 main field; predictive SV to degree 8 (higher degrees SV = 0).
 */

import {
  clampLatLon,
  computeMainField,
  decimalYearNow,
  loadCoeffMatrices,
  type GaussRow,
} from "@/lib/magneto/magneticField";

export const IGRF14_EPOCH = 2025.0;
export const IGRF14_MAX_YEAR = 2030.0;
export const IGRF14_DEGREE = 13;
export const IGRF14_SV_DEGREE = 8;

/** n, m, g, h, gdot, hdot at epoch 2025.0 */
export const IGRF14_COF: GaussRow[] = [
  [1, 0, -29350, 0, 12.6, 0],
  [1, 1, -1410.3, 4545.5, 10, -21.5],
  [2, 0, -2556.2, 0, -11.2, 0],
  [2, 1, 2950.9, -3133.6, -5.3, -27.3],
  [2, 2, 1648.7, -814.2, -8.3, -11.1],
  [3, 0, 1360.9, 0, -1.5, 0],
  [3, 1, -2404.2, -56.9, -4.4, 3.8],
  [3, 2, 1243.8, 237.6, 0.4, -0.2],
  [3, 3, 453.4, -549.6, -15.6, -3.9],
  [4, 0, 894.7, 0, -1.7, 0],
  [4, 1, 799.6, 278.6, -2.3, -1.3],
  [4, 2, 55.8, -134, -5.8, 4.1],
  [4, 3, -281.1, 212, 5.4, 1.6],
  [4, 4, 12, -375.4, -6.8, -4.1],
  [5, 0, -232.9, 0, 0.6, 0],
  [5, 1, 369, 45.3, 1.3, -0.5],
  [5, 2, 187.2, 220, 0, 2.1],
  [5, 3, -138.7, -122.9, 0.7, 0.5],
  [5, 4, -141.9, 42.9, 2.3, 1.7],
  [5, 5, 20.9, 106.2, 1, 1.9],
  [6, 0, 64.3, 0, -0.2, 0],
  [6, 1, 63.8, -18.4, -0.3, 0.3],
  [6, 2, 76.7, 16.8, 0.8, -1.6],
  [6, 3, -115.7, 48.9, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.8, 0.8],
  [6, 5, 14.9, 10.9, 0.4, 0.7],
  [6, 6, -60.8, 72.8, 0.9, 0.9],
  [7, 0, 79.6, 0, -0.1, 0],
  [7, 1, -76.9, -48.9, -0.1, 0.6],
  [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1, 0.5, -0.7],
  [7, 4, 15.8, 23.5, -0.1, 0],
  [7, 5, 2.5, -7.4, -0.8, -0.9],
  [7, 6, -11.2, -25.1, -0.8, 0.5],
  [7, 7, 14.3, -2.2, 0.9, -0.3],
  [8, 0, 23.1, 0, -0.1, 0],
  [8, 1, 10.9, 7.2, 0.2, -0.3],
  [8, 2, -17.5, -12.6, 0, 0.4],
  [8, 3, 2, 11.5, 0.4, -0.3],
  [8, 4, -21.8, -9.7, -0.1, 0.4],
  [8, 5, 16.9, 12.7, 0.3, -0.5],
  [8, 6, 14.9, 0.7, 0.1, -0.6],
  [8, 7, -16.8, -5.2, 0, 0.3],
  [8, 8, 1, 3.9, 0.3, 0.2],
  [9, 0, 4.7, 0, 0, 0],
  [9, 1, 8, -24.8, 0, 0],
  [9, 2, 3, 12.1, 0, 0],
  [9, 3, -0.2, 8.3, 0, 0],
  [9, 4, -2.5, -3.4, 0, 0],
  [9, 5, -13.1, -5.3, 0, 0],
  [9, 6, 2.4, 7.2, 0, 0],
  [9, 7, 8.6, -0.6, 0, 0],
  [9, 8, -8.7, 0.8, 0, 0],
  [9, 9, -12.8, 9.8, 0, 0],
  [10, 0, -1.3, 0, 0, 0],
  [10, 1, -6.4, 3.3, 0, 0],
  [10, 2, 0.2, 0.1, 0, 0],
  [10, 3, 2, 2.5, 0, 0],
  [10, 4, -1, 5.4, 0, 0],
  [10, 5, -0.5, -9, 0, 0],
  [10, 6, -0.9, 0.4, 0, 0],
  [10, 7, 1.5, -4.2, 0, 0],
  [10, 8, 0.9, -3.8, 0, 0],
  [10, 9, -2.6, 0.9, 0, 0],
  [10, 10, -3.9, -9, 0, 0],
  [11, 0, 3, 0, 0, 0],
  [11, 1, -1.4, 0, 0, 0],
  [11, 2, -2.5, 2.8, 0, 0],
  [11, 3, 2.4, -0.6, 0, 0],
  [11, 4, -0.6, 0.1, 0, 0],
  [11, 5, 0, 0.5, 0, 0],
  [11, 6, -0.6, -0.3, 0, 0],
  [11, 7, -0.1, -1.2, 0, 0],
  [11, 8, 1.1, -1.7, 0, 0],
  [11, 9, -1, -2.9, 0, 0],
  [11, 10, -0.1, -1.8, 0, 0],
  [11, 11, 2.6, -2.3, 0, 0],
  [12, 0, -2, 0, 0, 0],
  [12, 1, -0.1, -1.2, 0, 0],
  [12, 2, 0.4, 0.6, 0, 0],
  [12, 3, 1.2, 1, 0, 0],
  [12, 4, -1.2, -1.5, 0, 0],
  [12, 5, 0.6, 0, 0, 0],
  [12, 6, 0.5, 0.6, 0, 0],
  [12, 7, 0.5, -0.2, 0, 0],
  [12, 8, -0.1, 0.8, 0, 0],
  [12, 9, -0.5, 0.1, 0, 0],
  [12, 10, -0.2, -0.9, 0, 0],
  [12, 11, -1.2, 0.1, 0, 0],
  [12, 12, -0.7, 0.2, 0, 0],
  [13, 0, 0.2, 0, 0, 0],
  [13, 1, -0.9, -0.9, 0, 0],
  [13, 2, 0.6, 0.7, 0, 0],
  [13, 3, 0.7, 1.2, 0, 0],
  [13, 4, -0.2, -0.3, 0, 0],
  [13, 5, 0.5, -1.3, 0, 0],
  [13, 6, 0.1, -0.1, 0, 0],
  [13, 7, 0.7, 0.2, 0, 0],
  [13, 8, 0, -0.2, 0, 0],
  [13, 9, 0.3, 0.5, 0, 0],
  [13, 10, 0.2, 0.6, 0, 0],
  [13, 11, 0.4, -0.6, 0, 0],
  [13, 12, -0.5, -0.3, 0, 0],
  [13, 13, -0.4, -0.5, 0, 0]
];

const mats = loadCoeffMatrices(IGRF14_COF, IGRF14_DEGREE);

export type Igrf14Result = {
  model: "IGRF-14";
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

export function evaluateIgrf14(opts: {
  lat: number;
  lon: number;
  altKm?: number;
  decimalYear?: number;
}): Igrf14Result {
  const { lat, lon } = clampLatLon(opts.lat, opts.lon);
  const altKm = opts.altKm ?? 0;
  const year = opts.decimalYear ?? decimalYearNow();
  const a = computeMainField(lat, lon, altKm, year, IGRF14_EPOCH, IGRF14_DEGREE, mats);
  const b = computeMainField(lat, lon, altKm, year + 1, IGRF14_EPOCH, IGRF14_DEGREE, mats);
  return {
    model: "IGRF-14",
    epoch: IGRF14_EPOCH,
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

/** Dipole axial term snapshot for literacy UI */
export function igrf14DipoleSnapshot(decimalYear = decimalYearNow()) {
  const dt = decimalYear - IGRF14_EPOCH;
  const g10 = -29350.0 + dt * 12.6;
  // axial dipole moment proxy ~ |g10| * RE^3 (relative)
  return {
    g10,
    g10Sv: 12.6,
    note: "g₁⁰ is the dominant axial dipole Gauss coefficient (nT). Positive SV here means the coefficient is becoming less negative → slow dipole intensity change is model-dependent; always read full vector field, not g₁₀ alone.",
  };
}

export const IGRF14_FACTS = [
  "IAGA community model (not a single agency product). 14th generation finalized November 2024.",
  "Products: DGRF 2020.0 (definitive), IGRF 2025.0 (main field, degree 13), predictive SV 2025.0–2030.0 (degree 8).",
  "Schmidt semi-normalized spherical harmonics — same class of math as WMM, different parent process and degree.",
  "IGRF is the research/international standard; WMM is the operational navigation standard. Numbers are close but not identical.",
  "Secular variation is a linear 5-year forecast. Real core SV can accelerate regionally (secular acceleration) — research models (CHAOS-class) track that better mid-cycle.",
  "Does not include crustal anomalies, ionospheric Sq, magnetospheric ring current, or storm-time disturbance fields.",
] as const;
