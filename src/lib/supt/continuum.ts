/**
 * Cross-domain timing continuum — plain labels first; SUPT method is credit, not headline.
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
    label: "Earthquakes",
    status: v.title,
    detail: seismic
      ? seismic.n < 4
        ? "Need more events to score spacing"
        : seismic.separated
          ? `${bandPlainLabel(seismic.band)} · unusual vs random`
          : `${bandPlainLabel(seismic.band)} · ordinary spacing`
      : "Waiting for quake catalog",
    tone: seismicTone,
    metric:
      seismic?.d_ij != null
        ? seismic.separated
          ? "Unusual"
          : "Typical"
        : "—",
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

  const sepCh = solar?.channels?.filter((c) => c.score.separated).length ?? 0;
  const chN = solar?.channels?.length ?? 0;

  const solarDomain: ContinuumDomain = {
    id: "solar",
    label: "Space weather",
    status: solar?.impact.title ?? "Loading solar…",
    detail: solar
      ? `Attention ${solar.attention}/100 · timing channels ${sepCh}/${chN} unusual`
      : "Waiting for space-weather feeds",
    tone: solarTone,
    metric: solar ? `${solar.attention}` : "—",
  };

  const domains = [solarDomain, seismicDomain];

  let headline = "Timing looks quiet on both sides";
  if (solarTone === "storm") {
    headline = seismic?.separated
      ? "Solar elevated · earthquake spacing also unusual"
      : "Solar elevated · earthquake spacing ordinary";
  } else if (solarTone === "watch") {
    headline = seismic?.separated
      ? "Solar on watch · earthquake spacing unusual"
      : "Solar on watch · earthquake spacing ordinary";
  } else if (seismic?.separated) {
    headline = "Earthquake spacing unusual · solar relatively calm";
  } else if (seismic && seismic.n >= 4) {
    headline = "Both sides: ordinary timing / quiet attention";
  } else {
    headline = "Building a timing read from live feeds…";
  }

  const plain =
    "We look at the clock between events (quakes · flares · CMEs · X-ray peaks) — not how big they are. " +
    "Quiet or ordinary spacing is a real status. Size/intensity scales (M, R/S/G) stay separate.";

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
