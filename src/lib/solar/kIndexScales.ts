/**
 * Geomagnetic K / Kp ladder and NOAA G-scale mapping — literacy for SES Solar.
 */

export type KpBand = {
  kp: number;
  label: string;
  plain: string;
  gScale: number | null;
  aurora: string;
  tech: string;
};

/** Integer Kp ladder (0–9). Planetary Kp can be x.3 / x.7; band uses floor for G mapping. */
export const KP_BANDS: KpBand[] = [
  {
    kp: 0,
    label: "Quiet",
    plain: "Very quiet geomagnetic field.",
    gScale: null,
    aurora: "Polar cap only",
    tech: "No storm-scale impacts expected.",
  },
  {
    kp: 1,
    label: "Quiet",
    plain: "Quiet conditions.",
    gScale: null,
    aurora: "High latitudes",
    tech: "Background.",
  },
  {
    kp: 2,
    label: "Quiet",
    plain: "Still quiet / unsettled edge.",
    gScale: null,
    aurora: "High latitudes",
    tech: "Background.",
  },
  {
    kp: 3,
    label: "Unsettled",
    plain: "Unsettled — elevated activity without storm scale.",
    gScale: null,
    aurora: "High latitudes, brighter arcs",
    tech: "Minor HF variability at high latitudes possible.",
  },
  {
    kp: 4,
    label: "Active",
    plain: "Active field — below G1 storm threshold.",
    gScale: null,
    aurora: "High latitudes, occasional lower edge push",
    tech: "Weak satellite / HF effects possible at high latitude.",
  },
  {
    kp: 5,
    label: "G1 Minor storm",
    plain: "Minor geomagnetic storm.",
    gScale: 1,
    aurora: "May reach northern US / equivalent south",
    tech: "Weak power-grid fluctuations; minor satellite ops impacts.",
  },
  {
    kp: 6,
    label: "G2 Moderate storm",
    plain: "Moderate storm — procedures for grid/sat often elevated.",
    gScale: 2,
    aurora: "Mid-latitudes possible under dark skies",
    tech: "HF loss at higher lats; satellite orientation/drag issues possible.",
  },
  {
    kp: 7,
    label: "G3 Strong storm",
    plain: "Strong storm.",
    gScale: 3,
    aurora: "Mid-latitudes more likely",
    tech: "Intermittent HF; surface charging; voltage control issues on grids.",
  },
  {
    kp: 8,
    label: "G4 Severe storm",
    plain: "Severe storm — rare multi-times per cycle.",
    gScale: 4,
    aurora: "Well into mid-latitudes",
    tech: "Possible grid voltage problems; satellite tracking issues; HF degraded.",
  },
  {
    kp: 9,
    label: "G5 Extreme storm",
    plain: "Extreme — Halloween/May-2024 class peaks.",
    gScale: 5,
    aurora: "Can reach low mid-latitudes",
    tech: "Widespread voltage control / transformer stress risk; sat & HF major impacts.",
  },
];

export function gFromKp(kp: number | null | undefined): number | null {
  if (kp == null || !Number.isFinite(kp)) return null;
  if (kp >= 9) return 5;
  if (kp >= 8) return 4;
  if (kp >= 7) return 3;
  if (kp >= 6) return 2;
  if (kp >= 5) return 1;
  return null;
}

export function bandForKp(kp: number | null | undefined): KpBand {
  if (kp == null || !Number.isFinite(kp)) return KP_BANDS[0]!;
  const i = Math.max(0, Math.min(9, Math.round(kp)));
  return KP_BANDS[i]!;
}

export const K_INDEX_NOTES = [
  "K is a 0–9 quasi-log local 3-hour index; Kp is the planetary average of mid-latitude stations.",
  "NOAA G-scale maps from Kp: G1=Kp5 … G5=Kp9 (approximately).",
  "Kp is not linear in energy — Kp 9 is far more than 9× Kp 1.",
  "SES shows live Kp next to this ladder so “G2 now” has memory without constant red banners.",
] as const;
