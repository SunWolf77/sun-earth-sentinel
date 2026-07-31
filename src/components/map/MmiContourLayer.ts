import L from "leaflet";
import { mmiContourColor, type MmiContourCollection } from "@/lib/seismology/shakemap";

/**
 * Leaflet GeoJSON layer for USGS cont_mmi.json (MultiLineString contours).
 * Official product only — no local interpolation.
 */
export function createMmiContourLayer(): L.GeoJSON {
  const layer = L.geoJSON(undefined, {
    style: (feature) => {
      const v = Number(feature?.properties?.value ?? 0);
      const color =
        (feature?.properties?.color as string | undefined) || mmiContourColor(v);
      const weight = Number(feature?.properties?.weight ?? 0) || Math.max(2, Math.min(5, 1.5 + v * 0.45));
      return {
        color,
        weight,
        opacity: 0.88,
        fillOpacity: 0,
        lineCap: "round",
        lineJoin: "round",
        interactive: true,
      };
    },
    onEachFeature: (feature, lyr) => {
      const v = feature.properties?.value;
      if (v != null) {
        lyr.bindTooltip(`MMI ${Number(v).toFixed(1)}`, {
          sticky: true,
          direction: "top",
          className: "ww-mmi-tip",
        });
      }
    },
  });

  (layer as L.GeoJSON & { setContours: (g: MmiContourCollection | null) => void }).setContours =
    function setContours(g: MmiContourCollection | null) {
      this.clearLayers();
      if (g?.features?.length) {
        this.addData(g as GeoJSON.GeoJsonObject);
      }
    };

  return layer;
}

export type MmiContourLayer = L.GeoJSON & {
  setContours: (g: MmiContourCollection | null) => void;
};
