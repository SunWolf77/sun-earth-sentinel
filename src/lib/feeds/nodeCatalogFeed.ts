/**
 * Runtime merge of published-board authority catalogs into SES global eq.
 *
 * Contract (Campi Flegrei / mediterranean · Iceland):
 *  1. Keep global USGS (and GEOFON/JMA/EMSC) outside the node bbox.
 *  2. STRIP any feature inside the node bbox.
 *  3. INJECT GeoJSON from board catalogFeedUrl or in-process national feed.
 *  4. Never dual-read USGS + national authority for the same box.
 *
 * Only monitors marked authority-override are replaced at runtime.
 * TK stays on USGS unless a future authority flip requires it.
 */

import { pointInBounds, type LatLonBounds } from "@/lib/geo/bounds";
import { getCache, setCache } from "@/lib/cache/localCache";
import {
  catalogFeedUrl,
  getPublishedMonitor,
  listPublishedMonitors,
  type PublishedMonitor,
} from "@/lib/feeds/publishedMonitors";
import { DRAGON_NODES, type EqCollection, type EqFeature } from "@/lib/feeds/usgs";
import { fetchImoQuakes } from "@/lib/feeds/imoQuakes";
import { fetchChileAuthorityCatalog } from "@/lib/feeds/csnChile";

export type SesTimeWindow = "hour" | "day" | "week" | "month";

/** Map SES globe window → board /api/ses/catalog window. */
export function sesWindowToBoardWindow(w: SesTimeWindow | string): string {
  switch (w) {
    case "hour":
    case "day":
      return "24h";
    case "week":
      return "7d";
    case "month":
      return "30d";
    default:
      return "7d";
  }
}

/** True when this board feed replaces USGS inside its bbox (never dual-read). */
export function isAuthorityOverrideMonitor(p: PublishedMonitor): boolean {
  return (
    /ingv/i.test(p.authority) ||
    p.sesNodeId === "mediterranean" ||
    /imo/i.test(p.authority) ||
    p.sesNodeId === "iceland" ||
    /csn/i.test(p.authority) ||
    p.sesNodeId === "andes"
  );
}

export function dragonBoundsForSesNode(sesNodeId: string): LatLonBounds | null {
  const node = DRAGON_NODES.find((n) => n.id === sesNodeId);
  return node?.bounds ?? null;
}

function cacheKey(sesNodeId: string, boardWindow: string): string {
  return `node_catalog_${sesNodeId}_${boardWindow}`;
}

/** Coerce board GeoJSON → SES EqFeature (depth on coords[2], net tag). */
export function normalizeBoardFeature(raw: unknown, sesNodeId: string): EqFeature | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as {
    type?: string;
    id?: string | number;
    properties?: Record<string, unknown>;
    geometry?: { type?: string; coordinates?: number[] };
  };
  if (f.type !== "Feature" || !f.geometry || f.geometry.type !== "Point") return null;
  const coords = f.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const depth = coords.length >= 3 && Number.isFinite(Number(coords[2])) ? Number(coords[2]) : 0;
  const props = f.properties ?? {};
  const magRaw = props.mag;
  const mag =
    magRaw == null || magRaw === ""
      ? null
      : Number.isFinite(Number(magRaw))
        ? Number(magRaw)
        : null;
  const timeRaw = props.time;
  const time =
    typeof timeRaw === "number" && Number.isFinite(timeRaw)
      ? timeRaw
      : typeof timeRaw === "string"
        ? Date.parse(timeRaw)
        : null;
  const sesSource =
    typeof props.sesSource === "string"
      ? props.sesSource
      : sesNodeId === "iceland"
        ? "imo"
        : sesNodeId === "andes"
          ? "csn"
          : "ingv";
  const id =
    f.id != null
      ? String(f.id)
      : `board-${sesNodeId}-${lat.toFixed(4)}_${lon.toFixed(4)}_${time ?? 0}`;

  return {
    type: "Feature",
    id,
    properties: {
      mag,
      place: typeof props.place === "string" ? props.place : null,
      time: time != null && Number.isFinite(time) ? time : null,
      updated: typeof props.updated === "number" ? props.updated : time ?? undefined,
      url: typeof props.url === "string" ? props.url : undefined,
      title: typeof props.title === "string" ? props.title : undefined,
      type: typeof props.type === "string" ? props.type : "earthquake",
      status: typeof props.status === "string" ? props.status : "reviewed",
      magType: typeof props.magType === "string" ? props.magType : null,
      net: sesSource,
      detail: sesSource,
    },
    geometry: {
      type: "Point",
      coordinates: [lon, lat, depth],
    },
  };
}

export function stripFeaturesInBounds(
  features: EqFeature[],
  bounds: LatLonBounds,
  padDeg = 0.02,
): EqFeature[] {
  return features.filter((f) => {
    const [lon, lat] = f.geometry.coordinates;
    if (lat == null || lon == null) return true;
    return !pointInBounds(lat, lon, bounds, padDeg);
  });
}

/** In-process IMO catalog for Iceland node (no external Vercel board required). */
async function fetchIcelandAuthorityCatalog(
  boardWindow: string,
): Promise<EqCollection | null> {
  const days =
    boardWindow === "24h" ? 2 : boardWindow === "30d" ? 14 : boardWindow === "7d" ? 7 : 7;
  // Dense board path: include microseismicity M≥0.8
  const col = await fetchImoQuakes({ sizeMin: 0.8, days, limit: 1500 });
  if (!col.features.length) return null;
  return {
    ...col,
    metadata: {
      generated: Date.now(),
      count: col.features.length,
      title: "IMO Iceland authority catalog",
    },
  };
}

/**
 * Fetch one board catalog feed (cached ~90s).
 * Returns null on network/parse failure — caller keeps last good merge when possible.
 */
export async function fetchNodeCatalogFeed(
  sesNodeId: string,
  boardWindow: string,
  force = false,
): Promise<EqCollection | null> {
  const key = cacheKey(sesNodeId, boardWindow);
  if (!force) {
    const hit = getCache<EqCollection>(key, 90_000);
    if (hit?.features?.length) return hit;
  }

  // Iceland: in-process IMO — never hit imo:// URL
  if (sesNodeId === "iceland") {
    try {
      const col = await fetchIcelandAuthorityCatalog(boardWindow);
      if (col?.features?.length) {
        setCache(key, col);
        return col;
      }
      return getCache<EqCollection>(key, 600_000);
    } catch {
      return getCache<EqCollection>(key, 600_000);
    }
  }

  // Chile–Andes: CSN HTML + EMSC-CSN densify
  if (sesNodeId === "andes") {
    try {
      const days =
        boardWindow === "24h" ? 2 : boardWindow === "30d" ? 14 : boardWindow === "7d" ? 7 : 7;
      const col = await fetchChileAuthorityCatalog({ days, minMag: 2.0 });
      if (col?.features?.length) {
        setCache(key, col);
        return col;
      }
      return getCache<EqCollection>(key, 600_000);
    } catch {
      return getCache<EqCollection>(key, 600_000);
    }
  }

  const url = catalogFeedUrl(sesNodeId, boardWindow);
  if (!url || url.startsWith("imo:") || url.startsWith("csn:"))
    return getCache<EqCollection>(key, 600_000);

  try {
    const res = await fetch(url, {
      cache: "no-cache",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return getCache<EqCollection>(key, 600_000);

    const body = (await res.json()) as {
      type?: string;
      features?: unknown[];
      metadata?: Record<string, unknown>;
    };
    const rawFeatures = Array.isArray(body.features) ? body.features : [];
    const features = rawFeatures
      .map((f) => normalizeBoardFeature(f, sesNodeId))
      .filter((f): f is EqFeature => f != null);

    const collection: EqCollection = {
      type: "FeatureCollection",
      features,
      metadata: {
        generated: Date.now(),
        count: features.length,
        title:
          typeof body.metadata?.title === "string"
            ? body.metadata.title
            : `Authority feed · ${sesNodeId}`,
      },
    };
    setCache(key, collection);
    return collection;
  } catch {
    return getCache<EqCollection>(key, 600_000);
  }
}

export type NodeFeedMergeMeta = {
  nodes: Array<{
    sesNodeId: string;
    injected: number;
    stripped: number;
    authority: string;
  }>;
};

/**
 * After USGS/GEOFON/JMA/EMSC/IMO merge: replace in-box features with authority feeds.
 * Safe no-op when no override monitors or all feeds fail.
 */
export async function mergePublishedNodeFeeds(
  base: EqCollection | null,
  opts: { timeWindow: SesTimeWindow | string; force?: boolean },
): Promise<{ collection: EqCollection; meta: NodeFeedMergeMeta }> {
  const boardWindow = sesWindowToBoardWindow(opts.timeWindow);
  const overrides = listPublishedMonitors().filter(
    (p) => p.catalogFeedUrl && isAuthorityOverrideMonitor(p),
  );

  let features = [...(base?.features ?? [])];
  const meta: NodeFeedMergeMeta = { nodes: [] };

  for (const pub of overrides) {
    const bounds = dragonBoundsForSesNode(pub.sesNodeId);
    if (!bounds) continue;

    const before = features.length;
    features = stripFeaturesInBounds(features, bounds);
    const stripped = before - features.length;

    const feed = await fetchNodeCatalogFeed(pub.sesNodeId, boardWindow, opts.force);
    const injected = feed?.features?.length ?? 0;
    if (injected > 0 && feed) {
      // Prefer board ids; drop any residual same-id from global
      const boardIds = new Set(feed.features.map((f) => String(f.id ?? "")));
      features = features.filter((f) => !boardIds.has(String(f.id ?? "")));
      features.push(...feed.features);
    }

    meta.nodes.push({
      sesNodeId: pub.sesNodeId,
      injected,
      stripped,
      authority: pub.authority,
    });
  }

  features.sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));

  return {
    collection: {
      type: "FeatureCollection",
      features,
      metadata: {
        generated: Date.now(),
        count: features.length,
        title:
          meta.nodes.some((n) => n.injected > 0)
            ? "USGS + authority node feeds (no dual-read)"
            : base?.metadata?.title ?? "USGS merged",
      },
    },
    meta,
  };
}

/** Sync re-apply from cache only (pulse path — no network). */
export function mergePublishedNodeFeedsFromCache(
  base: EqCollection | null,
  timeWindow: SesTimeWindow | string,
): EqCollection {
  const boardWindow = sesWindowToBoardWindow(timeWindow);
  const overrides = listPublishedMonitors().filter(
    (p) => p.catalogFeedUrl && isAuthorityOverrideMonitor(p),
  );

  let features = [...(base?.features ?? [])];

  for (const pub of overrides) {
    const bounds = dragonBoundsForSesNode(pub.sesNodeId);
    if (!bounds) continue;
    features = stripFeaturesInBounds(features, bounds);
    const feed = getCache<EqCollection>(cacheKey(pub.sesNodeId, boardWindow), 600_000);
    if (feed?.features?.length) {
      const boardIds = new Set(feed.features.map((f) => String(f.id ?? "")));
      features = features.filter((f) => !boardIds.has(String(f.id ?? "")));
      features.push(...feed.features);
    }
  }

  features.sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));
  return {
    type: "FeatureCollection",
    features,
    metadata: {
      generated: Date.now(),
      count: features.length,
      title: base?.metadata?.title ?? "USGS + authority (cache)",
    },
  };
}

export function getPublishedMonitorAuthorityLabel(sesNodeId: string | null): string | null {
  if (!sesNodeId) return null;
  return getPublishedMonitor(sesNodeId)?.authority ?? null;
}
