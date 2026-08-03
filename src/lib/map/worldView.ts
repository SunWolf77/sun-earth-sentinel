import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

/** Mercator-safe world (avoid ±90 pole singularity). Single copy only. */
export const WORLD_BOUNDS = L.latLngBounds(
  L.latLng(-85, -180),
  L.latLng(85, 180),
);

/** Slightly padded maxBounds so drag doesn\'t bounce awkwardly at edges. */
export const WORLD_MAX_BOUNDS = L.latLngBounds(
  L.latLng(-85.5, -180),
  L.latLng(85.5, 180),
);

export const WORLD_CENTER: [number, number] = [12, 5];

/**
 * Full world framing — one Earth in view (no side-by-side wrap copies).
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
  const top = 10;
  const side = 8;
  try {
    map.setMaxBounds(WORLD_MAX_BOUNDS);
    let floor = 1;
    try {
      const z = map.getBoundsZoom(WORLD_BOUNDS, false);
      if (Number.isFinite(z) && z > 0) {
        // Stay just zoomed-in enough that only one world fits
        floor = Math.min(2.5, Math.max(1, z - 0.15));
      }
    } catch {
      floor = 1;
    }
    map.setMinZoom(floor);
    map.fitBounds(WORLD_BOUNDS, {
      animate,
      paddingTopLeft: L.point(side, top),
      paddingBottomRight: L.point(side, bottom),
      maxZoom: Math.max(floor + 0.5, 2.2),
    });
  } catch {
    map.setMinZoom(1);
    map.setView(WORLD_CENTER, 1.5, { animate });
  }
}

/** Default options when creating the map (before first fit). */
export const WORLD_MAP_INIT = {
  center: WORLD_CENTER as [number, number],
  zoom: 1.5,
  minZoom: 1,
  maxZoom: 18,
} as const;
