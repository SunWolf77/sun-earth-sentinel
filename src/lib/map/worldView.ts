import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

/**
 * Pacific-centered activity belt.
 * Latitude tightened so Antarctica no longer dominates the frame.
 * Longitude kept full-range for safe noWrap + marker placement,
 * but default center + zoom bias hard toward the western Pacific
 * so Kermadec / Tonga never sit on the far western edge.
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

/**
 * Default center — shifted further east so the Tonga–Kermadec–Japan
 * arc sits well inside the frame instead of on the left edge.
 * 175°E puts the dateline swarm near the visual centre-right.
 */
export const WORLD_CENTER: [number, number] = [5, 175];

/**
 * Frame the Pacific activity belt (one Earth, no side-by-side wrap copies).
 * Stronger eastward bias + higher minZoom keep Kermadec off the western edge.
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

    // Prefer a Pacific-weighted centre + zoom rather than a full-width
    // fitBounds. Full-width fit on wide screens still pushes the dateline
    // swarm hard against the left edge.
    let targetZoom = 2.35;
    try {
      const z = map.getBoundsZoom(WORLD_BOUNDS, false);
      if (Number.isFinite(z) && z > 0) {
        // Keep the belt comfortably framed and never too far out
        targetZoom = Math.min(2.9, Math.max(2.2, z + 0.15));
      }
    } catch {
      targetZoom = 2.35;
    }

    map.setMinZoom(Math.max(1.8, targetZoom - 0.6));
    map.setView(WORLD_CENTER, targetZoom, { animate });

    // Light padding nudge so chrome (legend / bottom bar) does not clip markers
    try {
      const size = map.getSize();
      if (size && size.x > 0) {
        // small eastward pixel bias to keep the swarm off the absolute left edge
        map.panBy([Math.round(size.x * 0.04), 0], { animate: false });
      }
    } catch {
      /* ignore */
    }
  } catch {
    map.setMinZoom(1.8);
    map.setView(WORLD_CENTER, 2.35, { animate });
  }
}

/** Default options when creating the map (before first fit). */
export const WORLD_MAP_INIT = {
  center: WORLD_CENTER as [number, number],
  zoom: 2.35,
  minZoom: 1.8,
  maxZoom: 18,
} as const;
