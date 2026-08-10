import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import L from "leaflet";
import { useObservatory } from "@/store/observatory";
import {
  fetchCapeGrid,
  fetchCloudGrid,
  fetchWaveGrid,
  fetchWeatherProbe,
  fetchWindGrid,
  type GridScalar,
  type WeatherProbe,
  type WindSample,
} from "@/lib/feeds/openMeteo";
import {
  fetchRainViewerMaps,
  formatRadarTime,
  latestRadarFrame,
  rainViewerTileUrl,
} from "@/lib/feeds/rainViewer";
import { createWindParticleLayer, type WindParticleHandle } from "@/components/map/WindParticleLayer";
import { Cloud, Waves, Wind, X, Crosshair } from "lucide-react";

/**
 * Windy-inspired atmosphere overlays for 2D LiveMap (opt-in).
 * Free sources only: Open-Meteo + RainViewer.
 */
export function useAtmosphereMapLayers(map: L.Map | null) {
  const overlays = useObservatory((s) => s.overlays);
  const windOn = overlays.windParticles;
  const radarOn = overlays.radar;
  const cloudsOn = overlays.clouds;
  const capeOn = overlays.cape;
  const wavesOn = overlays.waves;
  const probeOn = overlays.wxProbe;

  const windRef = useRef<WindParticleHandle | null>(null);
  const radarRef = useRef<L.TileLayer | null>(null);
  const cloudLayerRef = useRef<L.LayerGroup | null>(null);
  const capeLayerRef = useRef<L.LayerGroup | null>(null);
  const waveLayerRef = useRef<L.LayerGroup | null>(null);
  const [radarAsOf, setRadarAsOf] = useState<string | null>(null);
  const [windAsOf, setWindAsOf] = useState<string | null>(null);
  const [probe, setProbe] = useState<WeatherProbe | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!map) return;
    const handle = createWindParticleLayer(map);
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    handle.setParticleBudget(mobile ? 900 : 2400);
    windRef.current = handle;
    return () => {
      handle.destroy();
      windRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!map || !windRef.current) return;
    windRef.current.setActive(!!windOn);
    if (!windOn) {
      setWindAsOf(null);
      return;
    }
    let cancelled = false;
    let timer = 0;

    const load = async () => {
      try {
        setStatus("Loading wind…");
        const b = map.getBounds();
        const z = map.getZoom();
        const cols = z < 3 ? 6 : z < 5 ? 8 : 9;
        const rows = z < 3 ? 4 : z < 5 ? 5 : 6;
        const samples: WindSample[] = await fetchWindGrid(
          b.getSouth(),
          b.getWest(),
          b.getNorth(),
          b.getEast(),
          cols,
          rows,
        );
        if (cancelled) return;
        windRef.current?.setSamples(samples);
        setWindAsOf(new Date().toISOString().slice(0, 16) + "Z");
        setStatus(samples.length ? null : "Wind grid empty");
      } catch {
        if (!cancelled) setStatus("Wind feed unavailable");
      }
    };

    void load();
    const onMove = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 900);
    };
    map.on("moveend", onMove);
    const refresh = window.setInterval(() => void load(), 15 * 60_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(refresh);
      map.off("moveend", onMove);
    };
  }, [map, windOn]);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    const clearRadar = () => {
      if (radarRef.current) {
        if (map.hasLayer(radarRef.current)) map.removeLayer(radarRef.current);
        radarRef.current = null;
      }
      setRadarAsOf(null);
    };
    if (!radarOn) {
      clearRadar();
      return;
    }
    void (async () => {
      const maps = await fetchRainViewerMaps();
      if (cancelled || !maps) {
        setStatus("Radar unavailable");
        return;
      }
      const frame = latestRadarFrame(maps);
      if (!frame) {
        setStatus("No radar frame");
        return;
      }
      clearRadar();
      const url = rainViewerTileUrl(maps.host, frame.path);
      const layer = L.tileLayer(url, {
        opacity: 0.55,
        zIndex: 340,
        maxZoom: 12,
        attribution: "Radar © RainViewer",
        className: "ww-radar-tiles",
        updateWhenIdle: true,
        crossOrigin: true,
      });
      layer.addTo(map);
      radarRef.current = layer;
      setRadarAsOf(formatRadarTime(frame.time));
      setStatus(null);
    })();
    const id = window.setInterval(async () => {
      const maps = await fetchRainViewerMaps(true);
      if (cancelled || !maps || !radarRef.current) return;
      const frame = latestRadarFrame(maps);
      if (!frame) return;
      const url = rainViewerTileUrl(maps.host, frame.path);
      map.removeLayer(radarRef.current);
      const layer = L.tileLayer(url, {
        opacity: 0.55,
        zIndex: 340,
        maxZoom: 12,
        attribution: "Radar © RainViewer",
        className: "ww-radar-tiles",
        updateWhenIdle: true,
        crossOrigin: true,
      });
      layer.addTo(map);
      radarRef.current = layer;
      setRadarAsOf(formatRadarTime(frame.time));
    }, 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      clearRadar();
    };
  }, [map, radarOn]);

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    let timer = 0;

    const ensureGroup = (ref: MutableRefObject<L.LayerGroup | null>, on: boolean) => {
      if (!on) {
        if (ref.current) {
          if (map.hasLayer(ref.current)) map.removeLayer(ref.current);
          ref.current.clearLayers();
        }
        return null;
      }
      if (!ref.current) ref.current = L.layerGroup();
      if (!map.hasLayer(ref.current)) ref.current.addTo(map);
      return ref.current;
    };

    const paintGrid = (
      group: L.LayerGroup | null,
      cells: GridScalar[],
      colorFn: (v: number) => string,
      radius = 18,
    ) => {
      if (!group) return;
      group.clearLayers();
      for (const c of cells) {
        const m = L.circleMarker([c.lat, c.lon], {
          radius,
          stroke: false,
          fillColor: colorFn(c.value),
          fillOpacity: 0.35,
          interactive: false,
        });
        group.addLayer(m);
      }
    };

    const load = async () => {
      const b = map.getBounds();
      if (cloudsOn) {
        const g = ensureGroup(cloudLayerRef, true);
        try {
          const cells = await fetchCloudGrid(
            b.getSouth(),
            b.getWest(),
            b.getNorth(),
            b.getEast(),
            9,
            6,
          );
          if (!cancelled)
            paintGrid(
              g,
              cells,
              (v) => {
                const a = Math.min(0.55, 0.08 + v / 160);
                return `rgba(226,232,240,${a})`;
              },
              22,
            );
        } catch {
          /* ignore */
        }
      } else ensureGroup(cloudLayerRef, false);

      if (capeOn) {
        const g = ensureGroup(capeLayerRef, true);
        try {
          const cells = await fetchCapeGrid(
            b.getSouth(),
            b.getWest(),
            b.getNorth(),
            b.getEast(),
            8,
            5,
          );
          if (!cancelled)
            paintGrid(
              g,
              cells,
              (v) => {
                if (v < 200) return "rgba(34,197,94,0.25)";
                if (v < 1000) return "rgba(250,204,21,0.35)";
                if (v < 2500) return "rgba(249,115,22,0.4)";
                return "rgba(239,68,68,0.45)";
              },
              16,
            );
        } catch {
          /* ignore */
        }
      } else ensureGroup(capeLayerRef, false);

      if (wavesOn) {
        const g = ensureGroup(waveLayerRef, true);
        try {
          const cells = await fetchWaveGrid(
            b.getSouth(),
            b.getWest(),
            b.getNorth(),
            b.getEast(),
            7,
            5,
          );
          if (!cancelled && g) {
            g.clearLayers();
            for (const c of cells) {
              const r = 4 + Math.min(14, c.value * 3);
              const m = L.circleMarker([c.lat, c.lon], {
                radius: r,
                color: "#38bdf8",
                weight: 1,
                fillColor: "#0ea5e9",
                fillOpacity: 0.35,
                interactive: false,
              });
              m.bindTooltip(`${c.value.toFixed(1)} m waves`, {
                direction: "top",
                opacity: 0.9,
              });
              g.addLayer(m);
            }
          }
        } catch {
          /* ignore */
        }
      } else ensureGroup(waveLayerRef, false);
    };

    if (cloudsOn || capeOn || wavesOn) {
      void load();
      const onMove = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void load(), 1000);
      };
      map.on("moveend", onMove);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        map.off("moveend", onMove);
        ensureGroup(cloudLayerRef, false);
        ensureGroup(capeLayerRef, false);
        ensureGroup(waveLayerRef, false);
      };
    }
    ensureGroup(cloudLayerRef, false);
    ensureGroup(capeLayerRef, false);
    ensureGroup(waveLayerRef, false);
    return () => {
      cancelled = true;
    };
  }, [map, cloudsOn, capeOn, wavesOn]);

  useEffect(() => {
    if (!map) return;
    if (!probeOn) {
      setProbe(null);
      map.getContainer().style.cursor = "";
      return;
    }
    map.getContainer().style.cursor = "crosshair";
    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setProbeLoading(true);
      void fetchWeatherProbe(lat, lng)
        .then((p) => setProbe(p))
        .finally(() => setProbeLoading(false));
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      map.getContainer().style.cursor = "";
    };
  }, [map, probeOn]);

  return {
    radarAsOf,
    windAsOf,
    probe,
    probeLoading,
    status,
    clearProbe: () => setProbe(null),
    atmosphereActive: windOn || radarOn || cloudsOn || capeOn || wavesOn || probeOn,
  };
}

export function AtmosphereChrome({ map }: { map: L.Map | null }) {
  const {
    radarAsOf,
    windAsOf,
    probe,
    probeLoading,
    status,
    clearProbe,
    atmosphereActive,
  } = useAtmosphereMapLayers(map);

  if (!atmosphereActive && !probe) return null;

  return (
    <>
      {(radarAsOf || windAsOf || status) && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-[445] flex max-w-[min(96vw,28rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5">
          {windAsOf && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-bg/90 px-2 py-0.5 text-[0.58rem] text-sky-300 shadow backdrop-blur">
              <Wind className="h-3 w-3" />
              Wind · Open-Meteo · {windAsOf}
            </span>
          )}
          {radarAsOf && (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-bg/90 px-2 py-0.5 text-[0.58rem] text-cyan-300 shadow backdrop-blur">
              Radar · RainViewer · {radarAsOf}
            </span>
          )}
          {status && (
            <span className="rounded-full border border-border bg-bg/90 px-2 py-0.5 text-[0.58rem] text-dim shadow">
              {status}
            </span>
          )}
        </div>
      )}

      {(probe || probeLoading) && (
        <div className="pointer-events-auto absolute bottom-[5.5rem] left-2 z-[520] w-[min(92vw,17.5rem)] rounded-xl border border-border bg-bg/95 p-2.5 shadow-xl backdrop-blur sm:bottom-24 sm:left-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-fg">
              <Crosshair className="h-3.5 w-3.5 text-primary" />
              Weather probe
            </span>
            <button
              type="button"
              className="rounded p-0.5 text-dim hover:text-fg"
              aria-label="Close probe"
              onClick={clearProbe}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {probeLoading && (
            <p className="text-[0.65rem] text-dim">Sampling Open-Meteo…</p>
          )}
          {probe && !probeLoading && (
            <div className="space-y-1 text-[0.68rem] text-muted">
              <p className="font-mono text-[0.62rem] text-dim">
                {probe.lat.toFixed(2)}°, {probe.lon.toFixed(2)}°
                {probe.time ? ` · ${probe.time}` : ""}
              </p>
              <Row
                icon={<Wind className="h-3 w-3" />}
                label="Wind"
                value={
                  probe.windSpeedKmh != null
                    ? `${probe.windSpeedKmh.toFixed(0)} km/h · ${probe.windDirDeg ?? "—"}°`
                    : "—"
                }
              />
              <Row
                label="Temp"
                value={probe.tempC != null ? `${probe.tempC.toFixed(1)} °C` : "—"}
              />
              <Row
                label="Precip"
                value={probe.precipMm != null ? `${probe.precipMm.toFixed(1)} mm` : "—"}
              />
              <Row
                icon={<Cloud className="h-3 w-3" />}
                label="Cloud"
                value={probe.cloudPct != null ? `${probe.cloudPct.toFixed(0)} %` : "—"}
              />
              <Row
                label="CAPE"
                value={probe.capeJkg != null ? `${Math.round(probe.capeJkg)} J/kg` : "—"}
              />
              <Row
                icon={<Waves className="h-3 w-3" />}
                label="Waves"
                value={
                  probe.waveHeightM != null
                    ? `${probe.waveHeightM.toFixed(1)} m` +
                      (probe.wavePeriodS != null ? ` · ${probe.wavePeriodS.toFixed(0)} s` : "")
                    : "n/a (land?)"
                }
              />
              <p className="pt-1 text-[0.58rem] leading-snug text-dim">
                Open-Meteo model guidance · not an official forecast · SES atmosphere context
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1 text-dim">
        {icon}
        {label}
      </span>
      <span className="font-mono text-fg">{value}</span>
    </div>
  );
}
