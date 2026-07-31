import { useEffect, useRef, useState } from "react";
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
import { pointInBounds, boundsToLeafletRects } from "@/lib/geo/bounds";
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
import { MapStyleControl } from "@/components/map/MapStyleControl";
import { MapLegend } from "@/components/map/MapLegend";
import { MmiFocusBanner } from "@/components/map/MmiFocusBanner";
import { EventReplayBar } from "@/components/map/EventReplayBar";

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
  };
  if (style.subdomains) opts.subdomains = style.subdomains;
  return L.tileLayer(style.url, opts);
}

export function LiveMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const baseLayer = useRef<L.TileLayer | null>(null);
  const canvasRenderer = useRef<L.Canvas | null>(null);
  const eqLayer = useRef<L.LayerGroup | null>(null);
  const nodeLayer = useRef<L.LayerGroup | null>(null);
  const volcLayer = useRef<L.LayerGroup | null>(null);
  const heatLayer = useRef<ReturnType<typeof createQuakeHeatLayer> | null>(null);
  const mmiLayer = useRef<MmiContourLayer | null>(null);
  const plateLayer = useRef<PlateLayerHandle | null>(null);
  const touchHandle = useRef<MapTouchHandle | null>(null);

  const [pressLabel, setPressLabel] = useState<string | null>(null);
  const [showGestureTip, setShowGestureTip] = useState(false);

  const eq = useObservatory((s) => s.eq);
  const volc = useObservatory((s) => s.volc);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const volcWatchNodes = useObservatory((s) => s.volcWatchNodes);
  const globalSeismic = useObservatory((s) => s.globalSeismic);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const mapView = useObservatory((s) => s.mapView);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const basemapStyle = useObservatory((s) => s.basemapStyle);
  const overlays = useObservatory((s) => s.overlays);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const focusMmi = useObservatory((s) => s.focusMmi);
  const mapFlyTo = useObservatory((s) => s.mapFlyTo);
  const clearMapFlyTo = useObservatory((s) => s.clearMapFlyTo);
  const replayActive = useObservatory((s) => s.replayActive);
  const replayCursorMs = useObservatory((s) => s.replayCursorMs);

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
    if (!pressLabel) return;
    const t = setTimeout(() => setPressLabel(null), 2800);
    return () => clearTimeout(t);
  }, [pressLabel]);

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      worldCopyJump: true,
      zoomControl: false,
      preferCanvas: true,
      fadeAnimation: false,
      markerZoomAnimation: false,
      zoomAnimation: true,
      // Touch / interaction
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
      boxZoom: true,
      keyboard: true,
      bounceAtZoomLimits: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    touchHandle.current = attachMapTouchGestures(map, {
      doubleTapZoomDelta: 1,
      longPressMs: 500,
      onLongPress: (lat, lon) => {
        setPressLabel(`${lat.toFixed(2)}°, ${lon.toFixed(2)}° · long-press`);
      },
    });

    canvasRenderer.current = L.canvas({ padding: 0.5 });
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
    eqLayer.current = L.layerGroup().addTo(map);
    nodeLayer.current = L.layerGroup().addTo(map);
    volcLayer.current = L.layerGroup().addTo(map);
    mapObj.current = map;

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
      baseLayer.current = null;
      canvasRenderer.current = null;
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
    if (mapView === "2d" && mapObj.current) {
      setTimeout(() => mapObj.current?.invalidateSize(), 80);
    }
  }, [mapView]);

  useEffect(() => {
    const map = mapObj.current;
    if (!map || !mapFlyTo || mapView !== "2d") return;
    map.flyTo([mapFlyTo.lat, mapFlyTo.lon], mapFlyTo.zoom ?? 6, {
      animate: true,
      duration: 0.85,
    });
    clearMapFlyTo();
  }, [mapFlyTo, mapView, clearMapFlyTo]);

  useEffect(() => {
    plateLayer.current?.setActive(!!overlays.plates);
  }, [overlays.plates]);

  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    const node = getFocusNode(focusNodeId);
    if (!node) {
      if (focusNodeId === null) {
        map.setView([20, 0], 2, { animate: true });
      }
      return;
    }
    const rects = boundsToLeafletRects(node.bounds);
    if (rects.length === 1) {
      const [[latMin, lonMin], [latMax, lonMax]] = rects[0]!;
      map.fitBounds(
        [
          [latMin, lonMin],
          [latMax, lonMax],
        ],
        { padding: [40, 40], maxZoom: 6, animate: true },
      );
    } else if (node.center) {
      map.setView(node.center, 5, { animate: true });
    } else {
      const [[latMin, lonMin], [latMax, lonMax]] = rects[0]!;
      map.fitBounds(
        [
          [latMin, lonMin],
          [latMax, lonMax],
        ],
        { padding: [40, 40], maxZoom: 5, animate: true },
      );
    }
  }, [focusNodeId]);

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
    sync(nodeLayer.current, overlays.nodes || overlays.corridors);
    sync(volcLayer.current, overlays.volcanoes);
    heatLayer.current?.setActive(overlays.heatmap);
  }, [overlays]);

  useEffect(() => {
    if (!eqLayer.current || !nodeLayer.current) return;
    eqLayer.current.clearLayers();
    nodeLayer.current.clearLayers();

    const renderer = canvasRenderer.current ?? undefined;
    const sat = basemapStyle === "satellite";
    const all = filteredEq(eq?.features, minMag, maxMag);
    const focus = getFocusNode(focusNodeId);
    let features = focus
      ? all.filter((f) => {
          const [lon, lat] = f.geometry.coordinates;
          return pointInBounds(lat, lon, focus.bounds);
        })
      : all;

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
      for (const f of features) {
        const [lon, lat] = f.geometry.coordinates;
        const mag = f.properties.mag ?? 0;
        const depth = eqDepthKm(f);
        const place = f.properties.place ?? "Unknown";
        const time = f.properties.time
          ? new Date(f.properties.time).toUTCString()
          : "—";
        const isSig = mag >= 6;
        const radius = Math.max(
          5,
          Math.min(22, (mag - 2) * 3.4) + (isSig && overlays.significant ? 3 : 0),
        );
        const fill = overlays.depthColor ? depthColor(depth) : magColor(mag);
        const stroke = isSig
          ? "#fbbf24"
          : sat
            ? "#ffffff"
            : overlays.depthColor
              ? magColor(mag)
              : "#0f172a";
        const mmi = f.properties.mmi;
        const sm =
          hasShakeMapProduct(f.properties.types) ||
          (mmi != null && Number.isFinite(mmi));
        const smUrl = shakeMapEventUrl(f.id);
        const pageUrl = f.properties.url || eventPageUrl(f.id);
        const isMmiSource =
          focusMmi.eventId && f.id === focusMmi.eventId && focusMmi.status === "ready";

        const marker = L.circleMarker([lat, lon], {
          renderer,
          radius: isMmiSource ? radius + 3 : radius,
          color: isMmiSource ? "#fbbf24" : stroke,
          fillColor: fill,
          fillOpacity: overlays.heatmap ? 0.62 : sat ? 0.95 : 0.9,
          weight: isMmiSource || isSig ? 2.5 : sat ? 2 : overlays.depthColor ? 1.75 : 1.25,
          opacity: 0.95,
          bubblingMouseEvents: false,
        });
        marker.bindPopup(() => {
          const el = document.createElement("div");
          const mmiLine =
            mmi != null && Number.isFinite(mmi)
              ? `<br/><span style="color:#0e7490;font-size:11px">USGS MMI ~${formatMmi(mmi)}${sm ? " · ShakeMap product" : ""}</span>`
              : "";
          const contourNote = isMmiSource
            ? `<br/><span style="color:#ca8a04;font-size:11px">★ MMI contours drawn for this event</span>`
            : "";
          const sigNote = isSig
            ? `<br/><span style="color:#fbbf24;font-size:11px">Significant · M≥6</span>`
            : "";
          const smLink =
            sm && smUrl
              ? `<br/><a href="${smUrl}" target="_blank" rel="noopener noreferrer" style="color:#0891b2;font-weight:600;font-size:11px">Open official USGS ShakeMap →</a>`
              : pageUrl
                ? `<br/><a href="${pageUrl}" target="_blank" rel="noopener noreferrer" style="color:#64748b;font-size:11px">USGS event page →</a>`
                : "";
          el.innerHTML = `<strong style="color:${fill}">M${mag.toFixed(1)}</strong>
            <span style="color:#64748b;font-size:11px"> · ${depth.toFixed(0)} km</span>${sigNote}${mmiLine}${contourNote}<br/>
            ${place}<br/>
            <span style="color:#64748b;font-size:11px">${time}</span>${smLink}`;
          return el;
        });
        eqLayer.current.addLayer(marker);
      }
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
        const marker = L.circleMarker([lat, lon], {
          renderer,
          radius: sig ? 8 : 5,
          color: sig ? "#fbbf24" : "#64748b",
          fillColor: sig ? "#f59e0b" : "#94a3b8",
          fillOpacity: 0.35,
          weight: 1,
          opacity: 0.75,
          bubblingMouseEvents: false,
        });
        marker.bindPopup(
          `<strong style="color:#fbbf24">M${mag.toFixed(1)}</strong> · global 24h<br/>` +
            `${f.properties.place || "Event"}<br/>` +
            `<span style="color:#64748b;font-size:11px">USGS world layer</span>`,
        );
        eqLayer.current?.addLayer(marker);
      }
    }

        const allNodes = getAllFocusNodes();
    for (const node of allNodes) {
      const st = nodeStatus(all, node);
      const [[latMin, lonMin], [latMax, lonMax]] = node.bounds;
      const clat = node.center?.[0] ?? (latMin + latMax) / 2;
      const clon =
        node.center?.[1] ?? (lonMin <= lonMax ? (lonMin + lonMax) / 2 : -175);
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
        const ring = L.circleMarker([clat, clon], {
          renderer,
          radius: isFocus
            ? 17
            : isVolc
              ? 15
              : isPublished
                ? 13
                : st === "watch"
                  ? 14
                  : st === "active"
                    ? 11
                    : 9,
          color: sat ? "#fff" : color,
          fillColor: color,
          fillOpacity: isFocus ? 0.35 : isVolc ? 0.3 : isPublished ? 0.22 : 0.16,
          weight: isFocus || isVolc ? 3 : isPublished ? 2.5 : 2,
          opacity: dimmed ? 0.3 : 0.95,
          dashArray:
            st === "quiet" && !isPublished && !isFocus && !isVolc ? "4 4" : undefined,
          bubblingMouseEvents: false,
        });

        const monitorLink =
          node.monitorUrl && !isVolc
            ? `<br/><a href="${node.monitorUrl}" target="_blank" rel="noopener noreferrer" style="color:#0891b2;font-weight:600">Open full swarm board →</a>`
            : node.monitorUrl && isVolc
              ? `<br/><a href="${node.monitorUrl}" target="_blank" rel="noopener noreferrer" style="color:#fb923c;font-weight:600">Volcano profile →</a>`
              : "";
        const gvpLink = node.gvpUrl
          ? `<br/><a href="${node.gvpUrl}" target="_blank" rel="noopener noreferrer" style="color:#fb923c;font-weight:600">Smithsonian GVP →</a>`
          : "";
        const kvertLink = node.agencyUrl
          ? `<br/><a href="${node.agencyUrl}" target="_blank" rel="noopener noreferrer" style="color:#22d3ee;font-weight:600">KVERT →</a>`
          : "";
        const badge = isVolc
          ? `<br/><span style="color:#fb923c;font-size:11px">${
              node.id.startsWith("usgs-volc-")
                ? "USGS elevated watch (live · drops at GREEN)"
                : "Active volcano watch"
            }${node.aviationCode ? ` · Aviation ${node.aviationCode.toUpperCase()}` : ""}</span>`
          : isPublished
            ? `<br/><span style="color:#ca8a04;font-size:11px">★ Published focused node</span>`
            : "";
        const note = node.focusNote
          ? `<br/><span style="color:#64748b;font-size:11px">${node.focusNote}</span>`
          : "";
        ring.bindPopup(
          `<strong>${node.name}</strong>${badge}<br/><span style="color:#64748b">${node.role}</span><br/>Status: <b style="color:${color}">${st}</b>${note}${gvpLink}${kvertLink}${monitorLink}<br/><button type="button" class="ww-focus-btn" data-node="${node.id}" style="margin-top:6px;cursor:pointer;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:11px">${isFocus ? "Exit focus" : "Focus this watch"}</button>`,
        );
        ring.on("popupopen", () => {
          const btn = document.querySelector(`.ww-focus-btn[data-node="${node.id}"]`);
          if (btn) {
            btn.addEventListener(
              "click",
              () => {
                setFocusNode(isFocus ? null : node.id);
                mapObj.current?.closePopup();
              },
              { once: true },
            );
          }
        });
        nodeLayer.current.addLayer(ring);
      }

      if (overlays.corridors && (isFocus || isPublished || isPriority)) {
        for (const rectBounds of boundsToLeafletRects(node.bounds)) {
          const [[rLatMin, rLonMin], [rLatMax, rLonMax]] = rectBounds;
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
              interactive: false,
            },
          );
          nodeLayer.current.addLayer(rect);
        }
      }
    }
  }, [
    eq,
    minMag,
    maxMag,
    focusNodeId,
    setFocusNode,
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
  ,
    replayActive,
    replayCursorMs,
  ]);

  useEffect(() => {
    if (!volcLayer.current) return;
    volcLayer.current.clearLayers();
    if (!overlays.volcanoes) return;

    const renderer = canvasRenderer.current ?? undefined;
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
      const marker = L.circleMarker([lat, lon], {
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

    // USGS HANS elevated volcanoes (alert level / aviation color)
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
      const marker = L.circleMarker([v.lat, v.lon], {
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
      marker.bindPopup(
        `<strong style="color:${fill}">${v.name}</strong><br/>` +
          `<span style="font-size:11px">${v.alertLevel} · Aviation ${v.colorCode}</span><br/>` +
          `<span style="color:#64748b;font-size:11px">${v.obsName}${v.region ? " · " + v.region : ""}</span>` +
          elev +
          notice +
          `<br/><span style="color:#64748b;font-size:10px">USGS HANS · not a forecast</span>`,
      );
      volcLayer.current.addLayer(marker);
    }
  }, [volc, usgsVolcAlerts, focusNodeId, overlays.volcanoes]);

  const dismissTip = () => {
    setShowGestureTip(false);
    try {
      localStorage.setItem("wolfwatch_gesture_tip_v1", "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="relative h-full min-h-[280px] w-full overflow-hidden rounded-lg border border-border"
      style={{ display: mapView === "2d" ? "block" : "none" }}
    >
      <div ref={mapRef} className="ww-map h-full min-h-[280px] w-full" />
      <NodeFocusBanner />
      <MmiFocusBanner />
      {mapView === "2d" && (
        <>
          <MapLegend />
          <MapStyleControl />
          <EventReplayBar />
        </>
      )}

      {pressLabel && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[520] -translate-x-1/2 rounded-full border border-border bg-bg/95 px-3 py-1.5 font-mono text-[0.7rem] text-primary shadow-lg backdrop-blur">
          {pressLabel}
        </div>
      )}

      {showGestureTip && mapView === "2d" && (
        <div className="absolute bottom-[4.6rem] left-1/2 z-[510] w-[min(92%,20rem)] -translate-x-1/2 rounded-xl border border-border bg-bg/95 p-3 text-xs text-muted shadow-xl backdrop-blur sm:bottom-20">
          <div className="mb-1 font-semibold text-fg">Touch map</div>
          <ul className="mb-2 space-y-0.5 text-[0.7rem] leading-snug text-dim">
            <li>Drag to pan · pinch to zoom</li>
            <li>Double-tap to zoom in</li>
            <li>Long-press for coordinates</li>
            <li>Swipe tabs left/right between views</li>
          </ul>
          <button type="button" className="ww-btn w-full text-[0.7rem]" onClick={dismissTip}>
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
