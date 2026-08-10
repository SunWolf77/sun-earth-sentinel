import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import L from "leaflet";
import { useObservatory } from "@/store/observatory";
import {
  fetchAirQualityGrid,
  fetchCapeGrid,
  fetchCloudGrid,
  fetchWaveGrid,
  fetchWeatherProbe,
  fetchWindGrid,
  loadWeatherModel,
  saveWeatherModel,
  weatherModelLabel,
  WEATHER_MODELS,
  wmoWeatherLabel,
  type GridScalar,
  type WeatherModelId,
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
import { Cloud, Waves, Wind, X, Crosshair, Droplets } from "lucide-react";

/**
 * Windy-inspired atmosphere overlays for 2D LiveMap (opt-in).
 * Free sources: Open-Meteo + RainViewer.
 */
export function useAtmosphereMapLayers(map: L.Map | null) {
  const overlays = useObservatory((s) => s.overlays);
  const windOn = overlays.windParticles;
  const radarOn = overlays.radar;
  const cloudsOn = overlays.clouds;
  const capeOn = overlays.cape;
  const wavesOn = overlays.waves;
  const probeOn = overlays.wxProbe;
  const aqOn = overlays.airQuality;

  const [model, setModelState] = useState<WeatherModelId>(() => loadWeatherModel());
  const setModel = (id: WeatherModelId) => {
    setModelState(id);
    saveWeatherModel(id);
  };

  const windRef = useRef<WindParticleHandle | null>(null);
  const radarRef = useRef<L.TileLayer | null>(null);
  const cloudLayerRef = useRef<L.LayerGroup | null>(null);
  const capeLayerRef = useRef<L.LayerGroup | null>(null);
  const waveLayerRef = useRef<L.LayerGroup | null>(null);
  const aqLayerRef = useRef<L.LayerGroup | null>(null);
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
          model,
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
  }, [map, windOn, model]);

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
            model,
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
          /* */
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
            model,
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
          /* */
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
          /* */
        }
      } else ensureGroup(waveLayerRef, false);

      if (aqOn) {
        const g = ensureGroup(aqLayerRef, true);
        try {
          const cells = await fetchAirQualityGrid(
            b.getSouth(),
            b.getWest(),
            b.getNorth(),
            b.getEast(),
            7,
            5,
          );
          if (!cancelled)
            paintGrid(
              g,
              cells,
              (v) => {
                // PM2.5 μg/m³ rough AQI-ish colors
                if (v < 12) return "rgba(34,197,94,0.3)";
                if (v < 35) return "rgba(250,204,21,0.4)";
                if (v < 55) return "rgba(249,115,22,0.45)";
                return "rgba(239,68,68,0.5)";
              },
              14,
            );
        } catch {
          /* */
        }
      } else ensureGroup(aqLayerRef, false);
    };

    if (cloudsOn || capeOn || wavesOn || aqOn) {
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
        ensureGroup(aqLayerRef, false);
      };
    }
    ensureGroup(cloudLayerRef, false);
    ensureGroup(capeLayerRef, false);
    ensureGroup(waveLayerRef, false);
    ensureGroup(aqLayerRef, false);
    return () => {
      cancelled = true;
    };
  }, [map, cloudsOn, capeOn, wavesOn, aqOn, model]);

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
      void fetchWeatherProbe(lat, lng, model)
        .then((p) => setProbe(p))
        .finally(() => setProbeLoading(false));
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      map.getContainer().style.cursor = "";
    };
  }, [map, probeOn, model]);

  // Refresh open probe when model changes
  useEffect(() => {
    if (!probe || !probeOn) return;
    setProbeLoading(true);
    void fetchWeatherProbe(probe.lat, probe.lon, model)
      .then((p) => setProbe(p))
      .finally(() => setProbeLoading(false));
    // only on model change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  const showModelChrome =
    windOn || cloudsOn || capeOn || probeOn || Boolean(probe);

  return {
    radarAsOf,
    windAsOf,
    probe,
    probeLoading,
    status,
    model,
    setModel,
    showModelChrome,
    clearProbe: () => setProbe(null),
    atmosphereActive:
      windOn || radarOn || cloudsOn || capeOn || wavesOn || probeOn || aqOn,
  };
}

export function AtmosphereChrome({ map }: { map: L.Map | null }) {
  const {
    radarAsOf,
    windAsOf,
    probe,
    probeLoading,
    status,
    model,
    setModel,
    showModelChrome,
    clearProbe,
    atmosphereActive,
  } = useAtmosphereMapLayers(map);

  if (!atmosphereActive && !probe) return null;

  return (
    <>
      {(radarAsOf || windAsOf || status || showModelChrome) && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-[445] flex max-w-[min(96vw,32rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5">
          {showModelChrome && (
            <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-bg/95 p-0.5 shadow backdrop-blur">
              {WEATHER_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.hint}
                  onClick={() => setModel(m.id)}
                  className={`rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold ${
                    model === m.id
                      ? "bg-primary/25 text-primary"
                      : "text-dim hover:text-fg"
                  }`}
                >
                  {m.short}
                </button>
              ))}
            </div>
          )}
          {windAsOf && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-bg/90 px-2 py-0.5 text-[0.58rem] text-sky-300 shadow backdrop-blur">
              <Wind className="h-3 w-3" />
              Wind · {weatherModelLabel(model)} · {windAsOf}
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
        <div className="pointer-events-auto absolute bottom-[5.5rem] left-2 z-[520] w-[min(94vw,19rem)] rounded-xl border border-border bg-bg/95 p-2.5 shadow-xl backdrop-blur sm:bottom-24 sm:left-3">
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
              {probe.weatherLabel && (
                <p className="text-[0.72rem] font-medium text-fg">
                  {probe.weatherLabel}
                  {probe.weatherCode != null ? (
                    <span className="ml-1 font-mono text-[0.58rem] text-dim">
                      WMO {probe.weatherCode}
                    </span>
                  ) : null}
                </p>
              )}
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
                label="Gusts"
                value={
                  probe.windGustKmh != null
                    ? `${probe.windGustKmh.toFixed(0)} km/h`
                    : "—"
                }
              />
              <Row
                label="Temp"
                value={probe.tempC != null ? `${probe.tempC.toFixed(1)} °C` : "—"}
              />
              <Row
                label="MSLP"
                value={
                  probe.pressureHpa != null
                    ? `${probe.pressureHpa.toFixed(1)} hPa`
                    : "—"
                }
              />
              <Row
                label="Precip"
                value={
                  probe.precipMm != null ? `${probe.precipMm.toFixed(1)} mm` : "—"
                }
              />
              <Row
                icon={<Cloud className="h-3 w-3" />}
                label="Cloud"
                value={
                  probe.cloudPct != null ? `${probe.cloudPct.toFixed(0)} %` : "—"
                }
              />
              <Row
                label="CAPE"
                value={
                  probe.capeJkg != null ? `${Math.round(probe.capeJkg)} J/kg` : "—"
                }
              />
              <Row
                icon={<Waves className="h-3 w-3" />}
                label="Waves"
                value={
                  probe.waveHeightM != null
                    ? `${probe.waveHeightM.toFixed(1)} m` +
                      (probe.swellHeightM != null
                        ? ` · swell ${probe.swellHeightM.toFixed(1)} m`
                        : "") +
                      (probe.wavePeriodS != null
                        ? ` · ${probe.wavePeriodS.toFixed(0)} s`
                        : "")
                    : "n/a (land?)"
                }
              />
              <Row
                icon={<Droplets className="h-3 w-3" />}
                label="AQ"
                value={
                  probe.pm25 != null
                    ? `PM2.5 ${probe.pm25.toFixed(1)}` +
                      (probe.usAqi != null ? ` · AQI ${Math.round(probe.usAqi)}` : "") +
                      (probe.dust != null ? ` · dust ${probe.dust.toFixed(1)}` : "")
                    : "—"
                }
              />

              {probe.hourly.length > 0 && (
                <div className="pt-1.5">
                  <div className="mb-1 text-[0.55rem] font-semibold uppercase tracking-wider text-dim">
                    Next 12 h · model strip
                  </div>
                  <div className="flex items-end gap-0.5 overflow-x-auto pb-0.5">
                    {probe.hourly.map((h, i) => {
                      const t = h.tempC ?? 0;
                      const maxT = Math.max(
                        ...probe.hourly.map((x) => x.tempC ?? 0),
                        1,
                      );
                      const minT = Math.min(
                        ...probe.hourly.map((x) => x.tempC ?? 0),
                        0,
                      );
                      const span = Math.max(1, maxT - minT);
                      const hgt = 8 + ((t - minT) / span) * 22;
                      const hour = h.time.slice(11, 13);
                      const wet = (h.precipMm ?? 0) > 0.1;
                      return (
                        <div
                          key={h.time + i}
                          className="flex w-4 shrink-0 flex-col items-center gap-0.5"
                          title={`${h.time} · ${h.tempC ?? "—"}°C · ${h.precipMm ?? 0} mm · ${wmoWeatherLabel(h.weatherCode) ?? ""}`}
                        >
                          <span className="text-[0.45rem] text-dim">{hour}</span>
                          <div
                            className={`w-1.5 rounded-sm ${wet ? "bg-sky-400" : "bg-primary/70"}`}
                            style={{ height: hgt }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-0.5 text-[0.5rem] text-dim">
                    Bars = temp · blue tint if precip
                  </p>
                </div>
              )}

              <p className="pt-1 text-[0.58rem] leading-snug text-dim">
                Open-Meteo · {weatherModelLabel(probe.model)} · model guidance ·
                not an official forecast
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
      <span className="max-w-[58%] truncate text-right font-mono text-fg">
        {value}
      </span>
    </div>
  );
}
