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
import { pointInBounds, boundsToLeafletRects, toPacificLon } from "@/lib/geo/bounds";
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
import { AuroraOfficialPanel } from "@/components/map/AuroraOfficialPanel";
import { useAmbientMapLayers } from "@/components/map/AmbientLayers";
import { MapLegend } from "@/components/map/MapLegend";
import { MmiFocusBanner } from "@/components/map/MmiFocusBanner";
import { EventReplayBar } from "@/components/map/EventReplayBar";
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
import { shareUrlForPickedEvent } from "@/lib/pwa/shareFocus";

function makeTileLayer(styleId: keyof typeof BASEMAP_STYLES) {
  const style = BASEMAP_STYLES[styleId];
  const opts: L.TileLayerOptions = {
    attribution: style.attribution,
    maxZoom: style.maxZoom ?? 19,
    className: "ww-basemap",
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 1,
    crossOrigin: true,
    noWrap: true,
    bounds: L.latLngBounds(L.latLng(-58, 90), L.latLng(73, 250)),
  };
  if (style.subdomains) opts.subdomains = style.subdomains;
  return L.tileLayer(style.url, opts);
}
