import {
  VOLCANO_WATCHES,
  aviationToNodeStatus,
} from "@/lib/feeds/volcanoWatches";
import { pointInBounds, type LatLonBounds } from "@/lib/geo/bounds";

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
    /** JMA shindo class when known */
    jmaMaxi?: string | null;
    jmaEid?: string | null;
    jmaProduct?: string | null;
    jmaJson?: string | null;
    jmaEnriched?: boolean;
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
 * Cap marker count without erasing priority corridors (Tonga, volcano watches, etc.).
 * Keeps all events inside priority node boxes, then fills remaining slots by magnitude.
 */
export function capFeaturesForMode(
  features: EqFeature[],
  maxMarkers: number,
  priorityBounds: LatLonBounds[] = [],
): EqFeature[] {
  if (features.length <= maxMarkers) return features;

  const priority: EqFeature[] = [];
  const rest: EqFeature[] = [];
  for (const f of features) {
    const [lon, lat] = f.geometry.coordinates;
    const inPri = priorityBounds.some((b) => pointInBounds(lat, lon, b, 0.15));
    if (inPri) priority.push(f);
    else rest.push(f);
  }

  // Always keep priority (even if over cap slightly for corridor integrity)
  const sortedRest = [...rest].sort(
    (a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0),
  );
  const room = Math.max(0, maxMarkers - priority.length);
  // If priority alone exceeds cap, keep strongest priority first
  if (priority.length > maxMarkers) {
    return [...priority]
      .sort((a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0))
      .slice(0, maxMarkers);
  }
  return [...priority, ...sortedRest.slice(0, room)];
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
      "SES node #1 — Tonga–Kermadec trench corridor (USGS authority). Open full swarm board for Core / North / South / Nearby zones. Not a forecast.",
    aliases: ["tonga-kermadec", "tk", "kermadec"],
  },
  {
    id: "southsandwich",
    name: "South Sandwich / Drake",
    role: "Dragon Head · Fracture Sentinel / Long-tail",
    kind: "seismic",
    bounds: [
      [-65, -40],
      [-50, -15],
    ],
  },
  {
    id: "andes",
    name: "Chile–Andes / Nazca",
    role: "Release Valve · KE Threshold",
    kind: "seismic",
    bounds: [
      [-45, -80],
      [-15, -65],
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
      "SES node #2 — Campi Flegrei caldera west of Naples. Open full board for INGV-OV GOSSIP microseismicity, depth profile, and SUPT continuum. USGS under-samples this box. Not a forecast.",
    aliases: ["campi-flegrei", "campi", "cf", "flegrei"],
  },
  {
    id: "japan",
    name: "Japan–Kuril–Kamchatka",
    role: "Transmitter Node · Tension–Oscillator",
    kind: "seismic",
    bounds: [
      [30, 130],
      [55, 165],
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
];

export const FOCUSED_MONITORS = DRAGON_NODES.filter((n) => n.publishedFocus);

/** Bounds that must survive marker capping. */
export function priorityNodeBounds(extra: DragonNode[] = []): LatLonBounds[] {
  const base = DRAGON_NODES.filter((n) => n.publishedFocus || n.watchPriority);
  const merged = [...extra.filter((n) => n.watchPriority), ...base];
  return merged.map((n) => n.bounds);
}

export type NodeStatus = "quiet" | "elevated" | "active" | "watch";

export function nodeStatus(features: EqFeature[], node: DragonNode): NodeStatus {
  if (node.kind === "volcano" && node.aviationCode) {
    const floor = aviationToNodeStatus(node.aviationCode);
    const seismic = seismicNodeStatus(features, node);
    const rank = { quiet: 0, elevated: 1, active: 2, watch: 3 } as const;
    return rank[seismic] > rank[floor] ? seismic : floor;
  }
  return seismicNodeStatus(features, node);
}

function seismicNodeStatus(features: EqFeature[], node: DragonNode): NodeStatus {
  const inBounds = features.filter((f) => {
    const [lon, lat] = f.geometry.coordinates;
    const mag = f.properties.mag ?? 0;
    return pointInBounds(lat, lon, node.bounds) && mag >= 3.5;
  });
  const maxMag = inBounds.reduce((m, f) => Math.max(m, f.properties.mag ?? 0), 0);
  if (maxMag >= 6 || inBounds.filter((f) => (f.properties.mag ?? 0) >= 5).length >= 2)
    return "watch";
  if (maxMag >= 5) return "active";
  if (maxMag >= 4 || inBounds.length >= 5) return "elevated";
  return "quiet";
}

export type NodeEventStats = {
  count: number;
  maxMag: number;
  m5: number;
};

export function nodeEventStats(
  features: EqFeature[] | undefined,
  node: DragonNode,
  minMag = 0,
): NodeEventStats {
  let count = 0;
  let maxMag = 0;
  let m5 = 0;
  for (const f of features ?? []) {
    const mag = f.properties.mag ?? 0;
    if (mag < minMag) continue;
    const [lon, lat] = f.geometry.coordinates;
    if (!pointInBounds(lat, lon, node.bounds)) continue;
    count++;
    if (mag > maxMag) maxMag = mag;
    if (mag >= 5) m5++;
  }
  return { count, maxMag, m5 };
}
