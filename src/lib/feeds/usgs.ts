import {
  VOLCANO_WATCHES,
  aviationToNodeStatus,
} from "@/lib/feeds/volcanoWatches";
import { pointInBounds, type LatLonBounds } from "@/lib/geo/bounds";
import { RAISED, isFresh } from "@/lib/ops/raisedTimeout";

export type EqFeature = {
  type: "Feature";
  id?: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number | null;
    updated?: number;
    url?: string;
    title?: string;
    type?: string;
    status?: string;
    mmi?: number | null;
    types?: string | null;
    felt?: number | null;
    cdi?: number | null;
    alert?: string | null;
    tsunami?: number | null;
    sig?: number | null;
    detail?: string | null;
    /** Agency / network tag (us, jma, geofon, …) */
    net?: string | null;
    magType?: string | null;
    /**
     * GOSSIP / board densify: true when magnitude is officially N/D.
     * mag must stay null — never coerce to 0 (would fake energy).
     */
    magNd?: boolean;
    /** Optional multi-source label (e.g. INGV-OV) */
    sources?: string | null;
    /** JMA shindo class when known */
    jmaMaxi?: string | null;
    jmaEid?: string | null;
    jmaProduct?: string | null;
    jmaJson?: string | null;
    jmaEnriched?: boolean;
    emscEnriched?: boolean;
    imoEnriched?: boolean;
    geonetEnriched?: boolean;
    geofonEnriched?: boolean;
    /** Secondary GEOFON Mw when USGS primary kept after spatial match */
    geofonMag?: number | null;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number, number?];
  };
};

export type EqCollection = {
  type: "FeatureCollection";
  features: EqFeature[];
  metadata?: { generated?: number; count?: number; title?: string };
};

const FEEDS: Record<string, string> = {
  hour: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
  day: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  week: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
  month: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson",
};

export type TimeWindowKey = keyof typeof FEEDS;

/** Nominal length of each USGS feed window (ms). */
export function timeWindowMs(window: TimeWindowKey | string): number {
  switch (window) {
    case "hour":
      return 3_600_000;
    case "day":
      return 86_400_000;
    case "week":
      return 7 * 86_400_000;
    case "month":
      return 30 * 86_400_000;
    default:
      return 86_400_000;
  }
}

/**
 * Keep only events inside the selected time window.
 * Small skew pad for clock drift / late reports near the edge.
 * Drops undated features (cannot verify they belong in the window).
 */
export function filterFeaturesByTimeWindow(
  features: EqFeature[] | undefined,
  window: TimeWindowKey | string,
  now = Date.now(),
  skewMs = 120_000,
): EqFeature[] {
  if (!features?.length) return [];
  const cutoff = now - timeWindowMs(window) - skewMs;
  return features.filter((f) => {
    const t = f.properties.time;
    return typeof t === "number" && Number.isFinite(t) && t >= cutoff && t <= now + skewMs;
  });
}

/** Apply window filter to a collection (preserves metadata). */
export function clipCollectionToWindow(
  col: EqCollection | null | undefined,
  window: TimeWindowKey | string,
  now = Date.now(),
): EqCollection | null {
  if (!col) return null;
  const features = filterFeaturesByTimeWindow(col.features, window, now);
  return {
    ...col,
    features,
    metadata: {
      ...col.metadata,
      count: features.length,
      title: col.metadata?.title
        ? `${col.metadata.title} · clipped ${window}`
        : `clipped ${window}`,
    },
  };
}

export const REALTIME_FEED =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";

export async function fetchEarthquakes(
  window: keyof typeof FEEDS = "day",
): Promise<EqCollection> {
  const url = FEEDS[window] ?? FEEDS.day!;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`USGS ${res.status}`);
  return (await res.json()) as EqCollection;
}

/** Significant events (hour) — fast path for large shocks between full refreshes. */
export async function fetchSignificantPulse(): Promise<EqCollection> {
  const url =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson";
  const res = await fetch(`${url}?_=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`USGS significant pulse ${res.status}`);
  return (await res.json()) as EqCollection;
}

export async function fetchRealtimePulse(): Promise<EqCollection> {
  const res = await fetch(REALTIME_FEED, { cache: "no-cache" });
  if (!res.ok) throw new Error(`USGS realtime ${res.status}`);
  return (await res.json()) as EqCollection;
}

export async function fetchShakeMapEvents(limit = 20): Promise<EqCollection> {
  const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
  url.searchParams.set("format", "geojson");
  url.searchParams.set("producttype", "shakemap");
  url.searchParams.set("orderby", "time");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("minmagnitude", "4.5");
  const res = await fetch(url.toString(), { cache: "no-cache" });
  if (!res.ok) throw new Error(`USGS ShakeMap catalog ${res.status}`);
  return (await res.json()) as EqCollection;
}

export function mergeEqCollections(
  base: EqCollection | null,
  pulse: EqCollection | null,
): EqCollection {
  const map = new Map<string, EqFeature>();
  const keyOf = (f: EqFeature) => {
    if (f.id) return String(f.id);
    const [lon, lat] = f.geometry.coordinates;
    return `${lat.toFixed(3)}_${lon.toFixed(3)}_${f.properties.time ?? 0}`;
  };
  for (const f of base?.features ?? []) map.set(keyOf(f), f);
  for (const f of pulse?.features ?? []) map.set(keyOf(f), f);
  const features = [...map.values()].sort(
    (a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0),
  );
  return {
    type: "FeatureCollection",
    features,
    metadata: {
      generated: Date.now(),
      count: features.length,
      title: "USGS merged (window + realtime hour)",
    },
  };
}

/**
 * Cap catalog size without erasing the global map.
 *
 * CRITICAL: node boards (JMA, Campi INGV, TK swarm) inject dense microseismicity.
 * If we "keep all priority first", those micro-events fill the budget and then
 * the UI minMag filter drops them — leaving a nearly empty world map.
 *
 * Strategy:
 *  1. Events ≥ minMag are first-class (global, by magnitude).
 *  2. Sub-minMag events only kept inside priority corridors, hard-capped.
 *  3. Majority of slots always reserved for the global strong set.
 */
export function capFeaturesForMode(
  features: EqFeature[],
  maxMarkers: number,
  priorityBounds: LatLonBounds[] = [],
  opts?: { minMag?: number; maxPriorityMicro?: number },
): EqFeature[] {
  if (features.length <= maxMarkers) return features;

  const minMag = opts?.minMag ?? 0;
  const maxMicro =
    opts?.maxPriorityMicro ?? Math.min(120, Math.max(40, Math.floor(maxMarkers * 0.2)));

  const strong: EqFeature[] = [];
  const microPri: EqFeature[] = [];

  for (const f of features) {
    const mag = f.properties.mag ?? 0;
    if (mag >= minMag) {
      strong.push(f);
      continue;
    }
    if (priorityBounds.length) {
      const [lon, lat] = f.geometry.coordinates;
      if (priorityBounds.some((b) => pointInBounds(lat, lon, b, 0.15))) {
        microPri.push(f);
      }
    }
  }

  strong.sort((a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0));
  microPri.sort((a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0));

  // Reserve ≥80% of budget for global strong events
  const microBudget = Math.min(maxMicro, Math.floor(maxMarkers * 0.2), microPri.length);
  const strongBudget = maxMarkers - microBudget;
  const keptStrong = strong.slice(0, strongBudget);
  const keptMicro = microPri.slice(0, maxMarkers - keptStrong.length);
  return [...keptStrong, ...keptMicro];
}

export function latestEventAgeMs(features: EqFeature[] | undefined): number | null {
  if (!features?.length) return null;
  let max = 0;
  for (const f of features) {
    const t = f.properties.time ?? 0;
    if (t > max) max = t;
  }
  if (!max) return null;
  return Date.now() - max;
}

export function formatAge(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export async function fetchVolcanoes(): Promise<EqCollection | null> {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson",
      { cache: "no-cache" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as EqCollection;
    const volc = data.features.filter(
      (f) =>
        (f.properties.type || "").toLowerCase().includes("volcanic") ||
        (f.properties.place || "").toLowerCase().includes("volcano"),
    );
    return { type: "FeatureCollection", features: volc };
  } catch {
    return null;
  }
}

export function magColor(mag: number): string {
  if (mag >= 6) return "#f43f5e";
  if (mag >= 5) return "#fb923c";
  if (mag >= 4) return "#fbbf24";
  return "#34d399";
}

/** Finite magnitude only — null / N/D are not energy. */
export function hasFiniteMag(mag: number | null | undefined): mag is number {
  return mag != null && Number.isFinite(mag);
}

/**
 * Min-mag filter helper (CF densify contract):
 * null mag is unknown — never treated as 0. Include for map densify
 * when `includeUnknown` (default true); stats paths pass false.
 */
export function magPassesRange(
  mag: number | null | undefined,
  minMag: number,
  maxMag = 10,
  includeUnknown = true,
): boolean {
  if (!hasFiniteMag(mag)) return includeUnknown;
  return mag >= minMag && mag <= maxMag;
}

/** UI label — M– for N/D / null, never M0. */
export function formatMagLabel(
  mag: number | null | undefined,
  opts?: { digits?: number; prefix?: boolean },
): string {
  const digits = opts?.digits ?? 1;
  const prefix = opts?.prefix !== false;
  if (!hasFiniteMag(mag)) return prefix ? "M–" : "–";
  const body = mag.toFixed(digits);
  return prefix ? `M${body}` : body;
}

/** Marker size proxy — unknown mag uses small neutral pin (not M0). */
export function magForDisplaySize(mag: number | null | undefined): number {
  return hasFiniteMag(mag) ? mag : 1.2;
}

export function magColorForFeature(mag: number | null | undefined): string {
  if (!hasFiniteMag(mag)) return "#94a3b8"; // slate — unknown N/D
  return magColor(mag);
}

/**
 * Public Seismic Globe–style magnitude palette (Dutchsinse public program).
 * Hex/neon colors for 3D globe only — denser than 2D map chips.
 */
export function globeMagStyle(mag: number): {
  color: string;
  emissive: string;
  neon: boolean;
} {
  if (mag >= 9.0) return { color: "#aa00ff", emissive: "#6600aa", neon: true };
  if (mag >= 8.0) return { color: "#ff1493", emissive: "#aa0033", neon: true };
  if (mag >= 7.0) return { color: "#f0f0f0", emissive: "#555555", neon: true };
  if (mag >= 6.0) return { color: "#ff2200", emissive: "#550000", neon: false };
  if (mag >= 5.0) return { color: "#ff8c00", emissive: "#442200", neon: false };
  if (mag >= 4.0) return { color: "#ffee00", emissive: "#333300", neon: false };
  if (mag >= 3.0) return { color: "#00ee66", emissive: "#003300", neon: false };
  if (mag >= 2.0) return { color: "#3399ff", emissive: "#002244", neon: false };
  if (mag >= 1.0) return { color: "#f0f0f0", emissive: "#222222", neon: false };
  return { color: "#333333", emissive: "#111111", neon: false };
}

export function eqDepthKm(f: EqFeature): number {
  const d = f.geometry.coordinates[2];
  if (typeof d !== "number" || Number.isNaN(d)) return 10;
  return Math.abs(d);
}

export type DepthBand = "shallow" | "crust" | "upper" | "mid" | "deep";

export function depthBand(depthKm: number): DepthBand {
  if (depthKm < 35) return "shallow";
  if (depthKm < 70) return "crust";
  if (depthKm < 150) return "upper";
  if (depthKm < 300) return "mid";
  return "deep";
}

export function depthColor(depthKm: number): string {
  const b = depthBand(depthKm);
  switch (b) {
    case "shallow":
      return "#f43f5e";
    case "crust":
      return "#fb923c";
    case "upper":
      return "#fbbf24";
    case "mid":
      return "#34d399";
    case "deep":
      return "#818cf8";
  }
}

export const DEPTH_LEGEND: { band: DepthBand; label: string; color: string }[] = [
  { band: "shallow", label: "<35 km", color: depthColor(10) },
  { band: "crust", label: "35–70", color: depthColor(50) },
  { band: "upper", label: "70–150", color: depthColor(100) },
  { band: "mid", label: "150–300", color: depthColor(200) },
  { band: "deep", label: "300+ km", color: depthColor(400) },
];

export function timeDecayWeight(
  timeMs: number | null | undefined,
  halfLifeHours = 8,
  now = Date.now(),
): number {
  if (timeMs == null || !Number.isFinite(timeMs)) return 0.12;
  const ageH = Math.max(0, (now - timeMs) / 3_600_000);
  const w = Math.pow(0.5, ageH / Math.max(0.5, halfLifeHours));
  return Math.max(0.04, Math.min(1, w));
}

export function halfLifeForWindow(window: "hour" | "day" | "week" | "month"): number {
  switch (window) {
    case "hour":
      return 0.75;
    case "day":
      return 6;
    case "week":
      return 36;
    case "month":
      return 120;
  }
}

export function heatWeight(
  mag: number,
  timeMs: number | null | undefined,
  opts: { timeDecay: boolean; halfLifeHours: number; now?: number },
): number {
  const m = Math.max(0, mag);
  const energy = Math.min(40, Math.pow(10, 0.45 * (m - 3)));
  const decay = opts.timeDecay
    ? timeDecayWeight(timeMs, opts.halfLifeHours, opts.now)
    : 1;
  return energy * decay;
}

export type DragonNode = {
  id: string;
  name: string;
  role: string;
  bounds: LatLonBounds;
  monitorUrl?: string;
  publishedFocus?: boolean;
  focusNote?: string;
  kind?: "seismic" | "volcano";
  center?: [number, number];
  aliases?: string[];
  aviationCode?: "green" | "yellow" | "orange" | "red";
  gvpUrl?: string;
  agencyUrl?: string;
  watchPriority?: boolean;
};

function volcanoAsDragon(v: (typeof VOLCANO_WATCHES)[number]): DragonNode {
  return {
    id: v.id,
    name: v.name,
    role: v.role,
    bounds: v.bounds,
    monitorUrl: v.monitorUrl,
    publishedFocus: v.publishedFocus,
    focusNote: v.focusNote,
    kind: "volcano",
    center: v.center,
    aliases: v.aliases,
    aviationCode: v.aviationCode,
    gvpUrl: v.gvpUrl,
    agencyUrl: v.agencyUrl,
    watchPriority: v.watchPriority,
  };
}

export const DRAGON_NODES: DragonNode[] = [
  ...VOLCANO_WATCHES.map(volcanoAsDragon),
  {
    id: "tonga",
    name: "Tonga–Kermadec",
    role: "Published focus · SES #1 · Swarm corridor",
    kind: "seismic",
    /**
     * Wider corridor matching tonga-kermadec-monitor MONITOR_BBOX
     * (Core / North / South / Nearby zones). East of dateline only.
     */
    bounds: [
      [-32, -180],
      [-16, -170],
    ],
    center: [-24.5, -175.2],
    monitorUrl: "https://tonga-kermadec-monitor.vercel.app/",
    publishedFocus: true,
    watchPriority: true,
    focusNote:
      "SES node #1 — Tonga–Kermadec trench corridor (USGS authority). Open full swarm board for Core / North / South / Nearby zones.",
    aliases: ["tonga-kermadec", "tk", "kermadec"],
  },
  {
    id: "southsandwich",
    name: "South Sandwich / Drake",
    role: "Published focus · SES #6 · Scotia Arc · USGS",
    kind: "seismic",
    /**
     * South Sandwich trench + Scotia plate + Drake Passage approach.
     * Wider than trench-only so Drake events appear (ops satellite 30d view).
     * USGS primary — remote, no national dense board.
     */
    bounds: [
      [-64, -75],
      [-48, -12],
    ],
    center: [-56.5, -40],
    monitorUrl:
      "https://earthquake.usgs.gov/earthquakes/map/#%7B%22feed%22%3A%2230day_m25%22%2C%22sort%22%3A%22newest%22%2C%22basemap%22%3A%22satellite%22%2C%22autoUpdate%22%3Afalse%2C%22restrictListToMap%22%3Atrue%2C%22timeZone%22%3A%22utc%22%2C%22mapposition%22%3A%5B%5B-63.5%2C-78%5D%2C%5B-47.5%2C-12%5D%5D%2C%22overlays%22%3A%7B%22plates%22%3Atrue%7D%2C%22viewModes%22%3A%7B%22map%22%3Atrue%2C%22list%22%3Atrue%2C%22settings%22%3Afalse%2C%22help%22%3Afalse%7D%7D",
    publishedFocus: true,
    watchPriority: true,
    focusNote:
      "SES node #6 — South Sandwich trench, Scotia Arc & Drake Passage. Remote mid-ocean / island-arc seismicity; USGS primary (GEOFON/EMSC fill). Full board opens USGS 30-day M2.5+ satellite view of this corridor. Tsunami source potential for South Atlantic.",
    aliases: [
      "ss",
      "sandwich",
      "south-sandwich",
      "drake",
      "scotia",
      "scotia-arc",
    ],
  },
  {
    id: "andes",
    name: "Chile–Andes / Nazca",
    role: "Published focus · SES #7 · Nazca megathrust · CSN densify",
    kind: "seismic",
    /**
     * Central–south Chile Nazca subduction corridor (megathrust + outer rise).
     * Dense CSN HTML catalog + EMSC-CSN authority override (never dual-read USGS).
     */
    bounds: [
      [-45, -80],
      [-15, -65],
    ],
    center: [-30.0, -72.0],
    monitorUrl: "https://www.sismologia.cl/",
    publishedFocus: true,
    watchPriority: true,
    focusNote:
      "SES node #7 — Chile–Andes / Nazca megathrust. CSN densify (HTML catalog + EMSC-CSN) is exclusive in-box authority — never dual-read USGS. High tsunami source potential Pacific.",
    aliases: [
      "chile",
      "andes",
      "nazca",
      "csn",
      "chile-andes",
      "south-america",
      "sa",
    ],
  },
  {
    id: "mediterranean",
    name: "Campi Flegrei",
    role: "Published focus · SES #2 · INGV authority",
    kind: "seismic",
    /**
     * Tight Campi Flegrei caldera box (matches campi-flegrei-monitor focus node).
     * Dense catalog lives on the Vercel board (INGV-OV GOSSIP) — USGS is sparse here.
     */
    bounds: [
      [40.7, 13.95],
      [40.95, 14.35],
    ],
    center: [40.827, 14.139],
    monitorUrl: "https://campi-flegrei-monitor.vercel.app/",
    publishedFocus: true,
    watchPriority: true,
    focusNote:
      "SES node #2 — Campi Flegrei caldera west of Naples. Live official alert from INGV/Protezione Civile (giallo = ADVISORY/YELLOW) when elevated — not USGS HANS. Open full board for INGV-OV GOSSIP microseismicity & SUPT continuum.",
    aliases: ["campi-flegrei", "campi", "cf", "flegrei"],
  },
  {
    id: "japan",
    name: "Japan Arc",
    role: "Published focus · SES #3 · JMA + tsunami",
    kind: "seismic",
    bounds: [
      [24, 122],
      [46.5, 154],
    ],
    center: [36.5, 138.0],
    monitorUrl: "https://japan-kamchatka-monitor.vercel.app/",
    publishedFocus: true,
    watchPriority: true,
    focusNote:
      "SES node #3 — Japan archipelago (JMA Bosai authority). Tsunami watch first-class on the Japan board. Open full board for Kamchatka (#4) companion, volcano watch, SUPT continuum.",
    aliases: ["jp", "jma", "tokara", "nansei", "japan-arc", "japan-kamchatka"],
  },
  {
    id: "kamchatka",
    name: "Kamchatka–Kurils",
    role: "Published focus · SES #4 · Japan companion · USGS",
    kind: "seismic",
    bounds: [
      [42, 145],
      [62, 175],
    ],
    center: [53.0, 158.5],
    monitorUrl: "https://japan-kamchatka-monitor.vercel.app/?node=kamchatka",
    publishedFocus: true,
    watchPriority: true,
    focusNote:
      "SES node #4 — Kamchatka / Kurils (USGS authority, KVERT volcano links). High tsunami source potential. Hosted on Japan–Kamchatka board.",
    aliases: ["km", "kuril", "kurils", "kvert", "okhotsk"],
  },
  {
    id: "iceland",
    name: "Iceland",
    role: "Published focus · SES #5 · IMO authority · volcanic systems",
    kind: "seismic",
    /**
     * Whole-island + near-offshore — matches IMO densify polygon.
     * Dense SeisComP catalog under-samples on USGS; use IMO authority merge.
     */
    bounds: [
      [62.8, -25.5],
      [67.3, -12.5],
    ],
    center: [64.9, -18.8],
    monitorUrl: "https://skjalftalisa.vedur.is/",
    publishedFocus: true,
    watchPriority: true,
    focusNote:
      "SES node #5 — Iceland plate boundary + volcanic systems (Reykjanes, Katla, Askja…). IMO (Veðurstofa) is exclusive dense catalog + VALS/VONA. SUPT volcanic desk segments by system box.",
    aliases: [
      "is",
      "imo",
      "reykjanes",
      "iceland-arc",
      "svartsengi",
      "askja",
      "katla",
    ],
  },
  {
    id: "cascadia",
    name: "Cascadia / Pacific NW",
    role: "Fracture Sentinel / Locked Node",
    kind: "seismic",
    bounds: [
      [40, -130],
      [52, -120],
    ],
  },
  {
    id: "alaska",
    name: "Alaska–Aleutians",
    role: "Fracture Sentinel · Rebalancer",
    kind: "seismic",
    bounds: [
      [50, -180],
      [72, -140],
    ],
  },
  {
    id: "newzealand",
    name: "New Zealand",
    role: "Published focus · SES #8 · GeoNet densify",
    kind: "seismic",
    /**
     * Aotearoa main islands + near offshore (+ Chatham via densify pad).
     * GeoNet FDSN is exclusive dense catalog; USGS under-samples heavily.
     * North of −33° is TK / Kermadec board territory.
     */
    bounds: [
      [-48, 165],
      [-33, 180],
    ],
    center: [-41.0, 174.0],
    monitorUrl: "https://www.geonet.org.nz/",
    publishedFocus: true,
    watchPriority: true,
    focusNote:
      "SES node #8 — New Zealand (Aotearoa). GeoNet / GNS Science is exclusive dense catalog (FDSN + API). USGS under-samples here. Hikurangi / Alpine Fault / volcanic zones are educational context — not a forecast.",
    aliases: [
      "nz",
      "new-zealand",
      "aotearoa",
      "geonet",
      "hikurangi",
      "wellington",
      "taupo",
    ],
  },
];

export const FOCUSED_MONITORS = DRAGON_NODES.filter((n) => n.publishedFocus);

/** Bounds that must survive marker capping. */
export function priorityNodeBounds(extra: DragonNode[] = []): LatLonBounds[] {
  const base = DRAGON_NODES.filter((n) => n.publishedFocus || n.watchPriority);
  const merged = [...extra.filter((n) => n.watchPriority), ...base];
  return merged.map((n) => n.bounds);
}

export type NodeStatus = "quiet" | "elevated" | "active" | "watch";

/** Optional catalog window so week/month baselines are not treated as day-scale alarms. */
export type NodeStatusOpts = {
  /** hour | day | week | month — defaults to day-like sensitivity */
  timeWindow?: string;
  now?: number;
};

/**
 * Zone status — window-aware, anti-alarmist.
 * Ring of Fire arcs normally produce M4–M5 over a week; that is "elevated" or
 * "active" context, not a red watch. Watch reserved for fresh strong events or
 * clear short-window bursts (SUPT: signal, not smoke).
 */
export function nodeStatus(
  features: EqFeature[],
  node: DragonNode,
  opts?: NodeStatusOpts,
): NodeStatus {
  if (node.kind === "volcano" && node.aviationCode) {
    const floor = aviationToNodeStatus(node.aviationCode);
    const seismic = seismicNodeStatus(features, node, opts);
    const rank = { quiet: 0, elevated: 1, active: 2, watch: 3 } as const;
    return rank[seismic] > rank[floor] ? seismic : floor;
  }
  return seismicNodeStatus(features, node, opts);
}

function seismicNodeStatus(
  features: EqFeature[],
  node: DragonNode,
  opts?: NodeStatusOpts,
): NodeStatus {
  const now = opts?.now ?? Date.now();
  const win = (opts?.timeWindow || "day").toLowerCase();
  // Dense national catalogs (IMO Iceland, INGV CF): lower floor so microseismicity counts
  const minMagFloor =
    node.id === "iceland" || node.id === "mediterranean"
      ? 1.5
      : node.id === "andes"
        ? 2.5
        : node.id === "newzealand"
          ? 1.5
          : 3.5;
  const inBounds = features.filter((f) => {
    const [lon, lat] = f.geometry.coordinates;
    if (!pointInBounds(lat, lon, node.bounds)) return false;
    const mag = f.properties.mag;
    // Dense desks: count finite-hypocentre N/D as activity (not energy)
    if (!hasFiniteMag(mag)) {
      return node.id === "mediterranean" || node.id === "iceland";
    }
    return mag >= minMagFloor;
  });
  if (!inBounds.length) return "quiet";

  const h24 = 24 * 3_600_000;
  let maxMag = 0;
  let maxMag24h = 0;
  let maxMag72h = 0;
  let m5 = 0;
  let m5_24h = 0;
  let m6_48h = 0;
  let m6_7d = 0;
  let m5_72h = 0;
  let m7_72h = 0;
  let count_24h = 0;
  let m3 = 0;
  let nullCount = 0;
  for (const f of inBounds) {
    const mag = f.properties.mag;
    const t = f.properties.time;
    const age = typeof t === "number" ? now - t : Number.POSITIVE_INFINITY;
    if (!hasFiniteMag(mag)) {
      nullCount++;
      if (age <= h24) count_24h++;
      continue;
    }
    if (mag > maxMag) maxMag = mag;
    if (age <= h24 && mag > maxMag24h) maxMag24h = mag;
    if (isFresh(t, RAISED.node.m7WatchH, now) && mag > maxMag72h) maxMag72h = mag;
    if (mag >= 3) m3++;
    if (mag >= 5) m5++;
    if (age <= h24) {
      count_24h++;
      if (mag >= 5) m5_24h++;
    }
    if (isFresh(t, RAISED.node.m6WatchH, now) && mag >= 6) m6_48h++;
    if (age <= 7 * 86_400_000 && mag >= 6) m6_7d++;
    if (isFresh(t, RAISED.node.m7WatchH, now) && mag >= 5) m5_72h++;
    if (isFresh(t, RAISED.node.m7WatchH, now) && mag >= 7) m7_72h++;
  }

  // Watch is recency-only — a week/month catalog M7 must not keep the node red.
  if (m6_48h >= 1 || m7_72h >= 1) return "watch";
  if (m5_24h >= 2 || (m5_24h >= 1 && maxMag24h >= 5.8)) return "watch";

  // Iceland microseismicity-aware (anti-alarmist: dense M1 is normal, not red)
  if (node.id === "iceland") {
    if (win === "hour") {
      if (maxMag >= 4.5 || m3 >= 3) return "watch";
      if (maxMag >= 3.5 || inBounds.length >= 15) return "active";
      if (maxMag >= 2.5 || inBounds.length >= 5) return "elevated";
      return "quiet";
    }
    if (win === "day") {
      if (maxMag >= 5.5 || m5 >= 1) return "watch";
      if (maxMag >= 4 || m3 >= 8 || inBounds.length >= 80) return "active";
      if (maxMag >= 3 || m3 >= 3 || inBounds.length >= 25) return "elevated";
      return "quiet";
    }
    // week / month — Reykjanes can log hundreds of M1s in a quiet week
    if (maxMag72h >= 5.5) return "watch";
    if (m5 >= 1 || m3 >= 20 || inBounds.length >= 200) return "active";
    if (m3 >= 5 || maxMag >= 3.5 || inBounds.length >= 40) return "elevated";
    return "quiet";
  }

  // Chile megathrust — dense M2.5–3.5 is baseline, not smoke
  if (node.id === "andes") {
    if (win === "hour") {
      if (maxMag >= 5.5 || m5 >= 1) return "watch";
      if (maxMag >= 4.5 || m3 >= 5) return "active";
      if (maxMag >= 3.5 || inBounds.length >= 8) return "elevated";
      return "quiet";
    }
    if (win === "day") {
      if (maxMag >= 6 || m5 >= 2) return "watch";
      if (maxMag >= 5 || m5 >= 1 || m3 >= 15) return "active";
      if (maxMag >= 4 || m3 >= 6 || inBounds.length >= 40) return "elevated";
      return "quiet";
    }
    // week / month — old M6 is context, not a standing watch
    if (m5_72h >= 3) return "watch";
    if (m6_7d >= 1 || m5 >= 2 || maxMag >= 5.5 || m3 >= 40) return "active";
    if (m5 >= 1 || maxMag >= 4.5 || m3 >= 15 || inBounds.length >= 80) return "elevated";
    return "quiet";
  }

  // New Zealand — dense M1.5–3 GeoNet is baseline
  if (node.id === "newzealand") {
    if (win === "hour") {
      if (maxMag >= 5 || m5 >= 1) return "watch";
      if (maxMag >= 4 || m3 >= 4) return "active";
      if (maxMag >= 3 || inBounds.length >= 6) return "elevated";
      return "quiet";
    }
    if (win === "day") {
      if (maxMag >= 5.5 || m5 >= 2) return "watch";
      if (maxMag >= 4.5 || m5 >= 1 || m3 >= 12) return "active";
      if (maxMag >= 3.5 || m3 >= 5 || inBounds.length >= 30) return "elevated";
      return "quiet";
    }
    if (m5_72h >= 2) return "watch";
    if (m6_7d >= 1 || m5 >= 1 || maxMag >= 5 || m3 >= 25) return "active";
    if (maxMag >= 4 || m3 >= 10 || inBounds.length >= 60) return "elevated";
    return "quiet";
  }

  // Window-scaled remainder — do not paint whole week of ordinary RoF as "watch"
  if (win === "hour") {
    if (maxMag >= 5.5 || m5 >= 1 || inBounds.length >= 4) return "watch";
    if (maxMag >= 4.5 || inBounds.length >= 2) return "active";
    if (maxMag >= 3.5 || inBounds.length >= 1) return "elevated";
    return "quiet";
  }
  if (win === "day") {
    if (maxMag >= 6 || m5 >= 3 || (m5 >= 2 && count_24h >= 6)) return "watch";
    if (maxMag >= 5 || m5 >= 1 || inBounds.length >= 12) return "active";
    if (maxMag >= 4 || inBounds.length >= 5) return "elevated";
    return "quiet";
  }
  if (win === "month") {
    // Month catalogs are dense on arcs — watch already handled by recency floor
    if (m6_7d >= 1 || m5 >= 8 || m5_72h >= 2) return "active";
    if (m5 >= 3 || maxMag >= 5.5 || inBounds.length >= 40) return "elevated";
    return "quiet";
  }
  // week (default long window)
  if (m6_7d >= 1 || m5 >= 5 || m5_72h >= 3) return "active";
  if (m5 >= 2 || maxMag >= 5.5 || inBounds.length >= 20) return "elevated";
  if (maxMag >= 4.5 || inBounds.length >= 8) return "elevated";
  return "quiet";
}

export type NodeEventStats = {
  count: number;
  maxMag: number;
  m5: number;
  /** Unmaged (N/D) events in box — not energy */
  nullMag?: number;
};

export function nodeEventStats(
  features: EqFeature[] | undefined,
  node: DragonNode,
  minMag = 0,
): NodeEventStats {
  let count = 0;
  let maxMag = 0;
  let m5 = 0;
  let nullMag = 0;
  for (const f of features ?? []) {
    const mag = f.properties.mag;
    const finite = hasFiniteMag(mag);
    // Unknown mag still counts as an event in-box (densify completeness)
    if (finite && mag < minMag) continue;
    if (!finite && minMag > 0) {
      // keep nulls in count for CF; they don't affect max/m5
    }
    const [lon, lat] = f.geometry.coordinates;
    if (!pointInBounds(lat, lon, node.bounds)) continue;
    count++;
    if (!finite) {
      nullMag++;
      continue;
    }
    if (mag > maxMag) maxMag = mag;
    if (mag >= 5) m5++;
  }
  return { count, maxMag, m5, nullMag };
}
