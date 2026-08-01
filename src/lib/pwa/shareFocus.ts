/**
 * Direct share of focused map/globe targets: earthquake, node/zone, volcano, replay.
 * Builds absolute URLs and hydrates store state from query params.
 */

import type { TabId, TimeWindow, MapView, PickedEvent } from "@/store/observatory";
import type { MapOverlayId, BasemapStyleId } from "@/lib/feeds/mapStyles";
import type { PerformanceMode } from "@/lib/feeds/modes";
import { PRODUCTION_ORIGIN, resolveShareOrigin } from "@/lib/site";
import { resolveNodeId } from "@/lib/feeds/publishedMonitors";
import { viewFromLocation, type ViewDeepLink } from "@/lib/pwa/shortcuts";

export type ShareFocusKind = "event" | "node" | "volcano" | "view" | "replay";

export type ShareFocusInput = {
  kind?: ShareFocusKind;
  /** USGS / JMA / GEOFON event id */
  eventId?: string | null;
  /** Dragon / watch / published node id */
  nodeId?: string | null;
  /** GVP vnum or gvp-* id */
  volcanoId?: string | null;
  lat?: number | null;
  lon?: number | null;
  zoom?: number | null;
  place?: string | null;
  mag?: number | null;
  /** Replay cursor (ms epoch) */
  replayMs?: number | null;
  replay?: boolean;
  tab?: TabId;
  window?: TimeWindow;
  minMag?: number;
  mapView?: MapView;
  basemap?: BasemapStyleId;
  mode?: PerformanceMode;
  layers?: Partial<Record<MapOverlayId, boolean>>;
  /** Absolute origin override */
  origin?: string;
};

export type FocusDeepLink = ViewDeepLink & {
  eventId?: string;
  volcanoId?: string;
  lat?: number;
  lon?: number;
  zoom?: number;
  replay?: boolean;
  replayMs?: number | null;
};

/** Parse full focus deep-link including event / volcano / map / replay. */
export function focusFromLocation(loc?: Location): FocusDeepLink {
  const base = viewFromLocation(loc) as FocusDeepLink;
  if (typeof window === "undefined" && !loc) return base;
  const L = loc ?? window.location;
  try {
    const q = new URLSearchParams(L.search);
    const event = q.get("event") || q.get("eq") || q.get("quake");
    if (event) base.eventId = event.trim();
    const volc = q.get("volcano") || q.get("gvp");
    if (volc) base.volcanoId = volc.trim();
    const lat = q.get("lat");
    const lon = q.get("lon");
    if (lat != null && lon != null) {
      const la = Number(lat);
      const lo = Number(lon);
      if (Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) {
        base.lat = la;
        base.lon = lo;
      }
    }
    const z = q.get("z") || q.get("zoom");
    if (z != null) {
      const zn = Number(z);
      if (Number.isFinite(zn) && zn >= 1 && zn <= 18) base.zoom = zn;
    }
    if (q.get("replay") === "1" || q.get("replay") === "true") base.replay = true;
    const t = q.get("t") || q.get("cursor");
    if (t != null && t !== "") {
      // ISO or ms
      let ms = Number(t);
      if (!Number.isFinite(ms)) {
        const d = Date.parse(t);
        if (Number.isFinite(d)) ms = d;
      }
      if (Number.isFinite(ms) && ms > 0) base.replayMs = ms;
    }
    if (base.node) {
      base.node = resolveNodeId(base.node) ?? base.node;
    }
  } catch {
    /* ignore */
  }
  return base;
}

/** Build a shareable absolute URL for the given focus (does not mutate the address bar). */
export function buildShareFocusUrl(input: ShareFocusInput): string {
  const origin = (input.origin || resolveShareOrigin() || PRODUCTION_ORIGIN).replace(/\/$/, "");
  const u = new URL("/", origin);
  u.searchParams.set("tab", input.tab || "live");

  if (input.nodeId) u.searchParams.set("node", input.nodeId);
  if (input.eventId) u.searchParams.set("event", input.eventId);
  if (input.volcanoId) u.searchParams.set("volcano", input.volcanoId);

  if (input.lat != null && input.lon != null && Number.isFinite(input.lat) && Number.isFinite(input.lon)) {
    u.searchParams.set("lat", input.lat.toFixed(4));
    u.searchParams.set("lon", input.lon.toFixed(4));
  }
  if (input.zoom != null && Number.isFinite(input.zoom)) {
    u.searchParams.set("z", String(Math.round(input.zoom)));
  }
  if (input.window) u.searchParams.set("window", input.window);
  if (input.minMag != null) u.searchParams.set("mag", String(input.minMag));
  if (input.mapView) u.searchParams.set("view", input.mapView);
  if (input.basemap) u.searchParams.set("basemap", input.basemap);
  if (input.mode) u.searchParams.set("mode", input.mode);

  if (input.layers) {
    const on = Object.entries(input.layers)
      .filter(([, v]) => !!v)
      .map(([k]) => k);
    if (on.length) u.searchParams.set("layers", on.join(","));
  }

  if (input.replay || input.replayMs != null) {
    u.searchParams.set("replay", "1");
    if (input.replayMs != null && Number.isFinite(input.replayMs)) {
      u.searchParams.set("t", String(Math.round(input.replayMs)));
    }
  }

  // Human-readable crumbs (ignored by parser; help social paste)
  if (input.place) u.searchParams.set("label", input.place.slice(0, 80));
  if (input.mag != null) u.searchParams.set("mm", input.mag.toFixed(1));

  return u.toString();
}

export function shareUrlForPickedEvent(
  ev: PickedEvent,
  ctx: {
    nodeId?: string | null;
    window?: TimeWindow;
    minMag?: number;
    mapView?: MapView;
    basemap?: BasemapStyleId;
    mode?: PerformanceMode;
    layers?: Partial<Record<MapOverlayId, boolean>>;
    replayMs?: number | null;
    replay?: boolean;
  } = {},
): string {
  return buildShareFocusUrl({
    kind: "event",
    eventId: ev.id,
    nodeId: ctx.nodeId,
    lat: ev.lat,
    lon: ev.lon,
    zoom: 7,
    place: ev.place,
    mag: ev.mag,
    window: ctx.window,
    minMag: ctx.minMag,
    mapView: ctx.mapView,
    basemap: ctx.basemap,
    mode: ctx.mode,
    layers: ctx.layers,
    replay: ctx.replay,
    replayMs: ctx.replayMs ?? ev.time,
    tab: "live",
  });
}

export function shareUrlForNode(
  nodeId: string,
  ctx: {
    lat?: number;
    lon?: number;
    window?: TimeWindow;
    minMag?: number;
    mapView?: MapView;
    layers?: Partial<Record<MapOverlayId, boolean>>;
  } = {},
): string {
  return buildShareFocusUrl({
    kind: "node",
    nodeId,
    lat: ctx.lat,
    lon: ctx.lon,
    zoom: 5,
    window: ctx.window,
    minMag: ctx.minMag,
    mapView: ctx.mapView,
    layers: ctx.layers,
    tab: "live",
  });
}

export function shareUrlForVolcano(
  volcanoId: string,
  ctx: {
    lat?: number;
    lon?: number;
    place?: string;
    layers?: Partial<Record<MapOverlayId, boolean>>;
  } = {},
): string {
  return buildShareFocusUrl({
    kind: "volcano",
    volcanoId,
    lat: ctx.lat,
    lon: ctx.lon,
    zoom: 7,
    place: ctx.place,
    layers: {
      volcanoes: true,
      globalVolcanoes: true,
      ...ctx.layers,
    },
    tab: "live",
  });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Web Share API when available; else clipboard. */
export async function shareOrCopy(url: string, title = "Sun Earth Sentinel"): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, url, text: title });
      return "shared";
    }
  } catch (e) {
    // user cancel → still try copy only if AbortError not
    if (e instanceof DOMException && e.name === "AbortError") return "failed";
  }
  const ok = await copyText(url);
  return ok ? "copied" : "failed";
}
