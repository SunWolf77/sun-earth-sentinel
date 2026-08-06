/**
 * Pin-first EQ cluster radius — 2D MarkerCluster.
 *
 * Reality of Web Mercator: at world zoom, even 8–12px spans hundreds of km.
 * Any “generous” radius recreates continent mega-bubbles (150 / 112 / 51).
 *
 * Policy (screen-space, continuous in float zoom):
 *  z <  WORLD_PIN_ZOOM     → rCore (≈ same-pixel / true stack only)
 *  WORLD_PIN_ZOOM → 4.5    → ease to light pin-overlap (aftershocks)
 *  4.5 → DISABLE           → ease to near-pin stack radius
 *  z ≥ EQ_DISABLE_CLUSTER_ZOOM → clustering off (every event is a pin)
 *
 * Geographic km is reported for debug only — pixel core is the real control
 * at world scale (km caps cannot express “show the trench”).
 */

/** Zoom at which every marker is an individual pin. */
export const EQ_DISABLE_CLUSTER_ZOOM = 6;

/**
 * Below this, hold co-location core so trench lines stay visible.
 * (Must stay below EQ_DISABLE_CLUSTER_ZOOM.)
 */
export const EQ_WORLD_PIN_ZOOM = 3.25;

/** Half of typical pin head (~26px icon). */
const PIN_HALF_PX = 13;

/** Hard ceiling — never approach old mega-bubble radii (40–44). */
const RADIUS_CEILING_PX = 22;

/** World / continent: only near-identical screen positions. */
const R_CORE_PX = 5;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Web Mercator meters-per-pixel. */
export function metersPerPixel(lat: number, zoom: number): number {
  const z = clamp(zoom, 0, 22);
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

/** Debug: km spanned by a pixel radius at lat/zoom. */
export function clusterRadiusKm(
  zoom: number,
  radiusPx: number,
  lat = 0,
): number {
  return (metersPerPixel(lat, zoom) * radiusPx) / 1000;
}

/**
 * MarkerCluster `maxClusterRadius` in CSS pixels.
 * `lat` reserved for future geo weighting; screen curve is authoritative.
 */
export function eqMarkerClusterRadiusPx(zoom: number, _lat = 0): number {
  const z = clamp(Number.isFinite(zoom) ? Number(zoom) : 0, 0, 18);

  // Light aftershock chip when pin heads would overlap
  const rStack = Math.round(PIN_HALF_PX * 0.9); // ~12
  // Last stop before pins fully uncluster
  const rNear = Math.min(RADIUS_CEILING_PX, Math.round(PIN_HALF_PX + 5)); // ~18

  let px: number;
  if (z < EQ_WORLD_PIN_ZOOM) {
    px = R_CORE_PX;
  } else if (z < 4.5) {
    const t = smoothstep((z - EQ_WORLD_PIN_ZOOM) / (4.5 - EQ_WORLD_PIN_ZOOM));
    px = R_CORE_PX + (rStack - R_CORE_PX) * t;
  } else if (z < EQ_DISABLE_CLUSTER_ZOOM) {
    const t = smoothstep((z - 4.5) / (EQ_DISABLE_CLUSTER_ZOOM - 4.5));
    px = rStack + (rNear - rStack) * t;
  } else {
    // Clustering disabled — value unused but keep stable
    px = rNear;
  }

  return Math.round(clamp(px, R_CORE_PX, RADIUS_CEILING_PX));
}

/**
 * Leaflet `maxClusterRadius` callback; optional map-center lat (forward compat).
 */
export function makeEqClusterRadiusFn(
  getLat?: () => number | null | undefined,
): (zoom: number) => number {
  return (zoom: number) => {
    let lat = 0;
    try {
      const v = getLat?.();
      if (typeof v === "number" && Number.isFinite(v)) lat = clamp(v, -80, 80);
    } catch {
      /* ignore */
    }
    return eqMarkerClusterRadiusPx(zoom, lat);
  };
}

/** One-line debug table for console / tests. */
export function debugClusterRadiusTable(
  zooms: number[] = [0, 1, 2, 3, 3.25, 3.5, 4, 4.5, 5, 5.5, 6, 8],
  lat = 0,
): Array<{ z: number; px: number; km: string; clustering: string }> {
  return zooms.map((z) => {
    const px = eqMarkerClusterRadiusPx(z, lat);
    return {
      z,
      px,
      km: clusterRadiusKm(z, px, lat).toFixed(1),
      clustering: z >= EQ_DISABLE_CLUSTER_ZOOM ? "off (pins)" : "on",
    };
  });
}
