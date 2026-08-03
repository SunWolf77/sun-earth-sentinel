/**
 * Custom map camera flight with cubic easing (matches 3D globe aim).
 * Leaflet flyTo only exposes easeLinearity — this uses real easeOutCubic.
 * Invalid lat/lon/zoom/duration are rejected safely (no throw to callers).
 */

import type { Map as LeafletMap, LatLngExpression } from "leaflet";
import L from "leaflet";

/** Ease-out cubic — same curve as Globe3D aim / spiderfy. */
export function easeOutCubic(t: number): number {
  if (!Number.isFinite(t)) return 0;
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - (1 - x) ** 3;
}

export function easeInOutCubic(t: number): number {
  if (!Number.isFinite(t)) return 0;
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

export type FlightHandle = {
  cancel: () => void;
  /** false if inputs were invalid / map not ready for flight */
  ok: boolean;
  reason?: string;
};

let activeFlight: FlightHandle | null = null;

const noopHandle = (reason: string): FlightHandle => ({
  cancel: () => undefined,
  ok: false,
  reason,
});

/** Cancel any in-progress custom flight (e.g. new target). */
export function cancelFlyToEased(): void {
  try {
    activeFlight?.cancel();
  } catch {
    /* ignore */
  }
  activeFlight = null;
}

function mapReady(map: LeafletMap | null | undefined): boolean {
  if (!map || typeof map.getContainer !== "function") return false;
  try {
    const el = map.getContainer();
    if (!el || el.offsetWidth < 2 || el.offsetHeight < 2) return false;
    if (!map.getPane("mapPane")) return false;
    return true;
  } catch {
    return false;
  }
}

/** Finite lat ∈ [-90, 90], lon ∈ [-180, 180] (lon may be wrapped later). */
export function parseFlyLatLng(
  latlng: LatLngExpression | null | undefined,
): { lat: number; lng: number } | null {
  if (latlng == null) return null;
  try {
    let lat: number;
    let lng: number;
    if (Array.isArray(latlng)) {
      if (latlng.length < 2) return null;
      lat = Number(latlng[0]);
      lng = Number(latlng[1]);
    } else if (typeof latlng === "object" && latlng !== null) {
      const o = latlng as { lat?: unknown; lng?: unknown; lon?: unknown };
      lat = Number(o.lat);
      lng = Number(o.lng ?? o.lon);
    } else {
      return null;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90) return null;
    // Allow outside ±180 — we normalize
    if (Math.abs(lng) > 360 * 4) return null; // absurd
    // Normalize lon to [-180, 180]
    let lon = ((((lng + 180) % 360) + 360) % 360) - 180;
    if (Object.is(lon, -0)) lon = 0;
    return { lat, lng: lon };
  } catch {
    return null;
  }
}

/** Finite zoom clamped to map min/max when available. */
export function parseFlyZoom(
  zoom: unknown,
  map?: LeafletMap | null,
  fallback = 6,
): number | null {
  const z = typeof zoom === "number" ? zoom : Number(zoom);
  if (!Number.isFinite(z)) return null;
  let minZ = 0;
  let maxZ = 22;
  try {
    if (map) {
      const mn = map.getMinZoom?.();
      const mx = map.getMaxZoom?.();
      if (Number.isFinite(mn)) minZ = mn as number;
      if (Number.isFinite(mx)) maxZ = mx as number;
    }
  } catch {
    /* use defaults */
  }
  if (maxZ < minZ) maxZ = minZ;
  const clamped = Math.min(maxZ, Math.max(minZ, z));
  return Number.isFinite(clamped) ? clamped : fallback;
}

function parseDurationSec(duration: unknown, fallback = 0.85): number {
  if (duration == null) return fallback;
  const d = typeof duration === "number" ? duration : Number(duration);
  if (!Number.isFinite(d) || d <= 0) return fallback;
  // Cap absurd values (ms passed by mistake, etc.)
  if (d > 30) return fallback;
  return d;
}

function safeEase(fn: ((t: number) => number) | undefined): (t: number) => number {
  if (typeof fn !== "function") return easeOutCubic;
  return (t: number) => {
    try {
      const e = fn(t);
      if (!Number.isFinite(e)) return easeOutCubic(t);
      if (e < 0) return 0;
      if (e > 1) return 1;
      return e;
    } catch {
      return easeOutCubic(t);
    }
  };
}

/**
 * Animate map center + zoom with cubic easing.
 * Prefer this over map.flyTo when a true easeOutCubic curve is required.
 * Never throws for bad inputs — returns { ok: false, reason }.
 */
export function flyToEased(
  map: LeafletMap | null | undefined,
  latlng: LatLngExpression | null | undefined,
  zoom: number | null | undefined,
  opts?: FlyToEasedOptions,
): FlightHandle {
  cancelFlyToEased();

  if (!map) return noopHandle("map missing");

  const parsed = parseFlyLatLng(latlng);
  if (!parsed) return noopHandle("invalid lat/lng");

  const z1 = parseFlyZoom(zoom, map, 6);
  if (z1 == null) return noopHandle("invalid zoom");

  const durationMs = Math.max(80, parseDurationSec(opts?.duration) * 1000);
  const ease = safeEase(opts?.ease);
  const target = L.latLng(parsed.lat, parsed.lng);

  const handle: FlightHandle = {
    cancel: () => {
      /* set below */
    },
    ok: true,
  };

  if (!mapReady(map)) {
    try {
      map.setView(target, z1, { animate: false });
    } catch {
      return noopHandle("map not ready");
    }
    return handle;
  }

  let start: L.LatLng;
  let z0: number;
  try {
    start = map.getCenter();
    z0 = map.getZoom();
    if (!Number.isFinite(start.lat) || !Number.isFinite(start.lng) || !Number.isFinite(z0)) {
      map.setView(target, z1, { animate: false });
      return handle;
    }
  } catch {
    return noopHandle("cannot read map center");
  }

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
    if (cancelled || opts?.signal?.cancelled) {
      handle.cancel();
      return;
    }
    if (!mapReady(map)) {
      handle.cancel();
      return;
    }
    if (!Number.isFinite(now) || !Number.isFinite(t0)) {
      handle.cancel();
      return;
    }

    const u = Math.min(1, Math.max(0, (now - t0) / durationMs));
    const e = ease(u);
    const lat = start.lat + dLat * e;
    const lng = start.lng + dLon * e;
    const z = z0 + dZ * e;

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(z)) {
      handle.cancel();
      return;
    }

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
