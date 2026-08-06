import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

/**
 * Pacific-centered *home* view — still a full world map.
 *
 * Center/zoom bias puts the Ring of Fire in frame on first paint.
 * maxBounds stay wide enough that Europe, Africa, Americas, and
 * dateline-shifted markers (lon+360) remain reachable.
 */
export const WORLD_BOUNDS = L.latLngBounds(
  L.latLng(-55, -180),
  L.latLng(70, 180),
);

/** Wide maxBounds: canonical world + room for Pacific display lon (up to ~360). */
export const WORLD_MAX_BOUNDS = L.latLngBounds(
  L.latLng(-85, -180),
  L.latLng(85, 360),
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
    const targetZoom = 2.4;
    map.setMinZoom(1.6);
    map.setView(WORLD_CENTER, targetZoom, { animate });
  } catch {
    map.setMinZoom(1.6);
    map.setView(WORLD_CENTER, 2.4, { animate });
  }
}

export const WORLD_MAP_INIT = {
  center: WORLD_CENTER as [number, number],
  zoom: 2.4,
  minZoom: 1.6,
  maxZoom: 18,
} as const;
