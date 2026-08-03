/**
 * Leaflet ambient layers: ISS, aurora oval, wildfires, closest NEO pin.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useObservatory } from "@/store/observatory";
import { issTrailPoints } from "@/lib/feeds/iss";
import { buildAuroraOval, latestKp } from "@/lib/feeds/auroraOval";
import { formatUtc } from "@/lib/utils";

export function useAmbientMapLayers(map: L.Map | null) {
  const groupRef = useRef<L.LayerGroup | null>(null);
  const overlays = useObservatory((s) => s.overlays);
  const iss = useObservatory((s) => s.issPosition);
  const wildfires = useObservatory((s) => s.wildfires);
  const neos = useObservatory((s) => s.neos);
  const kp = useObservatory((s) => s.kp);
  const auroraOfficial = useObservatory((s) => s.auroraOfficial);
  const pulseIss = useObservatory((s) => s.pulseIss);
  const ensureAmbient = useObservatory((s) => s.ensureAmbientLayers);

  useEffect(() => {
    if (!map) return;
    try {
      if (!map.getPane("mapPane") || map.getContainer().offsetWidth < 2) return;
    } catch {
      return;
    }
    if (!groupRef.current) {
      groupRef.current = L.layerGroup().addTo(map);
    }
    return () => {
      if (groupRef.current) {
        map.removeLayer(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [map]);

  // ISS poll while layer on
  useEffect(() => {
    if (!overlays.iss) return;
    void pulseIss();
    const id = window.setInterval(() => void pulseIss(), 12_000);
    return () => window.clearInterval(id);
  }, [overlays.iss, pulseIss]);

  useEffect(() => {
    if (overlays.wildfires || overlays.neos || overlays.iss) {
      void ensureAmbient(true);
    }
  }, [overlays.wildfires, overlays.neos, overlays.iss, ensureAmbient]);

  useEffect(() => {
    const g = groupRef.current;
    if (!map || !g) return;
    try {
      if (!map.getPane("mapPane") || map.getContainer().offsetWidth < 2) return;
    } catch {
      return;
    }
    g.clearLayers();

    if (overlays.aurora && !auroraOfficial) {
      const oval = buildAuroraOval(latestKp(kp));
      const color =
        oval.level === "storm" ? "#34d399" : oval.level === "elevated" ? "#6ee7b7" : "#2dd4bf";
      for (const ring of [oval.northRing, oval.southRing]) {
        const latlngs = ring.map((p) => [p.lat, p.lon] as [number, number]);
        L.polygon(latlngs, {
          color,
          weight: 1.5,
          fillColor: color,
          fillOpacity: oval.level === "quiet" ? 0.06 : 0.12,
          interactive: true,
        })
          .bindPopup(
            `<strong>${oval.label}</strong><br/>Boundary ~${oval.boundaryMagLat}° mag.lat<br/><span style="color:#94a3b8;font-size:11px">Approx model from Kp · SWPC OVATION authoritative</span>`,
          )
          .addTo(g);
      }
    }

    if (overlays.iss && iss) {
      const trail = issTrailPoints(iss.lat, iss.lon, 18, 3);
      L.polyline(
        trail.map((p) => [p.lat, p.lon] as [number, number]),
        { color: "#38bdf8", weight: 2, opacity: 0.55, dashArray: "4 6" },
      ).addTo(g);
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#38bdf8;border:2px solid #e0f2fe;box-shadow:0 0 10px #38bdf8"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([iss.lat, iss.lon], { icon, zIndexOffset: 800 })
        .bindPopup(
          `<strong>ISS</strong><br/>${iss.lat.toFixed(2)}°, ${iss.lon.toFixed(2)}°<br/>Alt ${iss.altitudeKm.toFixed(0)} km · ${iss.velocityKms.toFixed(1)} km/s<br/><span style="color:#94a3b8;font-size:11px">${formatUtc(iss.timestamp)} · where-the-iss.at</span>`,
        )
        .addTo(g);
    }

    if (overlays.wildfires) {
      for (const f of wildfires.slice(0, 120)) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:8px;height:8px;border-radius:2px;background:#f97316;border:1px solid #fdba74;opacity:0.9"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        });
        L.marker([f.lat, f.lon], { icon, zIndexOffset: 400 })
          .bindPopup(
            `<strong>${f.title}</strong><br/>${f.date ? formatUtc(f.date) : "Open"}<br/>${
              f.link
                ? `<a href="${f.link}" target="_blank" rel="noopener">EONET</a>`
                : "NASA EONET"
            }`,
          )
          .addTo(g);
      }
    }

    if (overlays.neos && neos[0]) {
      // NeoWs has no sky position — pin a "desk" marker at 0,0 with list? Better: no map geometry.
      // Show closest as popup-only control via circleMarker at equator sample is misleading.
      // Use a non-geo note marker is wrong. Skip map pin; NEO is Solar list. Optional: badge only.
    }
  }, [map, overlays.aurora, auroraOfficial, overlays.iss, overlays.wildfires, overlays.neos, iss, wildfires, neos, kp]);
}
