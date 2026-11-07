/** IERS polar-motion reductions for the ECDO hypothesis desk. Measurement only. */

const ARCSEC_M = (6378137 * Math.PI) / (180 * 3600);
const CHANDLER_DAYS = 433;

export type PoleSample = {
  mjd: number;
  year: number;
  month: number;
  day: number;
  x: number;
  y: number;
  /** Length of day excess, milliseconds. */
  lodMs: number | null;
};

export type EcdoPoints = {
  asOf: string;
  xArcsec: number;
  yArcsec: number;
  lodMs: number | null;
  lodAsOf: string | null;
  net14m: number | null;
  path14m: number | null;
  r2_14: number | null;
  net90m: number | null;
  path90m: number | null;
  chandlerRecentMas: number | null;
  chandlerRefMas: number | null;
  recentSpan: string;
  refSpan: string;
  c04Through: string | null;
  /** Recent geographic-pole path, arcseconds. Daily where Bulletin A exists. */
  track: PoleTrackPoint[];
  /** Linear drift of that path, meters per year. Not a flip rate. */
  wanderMperYear: number | null;
  /** Last observed day-to-day step, meters. */
  stepM: number | null;
};

export type PoleTrackPoint = { d: string; x: number; y: number };

/** ECDO State-2 claim: 104° from the north pole along 31°E. Not a measured pole. */
export const ECDO_STATE2 = { lat: -14, lon: 31 } as const;

export function ymd(s: PoleSample): string {
  return `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`;
}

function num(v: string | undefined): number | null {
  if (!v || !v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** IERS Bulletin A daily CSV. Drops prediction rows. LOD column is milliseconds. */
export function parseFinalsDailyCsv(text: string): PoleSample[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = lines[0]!.split(";").map((s) => s.trim());
  const ix = (name: string) => head.indexOf(name);
  const iMjd = ix("MJD");
  const iY = ix("Year");
  const iMo = ix("Month");
  const iD = ix("Day");
  const iType = ix("Type");
  const iX = ix("x_pole");
  const iYp = ix("y_pole");
  const iLod = ix("LOD");
  const out: PoleSample[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split(";");
    const kind = (c[iType] ?? "").toLowerCase();
    if (kind.includes("pred")) continue;
    const x = num(c[iX]);
    const y = num(c[iYp]);
    const mjd = num(c[iMjd]);
    if (x == null || y == null || mjd == null) continue;
    out.push({
      mjd,
      year: Number(c[iY]) || 0,
      month: Number(c[iMo]) || 0,
      day: Number(c[iD]) || 0,
      x,
      y,
      lodMs: num(c[iLod]),
    });
  }
  return out.sort((a, b) => a.mjd - b.mjd);
}

/** IERS C04 fixed-width series. LOD column is seconds. */
export function parseC04(text: string): PoleSample[] {
  const out: PoleSample[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^\d{4}\s/.test(line)) continue;
    const p = line.trim().split(/\s+/);
    if (p.length < 8) continue;
    const year = Number(p[0]);
    const month = Number(p[1]);
    const day = Number(p[2]);
    const mjd = Number(p[3]);
    const x = Number(p[4]);
    const y = Number(p[5]);
    const lodSec = Number(p[7]);
    if (![year, month, day, mjd, x, y].every(Number.isFinite)) continue;
    out.push({
      mjd,
      year,
      month,
      day,
      x,
      y,
      lodMs: Number.isFinite(lodSec) ? lodSec * 1000 : null,
    });
  }
  return out;
}

function meters(a: PoleSample, b: PoleSample): number {
  return Math.hypot(b.x - a.x, b.y - a.y) * ARCSEC_M;
}

function pathMeters(rows: PoleSample[]): number {
  let m = 0;
  for (let i = 1; i < rows.length; i++) m += meters(rows[i - 1]!, rows[i]!);
  return m;
}

function rSquared(t: number[], y: number[]): number | null {
  const n = t.length;
  if (n < 5) return null;
  let st = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    st += t[i]!;
    sy += y[i]!;
  }
  const mt = st / n;
  const my = sy / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dt = t[i]! - mt;
    const dy = y[i]! - my;
    sxx += dt * dt;
    syy += dy * dy;
    sxy += dt * dy;
  }
  if (sxx <= 0 || syy <= 0) return null;
  const r = sxy / Math.sqrt(sxx * syy);
  return r * r;
}

function windowEnding(rows: PoleSample[], days: number): PoleSample[] {
  if (rows.length < 2) return [];
  const end = rows[rows.length - 1]!.mjd;
  return rows.filter((r) => r.mjd >= end - days);
}

/** Mean Chandler-band amplitude (mas) after a linear detrend. */
export function chandlerMas(rows: PoleSample[]): number | null {
  if (rows.length < 400) return null;
  const t0 = rows[0]!.mjd;
  const t = rows.map((r) => r.mjd - t0);
  const fit = (y: number[]) => {
    const n = t.length;
    let st = 0;
    let sy = 0;
    let stt = 0;
    let sty = 0;
    for (let i = 0; i < n; i++) {
      st += t[i]!;
      sy += y[i]!;
      stt += t[i]! * t[i]!;
      sty += t[i]! * y[i]!;
    }
    const det = n * stt - st * st;
    if (Math.abs(det) < 1e-6) return y.slice();
    const b = (n * sty - st * sy) / det;
    const a = (sy - b * st) / n;
    return y.map((v, i) => v - (a + b * t[i]!));
  };
  const amp = (y: number[]) => {
    const w = (2 * Math.PI) / CHANDLER_DAYS;
    let cc = 0;
    let ss = 0;
    let cs = 0;
    let cy = 0;
    let sy = 0;
    for (let i = 0; i < t.length; i++) {
      const c = Math.cos(w * t[i]!);
      const s = Math.sin(w * t[i]!);
      cc += c * c;
      ss += s * s;
      cs += c * s;
      cy += c * y[i]!;
      sy += s * y[i]!;
    }
    const det = cc * ss - cs * cs;
    if (Math.abs(det) < 1e-9) return null;
    const A = (cy * ss - sy * cs) / det;
    const B = (cc * sy - cs * cy) / det;
    return Math.hypot(A, B);
  };
  const ax = amp(fit(rows.map((r) => r.x)));
  const ay = amp(fit(rows.map((r) => r.y)));
  if (ax == null || ay == null) return null;
  return ((ax + ay) / 2) * 1000;
}

function between(rows: PoleSample[], y0: number, y1: number): PoleSample[] {
  return rows.filter((r) => r.year >= y0 && r.year < y1);
}

const TRACK_DAYS = 730;

/** Last two years of the pole. Bulletin A overwrites C04 on the same day. */
function mergedWindow(daily: PoleSample[], c04: PoleSample[]): PoleSample[] {
  const end = daily[daily.length - 1]?.mjd ?? c04[c04.length - 1]?.mjd;
  if (end == null) return [];
  const start = end - TRACK_DAYS;
  const byMjd = new Map<number, PoleSample>();
  for (const r of c04) {
    if (r.mjd >= start && r.mjd <= end) byMjd.set(Math.round(r.mjd), r);
  }
  for (const r of daily) {
    if (r.mjd >= start) byMjd.set(Math.round(r.mjd), r);
  }
  return [...byMjd.values()].sort((a, b) => a.mjd - b.mjd);
}

export function poleTrack(daily: PoleSample[], c04: PoleSample[]): PoleTrackPoint[] {
  const rows = mergedWindow(daily, c04);
  if (rows.length < 2) return [];
  const step = Math.max(1, Math.ceil(rows.length / 200));
  const out: PoleTrackPoint[] = [];
  for (let i = 0; i < rows.length; i += step) {
    const r = rows[i]!;
    out.push({ d: ymd(r), x: Math.round(r.x * 10000) / 10000, y: Math.round(r.y * 10000) / 10000 });
  }
  const last = rows[rows.length - 1]!;
  if (out[out.length - 1]?.d !== ymd(last)) {
    out.push({
      d: ymd(last),
      x: Math.round(last.x * 10000) / 10000,
      y: Math.round(last.y * 10000) / 10000,
    });
  }
  return out;
}

/** Secular speed of the pole path, m/year. Linear fit, so the Chandler loop mostly cancels. */
export function wanderMetersPerYear(rows: PoleSample[]): number | null {
  if (rows.length < 30) return null;
  const t0 = rows[0]!.mjd;
  const t = rows.map((r) => (r.mjd - t0) / 365.25);
  const slope = (y: number[]) => {
    const n = t.length;
    let st = 0;
    let sy = 0;
    let stt = 0;
    let sty = 0;
    for (let i = 0; i < n; i++) {
      st += t[i]!;
      sy += y[i]!;
      stt += t[i]! * t[i]!;
      sty += t[i]! * y[i]!;
    }
    const det = n * stt - st * st;
    if (Math.abs(det) < 1e-9) return 0;
    return (n * sty - st * sy) / det;
  };
  const vx = slope(rows.map((r) => r.x));
  const vy = slope(rows.map((r) => r.y));
  return Math.hypot(vx, vy) * ARCSEC_M;
}

export function buildEcdoPoints(daily: PoleSample[], c04: PoleSample[]): EcdoPoints | null {
  const now = daily.length ? daily : c04;
  if (!now.length) return null;
  const last = now[now.length - 1]!;
  const withLod = [...now].reverse().find((r) => r.lodMs != null) ?? null;
  const d14 = windowEnding(now, 14);
  const d90 = windowEnding(now, 90);
  const t14 = d14.map((r) => r.mjd);
  const r2x = rSquared(t14, d14.map((r) => r.x));
  const r2y = rSquared(t14, d14.map((r) => r.y));
  const recent = c04.filter((r) => r.mjd >= (c04[c04.length - 1]?.mjd ?? 0) - 8 * 365.25);
  const ref = between(c04, 1985, 1995);
  const c04Last = c04[c04.length - 1];
  return {
    asOf: ymd(last),
    xArcsec: last.x,
    yArcsec: last.y,
    lodMs: withLod?.lodMs ?? null,
    lodAsOf: withLod ? ymd(withLod) : null,
    net14m: d14.length > 1 ? meters(d14[0]!, d14[d14.length - 1]!) : null,
    path14m: d14.length > 1 ? pathMeters(d14) : null,
    r2_14: r2x != null && r2y != null ? Math.min(r2x, r2y) : null,
    net90m: d90.length > 1 ? meters(d90[0]!, d90[d90.length - 1]!) : null,
    path90m: d90.length > 1 ? pathMeters(d90) : null,
    chandlerRecentMas: chandlerMas(recent),
    chandlerRefMas: chandlerMas(ref),
    recentSpan: recent.length ? `${ymd(recent[0]!)} → ${ymd(recent[recent.length - 1]!)}` : "—",
    refSpan: "1985–1994",
    c04Through: c04Last ? ymd(c04Last) : null,
    track: poleTrack(daily, c04),
    wanderMperYear: wanderMetersPerYear(mergedWindow(daily, c04)),
    stepM: now.length > 1 ? meters(now[now.length - 2]!, last) : null,
  };
}
