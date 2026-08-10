/**
 * GeoNet (GNS Science) New Zealand earthquake densify.
 *
 * - Public API (CORS *): https://api.geonet.org.nz/quake?MMI=n — recent ≤100
 * - FDSN archive (no browser CORS): service.geonet.org.nz — windowed densify via server fn
 *
 * USGS under-samples NZ microseismicity (~2 vs ~360 M1.5+ / week in-box).
 * Attribution: GeoNet / GNS Science — https://www.geonet.org.nz/
 */

import { createServerFn } from "@tanstack/react-start";
import type { EqCollection, EqFeature } from "@/lib/feeds/usgs";

const GEONET_API = "https://api.geonet.org.nz/quake";
const GEONET_FDSN = "https://service.geonet.org.nz/fdsnws/event/1/query";
const GEONET_HOME = "https://www.geonet.org.nz/earthquake/";

/** NZ main islands + near offshore (no dateline wrap). Chatham filled via FDSN extra query. */
export const NZ_BOUNDS = {
  minLat: -48,
  maxLat: -33,
  minLon: 165,
  maxLon: 180,
} as const;

/** Chatham Islands pocket (east of dateline). */
export const CHATHAM_BOUNDS = {
  minLat: -45.5,
  maxLat: -42.5,
  minLon: -178.5,
  maxLon: -174.5,
} as const;

export const GEONET_ATTRIBUTION = "GeoNet / GNS Science";

type GeonetApiProps = {
  publicID?: string;
  time?: string;
  depth?: number;
  magnitude?: number;
  mmi?: number;
  locality?: string;
  quality?: string;
};

type GeonetApiFeature = {
  type?: string;
  geometry?: { type?: string; coordinates?: number[] };
  properties?: GeonetApiProps;
};

function inNzInterest(lat: number, lon: number): boolean {
  if (lat >= NZ_BOUNDS.minLat && lat <= NZ_BOUNDS.maxLat) {
    if (lon >= NZ_BOUNDS.minLon && lon <= NZ_BOUNDS.maxLon) return true;
    if (lon >= CHATHAM_BOUNDS.minLon && lon <= CHATHAM_BOUNDS.maxLon) return true;
  }
  // Mild offshore pad for Hikurangi / Fiordland
  if (lat >= -49 && lat <= -32 && lon >= 164 && lon <= 180) return true;
  if (lat >= -49 && lat <= -32 && lon >= -180 && lon <= -174) return true;
  return false;
}

export function parseGeonetApiGeoJson(
  raw: GeonetApiFeature[],
  opts?: { minMag?: number; maxAgeMs?: number },
): EqCollection {
  const minMag = opts?.minMag ?? 0;
  const maxAge = opts?.maxAgeMs ?? 14 * 86_400_000;
  const now = Date.now();
  const features: EqFeature[] = [];

  for (const f of raw) {
    const p = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    const mag = Number(p.magnitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) continue;
    if (mag < minMag) continue;
    if (p.quality === "deleted") continue;
    if (!inNzInterest(lat, lon)) continue;

    const timeMs = p.time ? Date.parse(p.time) : NaN;
    if (Number.isFinite(timeMs) && now - timeMs > maxAge) continue;

    const id = (p.publicID || "").trim();
    const place = (p.locality || "New Zealand").trim();
    const depth = Number(p.depth);
    const mmi = p.mmi != null && Number.isFinite(Number(p.mmi)) ? Number(p.mmi) : null;
    const quality = p.quality || "automatic";

    features.push({
      type: "Feature",
      id: id ? `geonet:${id}` : `geonet:${lat}_${lon}_${timeMs}`,
      properties: {
        mag,
        place: /new zealand|nz\b/i.test(place) ? place : `${place}, New Zealand`,
        time: Number.isFinite(timeMs) ? timeMs : null,
        url: id ? `${GEONET_HOME}${encodeURIComponent(id)}` : "https://www.geonet.org.nz/",
        title: `M${mag.toFixed(1)} ${place} (GeoNet)`,
        type: "earthquake",
        status: quality === "best" || quality === "reviewed" ? "reviewed" : "automatic",
        detail: "geonet",
        net: "geonet",
        magType: "MLv",
        ...(mmi != null && mmi >= 0 ? { mmi } : {}),
      },
      geometry: {
        type: "Point",
        coordinates: [lon, lat, Number.isFinite(depth) ? depth : 0],
      },
    });
  }

  features.sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));
  return {
    type: "FeatureCollection",
    features,
    metadata: {
      generated: Date.now(),
      count: features.length,
      title: "GeoNet API",
    },
  };
}

/** FDSN text (same columns as EMSC/GeoNet). */
export function parseGeonetFdsnText(text: string, minMag = 0): EqCollection {
  const features: EqFeature[] = [];
  for (const line of text.trim().split("\n")) {
    if (!line || line.startsWith("#") || line.startsWith("EventID")) continue;
    const c = line.split("|");
    if (c.length < 11) continue;
    const id = (c[0] || "").trim();
    const timeMs = Date.parse(c[1] || "");
    const lat = parseFloat(c[2] || "");
    const lon = parseFloat(c[3] || "");
    const depth = parseFloat(c[4] || "0");
    let mag = parseFloat(c[10] || "");
    if (!Number.isFinite(mag)) mag = parseFloat(c[9] || "");
    const place = (c[12] || c[c.length - 1] || "New Zealand").trim();
    const eventType = (c[13] || "earthquake").toLowerCase();
    if (eventType && eventType !== "earthquake" && !eventType.includes("quake")) {
      // keep "outside of network interest" if in NZ pad — skip distant teleseisms labeled outside
      if (eventType.includes("outside") && !inNzInterest(lat, lon)) continue;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) continue;
    if (mag < minMag) continue;
    if (!inNzInterest(lat, lon)) continue;

    features.push({
      type: "Feature",
      id: id ? `geonet:${id}` : `geonet:${lat}_${lon}_${timeMs}`,
      properties: {
        mag,
        place: /new zealand|nz\b|cape reinga|te anau|haast|tokoroa|castlepoint/i.test(place)
          ? place
          : `${place}, New Zealand`,
        time: Number.isFinite(timeMs) ? timeMs : null,
        url: id ? `${GEONET_HOME}${encodeURIComponent(id)}` : "https://www.geonet.org.nz/",
        title: `M${mag.toFixed(1)} ${place} (GeoNet)`,
        type: "earthquake",
        status: "reviewed",
        detail: "geonet",
        net: "geonet",
        magType: (c[9] || "MLv").trim() || "MLv",
      },
      geometry: {
        type: "Point",
        coordinates: [lon, lat, Number.isFinite(depth) ? depth : 0],
      },
    });
  }
  features.sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));
  return {
    type: "FeatureCollection",
    features,
    metadata: {
      generated: Date.now(),
      count: features.length,
      title: "GeoNet FDSN",
    },
  };
}

/** Client-side recent feed (CORS open). Cap ~100 events. */
export async function fetchGeonetApi(opts?: {
  mmi?: number;
  minMag?: number;
}): Promise<EqCollection> {
  const mmi = opts?.mmi ?? 1;
  const minMag = opts?.minMag ?? 1.0;
  try {
    const res = await fetch(`${GEONET_API}?MMI=${mmi}`, {
      cache: "no-cache",
      headers: {
        Accept: "application/vnd.geo+json;version=2",
      },
    });
    if (!res.ok) throw new Error(`GeoNet API ${res.status}`);
    const body = (await res.json()) as { features?: GeonetApiFeature[] };
    return parseGeonetApiGeoJson(body.features ?? [], {
      minMag,
      maxAgeMs: 14 * 86_400_000,
    });
  } catch {
    return {
      type: "FeatureCollection",
      features: [],
      metadata: { generated: Date.now(), count: 0, title: "GeoNet API (unavailable)" },
    };
  }
}

async function fdsnQuery(params: Record<string, string>): Promise<string> {
  const url = new URL(GEONET_FDSN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Accept: "text/plain" },
    cache: "no-cache",
  });
  if (!res.ok) throw new Error(`GeoNet FDSN ${res.status}`);
  return res.text();
}

/**
 * Server-side FDSN densify (browser CORS blocks service.geonet.org.nz).
 * Two boxes: NZ main + Chatham pocket.
 */
export const fetchGeonetFdsnServer = createServerFn({ method: "POST" })
  .inputValidator((input: { days?: number; minMag?: number } | undefined) => ({
    days: Math.min(Math.max(input?.days ?? 7, 1), 30),
    minMag: input?.minMag ?? 1.5,
  }))
  .handler(async ({ data }): Promise<EqCollection> => {
    const { days, minMag } = data;
    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    const startStr = start.toISOString().slice(0, 19);
    const endStr = end.toISOString().slice(0, 19);

    const base = {
      starttime: startStr,
      endtime: endStr,
      minmagnitude: String(minMag),
      format: "text",
      orderby: "time",
    };

    try {
      const [mainText, chathamText] = await Promise.all([
        fdsnQuery({
          ...base,
          minlatitude: String(NZ_BOUNDS.minLat),
          maxlatitude: String(NZ_BOUNDS.maxLat),
          minlongitude: String(NZ_BOUNDS.minLon),
          maxlongitude: String(NZ_BOUNDS.maxLon),
        }),
        fdsnQuery({
          ...base,
          minlatitude: String(CHATHAM_BOUNDS.minLat),
          maxlatitude: String(CHATHAM_BOUNDS.maxLat),
          minlongitude: String(CHATHAM_BOUNDS.minLon),
          maxlongitude: String(CHATHAM_BOUNDS.maxLon),
        }).catch(() => ""),
      ]);

      const a = parseGeonetFdsnText(mainText, minMag);
      const b = chathamText ? parseGeonetFdsnText(chathamText, minMag) : null;
      const map = new Map<string, EqFeature>();
      for (const f of [...a.features, ...(b?.features ?? [])]) {
        map.set(String(f.id), f);
      }
      const features = [...map.values()].sort(
        (x, y) => (y.properties.time ?? 0) - (x.properties.time ?? 0),
      );
      return {
        type: "FeatureCollection",
        features,
        metadata: {
          generated: Date.now(),
          count: features.length,
          title: `GeoNet FDSN · ${GEONET_ATTRIBUTION}`,
        },
      };
    } catch {
      return {
        type: "FeatureCollection",
        features: [],
        metadata: { generated: Date.now(), count: 0, title: "GeoNet FDSN (unavailable)" },
      };
    }
  });

/**
 * Preferred densify: FDSN server (week window) with API fallback.
 */
export async function fetchGeonetQuakes(opts?: {
  days?: number;
  minMag?: number;
}): Promise<EqCollection> {
  const days = opts?.days ?? 7;
  const minMag = opts?.minMag ?? 1.5;

  try {
    const col = await fetchGeonetFdsnServer({ data: { days, minMag } });
    if (col.features.length > 0) return col;
  } catch {
    /* fall through */
  }

  // Fallback: public API recent list
  return fetchGeonetApi({ mmi: 1, minMag });
}

export function isGeonetFeature(f: EqFeature): boolean {
  return (
    String(f.id || "").startsWith("geonet:") ||
    f.properties.detail === "geonet" ||
    f.properties.net === "geonet"
  );
}

/** Merge GeoNet into global catalog — add unique, tight space/time dedupe. */
export function mergeGeonetIntoCollection(
  base: EqCollection | null,
  geonet: EqCollection | null,
  opts?: { maxAgeMs?: number },
): EqCollection {
  const baseFeats = [...(base?.features ?? [])];
  const gnFeats = geonet?.features ?? [];
  if (!gnFeats.length) {
    return (
      base ?? {
        type: "FeatureCollection",
        features: [],
        metadata: { generated: Date.now(), count: 0 },
      }
    );
  }

  const maxAge = opts?.maxAgeMs ?? 14 * 86_400_000;
  const now = Date.now();
  const enriched = baseFeats.map((f) => ({
    ...f,
    properties: { ...f.properties },
  }));
  const added: EqFeature[] = [];

  for (const gf of gnFeats) {
    const gt = gf.properties.time;
    if (typeof gt === "number" && now - gt > maxAge) continue;
    const [glon, glat] = gf.geometry.coordinates;
    const gmag = gf.properties.mag ?? 0;

    let matched = false;
    for (const bf of enriched) {
      if (isGeonetFeature(bf)) continue;
      const [blon, blat] = bf.geometry.coordinates;
      const bt = bf.properties.time;
      const bmag = bf.properties.mag ?? 0;
      if (!Number.isFinite(blat) || !Number.isFinite(blon)) continue;
      if (Math.abs(blat - glat) > 0.4 || Math.abs(blon - glon) > 0.5) continue;
      if (
        typeof bt === "number" &&
        typeof gt === "number" &&
        Math.abs(bt - gt) > 15 * 60_000
      )
        continue;
      if (Math.abs(bmag - gmag) > 1.0 && gmag >= 3) continue;
      bf.properties.geonetEnriched = true;
      matched = true;
      break;
    }
    if (!matched) added.push(gf);
  }

  const features = [...enriched, ...added].sort(
    (a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0),
  );
  return {
    type: "FeatureCollection",
    features,
    metadata: {
      generated: Date.now(),
      count: features.length,
      title: "USGS + GeoNet",
    },
  };
}
