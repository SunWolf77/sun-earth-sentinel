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
  | "neos"
  | "windParticles"
  | "radar"
  | "clouds"
  | "cape"
  | "waves"
  | "wxProbe"
  | "airQuality";

/** Weather/radar/wind — culled. Dedicated apps do this; we do not. */
export const CULLED_OVERLAY_IDS: readonly MapOverlayId[] = [
  "windParticles",
  "radar",
  "clouds",
  "cape",
  "waves",
  "wxProbe",
  "airQuality",
];

export function scrubOverlays(
  overlays: Record<MapOverlayId, boolean>,
): Record<MapOverlayId, boolean> {
  const next = { ...overlays };
  for (const id of CULLED_OVERLAY_IDS) next[id] = false;
  next.iss = false;
  next.aurora = false;
  return next;
}

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
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
    tone: "light",
  },
  dark: {
    id: "dark",
    label: "Night ops",
    short: "Night",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
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
 * Atmosphere always off (weather layers culled).
 */
export const DEFAULT_OVERLAYS: Record<MapOverlayId, boolean> = {
  quakes: true,
  heatmap: false,
  nodes: true,
  volcanoes: true,
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
  windParticles: false,
  radar: false,
  clouds: false,
  cape: false,
  waves: false,
  wxProbe: false,
  airQuality: false,
};

/** Mobile first-open: even leaner */
export function mobileLeanOverlays(): Record<MapOverlayId, boolean> {
  return {
    ...DEFAULT_OVERLAYS,
    plates: false,
    depthColor: false,
    corridors: false,
    volcanoes: true,
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
    windParticles: false,
    radar: false,
    clouds: false,
    cape: false,
    waves: false,
    wxProbe: false,
    airQuality: false,
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
    label: "Elevated volcanoes (world)",
    short: "Volc",
    hint: "USGS + GVP weekly/recent + INGV · capped",
  },
  {
    id: "globalVolcanoes",
    label: "GVP Holocene catalog",
    short: "GVP+",
    hint: "Dense catalog ≥2010 · opt-in only",
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
  {
    id: "windParticles",
    label: "Wind particles",
    short: "Wind",
    hint: "Open-Meteo 10 m · animated streamlines · 2D only",
  },
  {
    id: "radar",
    label: "Precipitation radar",
    short: "Radar",
    hint: "RainViewer global radar · free tiles",
  },
  {
    id: "clouds",
    label: "Cloud cover",
    short: "Clouds",
    hint: "Open-Meteo cloud % grid",
  },
  {
    id: "cape",
    label: "CAPE (instability)",
    short: "CAPE",
    hint: "Convective available potential energy · model",
  },
  {
    id: "waves",
    label: "Ocean waves",
    short: "Waves",
    hint: "Open-Meteo marine wave height",
  },
  {
    id: "wxProbe",
    label: "Weather probe",
    short: "Probe",
    hint: "Click map · gusts, MSLP, WMO code, 12 h strip, AQ",
  },
  {
    id: "airQuality",
    label: "Air quality (PM2.5)",
    short: "AQ",
    hint: "Open-Meteo PM2.5 / dust · pairs with wildfires",
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
const OVERLAY_STORAGE_KEY = "wolfwatch_overlays_v9";

export function loadOverlays(opts?: { mobile?: boolean }): Record<MapOverlayId, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_OVERLAYS };
  try {
    const raw = localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<MapOverlayId, boolean>>;
      return scrubOverlays({ ...DEFAULT_OVERLAYS, ...parsed });
    }
    for (const k of [
      "wolfwatch_overlays_v7",
      "wolfwatch_overlays_v6",
      "wolfwatch_overlays_v5",
      "wolfwatch_overlays_v4",
      "wolfwatch_overlays_v3",
      "wolfwatch_overlays",
    ]) {
      const legacy = localStorage.getItem(k);
      if (!legacy) continue;
      try {
        const parsed = JSON.parse(legacy) as Partial<Record<MapOverlayId, boolean>>;
        const merged = scrubOverlays({
          ...DEFAULT_OVERLAYS,
          ...parsed,
          volcanoes: parsed.volcanoes ?? true,
          globalVolcanoes: false,
          iss: false,
          aurora: false,
          heatmap: false,
          significant: false,
        });
        localStorage.removeItem(k);
        try {
          localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          /* */
        }
        return merged;
      } catch {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
  if (opts?.mobile) return scrubOverlays(mobileLeanOverlays());
  try {
    if (window.matchMedia?.("(max-width: 767px)").matches) return scrubOverlays(mobileLeanOverlays());
  } catch {
    /* ignore */
  }
  return scrubOverlays({ ...DEFAULT_OVERLAYS });
}

export function saveOverlays(overlays: Record<MapOverlayId, boolean>): void {
  try {
    localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(scrubOverlays(overlays)));
  } catch {
    /* ignore */
  }
}
