/**
 * JMA Bosai public JSON → EqCollection (USGS-shaped).
 * Source: https://www.jma.go.jp/bosai/quake/data/list.json (CORS *).
 * Complements USGS for denser Japan coverage + shindo (maxi).
 */

import type { EqCollection, EqFeature } from "@/lib/feeds/usgs";
import { jmaLinksForEvent } from "@/lib/seismology/agencyLinks";

const JMA_LIST = "https://www.jma.go.jp/bosai/quake/data/list.json";
const JMA_DETAIL_BASE = "https://www.jma.go.jp/bosai/quake/data/";

const PREFERRED = new Set(["VXSE5k", "VXSE52", "VXSE61"]);
const INTENSITY_ONLY = new Set(["VXSE51"]);

export type JmaListItem = {
  ctt?: string;
  eid?: string;
  rdt?: string;
  at?: string;
  ttl?: string;
  en_ttl?: string;
  anm?: string;
  en_anm?: string;
  acd?: string;
  cod?: string;
  mag?: string;
  maxi?: string;
  json?: string;
  ser?: string;
  ift?: string;
};

/** Parse JMA cod "+lat+lon±depth_m/" → lat, lon, depth km. */
export function parseJmaCod(cod: string | null | undefined): {
  lat: number;
  lon: number;
  depthKm: number;
} | null {
  if (!cod) return null;
  const m = String(cod).match(
    /([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)\/?/,
  );
  if (!m) return null;
  const lat = parseFloat(m[1]!);
  const lon = parseFloat(m[2]!);
  const depthM = parseFloat(m[3]!);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const depthKm = Number.isFinite(depthM) ? Math.abs(depthM) / 1000 : 0;
  return { lat, lon, depthKm };
}

export function productCodeFromJson(json: string | undefined): string {
  if (!json) return "";
  const m = json.match(/_(VXSE[^_]+|VYSE[^_]+|VTSE[^_]+)_/i);
  return m?.[1] ?? "";
}

function parseJstToMs(s: string | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/** Rough shindo → mag proxy so intensity-only events pass minMag filters. */
function shindoToApproxMag(maxi: string): number {
  const t = maxi.trim();
  if (t === "7") return 6.5;
  if (t === "6+" || t === "6強") return 6.0;
  if (t === "6-" || t === "6弱") return 5.7;
  if (t === "5+" || t === "5強") return 5.3;
  if (t === "5-" || t === "5弱") return 5.0;
  if (t === "4") return 4.5;
  if (t === "3") return 4.0;
  if (t === "2") return 3.5;
  return 3.0;
}

function mapItem(item: JmaListItem): EqFeature | null {
  const product = productCodeFromJson(item.json);
  if (product.startsWith("VYSE")) return null;

  const coords = parseJmaCod(item.cod);
  if (!coords) return null;
  const { lat, lon, depthKm } = coords;

  const magRaw = item.mag?.trim();
  const mag =
    magRaw && magRaw !== "不明" && magRaw !== "-"
      ? parseFloat(magRaw)
      : NaN;
  const hasMag = Number.isFinite(mag);
  if (!hasMag && INTENSITY_ONLY.has(product)) {
    const maxi = item.maxi || "";
    if (!maxi || maxi === "1" || maxi === "2") return null;
  }
  if (!hasMag && !PREFERRED.has(product) && !item.maxi) return null;

  const eid = (item.eid || item.ctt || "").trim();
  if (!eid) return null;

  const place =
    (item.en_anm || item.anm || "Japan").replace(/\s+/g, " ").trim() || "Japan";
  const time = parseJstToMs(item.at) ?? parseJstToMs(item.rdt);
  const maxi = (item.maxi || "").trim();
  const displayMag = hasMag
    ? mag
    : maxi
      ? Math.max(2.5, shindoToApproxMag(maxi))
      : 2.5;

  const mapLinks = jmaLinksForEvent(lat, lon);
  const mapUrl = mapLinks.find((l) => l.id === "jma-map")?.url;

  return {
    type: "Feature",
    id: `jma:${eid}`,
    properties: {
      mag: displayMag,
      place: maxi ? `${place} · shindo ${maxi}` : place,
      time,
      url: mapUrl,
      title: hasMag
        ? `M${displayMag.toFixed(1)} ${place} (JMA)`
        : `shindo ${maxi} ${place} (JMA)`,
      type: "earthquake",
      status: item.ift || "published",
      detail: "jma",
      net: "jma",
      magType: hasMag ? "MJMA" : "shindo",
      jmaMaxi: maxi || null,
      jmaEid: eid,
      jmaProduct: product || null,
      jmaJson: item.json || null,
      sig: hasMag && mag >= 6 ? 600 : hasMag ? Math.round(mag * 50) : 100,
    },
    geometry: {
      type: "Point",
      coordinates: [lon, lat, depthKm],
    },
  };
}

export function parseJmaList(items: JmaListItem[]): EqCollection {
  const rank = (p: string) => {
    if (p === "VXSE5k") return 4;
    if (p === "VXSE52") return 3;
    if (p === "VXSE61") return 2;
    if (p === "VXSE51") return 1;
    return 0;
  };
  const best = new Map<string, JmaListItem>();
  for (const it of items) {
    const eid = (it.eid || "").trim();
    if (!eid) continue;
    const prev = best.get(eid);
    if (!prev) {
      best.set(eid, it);
      continue;
    }
    const rNew = rank(productCodeFromJson(it.json));
    const rOld = rank(productCodeFromJson(prev.json));
    if (rNew > rOld) best.set(eid, it);
    else if (rNew === rOld && (it.ctt || "") > (prev.ctt || "")) best.set(eid, it);
  }

  const features: EqFeature[] = [];
  for (const it of best.values()) {
    const f = mapItem(it);
    if (f) features.push(f);
  }
  features.sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));
  return {
    type: "FeatureCollection",
    features,
    metadata: {
      generated: Date.now(),
      count: features.length,
      title: "JMA Bosai quake list",
    },
  };
}

export async function fetchJmaQuakes(): Promise<EqCollection> {
  try {
    const res = await fetch(`${JMA_LIST}?_=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`JMA ${res.status}`);
    const data = (await res.json()) as JmaListItem[];
    if (!Array.isArray(data)) throw new Error("JMA list not array");
    return parseJmaList(data);
  } catch {
    return {
      type: "FeatureCollection",
      features: [],
      metadata: { generated: Date.now(), count: 0, title: "JMA (unavailable)" },
    };
  }
}

export function isJmaFeature(f: EqFeature): boolean {
  return (
    String(f.id || "").startsWith("jma:") ||
    f.properties.detail === "jma" ||
    f.properties.net === "jma"
  );
}

/**
 * Merge JMA into USGS/GEOFON:
 * - Enrich matching events with jmaMaxi / jmaEid
 * - Add unique Japan hypocenters not already present
 */
export function mergeJmaIntoCollection(
  base: EqCollection | null,
  jma: EqCollection | null,
  opts?: { maxAgeMs?: number },
): EqCollection {
  const baseFeats = [...(base?.features ?? [])];
  const jmaFeats = jma?.features ?? [];
  if (!jmaFeats.length) {
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

  for (const jf of jmaFeats) {
    const jt = jf.properties.time;
    if (typeof jt === "number" && now - jt > maxAge) continue;
    const [jlon, jlat] = jf.geometry.coordinates;
    const jmag = jf.properties.mag ?? 0;
    const jmaxi = jf.properties.jmaMaxi;
    const jeid = jf.properties.jmaEid;

    let matched = false;
    for (const bf of enriched) {
      if (isJmaFeature(bf)) continue;
      const [blon, blat] = bf.geometry.coordinates;
      const bt = bf.properties.time;
      const bmag = bf.properties.mag ?? 0;
      if (!Number.isFinite(blat) || !Number.isFinite(blon)) continue;
      const dLat = Math.abs(blat - jlat);
      const dLon = Math.abs(blon - jlon);
      if (dLat > 0.4 || dLon > 0.5) continue;
      if (
        typeof bt === "number" &&
        typeof jt === "number" &&
        Math.abs(bt - jt) > 15 * 60_000
      )
        continue;
      if (Math.abs(bmag - jmag) > 1.2 && jmag >= 3) continue;
      if (jmaxi) bf.properties.jmaMaxi = jmaxi;
      if (jeid) bf.properties.jmaEid = jeid;
      bf.properties.jmaEnriched = true;
      matched = true;
      break;
    }
    if (!matched) added.push(jf);
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
      title: "USGS + GEOFON + JMA",
    },
  };
}

export function jmaDetailUrl(jsonName: string | null | undefined): string | null {
  if (!jsonName) return null;
  return `${JMA_DETAIL_BASE}${jsonName}`;
}
