/** Viewport / UA helpers for first-open defaults (mobile-first data). */

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(max-width: 767px)").matches) return true;
    if (window.matchMedia?.("(pointer: coarse)").matches && window.innerWidth < 900)
      return true;
  } catch {
    /* ignore */
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return /Android|iPhone|iPod|Mobile|webOS|BlackBerry/i.test(ua);
}

/** First visit with no saved mode → Standard (Lite merged into Standard). */
export function defaultPerformanceMode(): "standard" {
  return "standard";
}

export function historyCap(): number {
  return isMobileViewport() ? 24 : 48;
}

export function cacheSoftLimitBytes(): number {
  return isMobileViewport() ? 1_200_000 : 3_500_000;
}

/** Low-end / phone: prefer lean WebGL (fewer meshes, no heavy textures). */
export function isLowEndGpuDevice(): boolean {
  if (typeof window === "undefined") return true;
  if (isMobileViewport()) return true;
  try {
    const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 4) {
      return true;
    }
    if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) {
      // weak signal only combined with small viewport
      if (window.innerWidth < 1100) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export type GlobeQualityId = "mobile" | "desktop";

export type GlobeQuality = {
  id: GlobeQualityId;
  sphereSeg: number;
  atmoSeg: number;
  glow: boolean;
  stars: number;
  maxMarkers: number;
  /** Max concentric hex rings per quake */
  maxRings: number;
  magSprites: boolean;
  pixelRatioCap: number;
  antialias: boolean;
  anisotropy: number;
  /** Blue-marble CDN texture — heavy on mobile GPU memory */
  loadMarble: boolean;
  powerPreference: WebGLPowerPreference;
  pinSeg: number;
  stemMinDepthKm: number;
  /** Cap FPS to reduce thermal throttle / tab kill */
  maxFps: number;
  nodePins: boolean;
};

export function resolveGlobeQuality(force?: GlobeQualityId): GlobeQuality {
  const id: GlobeQualityId =
    force ?? (isLowEndGpuDevice() ? "mobile" : "desktop");
  if (id === "mobile") {
    return {
      id: "mobile",
      sphereSeg: 32,
      atmoSeg: 20,
      glow: false,
      stars: 48,
      maxMarkers: 90,
      maxRings: 1,
      magSprites: true,
      pixelRatioCap: 1.25,
      antialias: false,
      anisotropy: 1,
      // Real Earth texture (GPU downsamples); procedural is only a fail-safe
      loadMarble: true,
      powerPreference: "default",
      pinSeg: 6,
      stemMinDepthKm: 0,
      maxFps: 30,
      nodePins: true,
    };
  }
  return {
    id: "desktop",
    sphereSeg: 64,
    atmoSeg: 48,
    glow: true,
    stars: 400,
    maxMarkers: 420,
    maxRings: 3,
    magSprites: true,
    pixelRatioCap: 2,
    antialias: true,
    anisotropy: 8,
    loadMarble: true,
    powerPreference: "high-performance",
    pinSeg: 10,
    stemMinDepthKm: 35,
    maxFps: 60,
    nodePins: true,
  };
}

/** Quick WebGL availability check (does not keep the context). */
export function hasWebGl(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}
