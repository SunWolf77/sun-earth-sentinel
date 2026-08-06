import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

/**
 * Pacific activity-belt home view.
 *
 * Not a full-world map. The default frame is the Ring of Fire corridor so
 * Kermadec / Tonga / Japan / Kamchatka / Aleutians are in-context from the
 * first paint. Longitude space is opened past +180 so toPacificLon() markers
 * (dateline events shifted +360) still sit on basemap tiles.
 */

/** Soft geographic interest box (canonical −180…180). Used for zoom calc only. */
export const WORLD_BOUNDS = L.latLngBounds(
  L.latLng(-50, 110),
  L.latLng(65, -100),
);

/**
 * maxBounds in Pacific display space (allows lon up to ~250).
 * Left edge sits in the Indian Ocean / SE Asia; right edge past the dateline
 * into the eastern Pacific — never a hard wall at −180.
 */
export const WORLD_MAX_BOUNDS = L.latLngBounds(
  L.latLng(-58, 90),
  L.latLng(72, 250),
);

/** Default center — western Pacific, slightly south so NZ/Kermadec are visible. */
export const WORLD_CENTER: [number, number] = [0, 175];

/**
 * Frame the Pacific activity belt.
 * Higher zoom + Pacific center = swarm has land/context, not edge-of-void.
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

    // Activity-belt zoom: tight enough that dateline is not a hard left edge
    // and the user can immediately read "Pacific" geography.
    const targetZoom = 2.85;
    map.setMinZoom(2.2);
    map.setView(WORLD_CENTER, targetZoom, { animate });
  } catch {
    map.setMinZoom(2.2);
    map.setView(WORLD_CENTER, 2.85, { animate });
  }
}

/** Default options when creating the map (before first fit). */
export const WORLD_MAP_INIT = {
  center: WORLD_CENTER as [number, number],
  zoom: 2.85,
  minZoom: 2.2,
  maxZoom: 18,
} as const;
