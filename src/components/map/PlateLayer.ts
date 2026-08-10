import L from "leaflet";
import {
  loadPlateBoundaries,
  sampleMotionArrows,
  boundaryKind,
  BOUNDARY_COLORS,
  BOUNDARY_LABELS,
  type MotionArrow,
  type PlateBoundaryCollection,
} from "@/lib/tectonics/plates";
import { toPacificLon } from "@/lib/geo/bounds";

export type PlateLayerHandle = {
  group: L.LayerGroup;
  setActive: (on: boolean) => void;
  isActive: () => boolean;
  load: () => Promise<void>;
  destroy: () => void;
};

/**
 * PB2002 plate boundaries + MORVEL-style relative-motion arrows.
 *
 * Critical: arrows must NOT be interactive DOM markers on top of the map.
 * Full-size interactive markers sit in the marker pane (z above canvas quakes)
 * and steal every click — EQ popups never open. Arrows are visual-only;
 * boundary lines use SVG so only the stroke captures hover (not a full canvas).
 */
export function createPlateLayer(map: L.Map): PlateLayerHandle {
  const group = L.layerGroup();
  const lineGroup = L.layerGroup().addTo(group);
  const arrowGroup = L.layerGroup().addTo(group);
  /** SVG renderer: hits only land on stroke pixels, not a full-map canvas. */
  const svgRenderer = L.svg({ padding: 0.5 });

  let active = false;
  let loaded = false;
  let loading: Promise<void> | null = null;
  let data: PlateBoundaryCollection | null = null;

  function clear() {
    lineGroup.clearLayers();
    arrowGroup.clearLayers();
  }

  function arrowIcon(arrow: MotionArrow): L.DivIcon {
    const color = BOUNDARY_COLORS[arrow.kind];
    const len = Math.max(14, Math.min(28, 10 + arrow.speed * 0.18));
    const html = `<div class="ww-plate-arrow" style="--a:${arrow.bearing.toFixed(
      1,
    )}deg;--c:${color};--l:${len}px" title="${arrow.name} ${arrow.speed.toFixed(0)} mm/yr">
      <span class="ww-plate-arrow__shaft"></span>
      <span class="ww-plate-arrow__head"></span>
    </div>`;
    return L.divIcon({
      className: "ww-plate-arrow-wrap",
      html,
      iconSize: [len + 8, len + 8],
      iconAnchor: [(len + 8) / 2, (len + 8) / 2],
    });
  }

  function draw(collection: PlateBoundaryCollection) {
    clear();
    const geo = L.geoJSON(collection as GeoJSON.GeoJsonObject, {
      renderer: svgRenderer,
      interactive: true,
      // Pacific display frame (0…360) — continuous RoF plate lines
      coordsToLatLng: (coords: number[]) => {
        const lng = coords[0]!;
        const lat = coords[1]!;
        return L.latLng(lat, toPacificLon(lng));
      },
      style: (feat) => {
        const kind = boundaryKind(feat as never);
        return {
          color: BOUNDARY_COLORS[kind],
          weight: kind === "convergent" ? 2.25 : 1.75,
          opacity: 0.88,
          lineCap: "round" as const,
          lineJoin: "round" as const,
        };
      },
      onEachFeature: (feat, layer) => {
        const p = (feat.properties || {}) as {
          Name?: string;
          PlateA?: string;
          PlateB?: string;
          Type?: string;
        };
        const kind = boundaryKind(feat as never);
        const name = p.Name || "Boundary";
        layer.bindTooltip(
          `<strong style="color:${BOUNDARY_COLORS[kind]}">${name}</strong>
           · ${BOUNDARY_LABELS[kind]}${p.Type ? ` · ${p.Type}` : ""}
           <br/><span style="opacity:.85">${p.PlateA || "?"} / ${p.PlateB || "?"}</span>`,
          { sticky: true, className: "ww-plate-tip" },
        );
      },
    } as L.GeoJSONOptions);
    lineGroup.addLayer(geo);

    const mobile =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(max-width: 767px)").matches;
    const arrows = sampleMotionArrows(collection, {
      step: mobile ? 8 : 5,
      minSpeed: mobile ? 8 : 5,
    });
    const maxArrows = mobile ? 72 : 220;
    const step = Math.max(1, Math.ceil(arrows.length / maxArrows));
    for (let i = 0; i < arrows.length; i += step) {
      const a = arrows[i]!;
      // Visual only — must not steal clicks from canvas EQ markers underneath.
      const m = L.marker([a.lat, toPacificLon(a.lon)], {
        icon: arrowIcon(a),
        interactive: false,
        keyboard: false,
      });
      arrowGroup.addLayer(m);
    }
  }

  async function load() {
    if (loaded && data) {
      draw(data);
      return;
    }
    if (loading) return loading;
    loading = (async () => {
      data = await loadPlateBoundaries();
      loaded = true;
      if (active) draw(data);
    })();
    try {
      await loading;
    } finally {
      loading = null;
    }
  }

  return {
    group,
    setActive(on: boolean) {
      active = on;
      if (on) {
        if (!map.hasLayer(group)) group.addTo(map);
        void load();
      } else {
        clear();
        if (map.hasLayer(group)) map.removeLayer(group);
      }
    },
    isActive: () => active,
    load,
    destroy() {
      clear();
      if (map.hasLayer(group)) map.removeLayer(group);
      loaded = false;
      data = null;
    },
  };
}
