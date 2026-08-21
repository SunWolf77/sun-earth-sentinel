/**
 * Performance modes — Standard (default) and Full.
 *
 * Honesty: both modes currently load the full feed stack (charts, volcanoes,
 * solar wind, imagery). Differences are minMag, marker caps, poll cadence,
 * and SUPT null-shuffle count. Globe quality is separate (device.ts).
 *
 * USGS GeoJSON summary feeds cache max-age=60s — sub-60s polls buy nothing.
 */

export type PerformanceMode = "standard" | "full";

/** Legacy id still may appear in localStorage / share URLs */
export type LegacyPerformanceMode = PerformanceMode | "lite";

export type ModeRisk = "balanced" | "dense";

export type ModeConfig = {
  key: PerformanceMode;
  label: string;
  minMag: number;
  maxMarkers: number;
  /** Base poll interval for full catalog refresh */
  refreshMs: number;
  /** Faster poll for USGS hour pulse (real-time tip) */
  realtimeMs: number;
  /** Reserved feed gates — both modes currently load all (see file header) */
  loadChart: boolean;
  loadVolc: boolean;
  loadSolarWind: boolean;
  loadImage: boolean;
  /**
   * Reserved. Does NOT control mapView. Globe quality is in device.ts
   * (resolveGlobeQuality). Kept for future lean builds.
   */
  load3d: boolean;
  /** SUPT resonance shuffle null count */
  shuffleN: number;
  description: string;
  /** Short risk label for honesty chip / deep dive */
  risk: ModeRisk;
  /** One-line device guidance */
  deviceNote: string;
};

export const MODES: Record<PerformanceMode, ModeConfig> = {
  standard: {
    key: "standard",
    label: "Standard",
    minMag: 4.5,
    maxMarkers: 600,
    refreshMs: 90_000,
    realtimeMs: 60_000,  // match USGS GeoJSON max-age=60
    loadChart: true,
    loadVolc: true,
    loadSolarWind: true,
    loadImage: true,
    load3d: true,
    shuffleN: 80,
    description:
      "Balanced — M4.5+ catalog, charts, volcanoes, solar stack. Default for all devices.",
    risk: "balanced",
    deviceNote: "Default for phones and desktops. Stay here unless you need M3.5–4.4 traffic.",
  },
  full: {
    key: "full",
    label: "Full",
    minMag: 3.5,
    maxMarkers: 1400,
    refreshMs: 60_000,
    realtimeMs: 60_000,  // match USGS GeoJSON max-age=60 — sub-60s polls buy nothing
    loadChart: true,
    loadVolc: true,
    loadSolarWind: true,
    loadImage: true,
    load3d: true,
    shuffleN: 120,
    description: "Dense catalog (M3.5+), denser SUPT null tests. Pulse still ~60s (agency cache).",
    risk: "dense",
    deviceNote:
      "More pins, heavier probe nulls. Fine on desktop; phones may lag or heat — especially with 3D.",
  },
};

/** Map legacy "lite" → standard; ignore unknown. */
export function normalizePerformanceMode(
  raw: string | null | undefined,
): PerformanceMode | null {
  if (raw === "full") return "full";
  if (raw === "standard" || raw === "lite") return "standard";
  return null;
}

export const MODE_ORDER: PerformanceMode[] = ["standard", "full"];

/** What actually changes when you flip mode (for deep-dive UI). */
export function modeDiffSummary(): {
  minMag: { standard: string; full: string };
  markers: { standard: string; full: string };
  refresh: { standard: string; full: string };
  pulse: { standard: string; full: string };
  shuffle: { standard: string; full: string };
  feeds: string;
  notes: string;
} {
  const s = MODES.standard;
  const f = MODES.full;
  return {
    minMag: { standard: `M${s.minMag}+`, full: `M${f.minMag}+` },
    markers: { standard: String(s.maxMarkers), full: String(f.maxMarkers) },
    refresh: {
      standard: `${s.refreshMs / 1000}s`,
      full: `${f.refreshMs / 1000}s`,
    },
    pulse: {
      standard: `${s.realtimeMs / 1000}s`,
      full: `${f.realtimeMs / 1000}s`,
    },
    shuffle: { standard: String(s.shuffleN), full: String(f.shuffleN) },
    feeds: "Both modes load charts, volcanoes, solar wind, imagery",
    notes: "Hour feed tip; not a second catalog",
  };
}

export function modeLine(mode: PerformanceMode): string {
  const cfg = MODES[mode];
  return (
    `Refresh ${cfg.refreshMs / 1000}s · pulse ${cfg.realtimeMs / 1000}s · SUPT nulls ${cfg.shuffleN}`
  );
}
