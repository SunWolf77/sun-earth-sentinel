/**
 * Shared main-field spherical-harmonic evaluator (Schmidt quasi-normalized).
 * Used by WMM2025 and IGRF-14 coefficient packs.
 */

export type GaussRow = [n: number, m: number, g: number, h: number, gdot: number, hdot: number];

export type FieldVector = {
  decl: number;
  incl: number;
  H: number;
  X: number;
  Y: number;
  Z: number;
  F: number;
};

const A = 6378.137;
const B = 6356.7523142;
const RE = 6371.2;

function makeMatrix(nMax: number): number[][] {
  const m: number[][] = [];
  for (let i = 0; i <= nMax; i++) m[i] = new Array(i + 1).fill(0);
  return m;
}

export function loadCoeffMatrices(rows: GaussRow[], nMax: number) {
  const g0 = makeMatrix(nMax);
  const h0 = makeMatrix(nMax);
  const gdot0 = makeMatrix(nMax);
  const hdot0 = makeMatrix(nMax);
  for (const [n, m, g, h, gd, hd] of rows) {
    if (n < 1 || n > nMax || m < 0 || m > n) continue;
    g0[n]![m] = g;
    h0[n]![m] = h;
    gdot0[n]![m] = gd;
    hdot0[n]![m] = hd;
  }
  return { g0, h0, gdot0, hdot0 };
}

export function computeMainField(
  latDeg: number,
  lonDeg: number,
  altKm: number,
  decimalYear: number,
  epoch: number,
  nMax: number,
  mats: ReturnType<typeof loadCoeffMatrices>,
): FieldVector {
  const { g0, h0, gdot0, hdot0 } = mats;
  const dt = decimalYear - epoch;
  const g = makeMatrix(nMax);
  const h = makeMatrix(nMax);
  for (let n = 1; n <= nMax; n++) {
    for (let m = 0; m <= n; m++) {
      g[n]![m] = g0[n]![m]! + dt * gdot0[n]![m]!;
      h[n]![m] = h0[n]![m]! + dt * hdot0[n]![m]!;
    }
  }

  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);

  const a2 = A * A;
  const b2 = B * B;
  const cos2 = cosLat * cosLat;
  const sin2 = sinLat * sinLat;
  const rEp = Math.sqrt(a2 * cos2 + b2 * sin2);
  const r = Math.sqrt(
    altKm * altKm + 2 * altKm * rEp + (a2 * a2 * cos2 + b2 * b2 * sin2) / (rEp * rEp),
  );
  const cosMu = ((altKm + a2 / rEp) * cosLat) / r;
  const sinMu = ((altKm + b2 / rEp) * sinLat) / r;

  const ct = sinMu;
  const st = Math.max(Math.abs(cosMu), 1e-15);

  const P = makeMatrix(nMax);
  const dP = makeMatrix(nMax);
  P[0]![0] = 1;
  dP[0]![0] = 0;
  P[1]![0] = ct;
  dP[1]![0] = -st;
  P[1]![1] = st;
  dP[1]![1] = ct;

  for (let n = 2; n <= nMax; n++) {
    for (let m = 0; m <= n; m++) {
      if (n === m) {
        P[n]![m] = st * P[n - 1]![m - 1]!;
        dP[n]![m] = st * dP[n - 1]![m - 1]! + ct * P[n - 1]![m - 1]!;
      } else {
        const K =
          m === n - 1 ? 0 : ((n - 1) ** 2 - m * m) / ((2 * n - 1) * (2 * n - 3));
        const Pnm2 = n >= 2 && m <= n - 2 ? P[n - 2]![m]! : 0;
        const dPnm2 = n >= 2 && m <= n - 2 ? dP[n - 2]![m]! : 0;
        P[n]![m] = ct * P[n - 1]![m]! - K * Pnm2;
        dP[n]![m] = ct * dP[n - 1]![m]! - st * P[n - 1]![m]! - K * dPnm2;
      }
    }
  }

  const S = makeMatrix(nMax);
  S[0]![0] = 1;
  for (let n = 1; n <= nMax; n++) {
    S[n]![0] = (S[n - 1]![0]! * (2 * n - 1)) / n;
    for (let m = 1; m <= n; m++) {
      const flp = m === 1 ? 2 : 1;
      S[n]![m] = S[n]![m - 1]! * Math.sqrt(((n - m + 1) * flp) / (n + m));
    }
  }
  for (let n = 1; n <= nMax; n++) {
    for (let m = 0; m <= n; m++) {
      P[n]![m]! *= S[n]![m]!;
      dP[n]![m]! *= S[n]![m]!;
    }
  }

  const ratio = RE / r;
  let Br = 0;
  let Bt = 0;
  let Bp = 0;

  for (let n = 1; n <= nMax; n++) {
    const rn = ratio ** (n + 2);
    for (let m = 0; m <= n; m++) {
      const cosM = Math.cos(m * lonRad);
      const sinM = Math.sin(m * lonRad);
      const gnm = g[n]![m]!;
      const hnm = h[n]![m]!;
      const Pnm = P[n]![m]!;
      const dPnm = dP[n]![m]!;
      Br += rn * (n + 1) * (gnm * cosM + hnm * sinM) * Pnm;
      Bt -= rn * (gnm * cosM + hnm * sinM) * dPnm;
      if (st !== 0) {
        Bp += (rn * m * (gnm * sinM - hnm * cosM) * Pnm) / st;
      }
    }
  }

  const geoLat = Math.atan2(sinMu, cosMu);
  const delta = geoLat - latRad;
  const cosD = Math.cos(delta);
  const sinD = Math.sin(delta);

  const X = -Bt * cosD - Br * sinD;
  const Y = Bp;
  const Z = Bt * sinD - Br * cosD;
  const H = Math.hypot(X, Y);
  const F = Math.hypot(H, Z);
  const decl = (Math.atan2(Y, X) * 180) / Math.PI;
  const incl = (Math.atan2(Z, H) * 180) / Math.PI;

  return { decl, incl, H, X, Y, Z, F };
}

export function decimalYearNow(d = new Date()): number {
  const y = d.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const next = Date.UTC(y + 1, 0, 1);
  return y + (d.getTime() - start) / (next - start);
}

export function clampLatLon(lat: number, lon: number) {
  const la = Math.max(-90, Math.min(90, lat));
  const lo = ((lon + 540) % 360) - 180;
  return { lat: la, lon: lo };
}
