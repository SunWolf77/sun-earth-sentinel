/**
 * Performance modes — density / refresh / probe profiles.
 *
 * Two axes people confuse (keep them separate in UI):
 *  1. **Performance mode** (Standard | Full) — catalog floor, pin cap, poll rate, SUPT shuffles
 *  2. **Map view** (2D | 3D) — Leaflet vs WebGL globe (orthogonal; not a "mode" in MODES)
 *
 * Lite was merged into Standard (2026-08). Saved "lite" → standard.
 *
 * Honesty: loadChart / loadVolc / loadSolarWind / loadImage are currently **true for both**.
 * They remain in the config so a future lean path can flip them without API churn.
 * load3d does **not** gate the globe — mapView does. Do not claim otherwise in UI.
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
    realtimeMs: 45_000,
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
    realtimeMs: 30_000,
    loadChart: true,
    loadVolc: true,
    loadSolarWind: true,
    loadImage: true,
    load3d: true,
    shuffleN: 120,
    description: "Dense catalog (M3.5+), faster live pulse, denser SUPT null tests.",
    risk: "dense",
    deviceNote:
      "More pins, faster polls, heavier probe nulls. Fine on desktop; phones may lag or heat — especially with 3D.",
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
export type ModeDeltaRow = {
  aspect: string;
  standard: string;
  full: string;
  notes: string;
};

export function modeComparisonRows(): ModeDeltaRow[] {
  const s = MODES.standard;
  const f = MODES.full;
  return [
    {
      aspect: "Magnitude floor",
      standard: `M${s.minMag}+`,
      full: `M${f.minMag}+`,
      notes: "Filter default when you haven’t hand-set minMag",
    },
    {
      aspect: "Map / catalog pin cap",
      standard: `${s.maxMarkers}`,
      full: `${f.maxMarkers}`,
      notes: "After field identity; priority nodes keep microseismicity share",
    },
    {
      aspect: "Full refresh",
      standard: `${s.refreshMs / 1000}s`,
      full: `${f.refreshMs / 1000}s`,
      notes: "USGS windows + multi-agency merge cycle",
    },
    {
      aspect: "Live pulse",
      standard: `${s.realtimeMs / 1000}s`,
      full: `${f.realtimeMs / 1000}s`,
      notes: "Hour feed tip; not a second catalog",
    },
    {
      aspect: "SUPT shuffle nulls",
      standard: `${s.shuffleN}`,
      full: `${f.shuffleN}`,
      notes: "More shuffles = heavier main/worker probe work",
    },
    {
      aspect: "Solar / volc / charts",
      standard: "on",
      full: "on",
      notes: "Same today — mode is density/timing, not feature stripping",
    },
    {
      aspect: "2D vs 3D map",
      standard: "orthogonal",
      full: "orthogonal",
      notes: "Map view is separate. 3D heat risk is WebGL, not Full alone",
    },
  ];
}

export type RuntimeLoadProfile = {
  mode: PerformanceMode;
  mapView: "2d" | "3d";
  mobile: boolean;
  /** 0–100 rough device pressure score for honesty UI */
  pressure: number;
  pressureLabel: "low" | "moderate" | "high";
  bullets: string[];
};

/** Combine performance mode + map view + device into one honesty profile. */
export function runtimeLoadProfile(opts: {
  mode: PerformanceMode;
  mapView: "2d" | "3d";
  mobile: boolean;
}): RuntimeLoadProfile {
  const cfg = MODES[opts.mode];
  let pressure = opts.mode === "full" ? 45 : 18;
  if (opts.mapView === "3d") pressure += opts.mobile ? 40 : 18;
  if (opts.mobile && opts.mode === "full") pressure += 15;
  pressure = Math.min(100, pressure);

  const pressureLabel: RuntimeLoadProfile["pressureLabel"] =
    pressure >= 70 ? "high" : pressure >= 40 ? "moderate" : "low";

  const bullets: string[] = [
    `Catalog floor M${cfg.minMag}+ · pin cap ${cfg.maxMarkers}`,
    `Refresh ${cfg.refreshMs / 1000}s · pulse ${cfg.realtimeMs / 1000}s · SUPT nulls ${cfg.shuffleN}`,
  ];
  if (opts.mapView === "3d") {
    bullets.push(
      opts.mobile
        ? "3D globe on phone — WebGL can thermal-throttle in minutes"
        : "3D globe — desktop usually fine; close other GPU tabs if laggy",
    );
  } else {
    bullets.push("2D map — lightest render path");
  }
  bullets.push(cfg.deviceNote);

  return {
    mode: opts.mode,
    mapView: opts.mapView,
    mobile: opts.mobile,
    pressure,
    pressureLabel,
    bullets,
  };
}
