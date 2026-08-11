import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

/**
 * Pacific-centered *home* view — full world, seam in the Atlantic.
 *
 * Why: default −180…180 maxBounds centers on the Greenwich seam and
 * bisects the Ring of Fire (Tonga / Kermadec / Chile / Japan).
 * Display longitudes use 0…360 (see toPacificLon) so the RoF is continuous.
 * The cut sits near the Atlantic / Africa — not through the Pacific.
 *
 * Bering / dateline stays *in frame* as the Pacific spine, not the map edge.
 */
export const WORLD_BOUNDS = L.latLngBounds(
  L.latLng(-55, 20),
  L.latLng(70, 340),
);

/**
 * Full navigable range in Pacific display coords.
 * Lon 0 ≈ Atlantic seam; lon 180 ≈ dateline / central Pacific.
 */
export const WORLD_MAX_BOUNDS = L.latLngBounds(
  L.latLng(-85, 0),
  L.latLng(85, 360),
);

/**
 * Default center — mid-Pacific (near dateline / Bering spine).
 * Puts Tonga–Kermadec, Japan, Chile, Aleutians on one continuous canvas.
 */
export const WORLD_CENTER: [number, number] = [8, 180];

/**
 * Home framing: Pacific-weighted setView, not a clipped corridor.
 * User can still pan toward the Atlantic seam (lon → 0 or 360).
 * Chrome lives in CSS grid tracks outside the canvas — no bottomPad needed.
 */
export function fitWorldView(
  map: LeafletMap,
  opts?: {
    animate?: boolean;
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
    // Wide enough for global context; Pacific remains the home focus
    const targetZoom = 2.05;
    map.setMinZoom(1.4);
    map.setView(WORLD_CENTER, targetZoom, { animate });
  } catch {
    map.setMinZoom(1.4);
    map.setView(WORLD_CENTER, 2.05, { animate });
  }
}

export const WORLD_MAP_INIT = {
  center: WORLD_CENTER as [number, number],
  zoom: 2.05,
  minZoom: 1.4,
  maxZoom: 18,
} as const;
