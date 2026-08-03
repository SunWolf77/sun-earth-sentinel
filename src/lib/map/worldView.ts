import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

/** Mercator-safe world (avoid ±90 pole singularity). */
export const WORLD_BOUNDS = L.latLngBounds(
  L.latLng(-85, -180),
  L.latLng(85, 180),
);

export const WORLD_CENTER: [number, number] = [12, 5];

/**
 * Full world framing for 2D map — fits Earth in the current container
 * with padding for chrome (legend / docks).
 */
export function fitWorldView(
  map: LeafletMap,
  opts?: {
    animate?: boolean;
    /** Extra bottom padding for mobile layer bar (px) */
    bottomPad?: number;
  },
): void {
  const animate = opts?.animate ?? false;
  const bottom = opts?.bottomPad ?? 24;
  const top = 10;
  const side = 6;
  try {
    map.setMinZoom(0);
    map.fitBounds(WORLD_BOUNDS, {
      animate,
      paddingTopLeft: L.point(side, top),
      paddingBottomRight: L.point(side, bottom),
      maxZoom: 3,
    });
  } catch {
    map.setView(WORLD_CENTER, 1, { animate });
  }
}

/** Default options when creating the map (before first fit). */
export const WORLD_MAP_INIT = {
  center: WORLD_CENTER as [number, number],
  zoom: 1,
  minZoom: 0,
  maxZoom: 18,
} as const;
