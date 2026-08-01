/**
 * Web App Manifest shortcuts + deep-link tab / view routing.
 * Spec: https://www.w3.org/TR/appmanifest/#shortcuts-member
 */

import type { TabId, TimeWindow, MapView } from "@/store/observatory";
import type { MapOverlayId, BasemapStyleId } from "@/lib/feeds/mapStyles";
import type { PerformanceMode } from "@/lib/feeds/modes";
import { resolveNodeId } from "@/lib/feeds/publishedMonitors";

export const TAB_IDS: TabId[] = ["live", "solar", "resonance", "analytics", "about"];

export type AppShortcut = {
  name: string;
  short_name: string;
  description: string;
  tab: TabId;
  url: string;
};

export const APP_SHORTCUTS: AppShortcut[] = [
  {
    name: "Live Map",
    short_name: "Map",
    description: "Seismic live map + nodes",
    tab: "live",
    url: "/?tab=live&source=pwa-shortcut",
  },
  {
    name: "Solar Observatory",
    short_name: "Solar",
    description: "Space weather command center",
    tab: "solar",
    url: "/?tab=solar&source=pwa-shortcut",
  },
  {
    name: "Catalog Rhythm",
    short_name: "Rhythm",
    description: "SUPT seismic timing read",
    tab: "resonance",
    url: "/?tab=resonance&source=pwa-shortcut",
  },
  {
    name: "Charts",
    short_name: "Charts",
    description: "Supporting time series",
    tab: "analytics",
    url: "/?tab=analytics&source=pwa-shortcut",
  },
];

export function parseTabParam(raw: string | null | undefined): TabId | null {
  if (!raw) return null;
  const t = raw.toLowerCase();
  if (t === "map") return "live";
  if (t === "rhythm") return "resonance";
  if (t === "charts") return "analytics";
  if ((TAB_IDS as string[]).includes(t)) return t as TabId;
  return null;
}

/** Read tab from location search (and optional hash #solar). */
export function tabFromLocation(loc?: Location): TabId | null {
  if (typeof window === "undefined" && !loc) return null;
  const L = loc ?? window.location;
  try {
    const q = new URLSearchParams(L.search);
    const fromQ = parseTabParam(q.get("tab"));
    if (fromQ) return fromQ;
    const hash = (L.hash || "").replace(/^#/, "");
    return parseTabParam(hash);
  } catch {
    return null;
  }
}

export type ViewDeepLink = {
  tab?: TabId;
  node?: string | null;
  window?: TimeWindow;
  minMag?: number;
  layers?: Partial<Record<MapOverlayId, boolean>>;
  mode?: PerformanceMode;
  mapView?: MapView;
  basemap?: BasemapStyleId;
  /** When true, layers list is exclusive (unlisted = off). */
  layersExclusive?: boolean;
};

const WINDOWS: TimeWindow[] = ["hour", "day", "week", "month"];
const MODES: PerformanceMode[] = ["lite", "standard", "full"];
const MAP_VIEWS: MapView[] = ["2d", "3d"];
const BASEMAPS: BasemapStyleId[] = ["soft", "dark", "satellite", "topo"];
const LAYER_IDS: MapOverlayId[] = [
  "quakes",
  "heatmap",
  "significant",
  "globalActivity",
  "depthColor",
  "timeDecay",
  "plates",
  "mmiContours",
  "nodes",
  "volcanoes",
  "globalVolcanoes",
  "corridors",
];

/** Parse shareable view: ?tab=&node=&window=&mag=&layers=&mode=&view=&basemap= */
export function viewFromLocation(loc?: Location): ViewDeepLink {
  if (typeof window === "undefined" && !loc) return {};
  const L = loc ?? window.location;
  const out: ViewDeepLink = {};
  try {
    const q = new URLSearchParams(L.search);
    const tab = parseTabParam(q.get("tab"));
    if (tab) out.tab = tab;
    const node = q.get("node");
    if (node) out.node = resolveNodeId(node) ?? node;
    else if (q.has("node")) out.node = null;
    const w = q.get("window") as TimeWindow | null;
    if (w && WINDOWS.includes(w)) out.window = w;
    const mag = q.get("mag");
    if (mag != null && mag !== "") {
      const n = Number(mag);
      if (Number.isFinite(n) && n >= 2 && n <= 8) out.minMag = n;
    }
    const mode = q.get("mode") as PerformanceMode | null;
    if (mode && MODES.includes(mode)) out.mode = mode;
    const view = q.get("view") as MapView | null;
    if (view && MAP_VIEWS.includes(view)) out.mapView = view;
    const basemap = q.get("basemap") as BasemapStyleId | null;
    if (basemap && BASEMAPS.includes(basemap)) out.basemap = basemap;
    const layers = q.get("layers");
    if (layers != null && layers !== "") {
      const on = new Set(
        layers
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      const partial: Partial<Record<MapOverlayId, boolean>> = {};
      for (const id of LAYER_IDS) {
        partial[id] = on.has(id);
      }
      out.layers = partial;
      out.layersExclusive = true;
    }
  } catch {
    /* */
  }
  return out;
}

/** Keep shareable view params in the address bar (no reload). */
export function syncViewToUrl(opts: {
  tab: TabId;
  node: string | null;
  window: TimeWindow;
  minMag: number;
  overlays: Record<MapOverlayId, boolean>;
  mode?: PerformanceMode;
  mapView?: MapView;
  basemap?: BasemapStyleId;
  /** Focused earthquake id */
  eventId?: string | null;
  /** Map center for share */
  lat?: number | null;
  lon?: number | null;
  zoom?: number | null;
  /** Educational replay cursor */
  replay?: boolean;
  replayMs?: number | null;
  volcanoId?: string | null;
}): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", opts.tab);
    url.searchParams.delete("source");
    if (opts.node) url.searchParams.set("node", opts.node);
    else url.searchParams.delete("node");
    url.searchParams.set("window", opts.window);
    url.searchParams.set("mag", String(opts.minMag));
    if (opts.mode) url.searchParams.set("mode", opts.mode);
    else url.searchParams.delete("mode");
    if (opts.mapView) url.searchParams.set("view", opts.mapView);
    else url.searchParams.delete("view");
    if (opts.basemap) url.searchParams.set("basemap", opts.basemap);
    else url.searchParams.delete("basemap");
    const on = LAYER_IDS.filter((id) => opts.overlays[id]);
    if (on.length) url.searchParams.set("layers", on.join(","));
    else url.searchParams.delete("layers");

    if (opts.eventId) url.searchParams.set("event", opts.eventId);
    else {
      url.searchParams.delete("event");
      url.searchParams.delete("eq");
      url.searchParams.delete("quake");
    }
    if (opts.volcanoId) url.searchParams.set("volcano", opts.volcanoId);
    else {
      url.searchParams.delete("volcano");
      url.searchParams.delete("gvp");
    }
    if (opts.lat != null && opts.lon != null && Number.isFinite(opts.lat) && Number.isFinite(opts.lon)) {
      url.searchParams.set("lat", opts.lat.toFixed(4));
      url.searchParams.set("lon", opts.lon.toFixed(4));
    } else {
      url.searchParams.delete("lat");
      url.searchParams.delete("lon");
    }
    if (opts.zoom != null && Number.isFinite(opts.zoom)) url.searchParams.set("z", String(Math.round(opts.zoom)));
    else {
      url.searchParams.delete("z");
      url.searchParams.delete("zoom");
    }
    if (opts.replay) {
      url.searchParams.set("replay", "1");
      if (opts.replayMs != null && Number.isFinite(opts.replayMs)) {
        url.searchParams.set("t", String(Math.round(opts.replayMs)));
      } else {
        url.searchParams.delete("t");
        url.searchParams.delete("cursor");
      }
    } else {
      url.searchParams.delete("replay");
      url.searchParams.delete("t");
      url.searchParams.delete("cursor");
    }

    const next = url.pathname + url.search + url.hash;
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(window.history.state, "", next);
    }
  } catch {
    /* ignore */
  }
}

/** @deprecated use syncViewToUrl — kept for callers */
export function syncTabToUrl(tab: TabId): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === tab) return;
    url.searchParams.set("tab", tab);
    url.searchParams.delete("source");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  } catch {
    /* ignore */
  }
}

export function shareableViewUrl(origin?: string): string {
  if (typeof window === "undefined") return origin ? `${origin}/` : "/";
  return window.location.href.split("#")[0] || window.location.href;
}
