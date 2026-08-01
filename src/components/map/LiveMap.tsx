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
import { gvpProfileUrl } from "@/lib/feeds/gvpGlobal";
import { nodeIdForAlert } from "@/lib/feeds/watchlistOverride";
import { monitorHandoffUrl } from "@/lib/feeds/publishedMonitors";
import { formatUtc } from "@/lib/utils";
import {
  agencyLinksForEvent,
  agencyLinksHtml,
} from "@/lib/seismology/agencyLinks";
import { isJmaFeature } from "@/lib/feeds/jma";
import {
  clusterEqPoints,
  spiderfyOffsets,
  spiderPinLatLon,
  type EqPoint,
} from "@/lib/map/eqCluster";
import type { EqFeature } from "@/lib/feeds/usgs";

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
  const srcBadge = isJma
    ? `<span style="color:#22d3ee;font-size:10px;font-weight:600"> · JMA</span>`
    : f.properties.jmaEnriched
      ? `<span style="color:#22d3ee;font-size:10px"> · +JMA</span>`
      : "";
  return `<div style="font-weight:700;color:${fill};font-size:14px">M${mag.toFixed(1)}${sigNote}${srcBadge}</div>
              <div style="color:#94a3b8;font-size:11px;margin-top:2px">${depth.toFixed(0)} km depth · ${coords}</div>
              <div style="margin-top:4px;color:#e2e8f0">${place}</div>
              <div style="color:#64748b;font-size:11px;margin-top:3px">${time}</div>
              ${metaBits ? `<div style="color:#64748b;font-size:10px;margin-top:2px">${metaBits}${eventId ? ` · ${eventId}` : ""}</div>` : eventId ? `<div style="color:#64748b;font-size:10px;margin-top:2px">${eventId}</div>` : ""}
              ${jmaNote}${mmiLine}${contourNote}${smLink}
              <div style="margin-top:6px;padding-top:6px;border-top:1px solid #1e293b;color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:.04em">Agency assessment</div>
              ${opts.agencyHtml}`;
}

function makeEqPinIcon(mag: number, fill: string, isSig: boolean): L.DivIcon {
  const label = mag >= 10 ? "10" : mag.toFixed(1);
  return L.divIcon({
    className: "ww-eq-pin-wrap",
    html: `<div class="ww-eq-pin${isSig ? " ww-eq-pin--sig" : ""}" title="M${label}">
      <div class="ww-eq-pin__head" style="background:${fill}"></div>
      <div class="ww-eq-pin__dot"></div>
      <div class="ww-eq-pin__label">${label}</div>
    </div>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [0, -28],
  });
}

function makeClusterIcon(count: number, maxMag: number, fill: string): L.DivIcon {
  const hot = maxMag >= 6 || count >= 8;
  const size = hot ? 32 : 28;
  return L.divIcon({
    className: "ww-eq-cluster",
    html: `<div class="ww-eq-cluster__badge${hot ? " ww-eq-cluster__badge--hot" : ""}" style="background:${fill}" title="${count} events · max M${maxMag.toFixed(1)} — click to expand pins">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function LiveMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const baseLayer = useRef<L.TileLayer | null>(null);
  /** SVG for interactive markers — full-map canvas steals clicks from EQ popups. */
  const vectorRenderer = useRef<L.SVG | null>(null);
  const eqLayer = useRef<L.LayerGroup | null>(null);
  const nodeLayer = useRef<L.LayerGroup | null>(null);
  const volcLayer = useRef<L.LayerGroup | null>(null);
  const gvpLayer = useRef<L.LayerGroup | null>(null);
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
  const [mapZoom, setMapZoom] = useState(2);
  const expandedClusters = useRef(new Set<string>());
  const [clusterTick, setClusterTick] = useState(0);

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
      preferCanvas: false,
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

    vectorRenderer.current = L.svg({ padding: 0.5 });
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
    gvpLayer.current = L.layerGroup().addTo(map);
    mapObj.current = map;
    setMapZoom(map.getZoom());
    map.on("zoomend", () => {
      setMapZoom(map.getZoom());
      // Collapse spiderfy on zoom — pins recluster at new scale
      if (expandedClusters.current.size) {
        expandedClusters.current.clear();
        setClusterTick((n) => n + 1);
      }
    });

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
    if (gvpLayer.current) sync(gvpLayer.current, overlays.globalVolcanoes);
    heatLayer.current?.setActive(overlays.heatmap);
  }, [overlays]);

  useEffect(() => {
    if (!eqLayer.current || !nodeLayer.current) return;
    eqLayer.current.clearLayers();
    nodeLayer.current.clearLayers();

    const renderer = vectorRenderer.current ?? undefined;
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
      const points: EqPoint[] = features.map((f) => {
        const [lon, lat] = f.geometry.coordinates;
        return { f, lat, lon, mag: f.properties.mag ?? 0 };
      });
      const clusters = clusterEqPoints(points, mapZoom, 30);
      
      const addFeatureMarker = (
        f: EqFeature,
        lat: number,
        lon: number,
        asPin: boolean,
        /** Pin display position (spider offset); data/lat lon stay true hypocenter */
        pinLat = lat,
        pinLon = lon,
      ) => {
        const mag = f.properties.mag ?? 0;
        const depth = eqDepthKm(f);
        const place = f.properties.place ?? "Unknown";
        const time = formatUtc(f.properties.time);
        const isSig = mag >= 6;
        const isJma = isJmaFeature(f);
        const fill = overlays.depthColor ? depthColor(depth) : magColor(mag);
        const stroke = isSig
          ? "#fbbf24"
          : isJma
            ? "#22d3ee"
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
        const eventId = f.id != null ? String(f.id) : "";
        const agencyLinks = agencyLinksForEvent({
          lat,
          lon,
          eventId,
          place,
          url: pageUrl,
        });
        const agencyHtml = agencyLinksHtml(agencyLinks);
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
          agencyHtml,
        });
        const onPick = () => {
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
        };

        if (asPin) {
          const pin = L.marker([pinLat, pinLon], {
            icon: makeEqPinIcon(mag, fill, isSig),
            riseOnHover: true,
            keyboard: true,
          });
          pin.bindPopup(popupHtml, {
            className: "ww-eq-popup",
            maxWidth: 300,
            autoPan: true,
          });
          pin.on("click", onPick);
          eqLayer.current?.addLayer(pin);
          return;
        }

        const radius = Math.max(
          4,
          Math.min(18, (mag - 3.2) * 3.0) + (isSig && overlays.significant ? 3 : 0),
        );
        const marker = L.circleMarker([lat, lon], {
          renderer,
          radius: isMmiSource ? radius + 3 : radius,
          color: isMmiSource ? "#fbbf24" : stroke,
          fillColor: fill,
          fillOpacity: overlays.heatmap ? 0.55 : sat ? 0.82 : 0.88,
          weight: isMmiSource || isSig ? 2.5 : sat ? 2 : overlays.depthColor ? 1.75 : 1.25,
          opacity: 0.95,
          bubblingMouseEvents: true,
        });
        marker.bindPopup(popupHtml, {
          className: "ww-eq-popup",
          maxWidth: 300,
          autoPan: true,
        });
        marker.on("click", onPick);
        eqLayer.current?.addLayer(marker);
      };

      for (const cl of clusters) {
        if (cl.points.length === 1) {
          const p = cl.points[0]!;
          addFeatureMarker(p.f, p.lat, p.lon, false);
          continue;
        }

        const expanded = expandedClusters.current.has(cl.key);
        if (expanded) {
          // Spiderfy: legs + pins so each stacked event is selectable
          const offs = spiderfyOffsets(cl.points.length);
          for (let i = 0; i < cl.points.length; i++) {
            const p = cl.points[i]!;
            const o = offs[i] ?? { dLat: 0, dLon: 0 };
            const [plat, plon] = spiderPinLatLon(cl.lat, cl.lon, o.dLat, o.dLon);
            const leg = L.polyline(
              [
                [cl.lat, cl.lon],
                [plat, plon],
              ],
              {
                color: "#94a3b8",
                weight: 1.25,
                opacity: 0.55,
                interactive: false,
                renderer,
              },
            );
            eqLayer.current?.addLayer(leg);
            addFeatureMarker(p.f, p.lat, p.lon, true, plat, plon);
          }
          // Center collapse control
          const fill = magColor(cl.maxMag);
          const collapse = L.marker([cl.lat, cl.lon], {
            icon: makeClusterIcon(cl.points.length, cl.maxMag, fill),
            zIndexOffset: 800,
            keyboard: true,
          });
          collapse.bindTooltip(
            `${cl.points.length} events · click to collapse pins`,
            { direction: "top", opacity: 0.95 },
          );
          collapse.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            expandedClusters.current.delete(cl.key);
            setClusterTick((n) => n + 1);
          });
          eqLayer.current?.addLayer(collapse);
        } else {
          const fill = magColor(cl.maxMag);
          const badge = L.marker([cl.lat, cl.lon], {
            icon: makeClusterIcon(cl.points.length, cl.maxMag, fill),
            zIndexOffset: 600,
            keyboard: true,
          });
          const top = cl.points
            .slice(0, 3)
            .map((p) => `M${p.mag.toFixed(1)}`)
            .join(" · ");
          badge.bindTooltip(
            `${cl.points.length} nearby events (${top}${cl.points.length > 3 ? "…" : ""}) · click for pins`,
            { direction: "top", opacity: 0.95 },
          );
          badge.bindPopup(
            `<div style="font-weight:700;color:${fill}">${cl.points.length} clustered events</div>
             <div style="color:#94a3b8;font-size:11px;margin-top:4px">Max M${cl.maxMag.toFixed(1)} · click badge again to expand pins</div>
             <div style="margin-top:6px;color:#cbd5e1;font-size:11px">Each pin opens full agency / waveform links.</div>`,
            { className: "ww-eq-popup", maxWidth: 260 },
          );
          badge.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            expandedClusters.current.add(cl.key);
            setClusterTick((n) => n + 1);
          });
          eqLayer.current?.addLayer(badge);
        }
      }
      try {
        // @ts-expect-error LayerGroup may expose bringToFront at runtime
        eqLayer.current.bringToFront?.();
      } catch {
        /* ignore */
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

        const board =
          !isVolc && node.monitorUrl
            ? monitorHandoffUrl(node.id) || node.monitorUrl
            : null;
        const monitorLink = board
          ? `<br/><a href="${board}" target="_blank" rel="noopener noreferrer" style="color:#ca8a04;font-weight:600">Full swarm board (SES) →</a>`
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
            ? `<br/><span style="color:#ca8a04;font-size:11px">★ Published SES focus node</span>`
            : "";
        const note = node.focusNote
          ? `<br/><span style="color:#64748b;font-size:11px">${node.focusNote}</span>`
          : "";
        ring.bindPopup(
          `<strong>${node.name}</strong>${badge}<br/><span style="color:#64748b">${node.role}</span><br/>Status: <b style="color:${color}">${st}</b>${note}${gvpLink}${kvertLink}${monitorLink}<br/><button type="button" class="ww-focus-btn" data-node="${node.id}" style="margin-top:6px;cursor:pointer;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:11px">${isFocus ? "Home view" : "Focus region"}</button>`,
        );
        ring.on("popupopen", () => {
          const btn = document.querySelector(`.ww-focus-btn[data-node="${node.id}"]`);
          if (btn) {
            btn.addEventListener(
              "click",
              () => {
                if (isFocus) exitToHomeView();
                else setFocusNode(node.id);
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
    mapZoom,
    clusterTick,
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
      const nodeId = nodeIdForAlert(v);
      const isFocus = focusNodeId === nodeId;
      const gvp = gvpProfileUrl(v.vnum);
      const gvpL = gvp
        ? `<br/><a href="${gvp}" target="_blank" rel="noopener" style="color:#fb923c;font-weight:600">Smithsonian GVP →</a>`
        : "";
      marker.bindPopup(
        `<strong style="color:${fill}">${v.name}</strong><br/>` +
          `<span style="font-size:11px">${v.alertLevel} · Aviation ${v.colorCode}</span><br/>` +
          `<span style="color:#64748b;font-size:11px">${v.obsName}${v.region ? " · " + v.region : ""}</span>` +
          elev +
          notice +
          gvpL +
          `<br/><span style="color:#64748b;font-size:10px">USGS HANS · not a forecast</span>` +
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
      const marker = L.circleMarker([v.lat, v.lon], {
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
