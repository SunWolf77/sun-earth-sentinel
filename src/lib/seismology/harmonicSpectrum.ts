/**
 * Same band split as process_SUPT_sac_universal.py
 * Tremor 0.5–5 · Mixed 5–15 · Fracture 15–40 Hz
 * Runs in-browser on a single IRIS trace. Not a catalog merge.
 */

export const WAVE_BANDS = {
  tremor: { label: "Tremor", fmin: 0.5, fmax: 5 },
  mixed: { label: "Mixed", fmin: 5, fmax: 15 },
  fracture: { label: "Fracture", fmin: 15, fmax: 40 },
} as const;

export type WaveFingerprint = {
  eventId: string;
  mag: number | null;
  place: string;
  time: number;
  lat: number;
  lon: number;
  net: string;
  sta: string;
  loc: string;
  cha: string;
  elevM: number | null;
  distDeg: number;
  sps: number;
  npts: number;
  tremorPct: number;
  mixedPct: number;
  fracturePct: number;
  fetchedAt: number;
};

export type SpectrumBin = { f: number; a: number };

function detrend(x: number[]): Float64Array {
  const n = x.length;
  const y = new Float64Array(n);
  if (n === 0) return y;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i]!;
  mean /= n;
  for (let i = 0; i < n; i++) y[i] = x[i]! - mean;
  return y;
}

function hann(n: number, i: number): number {
  if (n <= 1) return 1;
  return 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
}

/** Real FFT magnitudes via DFT on a downsampled cap (n ≤ 4096). */
export function rfftMag(samples: number[], dt: number): SpectrumBin[] {
  const raw = detrend(samples);
  const cap = 4096;
  const step = Math.max(1, Math.ceil(raw.length / cap));
  const n = Math.floor(raw.length / step);
  if (n < 32) return [];
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = raw[i * step]! * hann(n, i);
  const dtEff = dt * step;
  const nFreq = Math.floor(n / 2) + 1;
  const out: SpectrumBin[] = [];
  // Direct DFT — n=4096 is ~8M ops, fine once per pick
  for (let k = 0; k < nFreq; k++) {
    let re = 0;
    let im = 0;
    const w = (-2 * Math.PI * k) / n;
    for (let t = 0; t < n; t++) {
      const a = w * t;
      re += x[t]! * Math.cos(a);
      im += x[t]! * Math.sin(a);
    }
    out.push({ f: k / (n * dtEff), a: Math.hypot(re, im) });
  }
  return out;
}

export function bandPercents(spec: SpectrumBin[]): {
  tremorPct: number;
  mixedPct: number;
  fracturePct: number;
} {
  let tot = 0;
  let t = 0;
  let m = 0;
  let f = 0;
  for (const b of spec) {
    if (b.f < 0.5 || b.f >= 40) continue;
    tot += b.a;
    if (b.f < 5) t += b.a;
    else if (b.f < 15) m += b.a;
    else f += b.a;
  }
  if (tot <= 0) return { tremorPct: 0, mixedPct: 0, fracturePct: 0 };
  return {
    tremorPct: (t / tot) * 100,
    mixedPct: (m / tot) * 100,
    fracturePct: (f / tot) * 100,
  };
}

export function cosine3(
  a: Pick<WaveFingerprint, "tremorPct" | "mixedPct" | "fracturePct">,
  b: Pick<WaveFingerprint, "tremorPct" | "mixedPct" | "fracturePct">,
): number {
  const av = [a.tremorPct, a.mixedPct, a.fracturePct];
  const bv = [b.tremorPct, b.mixedPct, b.fracturePct];
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < 3; i++) {
    dot += av[i]! * bv[i]!;
    na += av[i]! * av[i]!;
    nb += bv[i]! * bv[i]!;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d > 0 ? dot / d : 0;
}

/** Downsample spectrum for a small sparkline (log-f bins). */
export function sparkBins(spec: SpectrumBin[], n = 48): SpectrumBin[] {
  const lo = Math.log10(0.5);
  const hi = Math.log10(40);
  const buckets = Array.from({ length: n }, (_, i) => {
    const f = 10 ** (lo + ((i + 0.5) / n) * (hi - lo));
    return { f, a: 0, c: 0 };
  });
  for (const b of spec) {
    if (b.f < 0.5 || b.f >= 40) continue;
    const i = Math.min(n - 1, Math.max(0, Math.floor(((Math.log10(b.f) - lo) / (hi - lo)) * n)));
    buckets[i]!.a += b.a;
    buckets[i]!.c += 1;
  }
  return buckets.map((x) => ({ f: x.f, a: x.c ? x.a / x.c : 0 }));
}
