/**
 * Cordaro H × flare × EQ — exploratory pairing on drmagneto peaks.
 * Magnetometer series, not a seismometer. Flare→H is often just SSC.
 * Mag→EQ is Cordaro-style coincidence, not a precursor claim.
 */

import type { MagPeak } from "@/lib/magneto/analyze";
import type { MagStation } from "@/lib/magneto/stations";
import { haversineKm } from "@/lib/magneto/stations";
import type { CouplingFlare, CouplingQuake } from "@/lib/ops/fieldCoupling";
import { formatLagHours, shortPlace } from "@/lib/ops/fieldCoupling";

export type CordaroQuakeHit = {
  id: string;
  mag: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  url?: string;
  lagHours: number;
  distKm: number;
};

export type CordaroFlareHit = {
  classType: string;
  peakMs: number;
  lagHours: number;
  link: string | null;
};

export type CordaroThread = {
  id: string;
  station: string;
  peakT: number;
  peakV: number;
  flare: CordaroFlareHit | null;
  quake: CordaroQuakeHit | null;
  headline: string;
  meta: string;
};

const FLARE_TO_H_MAX_H = 36;
const H_TO_EQ_MAX_H = 6;
const H_TO_EQ_PRE_H = 0.5;
const MIN_EQ_MAG = 4.5;
const MAX_DIST_KM = 8000;

export function buildCordaroThreads(opts: {
  station: MagStation;
  peaks: MagPeak[];
  flares: CouplingFlare[];
  quakes: CouplingQuake[];
}): CordaroThread[] {
  const threads: CordaroThread[] = [];
  const peaks = [...opts.peaks].sort((a, b) => b.v - a.v).slice(0, 12);

  for (const peak of peaks) {
    const leading = opts.flares
      .map((f) => ({ f, lag: (peak.t - f.peakMs) / 3_600_000 }))
      .filter((x) => x.lag >= 0 && x.lag <= FLARE_TO_H_MAX_H)
      .sort((a, b) => b.f.parsed.rank - a.f.parsed.rank || a.lag - b.lag)[0];
    const flare: CordaroFlareHit | null = leading
      ? {
          classType: leading.f.classType,
          peakMs: leading.f.peakMs,
          lagHours: leading.lag,
          link: leading.f.link,
        }
      : null;

    let quake: CordaroQuakeHit | null = null;
    for (const q of opts.quakes) {
      if (q.mag < MIN_EQ_MAG) continue;
      const lagH = (q.time - peak.t) / 3_600_000;
      if (lagH < -H_TO_EQ_PRE_H || lagH > H_TO_EQ_MAX_H) continue;
      const distKm = haversineKm(opts.station.lat, opts.station.lon, q.lat, q.lon);
      if (distKm > MAX_DIST_KM) continue;
      if (!quake || q.mag > quake.mag || (q.mag === quake.mag && lagH < quake.lagHours)) {
        quake = {
          id: q.id,
          mag: q.mag,
          place: q.place,
          time: q.time,
          lat: q.lat,
          lon: q.lon,
          url: q.url,
          lagHours: lagH,
          distKm,
        };
      }
    }

    if (!quake) continue; // coupling desk only lists H→EQ; flare-only is just space weather

    const place = shortPlace(quake.place);
    const headline = flare
      ? `Flare ${flare.classType} → H ${opts.station.code} → EQ ${quake.mag.toFixed(1)} ${place}`
      : `H ${opts.station.code} → EQ ${quake.mag.toFixed(1)} ${place}`;
    const meta = [
      `H peak ${peak.v.toFixed(2)}`,
      flare ? `flare +${formatLagHours(flare.lagHours)}` : null,
      `EQ +${formatLagHours(Math.max(0, quake.lagHours))}`,
      `${Math.round(quake.distKm)} km`,
    ]
      .filter(Boolean)
      .join(" · ");

    threads.push({
      id: `h:${opts.station.code}:${peak.t}:${quake.id}`,
      station: opts.station.code,
      peakT: peak.t,
      peakV: peak.v,
      flare,
      quake,
      headline,
      meta,
    });
  }

  const seen = new Set<string>();
  const out: CordaroThread[] = [];
  for (const t of threads.sort((a, b) => {
    const a3 = a.flare ? 1 : 0;
    const b3 = b.flare ? 1 : 0;
    if (a3 !== b3) return b3 - a3;
    return b.peakV - a.peakV;
  })) {
    const k = t.quake?.id ?? t.id;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= 6) break;
  }
  return out;
}

export function utcDayStart(ms = Date.now()): number {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function utcDateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
