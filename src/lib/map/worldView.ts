import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

/**
 * Pacific-centered *home* view — still a full world map.
 *
 * Center/zoom bias puts the Ring of Fire in frame on first paint.
 * maxBounds stay full-world so Europe, Africa, Americas remain reachable.
 * (Never clip lon to a Pacific-only corridor — that hid global EQs.)
 */
export const WORLD_BOUNDS = L.latLngBounds(
  L.latLng(-55, -180),
  L.latLng(70, 180),
);

/** Full world maxBounds — pan anywhere. Soft viscosity keeps one-world framing. */
export const WORLD_MAX_BOUNDS = L.latLngBounds(
  L.latLng(-85, -180),
  L.latLng(85, 180),
);

/** Default center — western Pacific so Kermadec/Japan are in-context. */
export const WORLD_CENTER: [number, number] = [5, 175];

/**
 * Home framing: Pacific-weighted setView, not a clipped corridor.
 * User can still pan to any continent.
 */
export function fitWorldView(
  map: LeafletMap,
  opts?: {
    animate?: boolean;
    bottomPad?: number;
  },
): void {
  try {
    const el = map.getContainer?.();
    if (!el || el.offsetWidth < 2 || el.offsetHeight < 2) return;
    if (!map.getPane("mapPane")) return;
  } catch {
    return;
  }
  const animate = opts?.animate ?? false;
  try {
    map.setMaxBounds(WORLD_MAX_BOUNDS);
    // Wide enough to keep global context; Pacific still the home focus
    const targetZoom = 2.15;
    map.setMinZoom(1.5);
    map.setView(WORLD_CENTER, targetZoom, { animate });
  } catch {
    map.setMinZoom(1.5);
    map.setView(WORLD_CENTER, 2.15, { animate });
  }
}

export const WORLD_MAP_INIT = {
  center: WORLD_CENTER as [number, number],
  zoom: 2.15,
  minZoom: 1.5,
  maxZoom: 18,
} as const;
