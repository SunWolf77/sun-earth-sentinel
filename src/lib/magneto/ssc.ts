/**
 * Geomagnetic sudden commencement / sudden impulse (SSC / SI) heuristics.
 *
 * Official list is ISGI / Observatori de l’Ebre — we do not scrape it.
 * We scan GOES Hp and Cordaro H for a pressure-pulse-shaped step, then
 * look at Kp in the next 12 h: storm or activity rise → SSC-like; quiet → SI-like.
 *
 * Physics: solar-wind dynamic-pressure pulse compresses the magnetosphere →
 * near-global step in ground H within minutes (Araki two-step SC).
 */

import type { Citation } from "@/lib/cite";
import type { KpPoint } from "@/lib/feeds/swpc";

export const SSC_LINKS = [
  { href: "https://isgi.unistra.fr/events_sc.php", label: "ISGI SC list" },
  { href: "https://www.obsebre.es/en/variations/rapid", label: "Ebre rapid variations" },
  { href: "https://www.gfz.de/en/section/geomagnetism/data-products-services/kp-index/ssc", label: "GFZ SSC" },
] as const;

export const SSC_CITES: Citation[] = [
  { label: "Curto et al. 2007 EPS", doi: "10.1186/BF03352059" },
  { label: "Araki 1994 GM 81", doi: "10.1029/GM081p0183" },
  { label: "Araki et al. 2004 EPS", doi: "10.1186/BF03353411" },
];

export type SscKind = "ssc-like" | "si-like" | "step";

export type SscCandidate = {
  t: number;
  dB: number;
  windowSec: number;
  source: "ground-H" | "goes-Hp" | "drmagneto-raw";
  note: string;
  kind: SscKind;
  kpAfter: number | null;
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
      const last = candidates[candidates.length - 1];
      const next: SscCandidate = {
        t: t0,
        dB,
        windowSec: stepSec,
        source,
        note: `${dB >= 0 ? "+" : ""}${dB.toFixed(1)} ${unit} in ${stepSec}s`,
        kind: "step",
        kpAfter: null,
      };
      if (last && Math.abs(last.t - t0) < 10 * 60_000) {
        if (Math.abs(dB) > Math.abs(last.dB)) candidates[candidates.length - 1] = next;
      } else {
        candidates.push(next);
      }
    }
  }

  candidates.sort((a, b) => Math.abs(b.dB) - Math.abs(a.dB));
  const top = candidates.slice(0, 12);

  let plain: string;
  if (!top.length) {
    plain = `No SSC/SI-like steps ≥ ${minAbs} ${unit} over ${stepSec}s.`;
  } else {
    const best = top[0]!;
    plain = `${top.length} step(s); largest ${best.note} at ${isoMin(best.t)} (${source}). Not ISGI.`;
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

export function kpAfterStep(kp: KpPoint[], t: number, hours = 12): number | null {
  const end = t + hours * 3_600_000;
  let max: number | null = null;
  for (const p of kp) {
    const pt = Date.parse(p.time_tag);
    if (!Number.isFinite(pt)) continue;
    // 3 h Kp bin can start before the step
    if (pt >= t - 90 * 60_000 && pt <= end) {
      max = max == null ? p.Kp : Math.max(max, p.Kp);
    }
  }
  return max;
}

export function kindFromKp(kpAfter: number | null): SscKind {
  if (kpAfter == null) return "step";
  if (kpAfter >= 4) return "ssc-like";
  return "si-like";
}

/** Stamp Kp-after onto candidates. SSC-like = activity/storm followed; SI-like = isolated. */
export function classifySscAgainstKp(
  result: SscScanResult,
  kp: KpPoint[],
): SscScanResult {
  const candidates = result.candidates.map((c) => {
    const kpAfter = kpAfterStep(kp, c.t);
    const kind = kindFromKp(kpAfter);
    return { ...c, kpAfter, kind };
  });
  const sscN = candidates.filter((c) => c.kind === "ssc-like").length;
  const siN = candidates.filter((c) => c.kind === "si-like").length;
  let plain = result.plain;
  if (candidates.length) {
    const bits = [
      sscN ? `${sscN} SSC-like` : null,
      siN ? `${siN} SI-like` : null,
      `${candidates.length} step(s)`,
    ].filter(Boolean);
    const best = candidates[0]!;
    plain = `${bits.join(" · ")}; largest ${best.note} at ${isoMin(best.t)}. Not ISGI.`;
  }
  return { ...result, candidates, plain };
}

/** Ground + GOES steps within 8 min — same pressure pulse, two sensors. */
export function pairGroundGoes(
  ground: SscCandidate[],
  goes: SscCandidate[],
  windowMs = 8 * 60_000,
): { ground: SscCandidate; goes: SscCandidate; dtMin: number }[] {
  const pairs: { ground: SscCandidate; goes: SscCandidate; dtMin: number }[] = [];
  for (const g of ground) {
    let best: SscCandidate | null = null;
    let bestDt = Infinity;
    for (const s of goes) {
      const dt = Math.abs(s.t - g.t);
      if (dt < windowMs && dt < bestDt) {
        best = s;
        bestDt = dt;
      }
    }
    if (best) pairs.push({ ground: g, goes: best, dtMin: bestDt / 60_000 });
  }
  return pairs.sort((a, b) => a.dtMin - b.dtMin).slice(0, 6);
}

function isoMin(t: number): string {
  try {
    return new Date(t).toISOString().slice(11, 16) + "Z";
  } catch {
    return "—";
  }
}
