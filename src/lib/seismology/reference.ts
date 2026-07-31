/**
 * Educational seismology reference for About + legends.
 * Not used for forecasting or early warning products.
 */

/** Half-life (h) for heat time-decay by USGS window — mirrors halfLifeForWindow. */
export const DECAY_HALF_LIFE_H: Record<"hour" | "day" | "week" | "month", number> = {
  hour: 0.75,
  day: 6,
  week: 36,
  month: 120,
};

/** Weight remaining at age for a given half-life (exponential). */
export function decayAtAge(ageHours: number, halfLifeH: number): number {
  return Math.pow(0.5, ageHours / Math.max(0.5, halfLifeH));
}

/**
 * Legend rows for the active window: age → remaining weight %.
 * Shows concrete values so "Decay" is not a black-box gradient.
 */
export function timeDecayLegendRows(
  window: "hour" | "day" | "week" | "month",
): { ageLabel: string; ageHours: number; weight: number; pct: string }[] {
  const hl = DECAY_HALF_LIFE_H[window];
  const ages =
    window === "hour"
      ? [
          { ageLabel: "now", ageHours: 0 },
          { ageLabel: "15 m", ageHours: 0.25 },
          { ageLabel: "45 m", ageHours: 0.75 },
          { ageLabel: "1.5 h", ageHours: 1.5 },
          { ageLabel: "3 h", ageHours: 3 },
        ]
      : window === "day"
        ? [
            { ageLabel: "now", ageHours: 0 },
            { ageLabel: "3 h", ageHours: 3 },
            { ageLabel: "6 h", ageHours: 6 },
            { ageLabel: "12 h", ageHours: 12 },
            { ageLabel: "24 h", ageHours: 24 },
          ]
        : window === "week"
          ? [
              { ageLabel: "now", ageHours: 0 },
              { ageLabel: "18 h", ageHours: 18 },
              { ageLabel: "1.5 d", ageHours: 36 },
              { ageLabel: "3 d", ageHours: 72 },
              { ageLabel: "7 d", ageHours: 168 },
            ]
          : [
              { ageLabel: "now", ageHours: 0 },
              { ageLabel: "5 d", ageHours: 120 },
              { ageLabel: "10 d", ageHours: 240 },
              { ageLabel: "20 d", ageHours: 480 },
              { ageLabel: "30 d", ageHours: 720 },
            ];

  return ages.map((a) => {
    const w = decayAtAge(a.ageHours, hl);
    return {
      ...a,
      weight: w,
      pct: `${Math.round(w * 100)}%`,
    };
  });
}

export function halfLifeLabel(window: "hour" | "day" | "week" | "month"): string {
  const h = DECAY_HALF_LIFE_H[window];
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h} h`;
  return `${(h / 24).toFixed(h % 24 === 0 ? 0 : 1)} d`;
}

/** Intensity color for legend swatch from remaining weight 0–1. */
export function decaySwatch(weight: number): string {
  const t = Math.max(0, Math.min(1, weight));
  // cool cyan → amber → hot rose (matches heat fragment palette)
  if (t > 0.7) return "#f43f5e";
  if (t > 0.45) return "#fb923c";
  if (t > 0.25) return "#fbbf24";
  if (t > 0.12) return "#67e8f9";
  return "#22d3ee66";
}

/**
 * Seismic attenuation (GMPE / GMM) — educational summary only.
 * Full intensity maps would need site Vs30, style, path — not in Sentinel.
 */
export const ATTENUATION_NOTES = {
  title: "Seismic attenuation models (GMPE / GMM)",
  summary:
    "Ground-motion prediction equations estimate how shaking intensity decays with distance, magnitude, depth, and site class. They power shake maps and design spectra — not our heat layer.",
  models: [
    {
      name: "Boore–Atkinson / NGA-West2 family",
      region: "Active crust (e.g. WUS)",
      notes: "Distance, mag, depth, Vs30; standard for crustal events.",
    },
    {
      name: "Abrahamson–Silva / ASK14 et al.",
      region: "NGA-West2",
      notes: "Next-generation attenuation; used in USGS hybrid products.",
    },
    {
      name: "Zhao / Si–Midorikawa style",
      region: "Subduction (Japan / similar)",
      notes: "Interface vs intraslab paths; relevant for Tonga–Kermadec context.",
    },
    {
      name: "Atkinson–Boore subduction",
      region: "Cascadia / global subduction",
      notes: "Separate terms for interface and in-slab.",
    },
  ],
  sentinelStance:
    "Sentinel does not compute PGA/PGV fields. Heat is magnitude × time-decay density for swarm visualization only. Focused monitors stay event-list dense; official shaking → USGS ShakeMap.",
};

/**
 * Earthquake early warning — investigate only; Sentinel is not an EEW client.
 */
export const EEW_NOTES = {
  title: "Earthquake early warning (EEW) systems",
  summary:
    "EEW uses the P-wave / S-wave speed gap: detect near the source, estimate magnitude, alert areas still waiting for damaging S-waves and surface waves. Seconds to tens of seconds of notice when geometry allows.",
  systems: [
    {
      name: "ShakeAlert® (USGS)",
      region: "US West Coast",
      notes: "Public / institutional alerts; not a browser GeoJSON feed for third-party apps.",
    },
    {
      name: "JMA EEW (Japan)",
      region: "Japan",
      notes: "Mature national system; cell broadcast + apps.",
    },
    {
      name: "SASMEX / Mexican EEW",
      region: "Mexico",
      notes: "Coastal sensors → inland cities (e.g. Mexico City).",
    },
    {
      name: "OpenEEW / community",
      region: "Research / pilot",
      notes: "Low-cost sensors; not a substitute for official EEW.",
    },
  ],
  limits: [
    "Blind zone near epicenter — too close for useful lead time",
    "Mag estimates update as more stations report (early under/over-shoot)",
    "Offshore / sparse networks reduce reliability",
    "Browser apps cannot replace certified alert paths (cell broadcast, IPAWS, etc.)",
  ],
  sentinelStance:
    "WolfWatch Sentinel is a monitoring observatory on public USGS + SWPC feeds. It is not connected to ShakeAlert or any EEW pipeline and must not be used for life-safety alerting.",
};
