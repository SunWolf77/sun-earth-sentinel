/**
 * Performance modes — density / refresh profiles.
 * Lite was merged into Standard (2026-08): one balanced profile + Full dense.
 * Saved "lite" preferences normalize to "standard".
 */

export type PerformanceMode = "standard" | "full";

/** Legacy id still may appear in localStorage / share URLs */
export type LegacyPerformanceMode = PerformanceMode | "lite";

export type ModeConfig = {
  key: PerformanceMode;
  label: string;
  minMag: number;
  maxMarkers: number;
  /** Base poll interval for SW + full refresh */
  refreshMs: number;
  /** Faster poll for USGS hour pulse (real-time tip) */
  realtimeMs: number;
  loadChart: boolean;
  loadVolc: boolean;
  loadSolarWind: boolean;
  loadImage: boolean;
  load3d: boolean;
  shuffleN: number;
  description: string;
};

export const MODES: Record<PerformanceMode, ModeConfig> = {
  standard: {
    key: "standard",
    label: "Standard",
    minMag: 4.5,
    maxMarkers: 140,
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
  },
  full: {
    key: "full",
    label: "Full",
    minMag: 3.5,
    maxMarkers: 320,
    refreshMs: 60_000,
    realtimeMs: 30_000,
    loadChart: true,
    loadVolc: true,
    loadSolarWind: true,
    loadImage: true,
    load3d: true,
    shuffleN: 120,
    description: "Dense catalog (M3.5+), faster live pulse, fuller analytics.",
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
