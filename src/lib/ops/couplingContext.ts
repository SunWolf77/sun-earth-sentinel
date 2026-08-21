/**
 * Coupling context vs shuffle — a reading of THIS window, not a model.
 *
 * Frozen SUPT probe on the mixed clock + pair-rate against a time-shuffle
 * of the same events. No weights. No training. Null is a valid result.
 */

import {
  interEventSeconds,
  mulberry32,
  resonanceScore,
  SUPT_SEED,
  type ResonanceScore,
} from "@/lib/supt/probe";
import type { CouplingFlare, CouplingQuake } from "@/lib/ops/fieldCoupling";
import type { MagPeak } from "@/lib/magneto/analyze";

export type DomainClock = {
  id: "flare" | "eq" | "mixed" | "h";
  label: string;
  n: number;
  score: ResonanceScore;
};

export type PairRate = {
  id: string;
  label: string;
  observed: number;
  nullMean: number;
  nullSd: number;
  z: number | null;
  shuffles: number;
  thin: boolean;
  reading: string;
};

export type CouplingContextReport = {
  generatedAt: number;
  windowDays: number;
  clocks: DomainClock[];
  rates: PairRate[];
  headline: string;
  stance: string;
};

const FLARE_EQ_H = 120;
const FLARE_H_H = 36;
const SHUFFLES = 160;

function circularShift(times: number[], delta: number, tMin: number, tMax: number): number[] {
  const span = Math.max(1, tMax - tMin);
  return times.map((t) => tMin + ((((t - tMin + delta) % span) + span) % span));
}

function meanSd(xs: number[]): { mean: number; sd: number } {
  if (!xs.length) return { mean: 0, sd: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, xs.length - 1);
  return { mean, sd: Math.sqrt(v) };
}

function clockOf(id: DomainClock["id"], label: string, times: number[]): DomainClock | null {
  const gaps = interEventSeconds(times);
  if (gaps.length < 4) return null;
  return { id, label, n: times.length, score: resonanceScore(gaps, 40) };
}

function pairFlareEq(flares: CouplingFlare[], quakeTimes: number[]): number {
  let n = 0;
  for (const f of flares) {
    for (const t of quakeTimes) {
      const lag = (t - f.peakMs) / 3_600_000;
      if (lag >= 0 && lag <= FLARE_EQ_H) n++;
    }
  }
  return n;
}

function pairFlareH(flares: CouplingFlare[], peakTimes: number[]): number {
  let n = 0;
  for (const f of flares) {
    for (const t of peakTimes) {
      const lag = (t - f.peakMs) / 3_600_000;
      if (lag >= 0 && lag <= FLARE_H_H) n++;
    }
  }
  return n;
}

function rateReading(opts: {
  observed: number;
  z: number | null;
  thin: boolean;
}): string {
  if (opts.thin) return "Window too thin — null is the result.";
  if (opts.z == null) return "No shuffle baseline.";
  const z = opts.z;
  if (Math.abs(z) < 1.2) return "Looks like chance in this window.";
  if (z >= 1.2) return "More than a shuffled clock. Context, not a forecast.";
  return "Fewer than shuffle. Also context.";
}

function zOf(obs: number, mean: number, sd: number): number | null {
  if (sd < 1e-9) return obs === mean ? 0 : obs > mean ? 3 : -3;
  return (obs - mean) / sd;
}

export function buildCouplingContext(opts: {
  flares: CouplingFlare[];
  quakes: CouplingQuake[];
  hPeaks?: MagPeak[];
  now?: number;
  windowDays?: number;
  seed?: number;
}): CouplingContextReport {
  const now = opts.now ?? Date.now();
  const windowDays = opts.windowDays ?? 14;
  const cutoff = now - windowDays * 86_400_000;
  const rng = mulberry32(opts.seed ?? SUPT_SEED);

  const flares = opts.flares.filter((f) => f.peakMs >= cutoff);
  const quakes = opts.quakes.filter((q) => q.time >= cutoff && q.mag >= 6.5);
  const hPeaks = (opts.hPeaks ?? []).filter((p) => p.t >= cutoff);

  const clocks: DomainClock[] = [];
  const flareClock = clockOf("flare", "Flare clock", flares.map((f) => f.peakMs).sort((a, b) => a - b));
  const eqClock = clockOf("eq", "EQ 6.5+ clock", quakes.map((q) => q.time).sort((a, b) => a - b));
  const mixedTimes = [...flares.map((f) => f.peakMs), ...quakes.map((q) => q.time)].sort((a, b) => a - b);
  const mixedClock = clockOf("mixed", "Mixed clock", mixedTimes);
  if (flareClock) clocks.push(flareClock);
  if (eqClock) clocks.push(eqClock);
  if (mixedClock) clocks.push(mixedClock);
  const hClock = clockOf(
    "h",
    "H peaks",
    hPeaks.map((p) => p.t).sort((a, b) => a - b),
  );
  if (hClock) clocks.push(hClock);

  const qTimes = quakes.map((q) => q.time);
  const tMin = cutoff;
  const tMax = now;
  const observed = pairFlareEq(flares, qTimes);
  const nullHits: number[] = [];
  const thinPairs = flares.length < 3 || quakes.length < 3;
  if (!thinPairs) {
    for (let i = 0; i < SHUFFLES; i++) {
      const delta = rng() * (tMax - tMin);
      nullHits.push(pairFlareEq(flares, circularShift(qTimes, delta, tMin, tMax)));
    }
  }
  const ns = meanSd(nullHits);
  const z = thinPairs ? null : zOf(observed, ns.mean, ns.sd);
  const sunRate: PairRate = {
    id: "flare-eq",
    label: "Flare → EQ 6.5+",
    observed,
    nullMean: ns.mean,
    nullSd: ns.sd,
    z,
    shuffles: thinPairs ? 0 : SHUFFLES,
    thin: thinPairs,
    reading: rateReading({ observed, z, thin: thinPairs }),
  };

  const rates: PairRate[] = [sunRate];

  if (hPeaks.length >= 2 && flares.length >= 2) {
    const hTimes = hPeaks.map((p) => p.t);
    const obsH = pairFlareH(flares, hTimes);
    const hNull: number[] = [];
    const hThin = hPeaks.length < 3;
    if (!hThin) {
      for (let i = 0; i < SHUFFLES; i++) {
        const delta = rng() * (tMax - tMin);
        hNull.push(pairFlareH(flares, circularShift(hTimes, delta, tMin, tMax)));
      }
    }
    const hs = meanSd(hNull);
    const hz = hThin ? null : zOf(obsH, hs.mean, hs.sd);
    rates.push({
      id: "flare-h",
      label: "Flare → H peak",
      observed: obsH,
      nullMean: hs.mean,
      nullSd: hs.sd,
      z: hz,
      shuffles: hThin ? 0 : SHUFFLES,
      thin: hThin,
      reading: hThin
        ? "H series is ~48 h — too short for a null."
        : rateReading({ observed: obsH, z: hz, thin: false }),
    });
  } else if (hPeaks.length) {
    rates.push({
      id: "flare-h",
      label: "Flare → H peak",
      observed: pairFlareH(flares, hPeaks.map((p) => p.t)),
      nullMean: 0,
      nullSd: 0,
      z: null,
      shuffles: 0,
      thin: true,
      reading: "H series is ~48 h — too short for a null.",
    });
  }

  const unusual = rates.some((r) => r.z != null && Math.abs(r.z) >= 1.2);
  const mixedSep = mixedClock?.score.separated;
  const headline = thinPairs
    ? "Thin window · shuffle has nothing to beat"
    : unusual
      ? "This window is not chance-shaped · still not a forecast"
      : "Pairing rate looks like a shuffled clock";
  const stance = mixedSep
    ? "Mixed flare+EQ clock is unusual vs its own shuffle. That is spacing, not cause."
    : "Frozen probe + pair-rate vs destroyed order. No weights. No next-quake claim.";

  return {
    generatedAt: now,
    windowDays,
    clocks,
    rates,
    headline,
    stance,
  };
}

function fakeFlare(i: number, peakMs: number): CouplingFlare {
  return {
    id: `f${i}`,
    classType: "M5.0",
    parsed: { raw: "M5.0", letter: "M", value: 5, rank: 15 },
    peakMs,
    sourceLocation: null,
    link: null,
  };
}

function fakeQuake(i: number, time: number): CouplingQuake {
  return {
    id: `q${i}`,
    lat: 0,
    lon: 0,
    mag: 6.7,
    place: "Test",
    depth: 10,
    time,
  };
}

/** Locked lags must beat shuffle; random lags must not. Proves the null, not nature. */
export function selfTestCouplingContext(): { ok: boolean; note: string } {
  const t0 = 1_700_000_000_000;
  const flares = Array.from({ length: 8 }, (_, i) => fakeFlare(i, t0 + i * 36 * 3_600_000));
  const lockedQ = flares.map((f, i) => fakeQuake(i, f.peakMs + 6 * 3_600_000));
  const rng = mulberry32(7);
  const span = 12 * 24 * 3_600_000;
  const randomQ = flares.map((_, i) => fakeQuake(i, t0 + rng() * span));
  const locked = buildCouplingContext({
    flares,
    quakes: lockedQ,
    now: t0 + span,
    windowDays: 14,
    seed: 1,
  });
  const random = buildCouplingContext({
    flares,
    quakes: randomQ,
    now: t0 + span,
    windowDays: 14,
    seed: 1,
  });
  const zL = locked.rates[0]?.z;
  const zR = random.rates[0]?.z;
  const ok = zL != null && zL >= 2 && (zR == null || Math.abs(zR) < 2.2);
  return {
    ok,
    note: ok
      ? `Self-check ok · locked z ${zL?.toFixed(1)} · random z ${zR?.toFixed(1) ?? "—"}`
      : `Self-check fail · locked z ${zL} · random z ${zR}`,
  };
}
