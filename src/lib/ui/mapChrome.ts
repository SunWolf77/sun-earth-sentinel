/**
 * Mobile live-map chrome mode.
 *
 * desk — header + WolfWatch rail visible (status / hop desks).
 * map  — those collapse so Earth is the screen. Bottom tabs stay.
 *        Pulse and a SES peek sit as overlays on the canvas.
 *
 * Persisted under ww_ui_* so CACHE_VER / site-data clear resets it
 * (same family as the folder coach). Ordinary feed prune does not.
 */

export type MapChrome = "desk" | "map";

export const MAP_CHROME_KEY = "ww_ui_map_chrome_v1";
export const MAP_CHROME_EVENT = "ww-map-chrome-mode";
export const MAP_INTERACT_EVENT = "ww-map-interact";

const FOLDERS_SEEN = "ww_ui_folders_v1";

function canStore(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readMapChrome(): MapChrome {
  if (!canStore()) return "desk";
  try {
    const saved = localStorage.getItem(MAP_CHROME_KEY);
    if (saved === "desk" || saved === "map") return saved;
    // Returning visitors who already know the folders: map-first.
    if (localStorage.getItem(FOLDERS_SEEN) === "1") return "map";
  } catch {
    /* private mode */
  }
  return "desk";
}

export function writeMapChrome(mode: MapChrome): void {
  if (!canStore()) return;
  try {
    localStorage.setItem(MAP_CHROME_KEY, mode);
  } catch {
    /* quota / private */
  }
  try {
    window.dispatchEvent(new CustomEvent(MAP_CHROME_EVENT, { detail: mode }));
  } catch {
    /* */
  }
}

let lastInteract = 0;

/** Throttled — pan/zoom of 2D or 3D fogs the desk so Earth stays the screen. */
export function emitMapInteract(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastInteract < 350) return;
  lastInteract = now;
  try {
    window.dispatchEvent(new Event(MAP_INTERACT_EVENT));
  } catch {
    /* */
  }
}
