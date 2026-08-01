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
    minMag: 4.5,
    maxMarkers: 60,
    refreshMs: 180_000,
    realtimeMs: 90_000,
    loadChart: false,
    loadVolc: false,
    loadSolarWind: true,
    loadImage: false,
    load3d: true,
    shuffleN: 40,
    description: "Mobile / low-data. Sparse quakes · solar wind on.",
  },
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
    description: "Minimal quake layer at start (M4.5+) · JMA Japan densifies.",
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
    description: "Higher density, analytics, 3D globe, faster live pulse.",
  },
};
