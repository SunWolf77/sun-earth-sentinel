import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import L from "leaflet";
import { useObservatory, filteredEq, getFocusNode, getAllFocusNodes } from "@/store/observatory";
import {
  magColor,
  depthColor,
  eqDepthKm,
  nodeStatus,
  halfLifeForWindow,
} from "@/lib/feeds/usgs";
import {
  formatMmi,
  hasShakeMapProduct,
  shakeMapEventUrl,
  eventPageUrl,
} from "@/lib/seismology/shakemap";
import { BASEMAP_STYLES } from "@/lib/feeds/mapStyles";
import { pointInBounds, boundsToPacificLeaflet, toPacificLon, fromPacificLon, pacificLatLng } from "@/lib/geo/bounds";
import {
  createQuakeHeatLayer,
  featuresToHeatPoints,
} from "@/components/map/QuakeHeatLayer";
import {
  createMmiContourLayer,
  type MmiContourLayer,
} from "@/components/map/MmiContourLayer";
import { createPlateLayer, type PlateLayerHandle } from "@/components/map/PlateLayer";
import { attachMapTouchGestures, type MapTouchHandle } from "@/lib/map/touchGestures";
import { NodeFocusBanner } from "@/components/nodes/NodeFocusPanel";
import { AuroraOfficialPanel } from "@/components/map/AuroraOfficialPanel";
import { useAmbientMapLayers } from "@/components/map/AmbientLayers";
import { MapLegend } from "@/components/map/MapLegend";
import { MmiFocusBanner } from "@/components/map/MmiFocusBanner";
import { EventReplayBar } from "@/components/map/EventReplayBar";
import { AtmosphereChrome } from "@/components/map/AtmosphereLayers";
import { AuWeatherDeskChip } from "@/components/map/AuWeatherDeskChip";
import { gvpProfileUrl } from "@/lib/feeds/gvpGlobal";
import { nodeIdForAlert } from "@/lib/feeds/watchlistOverride";
import { alertSourceLabel } from "@/lib/feeds/globalVolcanoAlerts";
import { monitorHandoffUrl } from "@/lib/feeds/publishedMonitors";
import { formatUtc } from "@/lib/utils";
import { fitWorldView, WORLD_MAP_INIT } from "@/lib/map/worldView";
import { flyToEased, cancelFlyToEased, easeOutCubic } from "@/lib/map/flyToEased";
import {
  agencyLinksForEvent,
  agencyLinksHtml,
} from "@/lib/seismology/agencyLinks";
import { isJmaFeature } from "@/lib/feeds/jma";
import type { EqFeature } from "@/lib/feeds/usgs";
import { filterFeaturesByTimeWindow } from "@/lib/feeds/usgs";
import { fairSampleEqPoints } from "@/lib/map/superclusterIndex";
import type { EqPoint } from "@/lib/map/eqCluster";
import {
  nodePopupHtml,
  nodeShortName,
  nodeMarkChip,
} from "@/lib/nodes/describeNode";
import {
  nodeHoverTooltipHtml,
  eqHoverTooltipHtml,
} from "@/lib/nodes/exportNodesCsv";
import {
  SHARE_FOCUS_UI_ENABLED,
  shareUrlForPickedEvent,
  shareOrCopy,
  softReplaceShareUrl,
  canWebShare,
} from "@/lib/pwa/shareFocus";

function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, "&" + "amp;")
    .replace(/"/g, "&" + "quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;");
}

/**
 * Popup share is a short button (not a wall of URL). Intercept click:
 * preventDefault, soft replaceState, Web Share / copy.
 */
function bindShareInPopup(layer: L.Layer, fallbackTitle: string, fallbackText?: string) {
  layer.on("popupopen", () => {
    const popup = (layer as L.CircleMarker).getPopup?.();
    const el = popup?.getElement?.();
    if (!el) return;
    const a = el.querySelector<HTMLAnchorElement>("a[data-ww-share]");
    if (!a || a.dataset.wwShareBound === "1") return;
    a.dataset.wwShareBound = "1";
    a.setAttribute("role", "button");
    const web = canWebShare();
    if (!web) {
      a.textContent = "Copy link";
    }
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const url = a.getAttribute("href") || "";
      if (!url || url === "#") return;
      const title = a.getAttribute("data-ww-share-title") || fallbackTitle;
      const text =
        a.getAttribute("data-ww-share-text") ||
        fallbackText ||
        `${title}\nLive map · free observation · not a warning\n${url}`;
      void (async () => {
        softReplaceShareUrl(url);
        const r = await shareOrCopy(url, title, { text });
        const prev = a.textContent;
        if (r === "shared") {
          a.textContent = "Shared ✓";
          a.style.color = "#4ade80";
        } else if (r === "copied") {
          a.textContent = "Copied ✓";
          a.style.color = "#4ade80";
        } else if (r === "cancelled") {
          a.textContent = "Cancelled";
          a.style.color = "#94a3b8";
        } else {
          a.textContent = "Failed";
          a.style.color = "#f87171";
        }
        window.setTimeout(() => {
          a.textContent = prev;
          a.style.color = "#67e8f9";
        }, 2000);
      })();
    });
  });
}

function makeTileLayer(styleId: keyof typeof BASEMAP_STYLES) {
  const style = BASEMAP_STYLES[styleId];
  const opts: L.TileLayerOptions = {
    attribution: style.attribution,
    maxZoom: style.maxZoom ?? 19,
    className: "ww-basemap",
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 2,
    crossOrigin: true,
    // Pacific frame is 0…360 — allow tile wrap so basemap continues past ±180
    noWrap: false,
    // Don’t clamp tiles to Greenwich world; continuous RoF needs full mercator span
  };
  if (style.subdomains) opts.subdomains = style.subdomains;
  return L.tileLayer(style.url, opts);
}


function buildEqPopupHtml(
  f: EqFeature,
  opts: {
    lat: number;
    lon: number;
    mag: number;
    depth: number;
    place: string;
    time: string;
    fill: string;
    isSig: boolean;
    isJma: boolean;
    isMmiSource: boolean;
    mmi: number | null | undefined;
    sm: boolean;
    smUrl: string | null;
    pageUrl: string | null | undefined;
    eventId: string;
    agencyHtml: string;
    shareHref?: string | null;
    shareTitle?: string | null;
    shareText?: string | null;
  },
): string {
  const {
    lat,
    lon,
    mag,
    depth,
    place,
    time,
    fill,
    isSig,
    isJma,
    isMmiSource,
    mmi,
    sm,
    smUrl,
    eventId,
  } = opts;
  const mmiLine =
    mmi != null && Number.isFinite(mmi)
      ? `<div style="color:#22d3ee;font-size:11px;margin-top:2px">USGS MMI ~${formatMmi(mmi)}${sm ? " · ShakeMap product" : ""}</div>`
      : "";
  const contourNote = isMmiSource
    ? `<div style="color:#fbbf24;font-size:11px">★ MMI contours drawn for this event</div>`
    : "";
  const sigNote = isSig
    ? `<span style="color:#fbbf24;font-size:11px"> · Significant M≥6</span>`
    : "";
  const magType = (f.properties as { magType?: string }).magType;
  const net = (f.properties as { net?: string }).net;
  const status = (f.properties as { status?: string }).status;
  const metaBits = [magType ? `mag ${magType}` : null, net ? `net ${net}` : null, status || null]
    .filter(Boolean)
    .join(" · ");
  const smLink =
    sm && smUrl
      ? `<div style="margin-top:4px"><a href="${smUrl}" target="_blank" rel="noopener noreferrer" style="color:#22d3ee;font-weight:600;font-size:11px">USGS ShakeMap →</a></div>`
      : "";
  const coords = `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
  const jmaMaxi = f.properties.jmaMaxi;
  const jmaNote = jmaMaxi
    ? `<div style="color:#22d3ee;font-size:11px;margin-top:2px">JMA shindo ${jmaMaxi}${isJma ? " · JMA catalog" : " · matched"}</div>`
    : isJma
      ? `<div style="color:#22d3ee;font-size:11px;margin-top:2px">JMA catalog</div>`
      : "";
  const idStr = String(f.id ?? "");
  const isImo =
    idStr.startsWith("imo:") ||
    f.properties.detail === "imo" ||
    f.properties.net === "imo";
  const isEmsc =
    idStr.startsWith("emsc:") ||
    f.properties.detail === "emsc" ||
    f.properties.net === "emsc";
  const srcBadge = isJma
    ? `<span style="color:#22d3ee;font-size:10px;font-weight:600"> · JMA</span>`
    : isImo
      ? `<span style="color:#a78bfa;font-size:10px;font-weight:600"> · IMO</span>`
      : isEmsc
        ? `<span style="color:#67e8f9;font-size:10px;font-weight:600"> · EMSC</span>`
        : f.properties.jmaEnriched
          ? `<span style="color:#22d3ee;font-size:10px"> · +JMA</span>`
          : f.properties.imoEnriched
            ? `<span style="color:#a78bfa;font-size:10px"> · +IMO</span>`
            : f.properties.emscEnriched
              ? `<span style="color:#67e8f9;font-size:10px"> · +EMSC</span>`
              : "";
  const shareLine =
    SHARE_FOCUS_UI_ENABLED && opts.shareHref
      ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><a href="${opts.shareHref}" data-ww-share="1" data-ww-share-title="${escapeAttr(opts.shareTitle || "Earthquake")}" data-ww-share-text="${escapeAttr(opts.shareText || "")}" title="Share focus — opens map on this event" style="display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:8px;border:1px solid #0e7490;background:#0c4a6e;color:#67e8f9;font-size:11px;font-weight:700;text-decoration:none;cursor:pointer">Share event</a><span style="color:#64748b;font-size:10px">Deep link · no reload</span></div>`
      : "";
  return `<div style="font-weight:700;color:${fill};font-size:14px">M${mag.toFixed(1)}${sigNote}${srcBadge}</div>
              <div style="color:#94a3b8;font-size:11px;margin-top:2px">${depth.toFixed(0)} km depth · ${coords}</div>
              <div style="margin-top:4px;color:#e2e8f0">${place}</div>
              <div style="color:#64748b;font-size:11px;margin-top:3px">${time}</div>
              ${metaBits ? `<div style="color:#64748b;font-size:10px;margin-top:2px">${metaBits}${eventId ? ` · ${eventId}` : ""}</div>` : eventId ? `<div style="color:#64748b;font-size:10px;margin-top:2px">${eventId}</div>` : ""}
              ${jmaNote}${mmiLine}${contourNote}${smLink}
              <div style="margin-top:6px;padding-top:6px;border-top:1px solid #1e293b;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:.04em">Agency assessment</div>
              ${opts.agencyHtml}${shareLine}`;
}

/** Radius (px) for epicenter circle — true lat/lon via SVG circleMarker. */
function eqCircleRadius(mag: number): number {
  const m = Number.isFinite(mag) ? mag : 0;
  if (m >= 7) return 7;
  if (m >= 6) return 5.5;
  if (m >= 5) return 4.5;
  if (m >= 4.5) return 3.75;
  if (m >= 4) return 3;
  return 2.5;
}

export function LiveMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const mapAlive = () => {
    const m = mapObj.current;
    if (!m) return null;
    try {
      // display:none while 3D — skip pane math that throws _leaflet_pos
      const el = m.getContainer?.();
      if (!el || el.offsetParent === null && el.style.display === "none") return null;
      if (!m.getPane("mapPane")) return null;
      return m;
    } catch {
      return null;
    }
  };
  const baseLayer = useRef<L.TileLayer | null>(null);
  /** SVG for interactive markers — full-map canvas steals clicks from EQ popups. */
  const vectorRenderer = useRef<L.SVG | null>(null);
  const eqLayer = useRef<L.LayerGroup | null>(null);
  const eqContextLayer = useRef<L.LayerGroup | null>(null);
  const nodeLayer = useRef<L.LayerGroup | null>(null);
  const volcLayer = useRef<L.LayerGroup | null>(null);
  const gvpLayer = useRef<L.LayerGroup | null>(null);
  const heatLayer = useRef<ReturnType<typeof createQuakeHeatLayer> | null>(null);
  const mmiLayer = useRef<MmiContourLayer | null>(null);
  const plateLayer = useRef<PlateLayerHandle | null>(null);
  const touchHandle = useRef<MapTouchHandle | null>(null);

  const [pressLabel, setPressLabel] = useState<string | null>(null);
  const [zoomTick, setZoomTick] = useState(0);
  const isMobileMap = useIsMobile();
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [showGestureTip, setShowGestureTip] = useState(false);

  const eq = useObservatory((s) => s.eq);
  const volc = useObservatory((s) => s.volc);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const volcWatchNodes = useObservatory((s) => s.volcWatchNodes);
  const globalSeismic = useObservatory((s) => s.globalSeismic);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const mapView = useObservatory((s) => s.mapView);
  const mapImmersive = useObservatory((s) => s.mapImmersive);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const gvpVolcanoes = useObservatory((s) => s.gvpVolcanoes);
  const focusGvpVolcano = useObservatory((s) => s.focusGvpVolcano);
  const basemapStyle = useObservatory((s) => s.basemapStyle);
  const overlays = useObservatory((s) => s.overlays);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const focusMmi = useObservatory((s) => s.focusMmi);
  const mapFlyTo = useObservatory((s) => s.mapFlyTo);
  const clearMapFlyTo = useObservatory((s) => s.clearMapFlyTo);
  const replayActive = useObservatory((s) => s.replayActive);
  const replayCursorMs = useObservatory((s) => s.replayCursorMs);
  const pickEvent = useObservatory((s) => s.pickEvent);

  useEffect(() => {
    try {
      if (!localStorage.getItem("wolfwatch_gesture_tip_v1")) {
        setShowGestureTip(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onZ = () => setZoomTick((n) => n + 1);
    window.addEventListener("ww-nodes-zoom", onZ);
    return () => window.removeEventListener("ww-nodes-zoom", onZ);
  }, []);

  useEffect(() => {
    if (!pressLabel) return;
    const t = setTimeout(() => setPressLabel(null), 2800);
    return () => clearTimeout(t);
  }, [pressLabel]);

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, {
      center: WORLD_MAP_INIT.center,
      zoom: WORLD_MAP_INIT.zoom,
      minZoom: WORLD_MAP_INIT.minZoom,
      maxZoom: WORLD_MAP_INIT.maxZoom,
      // Pacific display frame (0…360) — seam in Atlantic, RoF continuous
      maxBounds: L.latLngBounds(L.latLng(-85, 0), L.latLng(85, 360)),
      maxBoundsViscosity: 0.85,
      worldCopyJump: false,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      zoomAnimation: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
      boxZoom: true,
      keyboard: true,
      bounceAtZoomLimits: true,
    });

    // Top-right zoom — clear of legend (top-left) and layer bar (bottom)
    L.control.zoom({ position: "topright" }).addTo(map);
    // Compact attribution bottom-left — clear of MapStyleControl / replay
    L.control
      .attribution({
        position: "bottomleft",
        prefix: false,
      })
      .addTo(map);

    touchHandle.current = attachMapTouchGestures(map, {
      doubleTapZoomDelta: 1,
      longPressMs: 500,
      onLongPress: (lat, lon) => {
        const canon = fromPacificLon(lon);
        setPressLabel(`${lat.toFixed(2)}°, ${canon.toFixed(2)}° · long-press`);
      },
    });

    vectorRenderer.current = L.svg({ padding: 0.1 });
    const initial = useObservatory.getState().basemapStyle;
    baseLayer.current = makeTileLayer(initial).addTo(map);
    const el0 = map.getContainer();
    el0.classList.add(`ww-tone-${BASEMAP_STYLES[initial].tone}`);

    plateLayer.current = createPlateLayer(map);
    heatLayer.current = createQuakeHeatLayer();
    heatLayer.current.addTo(map);
    heatLayer.current.setActive(false);
    mmiLayer.current = createMmiContourLayer() as MmiContourLayer;
    mmiLayer.current.addTo(map);
    // Simple EQ dots — no MarkerCluster, no spiderfy
    eqLayer.current = L.layerGroup().addTo(map);
    eqContextLayer.current = L.layerGroup().addTo(map);
    nodeLayer.current = L.layerGroup().addTo(map);
    volcLayer.current = L.layerGroup().addTo(map);
    gvpLayer.current = L.layerGroup().addTo(map);
    mapObj.current = map;
    map.on("zoomend", () => {
      try {
        if (useObservatory.getState().overlays.nodes) {
          window.dispatchEvent(new CustomEvent("ww-nodes-zoom"));
        }
      } catch { /* */ }
    });

    // Full world framing — size sync keeps markers on basemap
    // Grid stage: also watch canvas/stage so dock-track growth remeasures projection
    const syncSize = () => {
      try {
        map.invalidateSize({ animate: false, pan: false });
      } catch {
        /* ignore */
      }
    };
    let sizePulse: number | null = null;
    const syncSizeDebounced = () => {
      syncSize();
      if (sizePulse != null) window.clearTimeout(sizePulse);
      sizePulse = window.setTimeout(() => {
        sizePulse = null;
        syncSize();
      }, 60);
    };
    requestAnimationFrame(() => {
      syncSize();
      fitWorldView(map, { animate: false });
      // Second pulse after layout/fonts/chrome settle (fullscreen, side panels, grid dock)
      window.setTimeout(() => {
        syncSize();
        fitWorldView(map, { animate: false });
      }, 120);
      window.setTimeout(syncSize, 320);
    });
    // Keep marker projection locked to basemap when shell/immersive/grid resizes
    const ro = new ResizeObserver(() => {
      syncSizeDebounced();
    });
    ro.observe(map.getContainer());
    const stageCanvas = map.getContainer().closest(".ww-map-stage__canvas");
    if (stageCanvas) ro.observe(stageCanvas);
    const stage = map.getContainer().closest(".ww-map-stage");
    if (stage) ro.observe(stage);
    map.once("unload", () => {
      ro.disconnect();
      if (sizePulse != null) window.clearTimeout(sizePulse);
    });
    window.addEventListener("resize", syncSizeDebounced);
    const onShell = () => {
      syncSizeDebounced();
      window.setTimeout(syncSize, 100);
    };
    window.addEventListener("ww-map-resize", onShell);

    map.once("unload", () => {
      window.removeEventListener("resize", syncSizeDebounced);
      window.removeEventListener("ww-map-resize", onShell);
    });


    setMapInstance(map);

    if (useObservatory.getState().overlays.plates) {
      plateLayer.current.setActive(true);
    }

    return () => {
      touchHandle.current?.destroy();
      touchHandle.current = null;
      plateLayer.current?.destroy();
      plateLayer.current = null;
      map.remove();
      mapObj.current = null;
      setMapInstance(null);
      baseLayer.current = null;
      vectorRenderer.current = null;
      heatLayer.current = null;
      mmiLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    if (baseLayer.current) {
      map.removeLayer(baseLayer.current);
      baseLayer.current = null;
    }
    baseLayer.current = makeTileLayer(basemapStyle).addTo(map);
    if (plateLayer.current?.group && map.hasLayer(plateLayer.current.group)) {
      try {
        // @ts-expect-error leaflet LayerGroup may expose bringToBack at runtime
        plateLayer.current.group.bringToBack?.();
      } catch {
        /* ignore */
      }
    }
    if (heatLayer.current) {
      if (map.hasLayer(heatLayer.current)) map.removeLayer(heatLayer.current);
      heatLayer.current.addTo(map);
      heatLayer.current.setActive(overlays.heatmap);
    }
    if (mmiLayer.current) {
      if (map.hasLayer(mmiLayer.current)) map.removeLayer(mmiLayer.current);
      mmiLayer.current.addTo(map);
    }
    const el = map.getContainer();
    el.classList.remove("ww-tone-light", "ww-tone-dark", "ww-tone-sat");
    el.classList.add(`ww-tone-${BASEMAP_STYLES[basemapStyle].tone}`);
  }, [basemapStyle, overlays.heatmap]);

  useEffect(() => {
    if (mapView !== "2d" || !mapObj.current) return;
    const id = window.setTimeout(() => {
      try {
        const m = mapObj.current;
        if (m && m.getContainer().offsetWidth > 2) m.invalidateSize(false);
      } catch {
        /* ignore */
      }
    }, 80);
    return () => window.clearTimeout(id);
  }, [mapView]);

  useEffect(() => {
    const map = mapObj.current;
    if (!map || !mapFlyTo || mapView !== "2d") return;
    const lat = Number(mapFlyTo.lat);
    const lon = Number(mapFlyTo.lon);
    const zoom = mapFlyTo.zoom == null ? 6 : Number(mapFlyTo.zoom);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(zoom)
    ) {
      clearMapFlyTo();
      return;
    }
    // Custom easeOutCubic flight (same curve as 3D globe aim)
    flyToEased(map, pacificLatLng(lat, lon), zoom, {
      duration: 0.85,
      ease: easeOutCubic,
    });
    clearMapFlyTo();
    return () => cancelFlyToEased();
  }, [mapFlyTo, mapView, clearMapFlyTo]);

  // 3D → 2D or resize: re-frame world if not focused on a node
  useEffect(() => {
    if (mapView !== "2d") return;
    const map = mapObj.current;
    if (!map) return;
    if (useObservatory.getState().focusNodeId) return;
    const id = window.setTimeout(() => {
      map.invalidateSize(false);
      fitWorldView(map, { animate: false });
    }, 60);
    return () => window.clearTimeout(id);
  }, [mapView, mapImmersive]);

  useEffect(() => {
    plateLayer.current?.setActive(!!overlays.plates);
  }, [overlays.plates]);

  useEffect(() => {
    if (mapView !== "2d") return;
    const map = mapObj.current;
    if (!map) return;
    try {
      if (!map.getPane("mapPane") || map.getContainer().offsetWidth < 2) return;
    } catch {
      return;
    }
    const node = getFocusNode(focusNodeId);
    if (!node) {
      if (focusNodeId === null) {
        fitWorldView(map, { animate: true });
      }
      return;
    }
    // Pacific-frame single rect so dateline desks (Tonga) stay one continuous box
    const [[latMin, lonMin], [latMax, lonMax]] = boundsToPacificLeaflet(node.bounds);
    map.fitBounds(
      [
        [latMin, lonMin],
        [latMax, lonMax],
      ],
      { padding: [40, 40], maxZoom: 6, animate: true },
    );
  }, [focusNodeId, mapView]);

  useEffect(() => {
    const layer = mmiLayer.current;
    if (!layer) return;
    const show =
      !!focusNodeId &&
      overlays.mmiContours &&
      !focusMmi.dismissed &&
      focusMmi.status === "ready" &&
      !!focusMmi.contours;
    layer.setContours(show ? focusMmi.contours : null);
    layer.bringToFront();
  }, [focusNodeId, overlays.mmiContours, focusMmi]);

  useEffect(() => {
    const map = mapObj.current;
    if (!map || !eqLayer.current || !nodeLayer.current || !volcLayer.current) return;
    const sync = (layer: L.LayerGroup, on: boolean) => {
      if (on && !map.hasLayer(layer)) layer.addTo(map);
      if (!on && map.hasLayer(layer)) map.removeLayer(layer);
    };
    sync(eqLayer.current, overlays.quakes);
    if (eqContextLayer.current) sync(eqContextLayer.current, overlays.quakes || overlays.globalActivity);
    sync(nodeLayer.current, overlays.nodes || overlays.corridors);
    sync(volcLayer.current, overlays.volcanoes);
    if (gvpLayer.current) sync(gvpLayer.current, overlays.globalVolcanoes);
    heatLayer.current?.setActive(overlays.heatmap);
  }, [overlays]);

  useEffect(() => {
    if (!eqLayer.current || !nodeLayer.current) return;
    eqLayer.current.clearLayers();
    eqContextLayer.current?.clearLayers();
    nodeLayer.current.clearLayers();

    const renderer = vectorRenderer.current ?? undefined;
    const sat = basemapStyle === "satellite";
    const focus = getFocusNode(focusNodeId);
    // Dense national catalogs when focused (IMO Iceland / INGV CF)
    const mapMin =
      focus?.id === "iceland"
        ? Math.min(minMag, 1.0)
        : focus?.id === "mediterranean"
          ? Math.min(minMag, 1.5)
          : focus?.id === "andes"
            ? Math.min(minMag, 2.0)
            : focus?.id === "newzealand"
              ? Math.min(minMag, 1.5)
              : minMag;
    const all = filteredEq(eq?.features, mapMin, maxMag);
    let features = focus
      ? all.filter((f) => {
          const [lon, lat] = f.geometry.coordinates;
          return pointInBounds(lat, lon, focus.bounds);
        })
      : all;

    // Match selected time window (drops GEOFON/JMA/stale pulse outside window)
    features = filterFeaturesByTimeWindow(features, timeWindow);

    // Significant M6+ mode: keep only strong events when filter is on
    if (overlays.significant) {
      features = features.filter((f) => (f.properties.mag ?? 0) >= 6);
    }

    // Event replay cursor — educational filter (time <= cursor)
    if (replayActive && replayCursorMs != null) {
      features = features.filter((f) => {
        const t = f.properties.time;
        return typeof t === "number" && t <= replayCursorMs;
      });
    }

    heatLayer.current?.setData(
      featuresToHeatPoints(features, {
        timeDecay: overlays.timeDecay,
        halfLifeHours: halfLifeForWindow(timeWindow),
      }),
    );
    heatLayer.current?.setActive(overlays.heatmap);

    if (overlays.quakes) {
      const map = mapObj.current;
      if (map) {
        try {
          map.invalidateSize({ animate: false, pan: false });
        } catch {
          /* ignore */
        }
      }

      // Geographic fair sample so 30d is a world map, not a few edge piles
      const modeMax =
        useObservatory.getState().mode === "full" ? 900 : 500;
      const points: EqPoint[] = features.map((f) => {
        const [lon, lat] = f.geometry.coordinates;
        return { f, lat, lon, mag: f.properties.mag ?? 0 };
      });
      const sampled = fairSampleEqPoints(points, modeMax, {
        cellDeg: 10,
        perCell: Math.max(4, Math.ceil(modeMax / 40)),
      });
      const drawFeatures = sampled.map((p) => p.f);

      const markers: L.Layer[] = [];
      // Weak first so stronger quakes sit above in the pane
      const ordered = [...drawFeatures].sort(
        (a, b) => (a.properties.mag ?? 0) - (b.properties.mag ?? 0),
      );
      for (const f of ordered) {
        const [lon, lat] = f.geometry.coordinates;
        const mag = f.properties.mag ?? 0;
        const depth = eqDepthKm(f);
        const place = f.properties.place ?? "Unknown";
        const time = formatUtc(f.properties.time);
        const isSig = mag >= 6;
        const isJma = isJmaFeature(f);
        const fill = overlays.depthColor ? depthColor(depth) : magColor(mag);
        const mmi = f.properties.mmi;
        const sm =
          hasShakeMapProduct(f.properties.types) ||
          (mmi != null && Number.isFinite(mmi));
        const smUrl = shakeMapEventUrl(f.id);
        const pageUrl = f.properties.url || eventPageUrl(f.id);
        const isMmiSource =
          focusMmi.eventId && f.id === focusMmi.eventId && focusMmi.status === "ready";
        const eventId = f.id != null ? String(f.id) : "";
        const agencyLinks = agencyLinksForEvent({
          lat,
          lon,
          eventId,
          place,
          url: pageUrl,
        });
        const shareHref = SHARE_FOCUS_UI_ENABLED
          ? shareUrlForPickedEvent(
              {
                id: eventId || `${lat},${lon},${f.properties.time ?? 0}`,
                lat,
                lon,
                mag,
                place,
                depth,
                time: typeof f.properties.time === "number" ? f.properties.time : null,
                url: pageUrl || undefined,
              },
              {
                nodeId: useObservatory.getState().focusNodeId,
                window: useObservatory.getState().timeWindow,
                minMag: useObservatory.getState().minMag,
                mapView: useObservatory.getState().mapView,
                basemap: useObservatory.getState().basemapStyle,
                mode: useObservatory.getState().mode,
                layers: useObservatory.getState().overlays,
              },
            )
          : null;
        const shareTitle = `M${mag.toFixed(1)} · ${place} · Sun-Earth Sentinel`;
        const shareText = [
          `M${mag.toFixed(1)} earthquake — ${place}`,
          typeof f.properties.time === "number"
            ? `Origin ${new Date(f.properties.time).toISOString().replace(".000Z", "Z")}`
            : null,
          `Depth ${depth.toFixed(0)} km`,
          "Live map · free observation · not a warning",
        ]
          .filter(Boolean)
          .join("\n");
        const popupHtml = buildEqPopupHtml(f, {
          lat,
          lon,
          mag,
          depth,
          place,
          time,
          fill,
          isSig,
          isJma,
          isMmiSource: !!isMmiSource,
          mmi,
          sm,
          smUrl,
          pageUrl,
          eventId,
          agencyHtml: agencyLinksHtml(agencyLinks),
          shareHref,
          shareTitle,
          shareText,
        });

        // SVG circle on exact epicenter — Pacific frame so RoF is continuous
        const r = eqCircleRadius(mag);
        const pin = L.circleMarker(pacificLatLng(lat, lon), {
          renderer,
          radius: r,
          color: isSig || isMmiSource ? "#fbbf24" : "rgba(248,250,252,0.95)",
          weight: isSig || isMmiSource ? 1.75 : 1,
          fillColor: fill,
          fillOpacity: 0.92,
          opacity: 1,
          className: "ww-eq-circle",
          bubblingMouseEvents: false,
        });
        pin.bindPopup(popupHtml, {
          className: "ww-eq-popup",
          maxWidth: 300,
          autoPan: true,
        });
        bindShareInPopup(
          pin,
          `M${mag.toFixed(1)} · ${place} · Sun-Earth Sentinel`,
          shareText,
        );
        pin.bindTooltip(
          eqHoverTooltipHtml({
            mag,
            place,
            depth,
            timeLabel: time !== "—" ? time : undefined,
          }),
          {
            direction: "top",
            offset: [0, -r - 4],
            opacity: 0.98,
            className: "ww-hover-tip-wrap",
            sticky: false,
          },
        );
        pin.on("click", () => {
          pickEvent({
            id: eventId || `${lat},${lon},${f.properties.time ?? 0}`,
            lat,
            lon,
            mag,
            place,
            depth,
            time: typeof f.properties.time === "number" ? f.properties.time : null,
            url: pageUrl || undefined,
          });
        });
        markers.push(pin);
      }
      for (const m of markers) eqLayer.current.addLayer(m);
    }

    // Global M4.5+ / significant day context layer
    if (overlays.globalActivity && globalSeismic) {
      const world = [
        ...(globalSeismic.m45?.features ?? []),
        ...(globalSeismic.significant?.features ?? []),
      ];
      const seen = new Set<string>();
      for (const f of world) {
        const id = String(f.id ?? "");
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        const [lon, lat] = f.geometry.coordinates;
        const mag = f.properties.mag ?? 0;
        const sig = (f.properties.sig ?? 0) >= 600 || mag >= 6;
        const marker = L.circleMarker(pacificLatLng(lat, lon), {
          renderer,
          radius: sig ? 8 : 5,
          color: sig ? "#fbbf24" : "#64748b",
          fillColor: sig ? "#f59e0b" : "#94a3b8",
          fillOpacity: 0.35,
          weight: 1,
          opacity: 0.75,
          bubblingMouseEvents: false,
        });
        const gPlace = f.properties.place || "Event";
        const gUrl = f.properties.url || eventPageUrl(f.id);
        const gLinks = agencyLinksHtml(
          agencyLinksForEvent({ lat, lon, eventId: id, place: gPlace, url: gUrl }),
          8,
        );
        marker.bindPopup(
          `<strong style="color:#fbbf24">M${mag.toFixed(1)}</strong> · global 24h<br/>` +
            `${gPlace}<br/>` +
            `<span style="color:#64748b;font-size:11px">USGS world layer</span>` +
            gLinks,
          { className: "ww-eq-popup", maxWidth: 300 },
        );
        eqContextLayer.current?.addLayer(marker);
      }
    }

    const allNodes = getAllFocusNodes();
    for (const node of allNodes) {
      const st = nodeStatus(all, node, { timeWindow });
      const [[latMin, lonMin], [latMax, lonMax]] = node.bounds;
      const clat = node.center?.[0] ?? (latMin + latMax) / 2;
      const clon = toPacificLon(
        node.center?.[1] ?? (lonMin <= lonMax ? (lonMin + lonMax) / 2 : -175),
      );
      const isFocus = focusNodeId === node.id;
      const isPublished = !!node.publishedFocus;
      const isVolc = node.kind === "volcano";
      const isPriority = !!node.watchPriority;
      const dimmed = focusNodeId != null && !isFocus;

      const color =
        isVolc && node.aviationCode === "orange"
          ? "#fb923c"
          : isVolc && node.aviationCode === "red"
            ? "#f43f5e"
            : st === "watch"
              ? "#e11d48"
              : st === "active"
                ? "#ea580c"
                : st === "elevated"
                  ? "#d97706"
                  : isPublished || isFocus
                    ? "#ca8a04"
                    : "#0891b2";

      if (overlays.nodes) {
        const chip = nodeMarkChip(node);
        const short = nodeShortName(node, 16);
        const z = mapObj.current?.getZoom() ?? 2;
        const showCaption =
          isFocus ||
          (isVolc &&
            (node.aviationCode === "orange" ||
              node.aviationCode === "red" ||
              st === "watch")) ||
          z >= 4;
        const compact = !showCaption;
        const innerCls = [
          "ww-node-marker__inner",
          compact ? "ww-node-marker__inner--dot" : "",
          isFocus ? "ww-node-marker__inner--focus" : "",
          isPublished ? "ww-node-marker__inner--ses" : "",
          isVolc ? "ww-node-marker__inner--volc" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const textHtml = compact
          ? ""
          : '<span class="ww-node-marker__text"><span class="ww-node-marker__name">' +
            short +
            '</span><span class="ww-node-marker__chip">' +
            chip +
            "</span></span>";
        const nodeHtml =
          '<div class="' +
          innerCls +
          '" style="--node-c:' +
          color +
          '"><span class="ww-node-marker__dot" style="background:' +
          color +
          ";border-color:" +
          (sat ? "#fff" : color) +
          '"></span>' +
          textHtml +
          "</div>";
        // Anchor on the DOT center (not mid-pill) so labels grow east without
        // shifting the geographic point. Dot is 14px (16px focus) at flex start.
        const dotHalf = isFocus ? 8 : 7;
        const label = L.marker([clat, clon], {
          icon: L.divIcon({
            className: compact
              ? "ww-node-marker ww-node-marker--dot"
              : "ww-node-marker ww-node-marker--chip",
            html: nodeHtml,
            // Wide box only for hit/layout; anchor is left-dot center
            iconSize: compact ? [18, 18] : [132, 34],
            iconAnchor: compact ? [9, 9] : [dotHalf, 17],
            popupAnchor: compact ? [0, -10] : [0, -14],
          }),
          keyboard: true,
          riseOnHover: true,
          zIndexOffset: isFocus ? 900 : isPublished || isVolc ? 700 : 500,
          title: `${node.name} — ${chip}`,
          opacity: dimmed ? 0.45 : 1,
        });

        const popupHtml = nodePopupHtml(node, {
          status: st,
          statusColor: color,
          isFocus,
        });
        // Prefer SES board URL when published (incl. Campi / volcanic desks)
        let html = popupHtml;
        if (node.monitorUrl || node.publishedFocus) {
          const board = monitorHandoffUrl(node.id) || node.monitorUrl;
          if (board && !html.includes(board)) {
            html = html.replace(
              `href="${node.monitorUrl}"`,
              `href="${board}"`,
            );
          }
          // Ensure board CTA exists for published desks even if template omitted it
          if (board && !html.includes(board) && !html.includes("swarm board")) {
            html = html.replace(
              "</div>",
              `<a class="ww-node-popup__board" href="${board}" target="_blank" rel="noopener noreferrer">Full swarm board →</a></div>`,
            );
          }
        }
        label.bindPopup(html, {
          className: "ww-eq-popup ww-node-popup",
          maxWidth: 300,
          autoPan: true,
        });
        label.bindTooltip(nodeHoverTooltipHtml(node, st), {
          direction: "top",
          offset: [40, -8],
          opacity: 0.98,
          className: "ww-hover-tip-wrap",
          sticky: false,
        });
        // Direct click focuses zone (popup still explains why)
        label.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          if (!isFocus) setFocusNode(node.id);
          // keep popup for "why" + links
        });
        label.on("popupopen", () => {
          const btn = document.querySelector(`.ww-focus-btn[data-node="${node.id}"]`);
          if (btn) {
            btn.addEventListener(
              "click",
              (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (isFocus) exitToHomeView();
                else setFocusNode(node.id);
                mapObj.current?.closePopup();
              },
              { once: true },
            );
          }
        });
        nodeLayer.current.addLayer(label);
      }

      if (overlays.corridors && (isFocus || isPublished || isPriority)) {
        const [[rLatMin, rLonMin], [rLatMax, rLonMax]] = boundsToPacificLeaflet(node.bounds);
        const rect = L.rectangle(
          [
            [rLatMin, rLonMin],
            [rLatMax, rLonMax],
          ],
          {
            renderer,
            color: isVolc ? "#fb923c" : isFocus ? "#22d3ee" : "#ca8a04",
            weight: isFocus ? 2.5 : isVolc ? 2 : 1.75,
            dashArray: isFocus ? undefined : "6 4",
            fillColor: isVolc ? "#fb923c" : isFocus ? "#22d3ee" : "#ca8a04",
            fillOpacity: isFocus ? 0.12 : isVolc ? 0.08 : 0.07,
            opacity: dimmed ? 0.25 : 0.95,
            interactive: true,
            bubblingMouseEvents: false,
          },
        );
        rect.bindTooltip(
          `${node.name} · ${nodeMarkChip(node)} — click to focus`,
          { sticky: true, direction: "top", opacity: 0.95, className: "ww-node-tip" },
        );
        rect.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          if (isFocus) exitToHomeView();
          else setFocusNode(node.id);
        });
        nodeLayer.current.addLayer(rect);
      }
    }
  }, [
    eq,
    minMag,
    maxMag,
    focusNodeId,
    setFocusNode,
    exitToHomeView,
    timeWindow,
    basemapStyle,
    focusMmi.eventId,
    focusMmi.status,
    overlays.quakes,
    overlays.heatmap,
    overlays.depthColor,
    overlays.timeDecay,
    overlays.nodes,
    overlays.corridors,
    volcWatchNodes,
    globalSeismic,
    overlays.globalActivity,
    overlays.significant,
    replayActive,
    replayCursorMs,
    pickEvent,
  ]);

  useEffect(() => {
    if (!volcLayer.current) return;
    volcLayer.current.clearLayers();
    if (!overlays.volcanoes) return;

    const renderer = vectorRenderer.current ?? undefined;
    const focus = getFocusNode(focusNodeId);
    let features = volc?.features ?? [];
    if (focus) {
      features = features.filter((f) => {
        const [lon, lat] = f.geometry.coordinates;
        return pointInBounds(lat, lon, focus.bounds);
      });
    }
    for (const f of features) {
      const [lon, lat] = f.geometry.coordinates;
      const mag = f.properties.mag ?? 0;
      const place = f.properties.place ?? "Volcanic activity";
      const marker = L.circleMarker(pacificLatLng(lat, lon), {
        renderer,
        radius: 10,
        color: "#fff",
        fillColor: "#f97316",
        fillOpacity: 0.65,
        weight: 2,
        dashArray: "2 3",
        bubblingMouseEvents: false,
      });
      marker.bindPopup(
        `<strong style="color:#ea580c">M${mag.toFixed(1)}</strong><br/>${place}<br/><span style="color:#64748b;font-size:11px">USGS volcanic earthquake / proxy</span>`,
      );
      volcLayer.current.addLayer(marker);
    }

    // World elevated: USGS HANS + GVP weekly/recent + INGV (deduped, capped)
    for (const v of usgsVolcAlerts) {
      if (v.lat == null || v.lon == null) continue;
      if (focus) {
        // still show elevated outside focus — they're rare ops pins
      }
      const fill =
        v.colorCode === "RED"
          ? "#f43f5e"
          : v.colorCode === "ORANGE"
            ? "#fb923c"
            : v.colorCode === "YELLOW"
              ? "#fbbf24"
              : "#34d399";
      const marker = L.circleMarker(pacificLatLng(v.lat, v.lon), {
        renderer,
        radius: 11,
        color: "#0f172a",
        fillColor: fill,
        fillOpacity: 0.85,
        weight: 2.5,
        bubblingMouseEvents: false,
      });
      const notice = v.noticeUrl
        ? `<br/><a href="${v.noticeUrl}" target="_blank" rel="noopener">Official notice</a>`
        : "";
      const elev =
        v.elevationM != null ? `<br/>Elev ${Math.round(v.elevationM)} m` : "";
      const nodeId = nodeIdForAlert(v);
      const isFocus = focusNodeId === nodeId;
      const gvp = gvpProfileUrl(v.vnum);
      const gvpL = gvp
        ? `<br/><a href="${gvp}" target="_blank" rel="noopener" style="color:#fb923c;font-weight:600">Smithsonian GVP →</a>`
        : "";
      marker.bindPopup(
        `<strong style="color:${fill}">${v.name}</strong><br/>` +
          `<span style="font-size:11px;font-weight:700">${v.alertLevel} · ${v.colorCode}${
            (v as { officialNative?: string }).officialNative
              ? " · " + (v as { officialNative?: string }).officialNative
              : ""
          }</span><br/>` +
          `<span style="color:#64748b;font-size:11px">${v.obsName}${v.region ? " · " + v.region : ""}</span>` +
          elev +
          notice +
          gvpL +
          `<br/><span style="color:#64748b;font-size:10px">${alertSourceLabel(v)} · not a forecast</span>` +
          `<br/><button type="button" class="ww-volc-focus-btn" data-node="${nodeId}" style="margin-top:6px;cursor:pointer;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:11px">${isFocus ? "Home view" : "Focus region"}</button>`,
      );
      marker.on("popupopen", () => {
        const btn = document.querySelector(`.ww-volc-focus-btn[data-node="${nodeId}"]`);
        if (btn) {
          btn.addEventListener(
            "click",
            () => {
              if (isFocus) exitToHomeView();
              else setFocusNode(nodeId);
              mapObj.current?.closePopup();
            },
            { once: true },
          );
        }
      });
      volcLayer.current.addLayer(marker);
    }
  }, [volc, usgsVolcAlerts, focusNodeId, overlays.volcanoes, setFocusNode, exitToHomeView]);

  // Opt-in Smithsonian GVP Holocene (eruption ≥ 2010)
  useEffect(() => {
    if (!gvpLayer.current) return;
    gvpLayer.current.clearLayers();
    const map = mapObj.current;
    if (!map) return;
    if (overlays.globalVolcanoes) {
      if (!map.hasLayer(gvpLayer.current)) gvpLayer.current.addTo(map);
    } else {
      if (map.hasLayer(gvpLayer.current)) map.removeLayer(gvpLayer.current);
      return;
    }
    const renderer = vectorRenderer.current ?? undefined;
    for (const v of gvpVolcanoes) {
      const isFocus = focusNodeId === v.id || focusNodeId === `gvp-${v.vnum}`;
      const marker = L.circleMarker(pacificLatLng(v.lat, v.lon), {
        renderer,
        radius: isFocus ? 10 : 5,
        color: isFocus ? "#fff" : "#7c3aed",
        fillColor: "#a78bfa",
        fillOpacity: isFocus ? 0.85 : 0.55,
        weight: isFocus ? 2.5 : 1,
        bubblingMouseEvents: false,
      });
      const elev =
        v.elevationM != null ? ` · ${Math.round(v.elevationM)} m` : "";
      const year =
        v.lastEruptionYear != null ? `Last eruption ${v.lastEruptionYear}` : "Holocene";
      marker.bindPopup(
        `<strong style="color:#a78bfa">${v.name}</strong><br/>` +
          `<span style="color:#64748b;font-size:11px">${[v.country, v.region].filter(Boolean).join(" · ")}${elev}</span><br/>` +
          `<span style="font-size:11px">${year}</span>` +
          `<br/><a href="${v.gvpUrl}" target="_blank" rel="noopener" style="color:#fb923c;font-weight:600">Smithsonian GVP →</a>` +
          `<br/><button type="button" class="ww-gvp-focus-btn" data-id="${v.id}" style="margin-top:6px;cursor:pointer;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:11px">${isFocus ? "Home view" : "Focus region"}</button>`,
      );
      marker.on("popupopen", () => {
        const btn = document.querySelector(`.ww-gvp-focus-btn[data-id="${v.id}"]`);
        if (btn) {
          btn.addEventListener(
            "click",
            () => {
              if (isFocus) exitToHomeView();
              else focusGvpVolcano(v);
              mapObj.current?.closePopup();
            },
            { once: true },
          );
        }
      });
      gvpLayer.current.addLayer(marker);
    }
  }, [gvpVolcanoes, overlays.globalVolcanoes, focusNodeId, focusGvpVolcano, exitToHomeView]);

  const dismissTip = () => {
    setShowGestureTip(false);
    try {
      localStorage.setItem("wolfwatch_gesture_tip_v1", "1");
    } catch {
      /* ignore */
    }
  };

  useAmbientMapLayers(mapView === "2d" ? mapInstance : null);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden sm:min-h-[280px]">
      <div
        ref={mapRef}
        className="ww-map h-full min-h-0 w-full"
        style={{ display: mapView === "2d" ? "block" : "none" }}
      />
      {mapView === "2d" && (
        <>
          <NodeFocusBanner />
          <div className="pointer-events-none absolute right-2 top-14 z-[440] sm:top-16 sm:right-3">
            <AuroraOfficialPanel />
          </div>
          <MmiFocusBanner />
          <MapLegend />
          <EventReplayBar hideIdleOnMobile />
          <AtmosphereChrome map={mapInstance} />
          <AuWeatherDeskChip map={mapInstance} />
        </>
      )}
      {/* Layer bar mounts in ww-map-stage__dock (grid) from index — not over canvas */}

      {pressLabel && mapView === "2d" && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[520] -translate-x-1/2 rounded-full border border-border bg-bg/95 px-3 py-1.5 font-mono text-[0.7rem] text-primary shadow-lg backdrop-blur">
          {pressLabel}
        </div>
      )}

      {showGestureTip && mapView === "2d" && !isMobileMap && (
        <div className="absolute bottom-[4.6rem] left-1/2 z-[510] w-[min(92%,16rem)] -translate-x-1/2 rounded-lg border border-border bg-bg/95 p-2 text-[0.65rem] text-muted shadow-xl backdrop-blur sm:bottom-20">
          <div className="mb-0.5 font-semibold text-fg">Touch</div>
          <ul className="mb-1.5 space-y-0.5 text-[0.62rem] leading-snug text-dim">
            <li>Drag · pinch · double-tap zoom</li>
            <li>Long-press coords</li>
          </ul>
          <button type="button" className="ww-btn w-full text-[0.7rem]" onClick={dismissTip}>
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
