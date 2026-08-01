import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, Suspense, lazy } from "react";
import {
  Activity,
  BookOpen,
  Globe2,
  Layers,
  Map as MapIcon,
  Pause,
  Play,
  RefreshCw,
  Sun,
  Waves,
  X,
} from "lucide-react";
import { useObservatory, filteredEq, viewEvents, getAllFocusNodes, type TabId } from "@/store/observatory";
import { MODES, type PerformanceMode } from "@/lib/feeds/modes";
import { SpaceWeatherPanel } from "@/components/weather/SpaceWeatherPanel";
import { ClientOnly } from "@/components/ops/ClientOnly";
import { ResonancePanel } from "@/components/resonance/ResonancePanel";
import { AnalyticsCharts } from "@/components/charts/AnalyticsCharts";
import { AboutPanel } from "@/components/about/AboutPanel";
import { NodeFocusPanel } from "@/components/nodes/NodeFocusPanel";
import { FocusedNodeCard } from "@/components/nodes/FocusedNodeCard";
import { SuptContinuumStrip } from "@/components/supt/SuptContinuumStrip";
import { TodayBriefBar } from "@/components/ops/TodayBriefBar";
import { FeedHealthStrip } from "@/components/ops/FeedHealthStrip";
import { SuptOnboarding } from "@/components/ops/SuptOnboarding";
import { OfflineBanner } from "@/components/ops/OfflineBanner";
import { VolcanoAlertsBar } from "@/components/map/VolcanoAlertsBar";
import { VolcWatchSmart } from "@/components/map/VolcWatchSmart";
import { startRealtime } from "@/lib/realtime/transport";
import { LiteModeChip } from "@/components/ops/LiteModeChip";
import { createTabSwipe } from "@/lib/map/touchGestures";
import {
  tabFromLocation,
  viewFromLocation,
  syncViewToUrl,
  shareableViewUrl,
} from "@/lib/pwa/shortcuts";
import { magColor } from "@/lib/feeds/usgs";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { Link2, Check } from "lucide-react";

const LiveMap = lazy(() =>
  import("@/components/map/LiveMap").then((m) => ({ default: m.LiveMap })),
);
const Globe3D = lazy(() =>
  import("@/components/map/Globe3D").then((m) => ({ default: m.Globe3D })),
);

export const Route = createFileRoute("/")({
  component: ObservatoryApp,
});

const TABS: {
  id: TabId;
  label: string;
  short: string;
  Icon: typeof MapIcon;
}[] = [
  { id: "live", label: "Live Map", short: "Map", Icon: MapIcon },
  { id: "solar", label: "Solar", short: "Solar", Icon: Sun },
  { id: "resonance", label: "Rhythm", short: "Rhythm", Icon: Waves },
  { id: "analytics", label: "Charts", short: "Charts", Icon: Activity },
  { id: "about", label: "About", short: "About", Icon: BookOpen },
];

const WINDOWS = [
  { id: "hour" as const, label: "1h", title: "Past hour" },
  { id: "day" as const, label: "1d", title: "Past day" },
  { id: "week" as const, label: "1w", title: "Past week" },
  { id: "month" as const, label: "1m", title: "Past month" },
];

function ObservatoryApp() {
  const mode = useObservatory((s) => s.mode);
  const tab = useObservatory((s) => s.tab);
  const mapView = useObservatory((s) => s.mapView);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const autoRefresh = useObservatory((s) => s.autoRefresh);
  const liveStatus = useObservatory((s) => s.liveStatus);
  const loading = useObservatory((s) => s.loading);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const livePulseAt = useObservatory((s) => s.livePulseAt);
  const newestEventAgeMs = useObservatory((s) => s.newestEventAgeMs);
  const error = useObservatory((s) => s.error);
  const scales = useObservatory((s) => s.scales);
  const eq = useObservatory((s) => s.eq);
  const focusNodeId = useObservatory((s) => s.focusNodeId);

  const setMode = useObservatory((s) => s.setMode);
  const setTab = useObservatory((s) => s.setTab);
  const mobileSheet = useObservatory((s) => s.mobileSheet);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);
  const setMapView = useObservatory((s) => s.setMapView);
  const setTimeWindow = useObservatory((s) => s.setTimeWindow);
  const setMinMag = useObservatory((s) => s.setMinMag);
  const setMaxMag = useObservatory((s) => s.setMaxMag);
  const setAutoRefresh = useObservatory((s) => s.setAutoRefresh);
  const refresh = useObservatory((s) => s.refresh);
  const pulseRealtime = useObservatory((s) => s.pulseRealtime);
  const bootstrapClientDefaults = useObservatory((s) => s.bootstrapClientDefaults);
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const useGeofon = useObservatory((s) => s.useGeofon);
  const setUseGeofon = useObservatory((s) => s.setUseGeofon);
  const audioAlerts = useObservatory((s) => s.audioAlerts);
  const setAudioAlerts = useObservatory((s) => s.setAudioAlerts);
  const antipodeOf = useObservatory((s) => s.antipodeOf);
  const pickEvent = useObservatory((s) => s.pickEvent);
  const pickedEvent = useObservatory((s) => s.pickedEvent);

  const fullTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ageTick, setAgeTick] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [bootWait, setBootWait] = useState(false);
  const bootRetried = useRef(false);
  const isMobile = useIsMobile();
  const [copiedShare, setCopiedShare] = useState(false);
  const overlays = useObservatory((s) => s.overlays);
  const setOverlaysBulk = useObservatory((s) => s.setOverlaysBulk);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const setBasemapStyle = useObservatory((s) => s.setBasemapStyle);
  const basemapStyle = useObservatory((s) => s.basemapStyle);

  useEffect(() => {
    bootstrapClientDefaults();
    // Apply shareable deep link once
    try {
      const v = viewFromLocation();
      if (v.mode) setMode(v.mode);
      if (v.tab) setTab(v.tab);
      if (v.window) setTimeWindow(v.window);
      if (v.minMag != null) setMinMag(v.minMag);
      if (v.mapView) setMapView(v.mapView);
      if (v.basemap) setBasemapStyle(v.basemap);
      if (v.node) {
        const id = v.node;
        const ok = getAllFocusNodes().some(
          (n) => n.id === id || n.aliases?.includes(id),
        );
        if (ok) {
          const canonical =
            getAllFocusNodes().find((n) => n.id === id)?.id ??
            getAllFocusNodes().find((n) => n.aliases?.includes(id))?.id ??
            id;
          setFocusNode(canonical);
        }
      }
      if (v.layers && setOverlaysBulk) {
        const base = useObservatory.getState().overlays;
        const next = { ...base };
        if (v.layersExclusive) {
          for (const k of Object.keys(next) as (keyof typeof next)[]) next[k] = false;
        }
        for (const [k, on] of Object.entries(v.layers)) {
          if (k in next) next[k as keyof typeof next] = !!on;
        }
        setOverlaysBulk(next);
      }
    } catch {
      /* */
    }
    void refresh(true);
  }, [
    refresh,
    bootstrapClientDefaults,
    setTab,
    setTimeWindow,
    setMinMag,
    setFocusNode,
    setOverlaysBulk,
    setMode,
    setMapView,
    setBasemapStyle,
  ]);

  // Surface stuck first load (never leave users on "updated —" with a black map)
  useEffect(() => {
    if (lastUpdate) {
      setBootWait(false);
      return;
    }
    const t = window.setTimeout(() => setBootWait(true), 4000);
    return () => window.clearTimeout(t);
  }, [lastUpdate]);

  useEffect(() => {
    if (!bootWait || lastUpdate || bootRetried.current) return;
    bootRetried.current = true;
    void refresh(true);
  }, [bootWait, lastUpdate, refresh]);

  useEffect(() => {
    const t = tabFromLocation();
    if (t) setTab(t);
    const onPop = () => {
      const v = viewFromLocation();
      if (v.mode) setMode(v.mode);
      if (v.tab) setTab(v.tab);
      if (v.window) setTimeWindow(v.window);
      if (v.minMag != null) setMinMag(v.minMag);
      if (v.mapView) setMapView(v.mapView);
      if (v.basemap) setBasemapStyle(v.basemap);
      if (v.node !== undefined) setFocusNode(v.node);
      if (v.layers && setOverlaysBulk) {
        const base = useObservatory.getState().overlays;
        const next = { ...base };
        if (v.layersExclusive) {
          for (const k of Object.keys(next) as (keyof typeof next)[]) next[k] = false;
        }
        for (const [k, on] of Object.entries(v.layers)) {
          if (k in next) next[k as keyof typeof next] = !!on;
        }
        setOverlaysBulk(next);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setTab, setTimeWindow, setMinMag, setFocusNode, setMode, setMapView, setBasemapStyle, setOverlaysBulk]);

  useEffect(() => {
    syncViewToUrl({
      tab,
      node: focusNodeId,
      window: timeWindow,
      minMag,
      overlays,
      mode,
      mapView,
      basemap: basemapStyle,
    });
  }, [tab, focusNodeId, timeWindow, minMag, overlays, mode, mapView, basemapStyle]);

  useEffect(() => {
    if (fullTimer.current) clearInterval(fullTimer.current);
    if (!autoRefresh) return;
    const ms = MODES[mode].refreshMs;
    fullTimer.current = setInterval(() => {
      void refresh(false);
    }, ms);
    return () => {
      if (fullTimer.current) clearInterval(fullTimer.current);
    };
  }, [autoRefresh, mode, refresh]);

  useEffect(() => {
    if (pulseTimer.current) clearInterval(pulseTimer.current);
    if (!autoRefresh) {
      useObservatory.getState().setLiveStatus("paused", "auto-refresh off");
      return;
    }
    const stop = startRealtime(
      {
        onPulse: (kind) => pulseRealtime(kind),
        onGeojson: async (data) => {
          // Optional self-hosted relay can push FeatureCollection
          try {
            const fc = data as { type?: string; features?: unknown[] };
            if (fc?.type === "FeatureCollection" && Array.isArray(fc.features)) {
              await pulseRealtime("ws");
            } else {
              await pulseRealtime("ws");
            }
          } catch {
            await pulseRealtime("ws");
          }
        },
        onStatus: (s, d) => useObservatory.getState().setLiveStatus(s, d),
      },
      {
        baseMs: MODES[mode].realtimeMs,
        minMs: mode === "lite" ? 18_000 : 12_000,
        maxMs: mode === "lite" ? 240_000 : 180_000,
      },
    );
    return stop;
  }, [autoRefresh, mode, pulseRealtime]);

  useEffect(() => {
    const id = window.setInterval(() => setAgeTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);


  const features = useMemo(
    () => viewEvents(eq?.features, minMag, focusNodeId, maxMag),
    [eq?.features, minMag, maxMag, focusNodeId],
  );

  const tabSwipe = createTabSwipe({
    onSwipeLeft: () => {
      const ids = TABS.map((t) => t.id);
      const i = ids.indexOf(tab);
      setTab(ids[(i + 1) % ids.length]!);
    },
    onSwipeRight: () => {
      const ids = TABS.map((t) => t.id);
      const i = ids.indexOf(tab);
      setTab(ids[(i - 1 + ids.length) % ids.length]!);
    },
  });

  const ageLabel = useMemo(() => {
    void ageTick;
    if (newestEventAgeMs == null) {
      return loading ? "loading" : "no events yet";
    }
    const m = Math.round(newestEventAgeMs / 60_000);
    if (m < 1) return "<1m";
    if (m < 60) return `${m}m`;
    return `${Math.round(m / 60)}h`;
  }, [newestEventAgeMs, ageTick, loading]);

  const updatedLabel = useMemo(() => {
    void ageTick;
    if (!lastUpdate) return loading ? "loading" : "waiting";
    const s = Math.round((Date.now() - lastUpdate) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.round(s / 60)}m ago`;
  }, [lastUpdate, ageTick, loading]);

  const filtersBlock = (
    <div className="space-y-3 p-3">
      <div>
        <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-dim">
          Time window
        </label>
        <div className="ww-seg ww-seg--compact flex flex-wrap">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              title={w.title}
              onClick={() => setTimeWindow(w.id)}
              className={`ww-seg__btn ${timeWindow === w.id ? "ww-seg__btn--on" : ""}`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-dim">
          Magnitude {minMag.toFixed(1)} – {maxMag >= 10 ? "10+" : maxMag.toFixed(1)}
        </label>
        <input
          type="range"
          min={2}
          max={8}
          step={0.5}
          value={minMag}
          onChange={(e) => setMinMag(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted">
          <input
            type="checkbox"
            checked={useGeofon}
            onChange={(e) => setUseGeofon(e.target.checked)}
          />
          GEOFON merge
        </label>
        <label className="inline-flex items-center gap-1.5 text-[0.7rem] text-muted">
          <input
            type="checkbox"
            checked={audioAlerts}
            onChange={(e) => setAudioAlerts(e.target.checked)}
          />
          Audio M4.5+
        </label>
      </div>
      <div className="ww-seg ww-seg--compact">
        {(["2d", "3d"] as const).map((v) => (
          <button
            key={v}
            type="button"
            disabled={v === "3d" && mode !== "full"}
            title={v === "3d" && mode !== "full" ? "Full mode for 3D globe" : undefined}
            onClick={() => setMapView(v)}
            className={`ww-seg__btn uppercase ${mapView === v ? "ww-seg__btn--on" : ""}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  const eventsBlock = (
    <div className="space-y-2 p-3">
      <SuptContinuumStrip compact />
      <VolcanoAlertsBar compact />
      <FocusedNodeCard features={filteredEq(eq?.features, minMag, maxMag)} />
      <NodeFocusPanel allFeatures={filteredEq(eq?.features, minMag, maxMag)} />
      <h3 className="text-[0.7rem] font-medium uppercase tracking-wider text-primary">
        Events ({features.length})
      </h3>
      <ul className="scroll-thin max-h-[50vh] space-y-1 overflow-y-auto lg:max-h-none">
        {features.slice(0, 80).map((f) => {
          const [lon, lat] = f.geometry.coordinates;
          const mag = f.properties.mag ?? 0;
          const fid = String(f.id ?? `${lat},${lon},${f.properties.time ?? 0}`);
          const selected = selectedEventId === fid || pickedEvent?.id === fid;
          return (
            <li key={fid}>
              <button
                type="button"
                onClick={() => {
                  setSelectedEventId(fid);
                  pickEvent({
                    id: fid,
                    lat,
                    lon,
                    mag,
                    place: f.properties.place || "Event",
                    depth: f.geometry.coordinates[2] ?? 0,
                    time: f.properties.time ?? null,
                    url: f.properties.url,
                  });
                  flyMapTo(lat, lon, 5, fid);
                  setMobileSheet("closed");
                  setToast(`${mag.toFixed(1)} · ${f.properties.place || "Event"}`);
                  window.setTimeout(() => setToast(null), 2500);
                }}
                onDoubleClick={() => antipodeOf(lat, lon)}
                className={`flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[0.7rem] ${
                  selected
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/60 bg-panel hover:bg-elevated"
                }`}
              >
                <span
                  className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: magColor(mag) }}
                />
                <span className="min-w-0">
                  <span className="font-semibold text-fg">M{mag.toFixed(1)}</span>{" "}
                  <span className="text-muted">{f.properties.place || "—"}</span>
                </span>
              </button>
            </li>
          );
        })}
        {!features.length && (
          <li className="text-[0.7rem] text-dim">No events in this filter window.</li>
        )}
      </ul>
    </div>
  );

  useEffect(() => {
    const onVolc = (e: Event) => {
      const d = (e as CustomEvent<{ message?: string }>).detail;
      if (d?.message) {
        setToast(d.message);
        window.setTimeout(() => setToast(null), 4500);
      }
    };
    window.addEventListener("ww-volc-watch", onVolc);
    return () => window.removeEventListener("ww-volc-watch", onVolc);
  }, []);

  return (
    <div className="ww-shell relative flex h-full max-h-full flex-col overflow-hidden">
      <VolcWatchSmart />
      <SuptOnboarding />

      <header className="ww-header shrink-0 border-b border-border bg-bg/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 sm:px-4 sm:py-2">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-fg sm:text-base">
              Sun-Earth <span className="text-primary">Sentinel</span>
            </h1>
            <p className="text-[0.58rem] text-dim sm:text-[0.62rem]">
              Sentinel · updated {updatedLabel} · newest {ageLabel}
              {livePulseAt ? " · live pulse" : ""}
              {liveStatus === "ws"
                ? " · WS"
                : liveStatus === "live"
                  ? " · LIVE"
                  : liveStatus === "paused"
                    ? " · paused"
                    : liveStatus === "offline"
                      ? " · offline"
                      : liveStatus === "polling"
                        ? " · …"
                        : ""}
            </p>
            {!isMobile && (
              <div className="mt-0.5 hidden sm:block">
                <FeedHealthStrip compact />
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="ww-btn ww-btn--icon ww-btn--compact"
              title="Copy shareable view link"
              aria-label="Copy shareable view link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareableViewUrl());
                  setCopiedShare(true);
                  setToast("Shareable view link copied");
                  window.setTimeout(() => setCopiedShare(false), 1600);
                  window.setTimeout(() => setToast(null), 2000);
                } catch {
                  setToast("Could not copy link — copy the address bar URL");
                  window.setTimeout(() => setToast(null), 2500);
                }
              }}
            >
              {copiedShare ? <Check className="h-4 w-4 text-ok" /> : <Link2 className="h-4 w-4" />}
            </button>
            <div className="ww-seg ww-seg--compact" role="group" aria-label="Performance mode">
              {(["lite", "standard", "full"] as PerformanceMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  title={MODES[m].description}
                  onClick={() => setMode(m)}
                  className={`ww-seg__btn capitalize ${mode === m ? "ww-seg__btn--on" : ""}`}
                >
                  <span className="ww-only-sm sm:hidden">{m[0]!.toUpperCase()}</span>
                  <span className="ww-only-lg hidden sm:inline">{m}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void refresh(true)}
              disabled={loading}
              className="ww-btn ww-btn--icon ww-btn--compact"
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`ww-btn ww-btn--icon ww-btn--compact ${autoRefresh ? "ww-btn--active" : ""}`}
              title={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
              aria-pressed={autoRefresh}
              aria-label={autoRefresh ? "Pause live updates" : "Resume live updates"}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <nav className="ww-tablist" role="tablist" aria-label="Main sections">
          {TABS.map(({ id, label, short, Icon }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(id)}
                className={`ww-tab ${selected ? "ww-tab--active" : ""}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="ww-only-lg hidden sm:inline">{label}</span>
                <span className="ww-only-sm sm:hidden">{short}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {(bootWait && !lastUpdate) && (
        <div
          className="shrink-0 border-b border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold sm:px-4"
          role="status"
        >
          <span className="font-medium">Loading live feeds…</span>
          {" "}
          {error ? <span className="text-danger">({error})</span> : null}
          {" "}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void refresh(true)}
          >
            Retry now
          </button>
        </div>
      )}
      {error && !(scales || eq?.features?.length) && (
        <div
          className="shrink-0 border-b border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger sm:px-4"
          role="alert"
        >
          {error}
        </div>
      )}
      <OfflineBanner />
      {toast && (
        <div
          className="pointer-events-none absolute inset-x-0 top-14 z-[800] flex justify-center px-3 sm:top-[4.5rem]"
          role="status"
        >
          <div className="pointer-events-auto max-w-[min(96vw,28rem)] rounded-full border border-primary/40 bg-bg/95 px-3 py-1.5 text-center text-[0.65rem] leading-snug text-primary shadow-lg backdrop-blur">
            <span className="line-clamp-2">{toast}</span>
          </div>
        </div>
      )}

      {/* Map-first on phone: Today stays a single collapsed chip; full brief on expand */}
      {tab !== "about" && (
        <div
          className={`shrink-0 border-b border-border/60 px-2 sm:px-3 ${
            isMobile && tab === "live" ? "py-0.5" : "py-1 sm:py-1.5"
          }`}
        >
          <TodayBriefBar dense />
          {isMobile && (
            <div className="mt-1 px-0.5">
              <FeedHealthStrip compact />
            </div>
          )}
        </div>
      )}

      <main
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        onTouchStart={tabSwipe.onTouchStart}
        onTouchEnd={tabSwipe.onTouchEnd}
        onTouchCancel={tabSwipe.onTouchCancel}
      >
        <div
          id="panel-live"
          role="tabpanel"
          aria-labelledby="tab-live"
          hidden={tab !== "live"}
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
        >
          <aside className="ww-aside hidden min-h-0 w-[min(280px,28vw)] shrink-0 flex-col border-r border-border lg:flex">
            <div className="shrink-0 border-b border-border/80">
              <h3 className="px-3 pt-3 text-[0.7rem] font-medium uppercase tracking-wider text-primary">
                Controls
              </h3>
              {filtersBlock}
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {eventsBlock}
            </div>
          </aside>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="relative min-h-[52dvh] flex-1 lg:min-h-0">
              <div className="absolute inset-0 lg:inset-2.5 lg:overflow-hidden lg:rounded-lg">
                <ClientOnly
                  fallback={
                    <div className="flex h-full min-h-[52dvh] flex-col items-center justify-center gap-2 bg-bg px-4 text-center text-sm text-muted">
                      <span>Loading map…</span>
                      <span className="text-[0.7rem] text-dim">Feeds bootstrap on first open — map appears as soon as the client mounts.</span>
                    </div>
                  }
                >
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center text-sm text-muted">
                        Loading map…
                      </div>
                    }
                  >
                    {mapView === "3d" && mode === "full" ? <Globe3D /> : <LiveMap />}
                  </Suspense>
                </ClientOnly>
              </div>
            </div>
            {mobileSheet !== "closed" && (
              <div className="absolute inset-x-0 bottom-0 z-[600] max-h-[min(55vh,calc(100%-4.5rem))] overflow-hidden rounded-t-xl border border-border bg-bg shadow-2xl lg:hidden">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-xs font-semibold text-fg">
                    {mobileSheet === "filters" ? "Filters" : "Events"}
                  </span>
                  <button
                    type="button"
                    className="ww-btn ww-btn--icon ww-btn--compact"
                    onClick={() => setMobileSheet("closed")}
                    aria-label="Close sheet"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="scroll-thin max-h-[48vh] overflow-y-auto">
                  {mobileSheet === "filters" ? filtersBlock : eventsBlock}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          id="panel-solar"
          role="tabpanel"
          aria-labelledby="tab-solar"
          hidden={tab !== "solar"}
          className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-4"
        >
          {tab === "solar" && <SpaceWeatherPanel />}
        </div>

        <div
          id="panel-resonance"
          role="tabpanel"
          aria-labelledby="tab-resonance"
          hidden={tab !== "resonance"}
          className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {tab === "resonance" && <ResonancePanel />}
        </div>

        <div
          id="panel-analytics"
          role="tabpanel"
          aria-labelledby="tab-analytics"
          hidden={tab !== "analytics"}
          className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-4"
        >
          {tab === "analytics" && <AnalyticsCharts />}
        </div>

        <div
          id="panel-about"
          role="tabpanel"
          aria-labelledby="tab-about"
          hidden={tab !== "about"}
          className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6"
        >
          {tab === "about" && <AboutPanel />}
        </div>
      </main>

      <footer className="ww-footer hidden shrink-0 border-t border-border px-3 py-1 text-[0.62rem] text-dim sm:flex sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-1">
          <Globe2 className="h-3 w-3" />
          Free public feeds · SUPT continuum · not a forecast product
        </span>
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" />
          Mode {mode} · {features.length} events shown
        </span>
      </footer>
    </div>
  );
}
