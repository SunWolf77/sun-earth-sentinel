/**
 * Direct share of focused map/globe targets: earthquake, node/zone, volcano, replay.
 * Builds absolute URLs and hydrates store state from query params.
 *
 * Web Share API: use sharePayload / shareOrCopy — never navigate the SPA for share.
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

export type ShareResult =
  | "shared"
  | "copied"
  | "cancelled"
  | "failed";

export type SharePayload = {
  title: string;
  text?: string;
  url: string;
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

  // Only attach replay when explicitly requested — never from event time alone
  if (input.replay) {
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
    // Only when caller is in educational replay — not every EQ share
    replay: !!ctx.replay,
    replayMs: ctx.replay ? (ctx.replayMs ?? ev.time ?? null) : null,
    tab: "live",
  });
}

/** Title + body for Web Share / social paste */
export function payloadForPickedEvent(ev: PickedEvent, url: string): SharePayload {
  const mag = Number.isFinite(ev.mag) ? `M${ev.mag.toFixed(1)}` : "Quake";
  const place = (ev.place || "event").trim();
  const title = `${mag} · ${place} · Sun-Earth Sentinel`;
  const when =
    ev.time != null && Number.isFinite(ev.time)
      ? new Date(ev.time).toISOString().replace(".000Z", "Z")
      : null;
  const depth =
    ev.depth != null && Number.isFinite(ev.depth) ? `${Math.abs(ev.depth).toFixed(0)} km` : null;
  const text = [
    `${mag} earthquake — ${place}`,
    when ? `Origin ${when}` : null,
    depth ? `Depth ${depth}` : null,
    "Live map · free observation · not a warning",
    url,
  ]
    .filter(Boolean)
    .join("\n");
  return { title, text, url };
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

/** Soft-update address bar to match share URL (no navigation / reload). */
export function softReplaceShareUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = new URL(url, window.location.origin);
    // Same origin only — never push production URL over localhost mid-session
    if (next.origin !== window.location.origin) {
      // Still allow production share origin on prod; on preview keep local path
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        window.history.replaceState(
          window.history.state,
          "",
          next.pathname + next.search + next.hash,
        );
        return;
      }
    }
    window.history.replaceState(
      window.history.state,
      "",
      next.pathname + next.search + next.hash,
    );
  } catch {
    /* ignore */
  }
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
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** True when Level-1 Web Share can take a URL (mobile Safari/Chrome, some desktop). */
export function canWebShare(url?: string, title = "Sun-Earth Sentinel"): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  try {
    if (typeof navigator.canShare === "function") {
      return navigator.canShare(url != null ? { title, url, text: title } : { title, url: "https://example.com" });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Web Share API first (native sheet), clipboard fallback.
 * Never full-navigates. Abort/cancel is "cancelled", not "failed".
 */
export async function shareOrCopy(
  url: string,
  title = "Sun-Earth Sentinel",
  opts?: { text?: string; preferCopy?: boolean },
): Promise<ShareResult> {
  const text = opts?.text ?? title;

  if (!opts?.preferCopy && canWebShare(url, title)) {
    try {
      const data: ShareData = { title, url, text };
      // Some Android builds reject if canShare fails on combined fields — try url-only
      if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
        if (navigator.canShare({ url })) {
          await navigator.share({ url });
          return "shared";
        }
      } else {
        await navigator.share(data);
        return "shared";
      }
    } catch (e) {
      if (e instanceof DOMException && (e.name === "AbortError" || e.name === "NotAllowedError")) {
        // User dismissed sheet — do not silently copy (avoids surprise clipboard writes)
        if (e.name === "AbortError") return "cancelled";
      }
      // Fall through to clipboard for TypeError / data not supported
    }
  }

  const ok = await copyText(url);
  return ok ? "copied" : "failed";
}

/** Event-aware share: richer text for Messages / WhatsApp / X. */
export async function sharePickedEvent(
  ev: PickedEvent,
  url: string,
  opts?: { preferCopy?: boolean },
): Promise<ShareResult> {
  const payload = payloadForPickedEvent(ev, url);
  softReplaceShareUrl(url);
  return shareOrCopy(payload.url, payload.title, {
    text: payload.text,
    preferCopy: opts?.preferCopy,
  });
}
