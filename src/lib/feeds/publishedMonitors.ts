/**
 * Published regional desks living with / outside Sentinel.
 * SES = Sun-Earth Sentinel (world observatory home).
 * WolfWatch Network = the published focus desks (TK · CF · JP · …).
 *
 * Handoff contract:
 *  - Sentinel → board:  open monitorUrl (+ optional ?from=ses&sesNode=)
 *  - Board → Sentinel:  PRODUCTION_ORIGIN/?tab=live&node=<sesDragonId>
 *  - Dense catalog:   catalogFeedUrl — replace USGS in-bounds for authority nodes
 *  - URL aliases resolve in resolveNodeId() so deep links stay flexible.
 */

import { PRODUCTION_ORIGIN } from "@/lib/site";

/** Brand for the published regional desk constellation (header strip + sidebar). */
export const WOLFWATCH_NETWORK = {
  id: "wolfwatch",
  name: "WolfWatch Network",
  shortName: "WolfWatch",
  code: "WW",
  tagline: "Regional seismic desks · focus in SES · open boards when needed",
} as const;

export type PublishedMonitor = {
  /** SES dragon-node id (DRAGON_NODES) */
  sesNodeId: string;
  /** Display name */
  name: string;
  /** SES network order (1 = first published) */
  networkOrder: number;
  shortCode: string;
  /**
   * Ultra-short label for dense mobile chips (defaults to shortCode).
   * Prefer 2–3 chars — never full place names in the header strip.
   */
  navLabel?: string;
  /** Optional region bucket for “All desks” grouping */
  region?: "pacific" | "ring" | "atlantic" | "europe" | "polar";
  role: string;
  /** Production board / authority homepage */
  monitorUrl: string;
  /**
   * Optional authority catalog feed (GeoJSON FeatureCollection).
   * When set, SES should prefer this over USGS inside the node bbox
   * (Campi Flegrei / mediterranean = INGV — never dual-read).
   */
  catalogFeedUrl?: string;
  /** Authority label shown in UI */
  authority: string;
  /** Accepted ?node= aliases (case-insensitive) */
  aliases: string[];
  focusNote: string;
};

export const PUBLISHED_MONITORS: PublishedMonitor[] = [
  {
    sesNodeId: "tonga",
    name: "Tonga–Kermadec",
    networkOrder: 1,
    shortCode: "TK",
    navLabel: "TK",
    region: "pacific",
    role: "Published focus · SES #1 · Swarm corridor",
    monitorUrl: "https://tonga-kermadec-monitor.vercel.app/",
    catalogFeedUrl:
      "https://tonga-kermadec-monitor.vercel.app/api/ses/catalog?window=7d&node=tonga",
    authority: "USGS FDSN / realtime",
    aliases: ["tonga", "tonga-kermadec", "tk", "kermadec"],
    focusNote:
      "SES node #1 — Tonga–Kermadec trench corridor. Full swarm board: Core / North / South / Nearby zones (USGS). Not a forecast.",
  },
  {
    sesNodeId: "mediterranean",
    name: "Campi Flegrei",
    networkOrder: 2,
    shortCode: "CF",
    navLabel: "CF",
    region: "europe",
    role: "Published focus · SES #2 · INGV authority",
    monitorUrl: "https://campi-flegrei-monitor.vercel.app/",
    catalogFeedUrl:
      "https://campi-flegrei-monitor.vercel.app/api/ses/catalog?window=7d&node=mediterranean",
    authority: "INGV-OV (GOSSIP → FDSN)",
    aliases: ["mediterranean", "campi-flegrei", "campi", "cf", "flegrei"],
    focusNote:
      "SES node #2 — Campi Flegrei caldera (Naples). Dense shallow swarm catalog is INGV-OV GOSSIP; USGS under-samples here. Open board for depth / SUPT continuum. Merge via catalogFeedUrl — never dual-read USGS. Not a forecast.",
  },
  {
    sesNodeId: "japan",
    name: "Japan Arc",
    networkOrder: 3,
    shortCode: "JP",
    navLabel: "JP",
    region: "ring",
    role: "Published focus · SES #3 · JMA + tsunami",
    monitorUrl: "https://japan-kamchatka-monitor.vercel.app/",
    catalogFeedUrl:
      "https://japan-kamchatka-monitor.vercel.app/api/ses/catalog?window=7d&node=japan",
    authority: "JMA Bosai (→ USGS fill)",
    aliases: ["japan", "jp", "jma", "tokara", "nansei", "japan-arc", "japan-kamchatka"],
    focusNote:
      "SES node #3 — Japan archipelago + Nansei / Tokara. JMA Bosai is exclusive domestic authority (Mj + shindo); tsunami watch first-class. Open board for Kamchatka companion. Not a forecast.",
  },
  {
    sesNodeId: "kamchatka",
    name: "Kamchatka–Kurils",
    networkOrder: 3,
    shortCode: "KM",
    navLabel: "KM",
    region: "ring",
    role: "Published focus · SES #3 companion · USGS",
    monitorUrl: "https://japan-kamchatka-monitor.vercel.app/?node=kamchatka",
    catalogFeedUrl:
      "https://japan-kamchatka-monitor.vercel.app/api/ses/catalog?window=7d&node=kamchatka",
    authority: "USGS FDSN / realtime",
    aliases: ["kamchatka", "km", "kuril", "kurils", "klyuchevskoy"],
    focusNote:
      "SES node #3 companion on Japan board — Kamchatka Peninsula / Kurils. USGS exclusive; KVERT for volcano status links. High tsunami source potential. Not a forecast.",
  },
  {
    sesNodeId: "iceland",
    name: "Iceland",
    networkOrder: 4,
    shortCode: "IS",
    navLabel: "IS",
    region: "atlantic",
    role: "Published focus · SES #4 · IMO densify",
    monitorUrl: "https://skjalftalisa.vedur.is/",
    catalogFeedUrl: "imo://iceland/catalog",
    authority: "IMO Veðurstofa (SeisComP + VALS/VONA)",
    aliases: [
      "iceland",
      "is",
      "reykjanes",
      "imo",
      "askja",
      "katla",
      "iceland-arc",
    ],
    focusNote:
      "SES node #4 — Iceland. Dense IMO SeisComP replaces USGS in-box (never dual-read). SUPT volcanic desk segments Reykjanes / Katla / Askja…. Not a forecast.",
  },
  {
    sesNodeId: "southsandwich",
    name: "South Sandwich / Drake",
    networkOrder: 5,
    shortCode: "SS",
    navLabel: "SS",
    region: "polar",
    role: "Published focus · SES #5 · Scotia Arc · USGS",
    /** USGS 30-day M2.5+ satellite · Scotia Sea / Drake / SS swarm (ops screenshot view) */
    monitorUrl:
      "https://earthquake.usgs.gov/earthquakes/map/#%7B%22feed%22%3A%2230day_m25%22%2C%22sort%22%3A%22newest%22%2C%22basemap%22%3A%22satellite%22%2C%22autoUpdate%22%3Afalse%2C%22restrictListToMap%22%3Atrue%2C%22timeZone%22%3A%22utc%22%2C%22mapposition%22%3A%5B%5B-63.5%2C-78%5D%2C%5B-47.5%2C-12%5D%5D%2C%22overlays%22%3A%7B%22plates%22%3Atrue%7D%2C%22viewModes%22%3A%7B%22map%22%3Atrue%2C%22list%22%3Atrue%2C%22settings%22%3Afalse%2C%22help%22%3Afalse%7D%7D",
    authority: "USGS FDSN / realtime (+ GEOFON/EMSC)",
    aliases: [
      "southsandwich",
      "ss",
      "sandwich",
      "south-sandwich",
      "drake",
      "scotia",
      "scotia-arc",
    ],
    focusNote:
      "SES node #5 — South Sandwich trench / Scotia Arc / Drake Passage. Remote; USGS primary. Full board = USGS 30-day M2.5+ satellite view of this corridor. Tsunami source potential South Atlantic. Not a forecast.",
  },
  {
    sesNodeId: "andes",
    name: "Chile–Andes / Nazca",
    networkOrder: 6,
    shortCode: "CL",
    navLabel: "CL",
    region: "pacific",
    role: "Published focus · SES #6 · Nazca megathrust · CSN densify",
    monitorUrl: "https://www.sismologia.cl/",
    /**
     * In-process CSN HTML + EMSC-CSN densify (see nodeCatalogFeed / csnChile).
     */
    catalogFeedUrl: "csn://andes/catalog",
    authority: "CSN Chile (HTML catalog + EMSC-CSN)",
    aliases: [
      "andes",
      "chile",
      "nazca",
      "csn",
      "chile-andes",
      "cl",
      "south-america",
      "sa",
    ],
    focusNote:
      "SES node #6 — Chile–Andes / Nazca. Dense CSN catalog replaces USGS in-box (never dual-read). Phase A EMSC-CSN + Phase B sismologia.cl daily HTML. Attribution: Centro Sismológico Nacional de la Universidad de Chile. Not a forecast.",
  },
  {
    sesNodeId: "newzealand",
    name: "New Zealand",
    networkOrder: 7,
    shortCode: "NZ",
    navLabel: "NZ",
    region: "pacific",
    role: "Published focus · SES #7 · GeoNet densify",
    monitorUrl: "https://www.geonet.org.nz/",
    catalogFeedUrl: "geonet://newzealand/catalog",
    authority: "GeoNet / GNS Science (FDSN + API)",
    aliases: [
      "newzealand",
      "nz",
      "new-zealand",
      "aotearoa",
      "geonet",
      "hikurangi",
      "wellington",
      "taupo",
    ],
    focusNote:
      "SES node #7 — New Zealand. GeoNet FDSN densify replaces USGS in-box (never dual-read). Attribution: GeoNet / GNS Science. Not a forecast.",
  },
];

const ALIAS_TO_SES = (() => {
  const m = new Map<string, string>();
  for (const p of PUBLISHED_MONITORS) {
    m.set(p.sesNodeId.toLowerCase(), p.sesNodeId);
    for (const a of p.aliases) m.set(a.toLowerCase(), p.sesNodeId);
  }
  return m;
})();

/** Resolve ?node= / handoff ids → canonical SES dragon id (or original if unknown). */
export function resolveNodeId(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const key = raw.trim().toLowerCase();
  return ALIAS_TO_SES.get(key) ?? raw.trim();
}

export function getPublishedMonitor(sesNodeId: string | null | undefined): PublishedMonitor | null {
  if (!sesNodeId) return null;
  const id = resolveNodeId(sesNodeId);
  if (!id) return null;
  return PUBLISHED_MONITORS.find((p) => p.sesNodeId === id) ?? null;
}

export function orderedPublishedMonitors(): PublishedMonitor[] {
  return [...PUBLISHED_MONITORS].sort((a, b) => {
    if (a.networkOrder !== b.networkOrder) return a.networkOrder - b.networkOrder;
    return a.shortCode.localeCompare(b.shortCode);
  });
}

export function listPublishedMonitors(): PublishedMonitor[] {
  return orderedPublishedMonitors();
}

/** Chip text — shortCode only on mobile; navLabel is the canonical 2-letter code. */
export function monitorNavLabel(p: PublishedMonitor): string {
  return p.navLabel || p.shortCode;
}

/**
 * Authority catalog feed URL (windowed). Returns null when the board has no feed.
 * In-process schemes (imo:/csn:/geonet:) pass through for nodeCatalogFeed.
 */
export function catalogFeedUrl(
  sesNodeId: string,
  windowKey: string = "7d",
): string | null {
  const p = getPublishedMonitor(sesNodeId);
  if (!p?.catalogFeedUrl) return null;
  try {
    if (
      p.catalogFeedUrl.startsWith("imo:") ||
      p.catalogFeedUrl.startsWith("csn:") ||
      p.catalogFeedUrl.startsWith("geonet:")
    ) {
      return p.catalogFeedUrl;
    }
    const u = new URL(p.catalogFeedUrl);
    u.searchParams.set("window", windowKey);
    u.searchParams.set("node", p.sesNodeId);
    return u.toString();
  } catch {
    return p.catalogFeedUrl;
  }
}

/** Board URL with SES handoff query (monitors may ignore unknown params). */
export function monitorHandoffUrl(sesNodeId: string | null | undefined): string | null {
  const p = getPublishedMonitor(sesNodeId);
  if (!p) return null;
  try {
    const u = new URL(p.monitorUrl);
    u.searchParams.set("from", "ses");
    u.searchParams.set("sesNode", p.sesNodeId);
    return u.toString();
  } catch {
    return p.monitorUrl;
  }
}

/** Absolute Sentinel deep link that restores node focus. */
export function sentinelFocusUrl(
  sesNodeId: string,
  origin = PRODUCTION_ORIGIN,
): string {
  const id = resolveNodeId(sesNodeId) || sesNodeId;
  const u = new URL(origin.endsWith("/") ? origin : `${origin}/`);
  u.searchParams.set("tab", "live");
  u.searchParams.set("node", id);
  return u.toString();
}

/** Deep link back into SES focused on a node. */
export function sesNodeDeepLink(sesNodeId: string): string {
  return sentinelFocusUrl(sesNodeId);
}
