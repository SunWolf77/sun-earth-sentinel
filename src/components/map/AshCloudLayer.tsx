/**
 * Washington VAAC KML polygons on the 2D map. Official geometry only.
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useObservatory } from "@/store/observatory";
import { loadWashingtonVaac } from "@/lib/feeds/vaacProxy";
import type { VaacBundle } from "@/lib/feeds/vaac";
import { toPacificLon } from "@/lib/geo/bounds";

export function useAshCloudLayer(map: L.Map | null) {
  const overlays = useObservatory((s) => s.overlays);
  const groupRef = useRef<L.LayerGroup | null>(null);
  const [bundle, setBundle] = useState<VaacBundle | null>(null);

  useEffect(() => {
    if (!overlays.volcanoes) return;
    let live = true;
    void loadWashingtonVaac().then((b) => {
      if (live) setBundle(b);
    });
    return () => {
      live = false;
    };
  }, [overlays.volcanoes]);

  useEffect(() => {
    if (!map) return;
    try {
      if (!map.getPane("mapPane") || map.getContainer().offsetWidth < 2) return;
    } catch {
      return;
    }
    if (!groupRef.current) groupRef.current = L.layerGroup().addTo(map);
    const g = groupRef.current;
    g.clearLayers();
    if (!overlays.volcanoes || !bundle) return;

    for (const a of bundle.advisories) {
      for (const ring of a.rings) {
        const latlngs = ring.latlngs.map(([lat, lon]) => [lat, toPacificLon(lon)] as [number, number]);
        const poly = L.polygon(latlngs, {
          color: ring.forecast ? "#eab308" : "#f43f5e",
          weight: ring.forecast ? 1.25 : 2,
          dashArray: ring.forecast ? "4 3" : undefined,
          fillColor: ring.forecast ? "#eab308" : "#f43f5e",
          fillOpacity: ring.forecast ? 0.08 : 0.18,
          interactive: true,
        });
        poly.bindTooltip(
          `${a.volcano} · ${ring.folder}${ring.fl ? ` · ${ring.fl}` : ""} · Washington VAAC — not SES`,
          { sticky: true, className: "ww-node-tip" },
        );
        g.addLayer(poly);
      }
    }

    return () => {
      g.clearLayers();
    };
  }, [map, overlays.volcanoes, bundle]);
}
