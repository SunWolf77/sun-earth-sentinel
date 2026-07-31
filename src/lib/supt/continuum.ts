/**
 * Cross-domain SUPT continuum — one vocabulary for seismic + solar.
 * Reliability: pure functions over already-fetched store data (no extra network).
 */

import type { ResonanceScore } from "@/lib/supt/probe";
import { bandPlainLabel, resonanceVerdict } from "@/lib/supt/probe";
import type { SolarAssessment } from "@/lib/solar/suptInterpreter";

export type ContinuumDomain = {
  id: "seismic" | "solar";
  label: string;
  status: string;
  detail: string;
  tone: "none" | "chance" | "ordered" | "mixed" | "sparse" | "watch" | "storm";
  metric: string;
};

export type ContinuumSnapshot = {
  generatedAt: number;
  domains: ContinuumDomain[];
  headline: string;
  plain: string;
  attentionMax: number;
};

export function buildContinuum(opts: {
  seismic: ResonanceScore | null;
  solar: SolarAssessment | null;
}): ContinuumSnapshot {
  const { seismic, solar } = opts;
  const v = resonanceVerdict(seismic);
  const seismicTone: ContinuumDomain["tone"] =
    v.tone === "null" ? "none" : v.tone;
  const seismicDomain: ContinuumDomain = {
    id: "seismic",
    label: "Earth catalog",
    status: v.title,
    detail: seismic
      ? `${bandPlainLabel(seismic.band)} · n=${seismic.n}${seismic.separated ? " · sep" : " · null"}`
      : "Waiting for quake gaps",
    tone: seismicTone,
    metric:
      seismic?.d_ij != null
        ? `d=${seismic.d_ij.toFixed(3)}`
        : "d=—",
  };

  const solarAtt = solar?.attention ?? 0;
  const solarTone: ContinuumDomain["tone"] =
    solarAtt >= 70
      ? "storm"
      : solarAtt >= 40
        ? "watch"
        : solar?.channels?.some((c) => c.score.separated)
          ? "ordered"
          : solar
            ? "chance"
            : "none";

  const solarDomain: ContinuumDomain = {
    id: "solar",
    label: "Solar storm stack",
    status: solar?.impact.title ?? "Solar loading…",
    detail: solar
      ? `Attention ${solar.attention}/100 · ${
          solar.channels.filter((c) => c.score.separated).length
        }/${solar.channels.length} SUPT channels non-null`
      : "Waiting for space-weather feeds",
    tone: solarTone,
    metric: solar ? `${solar.attention}` : "—",
  };

  const domains = [solarDomain, seismicDomain];

  // Headline prioritizes storm/watch, then ordered structure
  let headline = "Continuum quiet";
  if (solarTone === "storm" || seismic?.separated) {
    headline =
      solarTone === "storm"
        ? `Solar elevated · ${seismic?.separated ? "Earth timing non-null" : "Earth timing null"}`
        : `Earth timing non-null · Solar ${solar?.impact.level ?? "—"}`;
  } else if (solarTone === "watch") {
    headline = `Solar watch · Earth ${seismic?.separated ? "non-null" : "null"}`;
  } else if (seismic?.separated) {
    headline = "Earth catalog structure · solar calm";
  } else {
    headline = "Both domains near null / quiet";
  }

  const plain =
    "Same frozen SUPT probe on ordered gaps (quakes · flares · CMEs · X-ray peaks). " +
    "Null is valid. Amplitude scales (R/S/G, mag) are separate from timing structure.";

  return {
    generatedAt: Date.now(),
    domains,
    headline,
    plain,
    attentionMax: Math.max(solarAtt, seismic?.separated ? 55 : seismic?.d_ij != null ? 25 : 0),
  };
}

export const TONE_CLASS: Record<ContinuumDomain["tone"], string> = {
  none: "border-border bg-panel text-dim",
  chance: "border-primary/25 bg-primary/5 text-primary",
  ordered: "border-gold/35 bg-gold/10 text-gold",
  mixed: "border-warn/30 bg-warn/10 text-warn",
  sparse: "border-border bg-elevated/50 text-muted",
  watch: "border-warn/40 bg-warn/10 text-warn",
  storm: "border-danger/40 bg-danger/10 text-danger",
};
