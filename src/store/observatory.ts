import { normalizeTimeWindow } from "@/lib/map/timeWindowLabel";
import { create } from "zustand";
import {
  fetchEarthquakes,
  fetchVolcanoes,
  fetchRealtimePulse,
  fetchSignificantPulse,
  mergeEqCollections,
  clipCollectionToWindow,
  capFeaturesForMode,
  latestEventAgeMs,
  DRAGON_NODES,
  priorityNodeBounds,
  type DragonNode,
  type EqCollection,
  type EqFeature,
} from "@/lib/feeds/usgs";
import { fetchGeofonWeek } from "@/lib/feeds/geofon";
import { fetchJmaQuakes, mergeJmaIntoCollection } from "@/lib/feeds/jma";
import { alertNewEvents } from "@/lib/audio/alerts";
import {
  fetchKp,
  fetchXrays,
  fetchAlerts,
  type KpPoint,
  type XrayPoint,
  type SolarWind,
  type NoaaScales,
  type Flux10cm,
  type ProtonPoint,
  type ForecastBundle,
  type EnlilFrame,
  type OvationFrame,
  type OvationBundle,
  type KpForecastPoint,
} from "@/lib/feeds/swpc";
import type { DonkiBundle } from "@/lib/feeds/donki";
import { fetchDonkiBundle, fetchSolarCore } from "@/lib/feeds/solarProxy";
import { MODES, normalizePerformanceMode, type PerformanceMode } from "@/lib/feeds/modes";

import { fetchIssPosition, type IssPosition } from "@/lib/feeds/iss";
import { fetchOpenWildfires, type WildfireEvent } from "@/lib/feeds/wildfires";
import { fetchNeoToday, type NeoItem } from "@/lib/feeds/neows";

import {
  diffVolcWatch,
  fetchUsgsElevatedVolcanoes,
  type UsgsVolcanoAlert,
  type VolcWatchTransition,
} from "@/lib/feeds/usgsVolcanoAlerts";
import { fetchAllElevatedVolcanoes } from "@/lib/feeds/globalVolcanoAlerts";
import { fetchGlobalSeismic, type GlobalSeismicBundle } from "@/lib/feeds/globalSeismic";
import {
  buildWatchNodes,
  loadMutes,
  loadPins,
  saveMutes,
  savePins,
  alertKey,
} from "@/lib/feeds/watchlistOverride";
import {
  fetchGvpRecentVolcanoes,
  type GvpVolcano,
} from "@/lib/feeds/gvpGlobal";
import type { LiveStatus } from "@/lib/realtime/transport";
import {
  resonanceScore,
  readingSummary,
  interEventSeconds,
  type ResonanceScore,
} from "@/lib/supt/probe";
import {
  getCache,
  setCache,
  getHistory,
  pushHistory,
  pruneCache,
  type AttentionHistoryPoint,
} from "@/lib/cache/localCache";
import { defaultPerformanceMode, historyCap, isMobileViewport } from "@/lib/device";
import { interpretSolar, type SolarAssessment } from "@/lib/solar/suptInterpreter";
import { fluxToClass, longChannelXrays } from "@/lib/feeds/swpc";
import {
  loadBasemapStyle,
  loadOverlays,
  saveOverlays,
  type BasemapStyleId,
  type MapOverlayId,
} from "@/lib/feeds/mapStyles";
import {
  resolveFocusMmiEvent,
  fetchMmiContours,
  type MmiContourCollection,
} from "@/lib/seismology/shakemap";
import { pointInBounds } from "@/lib/geo/bounds";
import { resolveNodeId } from "@/lib/feeds/publishedMonitors";

type AlertItem = { message?: string; issue_datetime?: string };

export type TabId = "live" | "solar" | "resonance" | "analytics" | "about";
export type MobileSheet = "closed" | "filters" | "events";
export type MapView = "2d" | "3d";
export type TimeWindow = "hour" | "day" | "week" | "month";

/** Wall-clock ms of last successful pull per domain (null = never this session). */
export type FeedTimestamps = {
  eq: number | null;
  solar: number | null;
  volc: number | null;
  geofon: number | null;
  jma: number | null;
  global: number | null;
  pulse: number | null;
  donki: number | null;
  gvp: number | null;
};

export const EMPTY_FEED_TIMESTAMPS: FeedTimestamps = {
  eq: null,
  solar: null,
  volc: null,
  geofon: null,
  jma: null,
  global: null,
  pulse: null,
  donki: null,
  gvp: null,
};

export type DijHistoryPoint = {
  t: number;
  d_ij: number | null;
  n: number;
  z?: number | null;
};

export type FocusMmiState = {
  status: "idle" | "loading" | "ready" | "empty" | "error";
  eventId: string | null;
  place: string | null;
  mag: number | null;
  mmi: number | null;
  shakeMapUrl: string | null;
  contours: MmiContourCollection | null;
  error: string | null;
  dismissed: boolean;
};

/** Picked quake from globe click / event list (for antipode + highlight). */
export type PickedEvent = {
  id: string;
  lat: number;
  lon: number;
  mag: number;
  place: string;
  depth: number;
  time: number | null;
  url?: string;
};

const EMPTY_FOCUS_MMI: FocusMmiState = {
  status: "idle",
  eventId: null,
  place: null,
  mag: null,
  mmi: null,
  shakeMapUrl: null,
  contours: null,
  error: null,
  dismissed: false,
};

export function filteredEq(
  features: EqFeature[] | undefined,
  minMag: number,
  maxMag = 10,
): EqFeature[] {
  if (!features?.length) return [];
  return features.filter((f) => {
    const m = f.properties.mag ?? 0;
    return m >= minMag && m <= maxMag;
  });
}

function gvpToFocusNode(v: GvpVolcano): DragonNode {
  const half = 0.8;
  return {
    id: v.id,
    name: v.name,
    role: [
      "Smithsonian GVP",
      v.lastEruptionYear != null ? `last eruption ${v.lastEruptionYear}` : null,
      v.country,
    ]
      .filter(Boolean)
      .join(" · "),
    kind: "volcano",
    bounds: [
      [v.lat - half, v.lon - half],
      [v.lat + half, v.lon + half],
    ],
    center: [v.lat, v.lon],
    gvpUrl: v.gvpUrl,
    monitorUrl: v.gvpUrl,
    watchPriority: false,
    publishedFocus: false,
    focusNote: `${v.region || "Global Holocene"}${v.country ? ` · ${v.country}` : ""}${
      v.elevationM != null ? ` · ${Math.round(v.elevationM)} m` : ""
    }. Opt-in GVP layer (eruption ≥ 2010). Not a forecast — Smithsonian GVP is authoritative.`,
    aliases: v.vnum ? [v.vnum] : undefined,
  };
}

type ObservatoryState = {
  mode: PerformanceMode;
  tab: TabId;
  mobileSheet: MobileSheet;
  mapView: MapView;
  /** Immersive fullscreen map/globe (chrome minimal). */
  mapImmersive: boolean;
  timeWindow: TimeWindow;
  minMag: number;
  maxMag: number;
  autoRefresh: boolean;
  loading: boolean;
  lastUpdate: number | null;
  newestEventAgeMs: number | null;
  livePulseAt: number | null;
  error: string | null;
  focusNodeId: string | null;
  focusMmi: FocusMmiState;
  mapFlyTo: { lat: number; lon: number; zoom?: number; id?: string } | null;
  globeAntipode: { lat: number; lon: number } | null;
  pickedEvent: PickedEvent | null;

  basemapStyle: BasemapStyleId;
  overlays: Record<MapOverlayId, boolean>;

  useGeofon: boolean;
  audioAlerts: boolean;
  globeAutoSpin: boolean;
  /** Bumps when user re-asserts Spin (resume after focus). */
  globeSpinEpoch: number;
  /** Public-globe style: depth stem height multiplier (0.04–0.4). */
  globeStemScale: number;
  /** Public-globe style: hex / marker size multiplier. */
  globeMarkerScale: number;
  /** Auto-rotate speed multiplier. */
  globeSpinSpeed: number;
  /** Marker opacity 0.2–1. */
  globeMarkerOpacity: number;

  /** Per-domain last successful fetch (honest layer health). */
  feedTimestamps: FeedTimestamps;

  /** Event replay: only show quakes with time <= cursor (educational). */
  replayActive: boolean;
  replayCursorMs: number | null;
  replayPlaying: boolean;

  eq: EqCollection | null;
  volc: EqCollection | null;
  usgsVolcAlerts: UsgsVolcanoAlert[];
  /** Dynamic watch nodes while elevated (gone when green) */
  volcWatchNodes: DragonNode[];
  /** Recent elevate / baseline transitions for toasts & list */
  volcWatchTransitions: VolcWatchTransition[];
  /** Manual pin (keep after green) / mute (hide while elevated) — vnum keys */
  volcWatchPins: string[];
  volcWatchMutes: string[];
  /** Opt-in Smithsonian GVP Holocene (eruption ≥ 2010) */
  gvpVolcanoes: GvpVolcano[];
  gvpVolcanoesLoading: boolean;
  /** Transient focus for a GVP global pick */
  gvpFocusNode: DragonNode | null;
  globalSeismic: GlobalSeismicBundle | null;
  liveStatus: LiveStatus;
  liveStatusDetail: string | null;
  kp: KpPoint[];
  xray: XrayPoint[];
  solarWind: SolarWind | null;
  scales: NoaaScales | null;
  alerts: AlertItem[];
  flux10cm: Flux10cm | null;
  protons: ProtonPoint[];
  forecast: ForecastBundle | null;
  enlil: EnlilFrame | null;
  ovation: OvationFrame | null;
  ovationBundle: OvationBundle | null;
  /** When true + aurora layer: SWPC stills instead of Kp oval */
  auroraOfficial: boolean;
  issPosition: IssPosition | null;
  wildfires: WildfireEvent[];
  neos: NeoItem[];
  ambientLoading: boolean;
  donki: DonkiBundle | null;
  kpForecast: KpForecastPoint[];
  /** Cached SUPT solar assessment — single compute per refresh */
  solarAssessment: SolarAssessment | null;
  attentionHistory: AttentionHistoryPoint[];

  resonance: ResonanceScore | null;
  reading: string;
  dijHistory: DijHistoryPoint[];

  setMode: (m: PerformanceMode) => void;
  setTab: (t: TabId) => void;
  setMobileSheet: (s: MobileSheet) => void;
  setMapView: (v: MapView) => void;
  setMapImmersive: (v: boolean) => void;
  setTimeWindow: (w: TimeWindow) => void;
  setMinMag: (m: number) => void;
  setMaxMag: (m: number) => void;
  setAutoRefresh: (v: boolean) => void;
  setFocusNode: (id: string | null) => void;
  /** Clear focus + return map to world home view */
  exitToHomeView: () => void;
  focusGvpVolcano: (v: GvpVolcano) => void;
  setBasemapStyle: (id: BasemapStyleId) => void;
  setOverlay: (id: MapOverlayId, on: boolean) => void;
  setAuroraOfficial: (v: boolean) => void;
  setOverlaysBulk: (next: Record<MapOverlayId, boolean>) => void;
  pinVolcWatch: (key: string) => void;
  unpinVolcWatch: (key: string) => void;
  muteVolcWatch: (key: string) => void;
  unmuteVolcWatch: (key: string) => void;
  setLiveStatus: (s: LiveStatus, detail?: string | null) => void;
  rebuildVolcWatch: () => void;
  ensureGvpVolcanoes: () => Promise<void>;
  ensureAmbientLayers: (force?: boolean) => Promise<void>;
  pulseIss: () => Promise<void>;
  setUseGeofon: (v: boolean) => void;
  setAudioAlerts: (v: boolean) => void;
  setGlobeAutoSpin: (v: boolean) => void;
  /** Re-enable spin even if already ON (after focus pause). */
  resumeGlobeSpin: () => void;
  setGlobeStemScale: (v: number) => void;
  setGlobeMarkerScale: (v: number) => void;
  setGlobeSpinSpeed: (v: number) => void;
  setGlobeMarkerOpacity: (v: number) => void;
  pickEvent: (ev: PickedEvent | null) => void;
  dismissFocusMmi: () => void;
  loadFocusMmi: () => Promise<void>;
  flyMapTo: (lat: number, lon: number, zoom?: number, id?: string) => void;
  clearMapFlyTo: () => void;
  antipodeOf: (lat: number, lon: number) => void;
  clearGlobeAntipode: () => void;
  setReplayActive: (on: boolean) => void;
  setReplayCursorMs: (ms: number | null) => void;
  setReplayPlaying: (on: boolean) => void;
  exitReplay: () => void;
  refresh: (force?: boolean) => Promise<void>;
  pulseRealtime: (kind?: "hour" | "significant" | "ws") => Promise<void>;
  /** Call once on client mount — applies saved/mobile mode without SSR mismatch */
  bootstrapClientDefaults: () => void;
};

function loadMode(): PerformanceMode {
  try {
    const raw = localStorage.getItem("wolfwatch_mode");
    const normalized = normalizePerformanceMode(raw);
    if (normalized) {
      // Migrate legacy "lite" → standard in storage
      if (raw === "lite") {
        try {
          localStorage.setItem("wolfwatch_mode", "standard");
        } catch { /* ignore */ }
      }
      return normalized;
    }
    const def = defaultPerformanceMode();
    try {
      localStorage.setItem("wolfwatch_mode", def);
      localStorage.setItem("wolfwatch_first_open", isMobileViewport() ? "mobile" : "desktop");
    } catch { /* ignore */ }
    return def;
  } catch {
    /* ignore */
  }
  return defaultPerformanceMode();
}

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === "1" || v === "true") return true;
    if (v === "0" || v === "false") return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

function loadNum(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  } catch {
    return fallback;
  }
}

function saveNum(key: string, v: number) {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* ignore */
  }
}

function safeHistory(): DijHistoryPoint[] {
  if (typeof window === "undefined") return [];
  return getHistory<DijHistoryPoint>("dij", historyCap());
}

function safeAttentionHistory(): AttentionHistoryPoint[] {
  if (typeof window === "undefined") return [];
  return getHistory<AttentionHistoryPoint>("attn", historyCap());
}

function buildSolarAssessmentFromState(s: {
  scales: NoaaScales | null;
  solarWind: SolarWind | null;
  kp: KpPoint[];
  xray: XrayPoint[];
  donki: DonkiBundle | null;
  protons: ProtonPoint[];
  enlil: EnlilFrame | null;
  mode: PerformanceMode;
}): SolarAssessment {
  const long = longChannelXrays(s.xray);
  const latest = long.length ? long[long.length - 1] : null;
  const flux = latest ? latest.flux || latest.observed_flux || 0 : 0;
  const kpVal = s.kp.length ? Number(s.kp[s.kp.length - 1]!.Kp) : null;
  return interpretSolar({
    scales: s.scales,
    wind: s.solarWind,
    kp: kpVal,
    xClass: latest ? fluxToClass(flux) : "—",
    xray: s.xray,
    cmes: s.donki?.cmes ?? [],
    flares: s.donki?.flares ?? [],
    protons: s.protons,
    enlilTimeHint: s.enlil?.timeHint,
    shuffleN: s.mode === "full" ? 80 : 60,
  });
}

let seenEqIds = new Set<string>();
let mmiAbort: AbortController | null = null;
let gvpAbort: AbortController | null = null;
let gvpFetchInFlight: Promise<void> | null = null;


/** Bound hung network so one slow feed cannot freeze lastUpdate forever. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export const useObservatory = create<ObservatoryState>((set, get) => ({
  // SSR-safe defaults (must match server HTML). Client bootstrap adjusts mode.
  mode: "standard",
  tab: "live",
  mobileSheet: "closed",
  mapView: "2d",
  mapImmersive: false,
  timeWindow: "week",
  minMag: 4.5,
  maxMag: 10,
  autoRefresh: true,
  loading: false,
  lastUpdate: null,
  newestEventAgeMs: null,
  livePulseAt: null,
  error: null,
  focusNodeId: null,
  focusMmi: { ...EMPTY_FOCUS_MMI },
  mapFlyTo: null,
  globeAntipode: null,
  pickedEvent: null,
  basemapStyle: "satellite",
  overlays: {
    quakes: true,
    heatmap: false,
    nodes: true,
    volcanoes: true,
    globalVolcanoes: false,
    corridors: false,
    depthColor: false,
    timeDecay: false,
    mmiContours: true,
    plates: false,
    significant: false,
    globalActivity: false,
    iss: false,
    aurora: false,
    wildfires: false,
    neos: false,
  },
  useGeofon: false,
  audioAlerts: false,
  globeAutoSpin: true,
  globeSpinEpoch: 0,
  globeStemScale: 0.2,
  globeMarkerScale: 1.25,
  globeSpinSpeed: 1,
  globeMarkerOpacity: 0.95,
  feedTimestamps: { ...EMPTY_FEED_TIMESTAMPS },
  replayActive: false,
  replayCursorMs: null,
  replayPlaying: false,

  eq: null,
  volc: null,
  usgsVolcAlerts: [],
  volcWatchNodes: [],
  volcWatchTransitions: [],
  volcWatchPins: [],
  volcWatchMutes: [],
  gvpVolcanoes: [],
  gvpVolcanoesLoading: false,
  gvpFocusNode: null,
  globalSeismic: null,
  liveStatus: "polling",
  liveStatusDetail: null,
  kp: [],
  xray: [],
  solarWind: null,
  scales: null,
  alerts: [],
  flux10cm: null,
  protons: [],
  forecast: null,
  enlil: null,
  ovation: null,
  ovationBundle: null,
  auroraOfficial: false,
  issPosition: null,
  wildfires: [],
  neos: [],
  ambientLoading: false,
  donki: null,
  kpForecast: [],
  solarAssessment: null,
  attentionHistory: [],

  resonance: null,
  reading: "",
  dijHistory: [],

  setMode: (m) => {
    try {
      localStorage.setItem("wolfwatch_mode", m);
    } catch {
      /* ignore */
    }
    const prev = get().mode;
    const prevMin = MODES[prev].minMag;
    const patch: Partial<ObservatoryState> = { mode: m };
    // Align mag floor with mode when user was still on previous mode default
    if (get().minMag === prevMin) patch.minMag = MODES[m].minMag;
    // 3D globe is mode-independent (mobile-safe quality profile handles phones).
    set(patch);
    void get().refresh(true);
  },
  setTab: (t) => set({ tab: t, mobileSheet: "closed" as const }),
  setMobileSheet: (mobileSheet) => set({ mobileSheet }),
  setMapView: (v) => {
    try {
      localStorage.setItem("wolfwatch_mapview", v);
    } catch {
      /* ignore */
    }
    set({ mapView: v });
  },
  setMapImmersive: (v) => {
    try {
      localStorage.setItem("wolfwatch_map_immersive", v ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ mapImmersive: v });
  },
  setTimeWindow: (w) => {
    const next = normalizeTimeWindow(w) as TimeWindow;
    set({ timeWindow: next });
    void get().refresh(true);
  },
  setMinMag: (m) => set({ minMag: m }),
  setMaxMag: (m) => set({ maxMag: m }),
  setAutoRefresh: (v) => set({ autoRefresh: v }),
  setFocusNode: (id) => {
    if (mmiAbort) {
      mmiAbort.abort();
      mmiAbort = null;
    }
    const resolved = id != null ? resolveNodeId(id) ?? id : null;
    // Prefer canonical dragon id when alias was used
    let focusId = resolved;
    if (focusId) {
      const nodes = [
        ...get().volcWatchNodes,
        ...DRAGON_NODES,
        ...(get().gvpFocusNode ? [get().gvpFocusNode!] : []),
      ];
      const hit =
        nodes.find((n) => n.id === focusId) ??
        nodes.find((n) => n.aliases?.some((a) => a.toLowerCase() === focusId!.toLowerCase()));
      if (hit) focusId = hit.id;
    }
    const gvpFocus = get().gvpFocusNode;
    const keepGvp = focusId != null && gvpFocus?.id === focusId;
    set({
      focusNodeId: focusId,
      gvpFocusNode: keepGvp ? gvpFocus : null,
      mapView: focusId ? "2d" : get().mapView,
      tab: "live",
      mobileSheet: "closed",
      focusMmi: { ...EMPTY_FOCUS_MMI },
      pickedEvent: null,
    });
    if (focusId) void get().loadFocusMmi();
  },
  exitToHomeView: () => {
    if (mmiAbort) {
      mmiAbort.abort();
      mmiAbort = null;
    }
    set({
      focusNodeId: null,
      gvpFocusNode: null,
      tab: "live",
      mobileSheet: "closed",
      focusMmi: { ...EMPTY_FOCUS_MMI },
      pickedEvent: null,
      mapFlyTo: null,
      // keep mapView + immersive — Home = world frame, not force 2D
    });
  },
  focusGvpVolcano: (v) => {
    if (mmiAbort) {
      mmiAbort.abort();
      mmiAbort = null;
    }
    const node = gvpToFocusNode(v);
    const overlays = { ...get().overlays, globalVolcanoes: true };
    try {
      saveOverlays(overlays);
    } catch {
      /* ignore */
    }
    set({
      gvpFocusNode: node,
      focusNodeId: node.id,
      mapView: "2d",
      tab: "live",
      mobileSheet: "closed",
      focusMmi: { ...EMPTY_FOCUS_MMI },
      pickedEvent: null,
      overlays,
    });
    void get().loadFocusMmi();
  },
  flyMapTo: (lat, lon, zoom = 6, id) => {
    const la = Number(lat);
    const lo = Number(lon);
    const z = zoom == null ? 6 : Number(zoom);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
    if (la < -90 || la > 90) return;
    if (!Number.isFinite(z) || z < 0 || z > 22) return;
    // normalize lon
    let lonN = ((((lo + 180) % 360) + 360) % 360) - 180;
    set({
      tab: "live",
      mobileSheet: "closed",
      mapView: "2d",
      mapFlyTo: { lat: la, lon: lonN, zoom: z, id },
    });
  },
  clearMapFlyTo: () => set({ mapFlyTo: null }),
  antipodeOf: (lat, lon) => {
    const la = Number(lat);
    const lo = Number(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || la < -90 || la > 90) return;
    const aLat = -la;
    let aLon = lo + 180;
    if (aLon > 180) aLon -= 360;
    if (aLon < -180) aLon += 360;
    const full = get().mode === "full";
    set({
      tab: "live",
      mobileSheet: "closed",
      mapView: full ? "3d" : "2d",
      globeAntipode: full ? { lat: aLat, lon: aLon } : null,
      mapFlyTo: full ? null : { lat: aLat, lon: aLon, zoom: 3 },
    });
  },
  clearGlobeAntipode: () => set({ globeAntipode: null }),
  pickEvent: (ev) => set({ pickedEvent: ev }),
  setAuroraOfficial: (v) => {
    try {
      localStorage.setItem("wolfwatch_aurora_official", v ? "1" : "0");
    } catch { /* */ }
    set({ auroraOfficial: v });
  },
  setBasemapStyle: (id) => {
    try {
      localStorage.setItem("wolfwatch_basemap", id);
    } catch {
      /* ignore */
    }
    set({ basemapStyle: id });
  },
  setOverlay: (id, on) => {
    const overlays = { ...get().overlays, [id]: on };
    try {
      saveOverlays(overlays);
    } catch {
      /* ignore */
    }
    set({ overlays });
    if (id === "globalVolcanoes" && on) {
      void get().ensureGvpVolcanoes();
    }
    if (on && (id === "iss" || id === "wildfires" || id === "neos" || id === "aurora")) {
      void get().ensureAmbientLayers(id === "iss" || id === "wildfires" || id === "neos");
      if (id === "aurora" && !get().ovationBundle) {
        void get().refresh(false);
      }
    }
    if (id === "globalVolcanoes" && !on) {
      const focus = get().focusNodeId;
      const gvp = get().gvpFocusNode;
      if (gvp && focus === gvp.id) {
        set({ focusNodeId: null, gvpFocusNode: null });
      }
    }
  },
  setOverlaysBulk: (next) => {
    const overlays = { ...next };
    try {
      saveOverlays(overlays);
    } catch {
      /* ignore */
    }
    set({ overlays });
    if (overlays.globalVolcanoes) void get().ensureGvpVolcanoes();
    if (overlays.iss || overlays.wildfires || overlays.neos || overlays.aurora) {
      void get().ensureAmbientLayers(true);
    }
  },
  setLiveStatus: (liveStatus, detail = null) =>
    set({ liveStatus, liveStatusDetail: detail ?? null }),
  rebuildVolcWatch: () => {
    const pins = new Set<string>(get().volcWatchPins);
    const mutes = new Set<string>(get().volcWatchMutes);
    set({
      volcWatchNodes: buildWatchNodes(get().usgsVolcAlerts, pins, mutes),
    });
  },
  ensureGvpVolcanoes: async () => {
    if (get().gvpVolcanoes.length > 0) return;
    if (gvpFetchInFlight) return gvpFetchInFlight;
    gvpAbort?.abort();
    gvpAbort = new AbortController();
    const signal = gvpAbort.signal;
    set({ gvpVolcanoesLoading: true });
    gvpFetchInFlight = (async () => {
      try {
        const list = await withTimeout(
          fetchGvpRecentVolcanoes(signal),
          25000,
          "GVP volcanoes",
        );
        if (signal.aborted) return;
        set({
          gvpVolcanoes: list,
          gvpVolcanoesLoading: false,
          feedTimestamps: {
            ...get().feedTimestamps,
            gvp: list.length ? Date.now() : get().feedTimestamps.gvp,
          },
        });
      } catch {
        if (!signal.aborted) set({ gvpVolcanoesLoading: false });
      } finally {
        gvpFetchInFlight = null;
      }
    })();
    return gvpFetchInFlight;
  },
  ensureAmbientLayers: async (force = false) => {
    const o = get().overlays;
    const wantIss = o.iss || force;
    const wantFire = o.wildfires || (force && o.wildfires);
    const wantNeo = o.neos || force;
    // Cross-feed needs light data even when layers off: pull NEO/fires only if forced or empty+force
    set({ ambientLoading: true });
    try {
      const jobs: Promise<void>[] = [];
      if (o.iss || wantIss) {
        jobs.push(
          fetchIssPosition().then((iss) => {
            if (iss) set({ issPosition: iss });
          }),
        );
      }
      if (o.wildfires || (force && !get().wildfires.length)) {
        jobs.push(
          fetchOpenWildfires().then((wildfires) => set({ wildfires })),
        );
      }
      if (o.neos || force) {
        jobs.push(fetchNeoToday().then((neos) => set({ neos })));
      }
      // Quiet default: still warm NEO list once for Solar/cross-feed if empty
      if (!get().neos.length && !jobs.length) {
        jobs.push(fetchNeoToday().then((neos) => set({ neos })));
      }
      await Promise.all(jobs);
    } finally {
      set({ ambientLoading: false });
    }
  },
  pulseIss: async () => {
    if (!get().overlays.iss && !get().issPosition) {
      /* still allow cross-feed refresh */
    }
    if (!get().overlays.iss) return;
    const iss = await fetchIssPosition();
    if (iss) set({ issPosition: iss });
  },
  pinVolcWatch: (key: string) => {
    const pins = new Set<string>(get().volcWatchPins);
    pins.add(key);
    const mutes = new Set<string>(get().volcWatchMutes);
    mutes.delete(key);
    savePins(pins);
    saveMutes(mutes);
    set({
      volcWatchPins: [...pins],
      volcWatchMutes: [...mutes],
      volcWatchNodes: buildWatchNodes(get().usgsVolcAlerts, pins, mutes),
    });
  },
  unpinVolcWatch: (key: string) => {
    const pins = new Set<string>(get().volcWatchPins);
    pins.delete(key);
    savePins(pins);
    set({
      volcWatchPins: [...pins],
      volcWatchNodes: buildWatchNodes(
        get().usgsVolcAlerts,
        pins,
        new Set<string>(get().volcWatchMutes),
      ),
    });
  },
  muteVolcWatch: (key: string) => {
    const mutes = new Set<string>(get().volcWatchMutes);
    mutes.add(key);
    const pins = new Set<string>(get().volcWatchPins);
    pins.delete(key);
    saveMutes(mutes);
    savePins(pins);
    const focus = get().focusNodeId;
    const nodeId = `usgs-volc-${key}`;
    set({
      volcWatchMutes: [...mutes],
      volcWatchPins: [...pins],
      volcWatchNodes: buildWatchNodes(get().usgsVolcAlerts, pins, mutes),
      focusNodeId: focus === nodeId ? null : focus,
    });
  },
  unmuteVolcWatch: (key: string) => {
    const mutes = new Set<string>(get().volcWatchMutes);
    mutes.delete(key);
    saveMutes(mutes);
    set({
      volcWatchMutes: [...mutes],
      volcWatchNodes: buildWatchNodes(
        get().usgsVolcAlerts,
        new Set<string>(get().volcWatchPins),
        mutes,
      ),
    });
  },
  setUseGeofon: (v) => {
    try {
      localStorage.setItem("wolfwatch_geofon", v ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ useGeofon: v });
    void get().refresh(true);
  },
  setAudioAlerts: (v) => {
    try {
      localStorage.setItem("wolfwatch_audio", v ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ audioAlerts: v });
  },
  setGlobeAutoSpin: (v) => {
    try {
      localStorage.setItem("wolfwatch_globe_spin", v ? "1" : "0");
    } catch {
      /* ignore */
    }
    set((s) => ({
      globeAutoSpin: v,
      // Bump epoch when enabling so 3D re-attaches autoRef even if already true
      globeSpinEpoch: v ? s.globeSpinEpoch + 1 : s.globeSpinEpoch,
    }));
  },
  resumeGlobeSpin: () => {
    try {
      localStorage.setItem("wolfwatch_globe_spin", "1");
    } catch {
      /* ignore */
    }
    set((s) => ({
      globeAutoSpin: true,
      globeSpinEpoch: s.globeSpinEpoch + 1,
    }));
  },
  setGlobeStemScale: (v) => {
    const n = Math.min(0.42, Math.max(0.04, v));
    saveNum("wolfwatch_globe_stem", n);
    set({ globeStemScale: n });
  },
  setGlobeMarkerScale: (v) => {
    const n = Math.min(3.5, Math.max(0.4, v));
    saveNum("wolfwatch_globe_hex", n);
    set({ globeMarkerScale: n });
  },
  setGlobeSpinSpeed: (v) => {
    const n = Math.min(3, Math.max(0.1, v));
    saveNum("wolfwatch_globe_spd", n);
    set({ globeSpinSpeed: n });
  },
  setGlobeMarkerOpacity: (v) => {
    const n = Math.min(1, Math.max(0.2, v));
    saveNum("wolfwatch_globe_opac", n);
    set({ globeMarkerOpacity: n });
  },
  dismissFocusMmi: () =>
    set({ focusMmi: { ...get().focusMmi, dismissed: true } }),

  loadFocusMmi: async () => {
    const nodeId = get().focusNodeId;
    if (!nodeId) return;
    const node = DRAGON_NODES.find((n) => n.id === nodeId);
    if (!node || node.kind === "volcano") {
      set({
        focusMmi: {
          ...EMPTY_FOCUS_MMI,
          status: "empty",
          error: "No seismic focus for MMI",
        },
      });
      return;
    }
    if (!get().overlays.mmiContours) return;

    if (mmiAbort) mmiAbort.abort();
    const ac = new AbortController();
    mmiAbort = ac;
    const signal = ac.signal;

    set({
      focusMmi: {
        ...EMPTY_FOCUS_MMI,
        status: "loading",
      },
    });

    try {
      const features = get().eq?.features ?? [];
      const candidate = await resolveFocusMmiEvent(features, node.bounds, signal);
      if (signal.aborted) return;
      if (!candidate?.id) {
        set({
          focusMmi: {
            ...EMPTY_FOCUS_MMI,
            status: "empty",
            error: "No suitable event for ShakeMap MMI",
          },
        });
        return;
      }
      const result = await fetchMmiContours(String(candidate.id), signal);
      if (signal.aborted) return;
      if (!result) {
        set({
          focusMmi: {
            ...EMPTY_FOCUS_MMI,
            status: "empty",
            eventId: String(candidate.id),
            place: candidate.properties.place,
            mag: candidate.properties.mag,
            mmi: candidate.properties.mmi ?? null,
            error: "No cont_mmi product for this event",
          },
        });
        return;
      }
      set({
        focusMmi: {
          status: "ready",
          eventId: result.eventId,
          place: result.place,
          mag: result.mag,
          mmi: result.mmi,
          shakeMapUrl: result.shakeMapUrl,
          contours: result.contours,
          error: null,
          dismissed: false,
        },
      });
    } catch (e) {
      if (signal.aborted) return;
      set({
        focusMmi: {
          ...EMPTY_FOCUS_MMI,
          status: "error",
          error: e instanceof Error ? e.message : "MMI fetch failed",
        },
      });
    }
  },

  setReplayActive: (on) => {
    if (!on) {
      set({ replayActive: false, replayPlaying: false, replayCursorMs: null });
      return;
    }
    const feats = get().eq?.features ?? [];
    const times = feats
      .map((f) => f.properties.time)
      .filter((t): t is number => typeof t === "number")
      .sort((a, b) => a - b);
    const start = times[0] ?? Date.now() - 86_400_000;
    set({
      replayActive: true,
      replayPlaying: false,
      replayCursorMs: start,
      autoRefresh: false,
    });
  },
  setReplayCursorMs: (ms) => set({ replayCursorMs: ms }),
  setReplayPlaying: (on) => set({ replayPlaying: on }),
  exitReplay: () =>
    set({
      replayActive: false,
      replayPlaying: false,
      replayCursorMs: null,
    }),

  refresh: async (force = false) => {
    const { mode, timeWindow, loading, useGeofon, audioAlerts } = get();
    if (loading && !force) return;
    const cfg = MODES[mode];
    try {
      pruneCache(false);
    } catch { /* */ }
    set({ loading: true, error: null });

    try {
      const eqCacheKey = `eq_${timeWindow}`;
      let eq = force ? null : getCache<EqCollection>(eqCacheKey, cfg.refreshMs);
      let kp = force ? null : getCache<KpPoint[]>("kp", cfg.refreshMs);
      let xray = force ? null : getCache<XrayPoint[]>("xray", cfg.refreshMs * 2);
      let solarWind = force ? null : getCache<SolarWind>("sw", cfg.refreshMs);
      let scales = force ? null : getCache<NoaaScales>("scales", 180_000);
      let alerts = force ? null : getCache<AlertItem[]>("alerts", 120_000);
      let flux10cm = force ? null : getCache<Flux10cm>("flux10", 300_000);
      let protons = force ? null : getCache<ProtonPoint[]>("protons", 180_000);
      let forecast = force ? null : getCache<ForecastBundle>("forecast", 600_000);
      let enlil = force ? null : getCache<EnlilFrame>("enlil", 600_000);
      let ovation = force ? null : getCache<OvationFrame>("ovation", 300_000);
      let ovationBundle = force ? null : getCache<OvationBundle>("ovationBundle", 300_000);
      if (ovationBundle) set({ ovationBundle });
      let donki = force ? null : getCache<DonkiBundle>("donki", 600_000);
      let kpForecast = force ? null : getCache<KpForecastPoint[]>("kp_fc", 600_000);
      let volc = force ? null : getCache<EqCollection>("volc", 300_000);
      let usgsVolcAlerts: UsgsVolcanoAlert[] | null = force
        ? null
        : getCache<UsgsVolcanoAlert[]>("usgs_volc_alerts_v4", 300_000);

      const tasks: Promise<void>[] = [];
      let pulse: EqCollection | null = null;
      let geofon: EqCollection | null = null;
      let jma: EqCollection | null = null;
      const stamps: Partial<FeedTimestamps> = {};
      const stamp = (k: keyof FeedTimestamps) => {
        stamps[k] = Date.now();
      };

      if (!eq) {
        tasks.push(
          withTimeout(fetchEarthquakes(timeWindow), 20_000, "usgs-eq")
            .then((d) => {
              eq = d;
              setCache(eqCacheKey, d);
              stamp("eq");
            })
            .catch(() => {}),
        );
      } else if (!get().feedTimestamps.eq) {
        stamps.eq = Date.now();
      }
      tasks.push(
        withTimeout(fetchRealtimePulse(), 12_000, "usgs-pulse")
          .then((d) => {
            pulse = d;
            setCache("eq_pulse", d);
            stamp("pulse");
            stamp("eq");
          })
          .catch(() => {
            pulse = getCache<EqCollection>("eq_pulse", 120_000);
          }),
      );
      if (useGeofon) {
        tasks.push(
          withTimeout(fetchGeofonWeek(Math.min(cfg.minMag, 2.5)), 18_000, "geofon")
            .then((d) => {
              geofon = d;
              setCache("geofon", d);
              stamp("geofon");
            })
            .catch(() => {
              geofon = getCache<EqCollection>("geofon", 300_000);
            }),
        );
      }
      // JMA Bosai — densifies Japan + shindo (CORS open)
      tasks.push(
        withTimeout(fetchJmaQuakes(), 18_000, "jma")
          .then((d) => {
            jma = d;
            setCache("jma", d);
            stamp("jma");
          })
          .catch(() => {
            jma = getCache<EqCollection>("jma", 300_000);
          }),
      );
      // Solar stack via server proxy (CORS-safe) + DONKI
      if (cfg.loadSolarWind && (!kp?.length || !solarWind || !scales || !forecast || !flux10cm || force)) {
        tasks.push(
          withTimeout(
            fetchSolarCore({ data: { heavy: cfg.loadChart || cfg.loadImage } }),
            28_000,
            "solar-core",
          )
            .then((d) => {
              kp = d.kp;
              xray = d.xray;
              solarWind = d.solarWind;
              scales = d.scales;
              alerts = d.alerts;
              flux10cm = d.flux10cm;
              forecast = d.forecast;
              enlil = d.enlil;
              ovation = d.ovation;
              if (d.ovationBundle) { ovationBundle = d.ovationBundle; set({ ovationBundle }); }
              protons = d.protons;
              kpForecast = d.kpForecast;
              setCache("kp", d.kp);
              if (d.xray.length) setCache("xray", d.xray);
              setCache("sw", d.solarWind);
              if (d.scales) setCache("scales", d.scales);
              setCache("alerts", d.alerts);
              setCache("flux10", d.flux10cm);
              setCache("forecast", d.forecast);
              if (d.enlil) setCache("enlil", d.enlil);
              if (d.ovation) setCache("ovation", d.ovation);
              if (d.ovationBundle) setCache("ovationBundle", d.ovationBundle);
              if (d.protons.length) setCache("protons", d.protons);
              if (d.kpForecast?.length) setCache("kp_fc", d.kpForecast);
              stamp("solar");
            })
            .catch(() => {
              /* keep cached */
            }),
        );
      } else {
        if ((kp?.length || scales) && !get().feedTimestamps.solar) stamps.solar = Date.now();
        if (!kp) {
          tasks.push(
            withTimeout(fetchKp(), 15_000, "kp")
              .then((d) => {
                kp = d;
                stamp("solar");
                setCache("kp", d);
              })
              .catch(() => {}),
          );
        }
        if (cfg.loadChart && !xray) {
          tasks.push(
            withTimeout(fetchXrays(), 15_000, "xray")
              .then((d) => {
                xray = d;
                stamp("solar");
                setCache("xray", d);
              })
              .catch(() => {}),
          );
        }
        if (!alerts) {
          tasks.push(
            withTimeout(fetchAlerts(), 12_000, "alerts")
              .then((d) => {
                alerts = d;
                stamp("solar");
                setCache("alerts", d);
              })
              .catch(() => {}),
          );
        }
      }
      // DONKI catalogs: skip on Lite (mobile first-open) unless forced later via mode bump
      if (cfg.loadSolarWind && !donki) {
        tasks.push(
          withTimeout(fetchDonkiBundle(), 25_000, "donki")
            .then((d) => {
              donki = d;
              setCache("donki", d);
              stamp("donki");
              stamp("solar");
            })
            .catch(() => {}),
        );
      }
      
      if (cfg.loadVolc && !volc) {
        tasks.push(
          withTimeout(fetchVolcanoes(), 18_000, "volc")
            .then((d) => {
              volc = d;
              if (d) setCache("volc", d);
              stamp("volc");
            })
            .catch(() => {}),
        );
      }

      // USGS HANS elevated volcanoes — small; always refresh when missing
      if (!usgsVolcAlerts) {
        tasks.push(
          withTimeout(fetchAllElevatedVolcanoes(), 22_000, "volc-alerts")
            .then((d) => {
              usgsVolcAlerts = d;
              setCache("usgs_volc_alerts_v4", d);
              stamp("volc");
            })
            .catch(() => {}),
        );
      }

      let globalSeismic = force
        ? null
        : getCache<GlobalSeismicBundle>("global_seismic", 180_000);
      if (!globalSeismic) {
        tasks.push(
          withTimeout(fetchGlobalSeismic(), 20_000, "global-seismic")
            .then((d) => {
              globalSeismic = d;
              setCache("global_seismic", d);
              stamp("global");
            })
            .catch(() => {}),
        );
      }

      await Promise.allSettled(tasks); /* each task should be timeout-wrapped */

      let eqFinal = mergeEqCollections(eq ?? get().eq, pulse);
      if (useGeofon && geofon) {
        eqFinal = mergeEqCollections(eqFinal, geofon);
      }
      if (jma) {
        // Match selected window (not looser ages) so 3D/2D stay honest
        const age =
          timeWindow === "hour"
            ? 3_600_000
            : timeWindow === "day"
              ? 86_400_000
              : timeWindow === "week"
                ? 7 * 86_400_000
                : 30 * 86_400_000;
        eqFinal = mergeJmaIntoCollection(eqFinal, jma, { maxAgeMs: age });
      }
      // Hard clip: GEOFON week / pulse / stale cache cannot outrun the time control
      eqFinal = clipCollectionToWindow(eqFinal, timeWindow) ?? eqFinal;
      if (eqFinal?.features && eqFinal.features.length > cfg.maxMarkers) {
        eqFinal = {
          ...eqFinal,
          features: capFeaturesForMode(
            eqFinal.features,
            cfg.maxMarkers,
            priorityNodeBounds(get().volcWatchNodes),
          ),
        };
      }
      const newestEventAgeMs = latestEventAgeMs(eqFinal?.features);

      if (eqFinal?.features) {
        seenEqIds = alertNewEvents(eqFinal.features, seenEqIds, {
          enabled: audioAlerts,
          minMag: 4.5,
        });
      }

      let resonance = get().resonance;
      let reading = get().reading;
      let dijHistory = get().dijHistory;
      if (eqFinal?.features?.length) {
        const times = eqFinal.features
          .map((f) => f.properties.time)
          .filter((t): t is number => typeof t === "number");
        const inter = interEventSeconds(times);
        const score = resonanceScore(inter, cfg.shuffleN);
        resonance = score;
        reading = readingSummary(score);
        dijHistory = pushHistory<DijHistoryPoint>(
          "dij",
          {
            t: Date.now(),
            d_ij: score.d_ij,
            n: score.n,
            z: score.z,
          },
          historyCap(),
        );
      }

      const kpFinal = kp ?? get().kp;
      const xrayFinal = xray ?? get().xray;
      const swFinal = solarWind ?? get().solarWind;
      const scalesFinal = scales ?? get().scales;
      const protonsFinal = protons ?? get().protons;
      const donkiFinal = donki ?? get().donki;
      const enlilFinal = enlil ?? get().enlil;

      const solarAssessment = buildSolarAssessmentFromState({
        scales: scalesFinal,
        solarWind: swFinal,
        kp: kpFinal,
        xray: xrayFinal,
        donki: donkiFinal,
        protons: protonsFinal,
        enlil: enlilFinal,
        mode,
      });

      let attentionHistory = get().attentionHistory;
      if (solarAssessment) {
        attentionHistory = pushHistory<AttentionHistoryPoint>(
          "attn",
          {
            t: Date.now(),
            attention: solarAssessment.attention,
            level: solarAssessment.impact.level,
            kp: kpFinal.length ? Number(kpFinal[kpFinal.length - 1]!.Kp) : null,
          },
          historyCap(),
        );
      }

      set({
        eq: eqFinal,
        volc: volc ?? get().volc,
        usgsVolcAlerts: usgsVolcAlerts ?? get().usgsVolcAlerts,
        globalSeismic: globalSeismic ?? get().globalSeismic,
        volcWatchNodes: (() => {
          const next = usgsVolcAlerts ?? get().usgsVolcAlerts;
          return buildWatchNodes(
            next,
            new Set<string>(get().volcWatchPins),
            new Set<string>(get().volcWatchMutes),
          );
        })(),
        volcWatchTransitions: (() => {
          const prev = get().usgsVolcAlerts;
          const next = usgsVolcAlerts ?? prev;
          if (usgsVolcAlerts == null) return get().volcWatchTransitions;
          // Skip noisy "all elevated" on first empty→full load? Still useful.
          const hadPrev = prev.length > 0 || get().volcWatchNodes.length > 0;
          const deltas = diffVolcWatch(prev, next);
          if (!deltas.length) return get().volcWatchTransitions;
          // First successful fetch: treat as elevated seed without baseline spam
          const filtered =
            !hadPrev && prev.length === 0
              ? deltas.filter((d) => d.kind === "elevated")
              : deltas;
          return [...filtered, ...get().volcWatchTransitions].slice(0, 24);
        })(),
        kp: kpFinal,
        xray: xrayFinal,
        solarWind: swFinal,
        scales: scalesFinal,
        alerts: alerts ?? get().alerts,
        flux10cm: flux10cm ?? get().flux10cm,
        protons: protonsFinal,
        forecast: forecast ?? get().forecast,
        enlil: enlilFinal,
        ovation: ovation ?? get().ovation,
        ovationBundle: ovationBundle ?? get().ovationBundle,
        donki: donkiFinal,
        kpForecast: kpForecast ?? get().kpForecast,
        solarAssessment,
        attentionHistory,
        resonance,
        reading,
        dijHistory,
        loading: false,
        lastUpdate: Date.now(),
        newestEventAgeMs,
        livePulseAt: pulse ? Date.now() : get().livePulseAt,
        feedTimestamps: { ...get().feedTimestamps, ...stamps },
        error: null,
      });

      if (get().focusNodeId && get().overlays.mmiContours) {
        void get().loadFocusMmi();
      }
      // Ambient: ISS/fires/NEO when layers on (or warm NEO for Solar)
      void get().ensureAmbientLayers(false);
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Refresh failed",
      });
    } finally {
      // Never leave the shell stuck on "updated —" if a path forgot loading:false
      if (get().loading) set({ loading: false });
    }
  },

  bootstrapClientDefaults: () => {
    if (typeof window === "undefined") return;
    try {
      const patch: Partial<ObservatoryState> = {
        basemapStyle: loadBasemapStyle(),
        overlays: loadOverlays(),
        auroraOfficial: loadBool("wolfwatch_aurora_official", false),
        useGeofon: loadBool("wolfwatch_geofon", false),
        audioAlerts: loadBool("wolfwatch_audio", false),
        globeAutoSpin: loadBool("wolfwatch_globe_spin", true),
        globeStemScale: loadNum("wolfwatch_globe_stem", 0.2, 0.08, 0.4),
        globeMarkerScale: loadNum("wolfwatch_globe_hex", 1.25, 0.6, 2.2),
        globeSpinSpeed: loadNum("wolfwatch_globe_spd", 1, 0.1, 3),
        globeMarkerOpacity: loadNum("wolfwatch_globe_opac", 0.95, 0.5, 1),
        dijHistory: safeHistory(),
        attentionHistory: safeAttentionHistory(),
        volcWatchPins: [...loadPins()],
        volcWatchMutes: [...loadMutes()],
      };

      const m = loadMode();
      const saved = localStorage.getItem("wolfwatch_mode");
      const savedView = localStorage.getItem("wolfwatch_mapview");
      if (savedView === "2d" || savedView === "3d") {
        patch.mapView = savedView;
      }
      if (saved) {
        const nm = normalizePerformanceMode(saved) ?? m;
        patch.mode = nm;
        patch.minMag = MODES[nm].minMag;
        if (saved === "lite") {
          try {
            localStorage.setItem("wolfwatch_mode", "standard");
          } catch { /* */ }
        }
      } else if (isMobileViewport()) {
        try {
          localStorage.setItem("wolfwatch_mode", "standard");
          localStorage.setItem("wolfwatch_first_open", "mobile");
        } catch { /* */ }
        patch.mode = "standard";
        patch.minMag = MODES.standard.minMag;
        // Default 2D on first mobile open; 3D is one tap away with safe profile
        patch.mapView = "2d";
      }

      set(patch);
      if (patch.overlays?.globalVolcanoes) {
        void get().ensureGvpVolcanoes();
      }
    } catch {
      /* ignore */
    }
  },

  pulseRealtime: async (kind = "hour") => {
    try {
      const pulse =
        kind === "significant"
          ? await fetchSignificantPulse().catch(() => fetchRealtimePulse())
          : await fetchRealtimePulse();
      setCache("eq_pulse", pulse);
      let eqFinal = mergeEqCollections(get().eq, pulse);
      if (get().useGeofon) {
        const g = getCache<EqCollection>("geofon", 600_000);
        if (g) eqFinal = mergeEqCollections(eqFinal, g);
      }
      eqFinal = clipCollectionToWindow(eqFinal, get().timeWindow) ?? eqFinal;
      const cfg = MODES[get().mode];
      if (eqFinal?.features && eqFinal.features.length > cfg.maxMarkers) {
        eqFinal = {
          ...eqFinal,
          features: capFeaturesForMode(
            eqFinal.features,
            cfg.maxMarkers,
            priorityNodeBounds(get().volcWatchNodes),
          ),
        };
      }
      if (eqFinal?.features) {
        seenEqIds = alertNewEvents(eqFinal.features, seenEqIds, {
          enabled: get().audioAlerts,
          minMag: 4.5,
        });
      }
      const now = Date.now();
      set({
        eq: eqFinal,
        livePulseAt: now,
        newestEventAgeMs: latestEventAgeMs(eqFinal?.features),
        feedTimestamps: {
          ...get().feedTimestamps,
          pulse: now,
          eq: now,
        },
      });
    } catch {
      /* silent */
    }
  },
}));

export function getFocusNode(id: string | null) {
  if (!id) return null;
  const state = useObservatory.getState();
  if (state.gvpFocusNode?.id === id) return state.gvpFocusNode;
  const dynamic = state.volcWatchNodes;
  return (
    dynamic.find((n) => n.id === id) ??
    DRAGON_NODES.find((n) => n.id === id) ??
    null
  );
}

/** Static corridors + multi-source volcano alerts (no double pin on SES ids). */
export function getAllFocusNodes(): DragonNode[] {
  const state = useObservatory.getState();
  const dynamic = state.volcWatchNodes;
  const dynById = new Map(dynamic.map((n) => [n.id, n]));
  const list: DragonNode[] = [];

  for (const n of DRAGON_NODES) {
    const live = dynById.get(n.id);
    if (live) {
      list.push({
        ...n,
        ...live,
        name: n.name,
        bounds: n.bounds,
        center: n.center ?? live.center,
        kind: live.kind || n.kind,
        role: live.role || n.role,
        focusNote: [live.focusNote, n.focusNote].filter(Boolean).join(" "),
        publishedFocus: n.publishedFocus || live.publishedFocus,
        watchPriority: true,
        monitorUrl: live.monitorUrl || n.monitorUrl,
        agencyUrl: live.agencyUrl || n.agencyUrl,
        aviationCode: live.aviationCode ?? n.aviationCode,
      });
      dynById.delete(n.id);
    } else {
      list.push(n);
    }
  }
  for (const n of dynById.values()) list.push(n);

  const gvp = state.gvpFocusNode;
  if (gvp && !list.some((x) => x.id === gvp.id)) list.unshift(gvp);
  return list;
}

export function viewEvents(
  features: EqFeature[] | undefined,
  minMag: number,
  focusNodeId: string | null,
  maxMag = 10,
): EqFeature[] {
  let list = filteredEq(features, minMag, maxMag);
  const node = getFocusNode(focusNodeId);
  if (node) {
    list = list.filter((f) => {
      const [lon, lat] = f.geometry.coordinates;
      return pointInBounds(lat, lon, node.bounds);
    });
  }
  return list;
}

/** Events visible under current filters + optional replay cursor. */
export function replayFilteredFeatures(
  features: EqFeature[] | undefined,
  minMag: number,
  maxMag: number,
  focusNodeId: string | null,
  replayActive: boolean,
  replayCursorMs: number | null,
): EqFeature[] {
  let list = viewEvents(features, minMag, focusNodeId, maxMag);
  if (replayActive && replayCursorMs != null) {
    list = list.filter((f) => {
      const t = f.properties.time;
      return typeof t === "number" && t <= replayCursorMs;
    });
  }
  return list;
}
