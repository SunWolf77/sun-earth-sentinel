import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

/**
 * Pacific-centered activity belt.
 * Latitude tightened so Antarctica no longer dominates the frame.
 * Longitude kept full-range for safe noWrap + marker placement.
 */
export const WORLD_BOUNDS = L.latLngBounds(
  L.latLng(-55, -180),
  L.latLng(70, 180),
);

/** Slightly padded maxBounds so drag doesn't bounce awkwardly at edges. */
export const WORLD_MAX_BOUNDS = L.latLngBounds(
  L.latLng(-58, -180),
  L.latLng(73, 180),
);

/** Default center — western Pacific so Ring of Fire sits in the middle. */
export const WORLD_CENTER: [number, number] = [8, 165];

/**
 * Frame the Pacific activity belt (one Earth, no side-by-side wrap copies).
 * Antarctica is largely cropped; Alaska ↔ Kamchatka stay continuous.
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
  const bottom = opts?.bottomPad ?? 24;
  const top = 12;
  const side = 14;
  try {
    map.setMaxBounds(WORLD_MAX_BOUNDS);
    let floor = 1.4;
    try {
      const z = map.getBoundsZoom(WORLD_BOUNDS, false);
      if (Number.isFinite(z) && z > 0) {
        // Keep the belt comfortably framed (not fully zoomed-out)
        floor = Math.min(2.8, Math.max(1.4, z - 0.1));
      }
    } catch {
      floor = 1.4;
    }
    map.setMinZoom(floor);
    map.fitBounds(WORLD_BOUNDS, {
      animate,
      paddingTopLeft: L.point(side, top),
      paddingBottomRight: L.point(side, bottom),
      maxZoom: Math.max(floor + 0.4, 2.4),
    });
  } catch {
    map.setMinZoom(1.4);
    map.setView(WORLD_CENTER, 2, { animate });
  }
}

/** Default options when creating the map (before first fit). */
export const WORLD_MAP_INIT = {
  center: WORLD_CENTER as [number, number],
  zoom: 2,
  minZoom: 1.4,
  maxZoom: 18,
} as const;
