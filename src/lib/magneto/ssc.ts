/**
 * Geomagnetic sudden commencement / sudden impulse (SSC / SI) heuristics.
 *
 * Physics (plain language):
 *  A solar-wind pressure pulse compresses the magnetosphere → near-global step
 *  in ground H (horizontal field) within minutes. If a storm follows, archives
 *  label it SSC (storm sudden commencement); an isolated step is SI.
 *
 * Detection (ops heuristic, not WDC catalogue substitute):
 *  - Step in H (or GOES Hp) over a short window exceeds dB threshold
 *  - Optional: sustained post-step change
 *
 * Credits / catalogues:
 *  - INTERMAGNET observatories (ground H)
 *  - NOAA SWPC GOES magnetometers (space-based context)
 *  - Kyoto WDC / ISGI style SSC lists (official events — we do not scrape)
 *  - Cordaro drmagneto relative series (exploratory ground processing)
 */

export type SscCandidate = {
  t: number;
  dB: number;
  windowSec: number;
  source: "ground-H" | "goes-Hp" | "drmagneto-raw";
  note: string;
};

export type SscScanResult = {
  candidates: SscCandidate[];
  plain: string;
  method: string;
};

/**
 * Scan evenly-ish sampled series for sudden steps.
 * @param series t ascending ms, v in nT (or relative units for drmagneto)
 * @param opts.stepSec window for delta (default 3 min)
 * @param opts.minAbs step threshold (nT or relative)
 */
export function scanSuddenSteps(
  series: { t: number; v: number }[],
  opts?: {
    stepSec?: number;
    minAbs?: number;
    source?: SscCandidate["source"];
    unit?: string;
  },
): SscScanResult {
  const stepSec = opts?.stepSec ?? 180;
  const minAbs = opts?.minAbs ?? 15; // nT-ish default for ground/GOES
  const source = opts?.source ?? "ground-H";
  const unit = opts?.unit ?? "nT";
  const candidates: SscCandidate[] = [];

  if (series.length < 4) {
    return {
      candidates: [],
      plain: "Not enough samples for SSC/SI step scan.",
      method: `Δ over ${stepSec}s · thr ${minAbs} ${unit}`,
    };
  }

  let j = 0;
  for (let i = 0; i < series.length; i++) {
    const t0 = series[i]!.t;
    const target = t0 + stepSec * 1000;
    while (j < series.length - 1 && series[j]!.t < target) j++;
    if (j <= i) continue;
    const dB = series[j]!.v - series[i]!.v;
    if (Math.abs(dB) >= minAbs) {
      // de-dupe: keep strongest within 10 min
      const last = candidates[candidates.length - 1];
      if (last && Math.abs(last.t - t0) < 10 * 60_000) {
        if (Math.abs(dB) > Math.abs(last.dB)) {
          candidates[candidates.length - 1] = {
            t: t0,
            dB,
            windowSec: stepSec,
            source,
            note: `${dB >= 0 ? "+" : ""}${dB.toFixed(1)} ${unit} in ${stepSec}s`,
          };
        }
      } else {
        candidates.push({
          t: t0,
          dB,
          windowSec: stepSec,
          source,
          note: `${dB >= 0 ? "+" : ""}${dB.toFixed(1)} ${unit} in ${stepSec}s`,
        });
      }
    }
  }

  // Keep top by |dB|
  candidates.sort((a, b) => Math.abs(b.dB) - Math.abs(a.dB));
  const top = candidates.slice(0, 12);

  let plain: string;
  if (!top.length) {
    plain = `No SSC/SI-like steps ≥ ${minAbs} ${unit} over ${stepSec}s windows.`;
  } else {
    const best = top[0]!;
    plain = `${top.length} candidate step(s); largest ${best.note} at ${new Date(best.t).toISOString().slice(11, 19)}Z (${source}). Correlate with SWPC scales / solar wind — not an official SSC list.`;
  }

  return {
    candidates: top,
    plain,
    method: `Δ over ${stepSec}s · thr ${minAbs} ${unit} · source ${source}`,
  };
}

/** Relative drmagneto series: lower absolute threshold, same shape. */
export function scanDrmagnetoSteps(
  series: { t: number; v: number }[],
  minAbs = 0.35,
): SscScanResult {
  return scanSuddenSteps(series, {
    stepSec: 300,
    minAbs,
    source: "drmagneto-raw",
    unit: "rel",
  });
}
