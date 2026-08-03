/** Free basemap styles (no Mapbox token). Mapbox-like layer control UX. */

export type BasemapStyleId = "soft" | "dark" | "satellite" | "topo";

export type MapOverlayId =
  | "quakes"
  | "heatmap"
  | "nodes"
  | "volcanoes"
  | "globalVolcanoes"
  | "corridors"
  | "depthColor"
  | "timeDecay"
  | "mmiContours"
  | "plates"
  | "significant"
  | "globalActivity"
  | "iss"
  | "aurora"
  | "wildfires"
  | "neos";

export type MapStyleConfig = {
  id: BasemapStyleId;
  label: string;
  short: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom?: number;
  tone: "light" | "dark" | "sat";
};

export const BASEMAP_STYLES: Record<BasemapStyleId, MapStyleConfig> = {
  soft: {
    id: "soft",
    label: "Soft lit",
    short: "Soft",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OSM &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19,
    tone: "light",
  },
  dark: {
    id: "dark",
    label: "Night ops",
    short: "Night",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: "&copy; OSM &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19,
    tone: "dark",
  },
  satellite: {
    id: "satellite",
    label: "Satellite",
    short: "Sat",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 18,
    tone: "sat",
  },
  topo: {
    id: "topo",
    label: "Terrain",
    short: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "Map data: &copy; OSM, SRTM | Map style: &copy; OpenTopoMap",
    subdomains: "abc",
    maxZoom: 17,
    tone: "light",
  },
};

/**
 * Startup defaults — map readable first, layers opt-in.
 * Quakes on (filtered by minMag M4.5+), nodes on; plates/depth/zones off.
 */
export const DEFAULT_OVERLAYS: Record<MapOverlayId, boolean> = {
  quakes: true,
  heatmap: false,
  nodes: true,
  volcanoes: false,
  globalVolcanoes: false,
  corridors: false,
  depthColor: false,
  timeDecay: false,
  mmiContours: true,
  plates: false,
  significant: false,
  globalActivity: false,
  iss: false,
  aurora: false,
  wildfires: false,
  neos: false,
};

/** Mobile first-open: even leaner */
export function mobileLeanOverlays(): Record<MapOverlayId, boolean> {
  return {
    ...DEFAULT_OVERLAYS,
    plates: false,
    depthColor: false,
    corridors: false,
    volcanoes: false,
    globalVolcanoes: false,
    heatmap: false,
    timeDecay: false,
    mmiContours: true,
    nodes: true,
    significant: false,
    globalActivity: false,
    iss: false,
    aurora: false,
    wildfires: false,
    neos: false,
  };
}

export const OVERLAY_META: {
  id: MapOverlayId;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    id: "quakes",
    label: "Earthquake markers",
    short: "Quakes",
    hint: "Event circles · size = mag",
  },
  {
    id: "heatmap",
    label: "Heatmap density",
    short: "Heat",
    hint: "Density heat",
  },
  {
    id: "significant",
    label: "Significant M6+",
    short: "M6+",
    hint: "M≥6 only",
  },
  {
    id: "globalActivity",
    label: "Global M4.5+ (day)",
    short: "World",
    hint: "World M4.5+ day",
  },
  {
    id: "depthColor",
    label: "Depth coloring",
    short: "Depth",
    hint: "Color by depth",
  },
  {
    id: "timeDecay",
    label: "Heat time-decay",
    short: "Decay",
    hint: "Heat ages out",
  },
  {
    id: "plates",
    label: "Plate boundaries + motion",
    short: "Plates",
    hint: "Plate boundaries",
  },
  {
    id: "mmiContours",
    label: "MMI contours (focus)",
    short: "MMI",
    hint: "Focus MMI",
  },
  {
    id: "nodes",
    label: "Priority nodes",
    short: "Nodes",
    hint: "Priority nodes",
  },
  {
    id: "volcanoes",
    label: "USGS elevated volcanoes",
    short: "USGS Volc",
    hint: "USGS elevated",
  },
  {
    id: "globalVolcanoes",
    label: "Global volcanoes (GVP)",
    short: "GVP World",
    hint: "GVP vents",
  },
  {
    id: "corridors",
    label: "Focus corridors",
    short: "Zones",
    hint: "Focus zones",
  },
{
    id: "iss",
    label: "ISS track",
    short: "ISS",
    hint: "Live ISS + track",
  },
  {
    id: "aurora",
    label: "Aurora oval (Kp)",
    short: "Aurora",
    hint: "Kp oval or Official OVATION stills",
  },
  {
    id: "wildfires",
    label: "Wildfires (EONET)",
    short: "Fires",
    hint: "EONET fires",
  },
  {
    id: "neos",
    label: "Near-Earth objects",
    short: "NEO",
    hint: "NeoWs today",
  },
];

export function loadBasemapStyle(): BasemapStyleId {
  if (typeof window === "undefined") return "satellite";
  try {
    const v = localStorage.getItem("wolfwatch_basemap");
    if (v === "soft" || v === "dark" || v === "satellite" || v === "topo") return v;
  } catch {
    /* ignore */
  }
  return "satellite";
}

/** Bump key when defaults change so users get the lean map once. */
const OVERLAY_STORAGE_KEY = "wolfwatch_overlays_v3";

export function loadOverlays(opts?: { mobile?: boolean }): Record<MapOverlayId, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_OVERLAYS };
  try {
    const raw = localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<MapOverlayId, boolean>>;
      return { ...DEFAULT_OVERLAYS, ...parsed };
    }
    // migrate: drop old dense prefs once
    localStorage.removeItem("wolfwatch_overlays");
  } catch {
    /* ignore */
  }
  if (opts?.mobile) return mobileLeanOverlays();
  try {
    if (window.matchMedia?.("(max-width: 767px)").matches) return mobileLeanOverlays();
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_OVERLAYS };
}

export function saveOverlays(overlays: Record<MapOverlayId, boolean>): void {
  try {
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(overlays));
  } catch {
    /* ignore */
  }
}
