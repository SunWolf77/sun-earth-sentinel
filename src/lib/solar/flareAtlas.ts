/**
 * Each GOES flare placed on the 7-day X-ray chart, with the same
 * harmonic read the outlook uses. Description of the record, not a forecast.
 */

import type { XrayPoint } from "@/lib/feeds/swpc";
import { fluxToClass } from "@/lib/feeds/swpc";

export type FlareMark = {
  id: string;
  klass: string;
  letter: "X" | "M" | "C";
  begin: string;
  peak: string;
  end: string | null;
  riseMin: number | null;
  peakFlux: number | null;
  excess: number | null;
  harmonicMin: number | null;
  harmonicRatio: number | null;
  impulsive: boolean;
  open: boolean;
  steps: { title: string; text: string }[];
};

export type FlareAtlas = {
  generated: number;
  count: number;
  mCount: number;
  xCount: number;
  liveHarmonicMin: number | null;
  phaseLine: string | null;
  marks: FlareMark[];
  honesty: string;
};

type Row = {
  begin_time?: string;
  max_time?: string;
  end_time?: string | null;
  max_class?: string;
  max_xrlong?: number;
};

type Sample = { t: number; f: number };

function seriesOf(points: XrayPoint[]): Sample[] {
  const map = new Map<number, number>();
  for (const p of points) {
    if (!p.energy?.includes("0.1-0.8")) continue;
    const f = p.flux ?? p.observed_flux;
    if (f == null || !Number.isFinite(f) || f <= 0) continue;
    const ms = Date.parse(p.time_tag);
    if (!Number.isFinite(ms)) continue;
    map.set(Math.floor(ms / 60_000) * 60_000, f);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([t, f]) => ({ t, f }));
}

function nearest(series: Sample[], t: number): number {
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

function clock(ms: number): string {
  return new Date(ms).toISOString().slice(5, 16).replace("T", " ") + " UTC";
}

function letterOf(klass: string): "X" | "M" | "C" | null {
  const c = klass.trim().toUpperCase()[0];
  if (c === "X" || c === "M" || c === "C") return c;
  return null;
}

export function buildFlareAtlas(
  points: XrayPoint[],
  flares: Row[],
  decadeMedianRise: number | null,
  phaseLine: string | null,
  now = Date.now(),
): FlareAtlas {
  const series = seriesOf(points);
  const empty: FlareAtlas = {
    generated: now,
    count: 0,
    mCount: 0,
    xCount: 0,
    liveHarmonicMin: null,
    phaseLine,
    marks: [],
    honesty:
      "Flares are placed on the GOES minute chart. A harmonic is kept only when one period stands clear of the others. Not a civil forecast.",
  };
  if (series.length < 60) return empty;

  const live = harmonic(series, series.length - 1);
  const drafts: Omit<FlareMark, "steps">[] = [];

  for (const fl of flares) {
    const peakMs = Date.parse(fl.max_time ?? "");
    if (!Number.isFinite(peakMs)) continue;
    const idx = nearest(series, peakMs);
    const hit = series[idx]!;
    if (Math.abs(hit.t - peakMs) > 8 * 60_000) continue;
    const klass = (fl.max_class ?? fluxToClass(hit.f)).trim().toUpperCase();
    const letter = letterOf(klass);
    if (!letter) continue;
    const beginMs = Date.parse(fl.begin_time ?? "");
    const endMs = Date.parse(fl.end_time ?? "");
    const riseMin = Number.isFinite(beginMs) && peakMs > beginMs ? (peakMs - beginMs) / 60_000 : null;
    const harm = harmonic(series, idx);
    const bg = background(series, idx);
    const logF = Math.log10(hit.f);
    drafts.push({
      id: `${klass}-${hit.t}`,
      klass,
      letter,
      begin: Number.isFinite(beginMs) ? new Date(beginMs).toISOString() : new Date(hit.t).toISOString(),
      peak: new Date(hit.t).toISOString(),
      end: Number.isFinite(endMs) ? new Date(endMs).toISOString() : null,
      riseMin: riseMin != null && riseMin < 240 ? riseMin : null,
      peakFlux: hit.f,
      excess: bg == null ? null : logF - bg,
      harmonicMin: harm.period,
      harmonicRatio: harm.ratio,
      impulsive: riseMin != null && riseMin < 8,
      open: !Number.isFinite(endMs) || endMs > now - 10 * 60_000,
    });
  }

  drafts.sort((a, b) => Date.parse(b.peak) - Date.parse(a.peak));
  const kept = drafts.slice(0, 18);
  const marks: FlareMark[] = kept.map((d) => {
    const peers = kept.filter(
      (o) =>
        o.id !== d.id &&
        (o.letter === "M" || o.letter === "X") &&
        d.harmonicMin != null &&
        o.harmonicMin != null &&
        Math.abs(o.harmonicMin - d.harmonicMin) <= 2,
    ).length;
    const riseBit =
      d.riseMin == null
        ? "The begin time is missing, so the rise is not measured."
        : d.impulsive
          ? `The rise took ${Math.round(d.riseMin)} min, short enough to call impulsive.`
          : `The rise took ${Math.round(d.riseMin)} min, a longer build.`;
    const decadeBit =
      decadeMedianRise != null && d.riseMin != null && (d.letter === "M" || d.letter === "X")
        ? ` The 10-year M/X median rise is ${Math.round(decadeMedianRise)} min.`
        : "";
    const fluxBit =
      d.peakFlux == null
        ? "The minute chart has no flux at the peak."
        : d.excess == null
          ? `The chart reads ${d.klass} at the peak.`
          : `The chart reads ${d.klass}. That is ${d.excess.toFixed(2)} dex above the quiet level in the hours before.`;
    const harmBit =
      d.harmonicMin == null
        ? "No period from 4 to 20 minutes stands clear of the noise in the 90 minutes before the peak."
        : `A ${d.harmonicMin}-min pulse is ${d.harmonicRatio?.toFixed(1)} times stronger than the other periods in that hour. ${peers} other M or X flare${peers === 1 ? "" : "s"} this week had a pulse within 2 minutes of it.`;
    const useBit = d.open
      ? "The end is not in yet, so this rise may still be going. The 6-hour chance watches a rise that is still climbing, not a spike that has already finished."
      : d.impulsive
        ? "This spike has finished. An impulsive flare does not, by itself, raise the chance of the next hours."
        : "This flare is already in the week the 6-hour chance was trained on. A finished flare is context. A flux that is still rising is what moves the number.";

    return {
      ...d,
      steps: [
        { title: "Clock", text: `${d.klass} peaked ${clock(Date.parse(d.peak))}. ${riseBit}${decadeBit}` },
        { title: "Chart", text: fluxBit },
        { title: "Harmonic", text: harmBit },
        { title: "Use", text: useBit },
      ],
    };
  });

  return {
    generated: now,
    count: kept.length,
    mCount: kept.filter((m) => m.letter === "M").length,
    xCount: kept.filter((m) => m.letter === "X").length,
    liveHarmonicMin: live.period,
    phaseLine,
    marks,
    honesty: empty.honesty,
  };
}
