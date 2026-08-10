/**
 * Mobile map chrome patterns (collapse strategy).
 *
 * Principles:
 *  1. Map is the hero — overlays chrome starts collapsed / minimal.
 *  2. Progressive disclosure: quick bar (few) → sheet (full) → legend Key chip.
 *  3. Mutually exclusive expand: opening Layers sheet closes Legend, and vice versa.
 *  4. Persist only explicit user expands (legend open key); sheets stay session-ephemeral.
 *  5. Touch targets ≥ 36–44px; avoid wrapping a second full row of toggles on ~390px.
 */

export const MAP_CHROME_EVENT = "ww-map-chrome";

export type MapChromeMessage =
  | { type: "open-layers" }
  | { type: "close-layers" }
  | { type: "open-legend" }
  | { type: "close-legend" };

export function emitMapChrome(msg: MapChromeMessage): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MAP_CHROME_EVENT, { detail: msg }));
}

export function onMapChrome(handler: (msg: MapChromeMessage) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const fn = (e: Event) => {
    const ce = e as CustomEvent<MapChromeMessage>;
    if (ce.detail) handler(ce.detail);
  };
  window.addEventListener(MAP_CHROME_EVENT, fn);
  return () => window.removeEventListener(MAP_CHROME_EVENT, fn);
}

/**
 * Mobile bottom bar: NO layer chips here — only Filters / Events / More.
 * Layer toggles live inside the More sheet (avoids dock overflow on ~390px).
 */
export const MOBILE_QUICK_LAYERS = [] as const;

/** Desktop quick bar — clear on/off only; rest live in Layers sheet */
export const DESKTOP_QUICK_LAYERS = [
  "quakes",
  "heatmap",
  "significant",
  "nodes",
  "volcanoes",
] as const;

export const LAYER_GROUPS: {
  id: string;
  label: string;
  ids: readonly string[];
}[] = [
  {
    id: "core",
    label: "Core",
    ids: ["quakes", "heatmap", "significant", "globalActivity", "nodes"],
  },
  {
    id: "geology",
    label: "Geology & depth",
    ids: ["plates", "depthColor", "timeDecay", "volcanoes", "globalVolcanoes", "corridors"],
  },
  {
    id: "atmosphere",
    label: "Atmosphere (opt-in · 2D)",
    ids: ["windParticles", "radar", "clouds", "cape", "waves", "airQuality", "wxProbe"],
  },
  {
    id: "space",
    label: "Space (opt-in)",
    ids: ["neos"],
  },
  {
    id: "ambient",
    label: "Ambient Earth",
    ids: ["wildfires"],
  },
  {
    id: "focus",
    label: "Focus tools",
    ids: ["mmiContours"],
  },
];
