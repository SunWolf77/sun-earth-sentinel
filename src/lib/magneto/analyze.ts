/**
 * Magnetic anomaly series analysis + quake time-distance matching.
 * Exploratory only — Cordaro-style relative probability, NOT a forecast product.
 */

import { haversineKm, type MagStation } from "@/lib/magneto/stations";
import type { EqFeature } from "@/lib/feeds/usgs";

export type MagSeriesPoint = {
  /** UTC ms — 30s steps from day start if not provided by API */
  t: number;
  /** Relative probability / processed level from drmagneto */
  v: number;
  raw?: number;
};

export type MagPeak = {
  t: number;
  v: number;
  /** duration of contiguous above-threshold samples (s) */
  durationSec: number;
};

export type MagQuakeMatch = {
  peak: MagPeak;
  quake: {
    id: string;
    mag: number;
    place: string;
    time: number;
    lat: number;
    lon: number;
    depth: number;
  };
  /** minutes from peak to quake (positive = quake after peak) */
  lagMin: number;
  distKm: number;
  score: number;
};

export type MagAssessment = {
  station: MagStation;
  threshold: number;
  n: number;
  peak: number;
  mean: number;
  aboveCount: number;
  peaks: MagPeak[];
  matches: MagQuakeMatch[];
  plain: string;
  caveat: string;
};

/** drmagneto samples ~every 30s for ~24h */
const STEP_MS = 30_000;

export function seriesFromProcessed(
  processed: number[],
  raw: number[] | undefined,
  dayStartMs: number,
): MagSeriesPoint[] {
  return processed.map((v, i) => ({
    t: dayStartMs + i * STEP_MS,
    v: Number(v) || 0,
    raw: raw?.[i] != null ? Number(raw[i]) : undefined,
  }));
}

export function findPeaks(series: MagSeriesPoint[], threshold: number): MagPeak[] {
  const peaks: MagPeak[] = [];
  let i = 0;
  while (i < series.length) {
    if (series[i]!.v < threshold) {
      i++;
      continue;
    }
    let j = i;
    let maxV = series[i]!.v;
    let maxT = series[i]!.t;
    while (j < series.length && series[j]!.v >= threshold) {
      if (series[j]!.v > maxV) {
        maxV = series[j]!.v;
        maxT = series[j]!.t;
      }
      j++;
    }
    peaks.push({
      t: maxT,
      v: maxV,
      durationSec: ((j - i) * STEP_MS) / 1000,
    });
    i = j;
  }
  // strongest first
  return peaks.sort((a, b) => b.v - a.v).slice(0, 24);
}

export function matchPeaksToQuakes(opts: {
  peaks: MagPeak[];
  station: MagStation;
  features: EqFeature[];
  /** minutes before peak to consider */
  preMin?: number;
  /** minutes after peak */
  postMin?: number;
  maxDistKm?: number;
  minMag?: number;
}): MagQuakeMatch[] {
  const pre = (opts.preMin ?? 60) * 60_000;
  const post = (opts.postMin ?? 360) * 60_000;
  const maxD = opts.maxDistKm ?? 8000;
  const minMag = opts.minMag ?? 4.0;
  const matches: MagQuakeMatch[] = [];

  for (const peak of opts.peaks) {
    for (const f of opts.features) {
      const mag = f.properties.mag ?? 0;
      if (mag < minMag) continue;
      const time = f.properties.time;
      if (typeof time !== "number") continue;
      const lag = time - peak.t;
      if (lag < -pre || lag > post) continue;
      const [lon, lat, depth] = f.geometry.coordinates;
      const distKm = haversineKm(opts.station.lat, opts.station.lon, lat, lon);
      if (distKm > maxD) continue;
      // score: higher peak, larger mag, closer, lag shortly after peak preferred
      const lagMin = lag / 60_000;
      const lagFactor = lagMin >= 0 ? 1 / (1 + lagMin / 120) : 0.4 / (1 + Math.abs(lagMin) / 60);
      const distFactor = 1 / (1 + distKm / 2000);
      const score = peak.v * mag * lagFactor * distFactor;
      matches.push({
        peak,
        quake: {
          id: String(f.id ?? `${lat},${lon},${time}`),
          mag,
          place: f.properties.place || "Event",
          time,
          lat,
          lon,
          depth: depth ?? 0,
        },
        lagMin,
        distKm,
        score,
      });
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 20);
}

export function assessMagneto(opts: {
  station: MagStation;
  series: MagSeriesPoint[];
  threshold: number;
  features: EqFeature[];
}): MagAssessment {
  const vals = opts.series.map((p) => p.v);
  const peak = vals.length ? Math.max(...vals) : 0;
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const aboveCount = vals.filter((v) => v >= opts.threshold).length;
  const peaks = findPeaks(opts.series, opts.threshold);
  const matches = matchPeaksToQuakes({
    peaks,
    station: opts.station,
    features: opts.features,
  });

  let plain: string;
  if (!vals.length) {
    plain = "No magneto series for this station today.";
  } else if (peak < opts.threshold) {
    plain = `Quiet on ${opts.station.code}: peak relative level ${peak.toFixed(2)} below threshold ${opts.threshold}.`;
  } else {
    plain = `${opts.station.code} shows ${peaks.length} interval(s) ≥ ${opts.threshold} (peak ${peak.toFixed(2)}). ${
      matches.length
        ? `${matches.length} catalog quake(s) within time/distance window of peaks (exploratory match only).`
        : "No M4+ catalog quakes fall in the match window — null is valid."
    }`;
  }

  return {
    station: opts.station,
    threshold: opts.threshold,
    n: vals.length,
    peak,
    mean,
    aboveCount,
    peaks,
    matches,
    plain,
    caveat:
      "Exploratory overlay inspired by Richard Cordaro’s public INTERMAGNET processing (drmagneto). " +
      "Relative probability is not a proven precursor and is not an official warning. " +
      "Space weather (Kp/Dst) also moves ground magnetometers — always cross-check SWPC scales.",
  };
}
