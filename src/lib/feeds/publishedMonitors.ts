/**
 * Published swarm boards living outside Sentinel (Vercel).
 * SES dragon-node ids must match monitor-side `sesDragonId` / DRAGON_NODES.
 *
 * Handoff contract:
 *  - Sentinel → board:  open monitorUrl (+ optional ?from=ses&sesNode=)
 *  - Board → Sentinel:  PRODUCTION_ORIGIN/?tab=live&node=<sesDragonId>
 *  - Dense catalog:   catalogFeedUrl (GeoJSON) — replace USGS in-bounds for INGV nodes
 *  - URL aliases resolve in resolveNodeId() so deep links stay flexible.
 */

import { PRODUCTION_ORIGIN } from "@/lib/site";

export type PublishedMonitor = {
  /** SES dragon-node id (DRAGON_NODES) */
  sesNodeId: string;
  /** Display name */
  name: string;
  /** SES network order (1 = first published) */
  networkOrder: number;
  shortCode: string;
  role: string;
  /** Production Vercel board */
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
    role: "Published focus · SES #3 companion · USGS",
    monitorUrl: "https://japan-kamchatka-monitor.vercel.app/?node=kamchatka",
    catalogFeedUrl:
      "https://japan-kamchatka-monitor.vercel.app/api/ses/catalog?window=7d&node=kamchatka",
    authority: "USGS FDSN / realtime",
    aliases: ["kamchatka", "km", "kuril", "kurils", "kvert", "okhotsk"],
    focusNote:
      "SES node #3 companion on Japan board — Kamchatka Peninsula / Kurils. USGS exclusive; KVERT for volcano status links. High tsunami source potential. Not a forecast.",
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
  return PUBLISHED_MONITORS.find((p) => p.sesNodeId === id) ?? null;
}

/** Board URL with SES handoff query (monitors may ignore unknown params). */
export function monitorHandoffUrl(sesNodeId: string): string | null {
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

/**
 * Authority catalog feed URL (windowed). Returns null when the board has no feed.
 * CF → INGV GOSSIP GeoJSON; use to replace USGS inside mediterranean bbox.
 */
export function catalogFeedUrl(
  sesNodeId: string,
  windowKey: string = "7d",
): string | null {
  const p = getPublishedMonitor(sesNodeId);
  if (!p?.catalogFeedUrl) return null;
  try {
    const u = new URL(p.catalogFeedUrl);
    u.searchParams.set("window", windowKey);
    u.searchParams.set("node", p.sesNodeId);
    return u.toString();
  } catch {
    return p.catalogFeedUrl;
  }
}

export function listPublishedMonitors(): PublishedMonitor[] {
  return [...PUBLISHED_MONITORS].sort((a, b) => a.networkOrder - b.networkOrder);
}
