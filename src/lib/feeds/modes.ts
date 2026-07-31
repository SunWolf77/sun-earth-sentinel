export type PerformanceMode = "lite" | "standard" | "full";

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
  lite: {
    key: "lite",
    label: "Lite",
    minMag: 4.0,
    maxMarkers: 80,
    refreshMs: 180_000,
    realtimeMs: 90_000,
    loadChart: false,
    loadVolc: false,
    loadSolarWind: true,
    loadImage: false,
    load3d: false,
    shuffleN: 40,
    description: "Mobile / low-data. Solar wind + scales on; imagery off.",
  },
  standard: {
    key: "standard",
    label: "Standard",
    minMag: 3.5,
    maxMarkers: 280,

    refreshMs: 90_000,
    realtimeMs: 45_000,
    loadChart: true,
    loadVolc: true,
    loadSolarWind: true,
    loadImage: true,
    load3d: false,
    shuffleN: 80,
    description: "Balanced everyday monitoring + real-time hour pulse.",
  },
  full: {
    key: "full",
    label: "Full",
    minMag: 2.5,
    maxMarkers: 500,
    refreshMs: 60_000,
    realtimeMs: 30_000,
    loadChart: true,
    loadVolc: true,
    loadSolarWind: true,
    loadImage: true,
    load3d: true,
    shuffleN: 120,
    description: "Higher density, analytics, 3D globe, faster live pulse.",
  },
};
