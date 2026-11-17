/**
 * GOES long-channel flare state.
 * The class is known within minutes. The region number is not.
 * A CME is not claimed until a coronagraph sees one.
 */

import { fluxToClass, longChannelXrays, type XrayPoint } from "@/lib/feeds/swpc";
import { haleRank, type ActiveRegion } from "@/lib/feeds/solarRegions";

const M = 1e-5;
const C5 = 5e-6;

export type LiveFlare = {
  phase: "rising" | "peak" | "subsided";
  /** Stable notify key. */
  id: string;
  line: string;
};

function fluxOf(p: XrayPoint): number {
  const f = p.flux || p.observed_flux || 0;
  return Number.isFinite(f) ? f : 0;
}

function msOf(p: XrayPoint): number {
  const t = Date.parse(p.time_tag);
  return Number.isFinite(t) ? t : 0;
}

function watchRegion(regions: ActiveRegion[]): ActiveRegion | null {
  const face = regions.filter((r) => r.phase === "direct" || r.phase === "entering" || r.phase === "leaving" || r.phase === "east");
  face.sort((a, b) => haleRank(b.hale) - haleRank(a.hale) || b.mProb + b.xProb - (a.mProb + a.xProb));
  return face[0] ?? null;
}

function regionBit(regions: ActiveRegion[], peakLetter: string, now: number): string {
  const named = regions.find((r) => {
    if (!r.lastFlare || r.lastFlare.klass[0] !== peakLetter) return false;
    const t = Date.parse(r.lastFlare.at.endsWith("Z") ? r.lastFlare.at : `${r.lastFlare.at}Z`);
    return Number.isFinite(t) && now - t < 6 * 3600_000 && now - t > -3600_000;
  });
  if (named) return `NOAA has it on AR${named.region}.`;
  const watch = watchRegion(regions);
  if (!watch) return "No Earth-facing region to watch.";
  return `Watching AR${watch.region}, ${watch.haleLabel}, ${watch.phaseLabel}. Not assigned yet.`;
}

function cmeBit(region: ActiveRegion | null, peak: number): string {
  if (peak < M) return "Too early to call a CME.";
  const aimed = region && (region.phase === "direct" || region.phase === "entering" || region.phase === "leaving");
  const complex = region && haleRank(region.hale) >= 3;
  if (aimed && complex) return "CME possible from an Earth-facing complex region. Not confirmed until a coronagraph sees it.";
  return "An M flare can launch a CME. Earth-arrival is not known yet.";
}

export function readLiveFlare(xray: XrayPoint[], regions: ActiveRegion[], now = Date.now()): LiveFlare | null {
  const series = longChannelXrays(xray)
    .map((p) => ({ t: msOf(p), f: fluxOf(p) }))
    .filter((p) => p.t > 0 && p.f > 0)
    .sort((a, b) => a.t - b.t);
  if (!series.length) return null;
  const last = series[series.length - 1]!;
  if (now - last.t > 12 * 60_000) return null;

  const window = series.filter((p) => now - p.t <= 90 * 60_000);
  if (!window.length) return null;
  let peak = window[0]!;
  for (const p of window) if (p.f > peak.f) peak = p;
  const above = window.filter((p) => p.f >= M);
  const minutes = above.length ? Math.max(1, Math.round((above[above.length - 1]!.t - above[0]!.t) / 60_000)) : 0;
  const region = watchRegion(regions);
  const peakClass = fluxToClass(peak.f);
  const nowClass = fluxToClass(last.f);

  if (peak.f >= M && last.f >= M) {
    return {
      phase: "peak",
      id: "flare-peak",
      line: `${peakClass} in progress, ${Math.max(minutes, 1)} min. ${regionBit(regions, peakClass[0]!, now)} ${cmeBit(region, peak.f)}`,
    };
  }

  if (peak.f >= M && last.f < M && last.f < peak.f * 0.5 && now - peak.t <= 45 * 60_000) {
    return {
      phase: "subsided",
      id: "flare-subsided",
      line: `${peakClass} subsided after ${Math.max(minutes, 1)} min. Latest ${nowClass}. ${regionBit(regions, peakClass[0]!, now)}`,
    };
  }

  const recent = series.filter((p) => last.t - p.t <= 8 * 60_000);
  if (recent.length >= 4 && last.f >= C5 && last.f < M) {
    const first = recent[0]!.f;
    const tail = recent.slice(-3);
    const rising = tail[2]!.f > tail[1]!.f && tail[1]!.f > tail[0]!.f;
    if (rising && last.f >= first * 3) {
      return {
        phase: "rising",
        id: "flare-rising",
        line: `Flux rising, now ${nowClass}. ${regionBit(regions, "C", now)} Too early to call a CME.`,
      };
    }
  }
  return null;
}
