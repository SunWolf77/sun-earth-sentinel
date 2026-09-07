/**
 * Mobile map chrome patterns (collapse strategy).
 *
 * Zones (portrait ~390px) — nothing free-floats over Earth mid-screen:
 *  TOP overlay: SES peek (map mode) + Pulse chip. Expand is a sheet, not layout.
 *  CENTER: map only (+ leaflet marker; event detail is a bottom sheet)
 *  BOTTOM: one dock — Map · Filters · Events · Layers (mutual exclusive sheets)
 *          + persistent app tabs (Map · Solar · Rhythm · Charts · About)
 *
 * Principles:
 *  1. Map is the hero — chrome starts collapsed / Map screen after first visit.
 *  2. Progressive disclosure: dock → one sheet at a time.
 *  3. Mutually exclusive expand: Map | Filters | Events | Layers | Event detail | Pulse.
 *  4. Persist chrome mode (desk | map). Pan/zoom fogs to map. Sheets stay session-ephemeral.
 *  5. Touch targets ≥ 36–44px; dock goes icon-only in Map screen.
 *  6. Map screen ≠ Fullscreen. Screen keeps bottom tabs; Full hides them.
 */

export const MAP_CHROME_EVENT = "ww-map-chrome";

export type MapChromeMessage =
  | { type: "open-layers" }
  | { type: "close-layers" }
  | { type: "open-legend" }
  | { type: "close-legend" }
  | { type: "open-map-tools" }
  | { type: "close-map-tools" };

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
 * Mobile bottom bar: NO layer chips here — only Map / Filters / Events / Layers.
 * Layer toggles live inside the Layers sheet (avoids dock overflow on ~390px).
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
