/**
 * Custom map camera flight with cubic easing (matches 3D globe aim).
 * Leaflet flyTo only exposes easeLinearity — this uses real easeOutCubic.
 */

import type { Map as LeafletMap, LatLngExpression } from "leaflet";
import L from "leaflet";

/** Ease-out cubic — same curve as Globe3D aim / spiderfy. */
export function easeOutCubic(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - (1 - x) ** 3;
}

export function easeInOutCubic(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export type FlyToEasedOptions = {
  /** Seconds — default 0.85 (prior Leaflet preset) */
  duration?: number;
  /** Easing fn in [0,1] → [0,1] — default easeOutCubic */
  ease?: (t: number) => number;
  /** Abort signal / external cancel */
  signal?: { cancelled?: boolean };
};

type FlightHandle = {
  cancel: () => void;
};

let activeFlight: FlightHandle | null = null;

/** Cancel any in-progress custom flight (e.g. new target). */
export function cancelFlyToEased(): void {
  activeFlight?.cancel();
  activeFlight = null;
}

function mapReady(map: LeafletMap): boolean {
  try {
    const el = map.getContainer?.();
    if (!el || el.offsetWidth < 2 || el.offsetHeight < 2) return false;
    if (!map.getPane("mapPane")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Animate map center + zoom with cubic easing.
 * Prefer this over map.flyTo when a true easeOutCubic curve is required.
 */
export function flyToEased(
  map: LeafletMap,
  latlng: LatLngExpression,
  zoom: number,
  opts?: FlyToEasedOptions,
): FlightHandle {
  cancelFlyToEased();

  const durationMs = Math.max(80, (opts?.duration ?? 0.85) * 1000);
  const ease = opts?.ease ?? easeOutCubic;
  const target = L.latLng(latlng);
  const z1 = zoom;

  const handle: FlightHandle = {
    cancel: () => {
      /* set below */
    },
  };

  if (!mapReady(map)) {
    try {
      map.setView(target, z1, { animate: false });
    } catch {
      /* ignore */
    }
    return handle;
  }

  const start = map.getCenter();
  const z0 = map.getZoom();
  // Shortest longitude delta (dateline-safe)
  let dLon = target.lng - start.lng;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const dLat = target.lat - start.lat;
  const dZ = z1 - z0;

  // Near-identity → snap
  if (Math.abs(dLat) < 1e-7 && Math.abs(dLon) < 1e-7 && Math.abs(dZ) < 1e-4) {
    try {
      map.setView(target, z1, { animate: false });
    } catch {
      /* ignore */
    }
    return handle;
  }

  let raf = 0;
  let cancelled = false;
  const t0 = performance.now();

  handle.cancel = () => {
    cancelled = true;
    if (raf) cancelAnimationFrame(raf);
    if (activeFlight === handle) activeFlight = null;
  };
  activeFlight = handle;

  const step = (now: number) => {
    if (cancelled || (opts?.signal?.cancelled)) {
      handle.cancel();
      return;
    }
    if (!mapReady(map)) {
      handle.cancel();
      return;
    }

    const u = Math.min(1, (now - t0) / durationMs);
    const e = ease(u);
    const lat = start.lat + dLat * e;
    const lng = start.lng + dLon * e;
    const z = z0 + dZ * e;

    try {
      map.setView([lat, lng], z, { animate: false, noMoveStart: u > 0 && u < 1 });
    } catch {
      handle.cancel();
      return;
    }

    if (u < 1) {
      raf = requestAnimationFrame(step);
    } else {
      try {
        map.setView(target, z1, { animate: false });
      } catch {
        /* ignore */
      }
      if (activeFlight === handle) activeFlight = null;
    }
  };

  raf = requestAnimationFrame(step);
  return handle;
}
