/**
 * Flare window from the GOES long-channel record plus the Earth-facing region.
 *
 * The chance is a small logistic fit on the last 7 days: flux excess, rise,
 * a harmonic (a repeating minute-scale pulse), and Hale class.
 * It is a hindcast on that same window, then applied to now.
 * Not a NOAA forecast and not a civil alert.
 */

import type { XrayPoint } from "@/lib/feeds/swpc";
import { fluxToClass } from "@/lib/feeds/swpc";
import type { ActiveRegion } from "@/lib/feeds/solarRegions";
import { haleRank } from "@/lib/feeds/solarRegions";

const M1 = 1e-5;
const X1 = 1e-4;
const C1 = 1e-6;
const HORIZON_MS = 6 * 3600_000;

export type CatalogFlare = {
  begin_time?: string;
  max_time?: string;
  max_class?: string;
  max_xrlong?: number;
};

export type FlareOutlook = {
  generated: number;
  klass: string;
  trend: "rising" | "falling" | "steady";
  minutesPerClass: number | null;
  hoursToXIfRiseHolds: number | null;
  harmonicMin: number | null;
  pC: number | null;
  pM: number | null;
  learnedM: boolean;
  learnedC: boolean;
  trainM: number;
  trainC: number;
  catalogM: number;
  hindcastHit: number;
  hindcastN: number;
  regionLine: string | null;
  sentence: string;
  honesty: string;
  recentFlares: { peak: string; klass: string }[];
};

type Sample = { t: number; f: number };

function sigmoid(z: number): number {
  const x = Math.max(-20, Math.min(20, z));
  return 1 / (1 + Math.exp(-x));
}

function longSeries(points: XrayPoint[]): Sample[] {
  const map = new Map<number, number>();
  for (const p of points) {
    if (!p.energy?.includes("0.1-0.8")) continue;
    const f = p.flux ?? p.observed_flux;
    if (f == null || !Number.isFinite(f) || f <= 0) continue;
    const ms = Date.parse(p.time_tag);
    if (!Number.isFinite(ms)) continue;
    map.set(Math.floor(ms / 60_000) * 60_000, f);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, f]) => ({ t, f }));
}

function fluxNear(series: Sample[], i: number, minutes: number): number | null {
  const target = series[i]!.t - minutes * 60_000;
  for (let j = i - 1; j >= 0 && i - j < minutes + 10; j--) {
    const dt = series[j]!.t - target;
    if (Math.abs(dt) <= 90_000) return series[j]!.f;
    if (series[j]!.t < target - 180_000) break;
  }
  return null;
}

function slopeAt(series: Sample[], i: number, minutes: number): number | null {
  const prev = fluxNear(series, i, minutes);
  const now = series[i]!.f;
  if (prev == null || prev <= 0 || now <= 0) return null;
  return (Math.log10(now) - Math.log10(prev)) / minutes;
}

function background(series: Sample[], i: number): number | null {
  const start = series[i]!.t - 6 * 3600_000;
  const end = series[i]!.t - 30 * 60_000;
  const logs: number[] = [];
  for (let j = i; j >= 0; j--) {
    const t = series[j]!.t;
    if (t < start) break;
    if (t <= end) logs.push(Math.log10(series[j]!.f));
  }
  if (logs.length < 20) return null;
  logs.sort((a, b) => a - b);
  return logs[Math.floor(logs.length * 0.2)]!;
}

function harmonic(series: Sample[], i: number): { period: number | null; ratio: number } {
  const ys: number[] = [];
  const t0 = series[i]!.t - 90 * 60_000;
  for (let j = i; j >= 0; j--) {
    if (series[j]!.t < t0) break;
    ys.push(Math.log10(series[j]!.f));
  }
  ys.reverse();
  if (ys.length < 40) return { period: null, ratio: 0 };
  const n = ys.length;
  let sumT = 0;
  let sumY = 0;
  let sumTT = 0;
  let sumTY = 0;
  for (let k = 0; k < n; k++) {
    sumT += k;
    sumY += ys[k]!;
    sumTT += k * k;
    sumTY += k * ys[k]!;
  }
  const denom = n * sumTT - sumT * sumT || 1;
  const slope = (n * sumTY - sumT * sumY) / denom;
  const intercept = (sumY - slope * sumT) / n;
  const y = ys.map((v, k) => v - (intercept + slope * k));
  let bestP = 0;
  let best = 0;
  let acc = 0;
  let count = 0;
  for (let period = 4; period <= 20; period++) {
    const w = (2 * Math.PI) / period;
    let re = 0;
    let im = 0;
    for (let k = 0; k < n; k++) {
      re += y[k]! * Math.cos(w * k);
      im += y[k]! * Math.sin(w * k);
    }
    const pow = (re * re + im * im) / n;
    acc += pow;
    count += 1;
    if (pow > best) {
      best = pow;
      bestP = period;
    }
  }
  const mean = acc / Math.max(1, count);
  const ratio = mean > 0 ? best / mean : 0;
  return { period: ratio >= 3 ? bestP : null, ratio };
}

type Feat = {
  t: number;
  x: number[];
};

function features(series: Sample[], i: number, region: number, earth: number): Feat | null {
  const slope = slopeAt(series, i, 15);
  if (slope == null) return null;
  const prevSlope = slopeAt(series, Math.max(0, i - 15), 15);
  const accel = prevSlope == null ? 0 : slope - prevSlope;
  const bg = background(series, i);
  const logF = Math.log10(series[i]!.f);
  const excess = bg == null ? 0 : logF - bg;
  const harm = harmonic(series, i);
  return {
    t: series[i]!.t,
    x: [1, excess, slope * 10, accel * 10, Math.min(harm.ratio, 8) / 4, region, earth],
  };
}

function dot(w: number[], x: number[]): number {
  let z = 0;
  for (let i = 0; i < w.length; i++) z += w[i]! * x[i]!;
  return z;
}

function fit(rows: { x: number[]; y: number }[]): number[] {
  const d = rows[0]!.x.length;
  const w = new Array(d).fill(0);
  w[1] = 0.35;
  w[2] = 0.7;
  w[5] = 0.5;
  w[6] = 0.35;
  const lr = 0.25;
  const l2 = 0.2;
  for (let step = 0; step < 50; step++) {
    const g = new Array(d).fill(0);
    for (const row of rows) {
      const err = sigmoid(dot(w, row.x)) - row.y;
      for (let j = 0; j < d; j++) g[j] += err * row.x[j]!;
    }
    for (let j = 0; j < d; j++) {
      g[j] = g[j]! / rows.length + l2 * w[j]!;
      w[j] = w[j]! - lr * g[j]!;
    }
  }
  return w;
}

function nearestIndex(series: Sample[], t: number): number {
  let lo = 0;
  let hi = series.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid]!.t < t) lo = mid + 1;
    else hi = mid;
  }
  const prev = Math.max(0, lo - 1);
  return Math.abs(series[lo]!.t - t) <= Math.abs(series[prev]!.t - t) ? lo : prev;
}

function isMClass(klass: string | undefined): boolean {
  const c = (klass ?? "").trim().toUpperCase();
  return c.startsWith("M") || c.startsWith("X");
}

function isCClass(klass: string | undefined): boolean {
  const c = (klass ?? "").trim().toUpperCase();
  return c.startsWith("C") || isMClass(c);
}

/** Place each catalogued flare on the flux chart. The chart's own minute wins when it is close. */
function mapCatalog(flares: CatalogFlare[], series: Sample[], want: "M" | "C"): Sample[] {
  const out: Sample[] = [];
  for (const fl of flares) {
    if (want === "M" ? !isMClass(fl.max_class) : !isCClass(fl.max_class)) continue;
    const t = Date.parse(fl.max_time ?? "");
    if (!Number.isFinite(t)) continue;
    const idx = nearestIndex(series, t);
    const hit = series[idx]!;
    if (Math.abs(hit.t - t) > 8 * 60_000) continue;
    const prev = out[out.length - 1];
    if (prev && Math.abs(hit.t - prev.t) < 20 * 60_000) {
      if (hit.f > prev.f) out[out.length - 1] = hit;
      continue;
    }
    out.push(hit);
  }
  return out;
}

function prelude(series: Sample[], i: number): number[] | null {
  const vals: number[] = [];
  for (let m = 60; m >= 0; m -= 10) {
    const f = m === 0 ? series[i]!.f : fluxNear(series, i, m);
    if (f == null || f <= 0) return null;
    vals.push(Math.log10(f));
  }
  const base = vals[0]!;
  return vals.map((v) => v - base);
}

function cosine(a: number[], b: number[]): number {
  let dotp = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dotp += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na <= 0 || nb <= 0) return 0;
  return dotp / Math.sqrt(na * nb);
}

function findPeaks(series: Sample[], floor: number): Sample[] {
  const raw: Sample[] = [];
  for (let i = 2; i < series.length - 2; i++) {
    const f = series[i]!.f;
    if (f < floor) continue;
    if (
      f >= series[i - 1]!.f &&
      f >= series[i + 1]!.f &&
      f > series[i - 2]!.f * 1.5 &&
      f >= series[i + 2]!.f
    ) {
      raw.push(series[i]!);
    }
  }
  const kept: Sample[] = [];
  for (const p of raw) {
    const prev = kept[kept.length - 1];
    if (prev && p.t - prev.t < 25 * 60_000) {
      if (p.f > prev.f) kept[kept.length - 1] = p;
      continue;
    }
    kept.push(p);
  }
  return kept;
}

function regionBits(regions: ActiveRegion[]): { rank: number; earth: number; line: string | null } {
  const lead = regions.find((r) => haleRank(r.hale) > 0 && r.phase !== "off");
  if (!lead) return { rank: 0, earth: 0, line: null };
  const earth =
    lead.phase === "direct" ? 1 : lead.phase === "entering" || lead.phase === "leaving" ? 0.7 : lead.phase === "east" ? 0.35 : 0.1;
  return {
    rank: haleRank(lead.hale) / 5,
    earth,
    line: lead.sentence,
  };
}

function clampP(p: number): number {
  return Math.max(0.02, Math.min(0.9, p));
}

export function buildFlareOutlook(
  points: XrayPoint[],
  regions: ActiveRegion[],
  catalog: CatalogFlare[] = [],
): FlareOutlook {
  const series = longSeries(points);
  const empty: FlareOutlook = {
    generated: Date.now(),
    klass: "—",
    trend: "steady",
    minutesPerClass: null,
    hoursToXIfRiseHolds: null,
    harmonicMin: null,
    pC: null,
    pM: null,
    learnedM: false,
    learnedC: false,
    trainM: 0,
    trainC: 0,
    catalogM: 0,
    hindcastHit: 0,
    hindcastN: 0,
    regionLine: null,
    sentence: "GOES long-channel history is not in yet.",
    honesty: "No forecast is issued without the X-ray series.",
    recentFlares: [],
  };
  if (series.length < 120) return empty;

  const reg = regionBits(regions);
  const last = series.length - 1;
  const nowF = series[last]!.f;
  const slope = slopeAt(series, last, 15);
  const harm = harmonic(series, last);
  const trend: FlareOutlook["trend"] =
    slope == null ? "steady" : slope > 0.008 ? "rising" : slope < -0.008 ? "falling" : "steady";
  const minutesPerClass = slope != null && slope > 0.004 ? 1 / slope : null;
  const hoursToX =
    slope != null && slope > 0 && nowF < X1
      ? (Math.log10(X1) - Math.log10(nowF)) / slope / 60
      : null;

  const detectedM = findPeaks(series, M1);
  const detectedC = findPeaks(series, C1 * 5);
  const catalogM = mapCatalog(catalog, series, "M");
  const catalogC = mapCatalog(catalog, series, "C");
  const mPeaks = catalogM.length ? catalogM : detectedM;
  const cPeaks = catalogC.length ? catalogC : detectedC;
  const labeledEnd = series[last]!.t - HORIZON_MS;
  const rowsM: { x: number[]; y: number }[] = [];
  const rowsC: { x: number[]; y: number }[] = [];

  for (let i = 90; i < series.length; i += 30) {
    if (series[i]!.t > labeledEnd) break;
    const feat = features(series, i, reg.rank, reg.earth);
    if (!feat) continue;
    const m = mPeaks.some((p) => p.t > feat.t && p.t <= feat.t + HORIZON_MS);
    const c = cPeaks.some((p) => p.t > feat.t && p.t <= feat.t + HORIZON_MS);
    rowsM.push({ x: feat.x, y: m ? 1 : 0 });
    rowsC.push({ x: feat.x, y: c ? 1 : 0 });
  }

  const trainM = rowsM.filter((r) => r.y === 1).length;
  const trainC = rowsC.filter((r) => r.y === 1).length;
  const nowFeat = features(series, last, reg.rank, reg.earth);
  let pM: number | null = null;
  let pC: number | null = null;
  let learnedM = false;
  let learnedC = false;
  let hindcastHit = 0;
  let hindcastN = 0;

  if (nowFeat && trainC >= 8 && rowsC.length >= 20) {
    const w = fit(rowsC);
    pC = clampP(sigmoid(dot(w, nowFeat.x)));
    learnedC = true;
  }
  if (nowFeat && trainM >= 4 && rowsM.length >= 20) {
    const w = fit(rowsM);
    pM = clampP(sigmoid(dot(w, nowFeat.x)));
    learnedM = true;
    for (const peak of mPeaks) {
      const probe = peak.t - 40 * 60_000;
      let idx = -1;
      for (let i = 0; i < series.length; i++) {
        if (Math.abs(series[i]!.t - probe) <= 3 * 60_000) idx = i;
      }
      if (idx < 90) continue;
      const feat = features(series, idx, reg.rank, reg.earth);
      if (!feat) continue;
      hindcastN += 1;
      if (sigmoid(dot(w, feat.x)) >= 0.35) hindcastHit += 1;
    }
  } else if (nowFeat) {
    const prior =
      -2.4 +
      nowFeat.x[1]! * 0.5 +
      Math.max(0, nowFeat.x[2]!) * 0.9 +
      nowFeat.x[5]! * 1.3 +
      nowFeat.x[6]! * 0.8;
    pM = clampP(sigmoid(prior));
  }

  const recentFlares = [...mPeaks]
    .sort((a, b) => b.t - a.t)
    .slice(0, 6)
    .map((p) => ({ peak: new Date(p.t).toISOString(), klass: fluxToClass(p.f) }));

  const klass = fluxToClass(nowF);
  const bits: string[] = [];
  if (trend === "rising" && minutesPerClass != null && minutesPerClass < 240) {
    bits.push(`Flux is rising about one class every ${Math.round(minutesPerClass)} min.`);
  } else if (trend === "falling") {
    bits.push(`Flux is falling from ${klass}.`);
  } else {
    bits.push(`Flux is steady near ${klass}.`);
  }
  if (hoursToX != null && hoursToX > 0 && hoursToX < 12 && trend === "rising") {
    bits.push(`If this rise held, X would be about ${hoursToX.toFixed(1)} h out.`);
  }
  if (reg.line) bits.push(reg.line);
  if (harm.period) bits.push(`A ${harm.period}-min pulse stands out of the last 90 minutes.`);
  if (learnedM && pM != null) {
    bits.push(
      `M-class within 6 hours: ${Math.round(pM * 100)}%. Learned from ${catalogM.length || trainM} flares placed on the 7-day X-ray chart. Hindcast caught ${hindcastHit} of ${hindcastN} before the peak.`,
    );
  } else if (pM != null) {
    bits.push(
      `M-class watch ${Math.round(pM * 100)}%. ${catalogM.length} catalogued M flares on this week's chart, not enough to train. This is the live trend plus the region class.`,
    );
  }
  const nowShape = prelude(series, last);
  if (nowShape && catalogM.length) {
    let best = 0;
    for (const peak of catalogM.slice(-8)) {
      const idx = nearestIndex(series, peak.t);
      const shape = prelude(series, idx);
      if (!shape) continue;
      best = Math.max(best, cosine(nowShape, shape));
    }
    if (best >= 0.82) {
      bits.push("The last hour of the chart resembles the rise before a catalogued M flare.");
    }
  }

  return {
    generated: Date.now(),
    klass,
    trend,
    minutesPerClass,
    hoursToXIfRiseHolds: hoursToX != null && hoursToX > 0 && hoursToX < 18 ? hoursToX : null,
    harmonicMin: harm.period,
    pC,
    pM,
    learnedM,
    learnedC,
    trainM,
    trainC,
    catalogM: catalogM.length,
    hindcastHit,
    hindcastN,
    regionLine: reg.line,
    sentence: bits.join(" "),
    honesty:
      "Each catalogued flare is placed on the GOES X-ray chart, and the hour before it is what the fit learns. Scored on that same week. Not a civil alert.",
    recentFlares,
  };
}
