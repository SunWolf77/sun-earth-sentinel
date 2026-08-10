/**
 * CSN Chile densify — Centro Sismológico Nacional (Universidad de Chile).
 *
 * Phase A: EMSC FDSN bbox (Author=CSN solutions already dominate Chile M2.5+).
 * Phase B: Daily HTML catalog on sismologia.cl (true national list).
 *
 * Attribution (required): Centro Sismológico Nacional de la Universidad de Chile.
 * Academic / divulgación use per https://www.sismologia.cl/accesos/uso-de-datos.html
 * No public FDSN API as of 2026-08 — HTML + EMSC only.
 */

import type { EqCollection, EqFeature } from "@/lib/feeds/usgs";
import { parseEmscText } from "@/lib/feeds/emsc";

const EMSC_QUERY = "https://www.seismicportal.eu/fdsnws/event/1/query";
const CSN_CATALOG_BASE = "https://www.sismologia.cl/sismicidad/catalogo";
const CSN_HOME = "https://www.sismologia.cl/";
const CSN_UA =
  "Mozilla/5.0 (compatible; SunEarthSentinel/1.18; +https://sun-earth-sentinel.vercel.app) educational";

/** SES #7 Chile–Andes / Nazca focus box */
export const CHILE_BOUNDS = {
  minLat: -45,
  maxLat: -15,
  minLon: -80,
  maxLon: -65,
} as const;

export const CSN_ATTRIBUTION =
  "Centro Sismológico Nacional de la Universidad de Chile";

function utcYmd(d: Date): { y: string; m: string; ymd: string } {
  const y = d.getUTCFullYear().toString();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return { y, m, ymd: `${y}${m}${day}` };
}

/** Catalog path: /sismicidad/catalogo/YYYY/MM/YYYYMMDD.html */
export function csnCatalogUrlForDay(d: Date): string {
  const { y, m, ymd } = utcYmd(d);
  return `${CSN_CATALOG_BASE}/${y}/${m}/${ymd}.html`;
}

/**
 * Phase A — EMSC Chile box, prefer tagging CSN-authored solutions as net=csn.
 */
export async function fetchEmscChile(opts?: {
  days?: number;
  minMag?: number;
}): Promise<EqCollection> {
  const days = opts?.days ?? 7;
  const minMag = opts?.minMag ?? 2.0;
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const url = new URL(EMSC_QUERY);
  url.searchParams.set("starttime", start.toISOString().slice(0, 19));
  url.searchParams.set("endtime", end.toISOString().slice(0, 19));
  url.searchParams.set("minlatitude", String(CHILE_BOUNDS.minLat));
  url.searchParams.set("maxlatitude", String(CHILE_BOUNDS.maxLat));
  url.searchParams.set("minlongitude", String(CHILE_BOUNDS.minLon));
  url.searchParams.set("maxlongitude", String(CHILE_BOUNDS.maxLon));
  url.searchParams.set("minmagnitude", String(minMag));
  url.searchParams.set("format", "text");
  url.searchParams.set("limit", "2000");
  url.searchParams.set("orderby", "time");

  try {
    const res = await fetch(url.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`EMSC-CL ${res.status}`);
    const col = parseEmscText(await res.text(), { chileCsnTag: true });
    return {
      ...col,
      metadata: {
        generated: Date.now(),
        count: col.features.length,
        title: "EMSC Chile (CSN solutions)",
      },
    };
  } catch {
    return {
      type: "FeatureCollection",
      features: [],
      metadata: { generated: Date.now(), count: 0, title: "EMSC Chile (unavailable)" },
    };
  }
}

/**
 * Parse one CSN daily HTML catalog table.
 * Columns: Fecha Local / Lugar | Fecha UTC | Latitud / Longitud | Profundidad | Magnitud
 */
export function parseCsnCatalogHtml(html: string, dayYmd: string): EqFeature[] {
  const features: EqFeature[] = [];
  // Row-ish: local place … UTC … lat lon … depth km … mag Mlv
  const rowRe =
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+([\s\S]*?)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(\d+(?:\.\d+)?)\s*km\s+(\d+\.\d+)\s*M[LlWwVv]*/gi;

  // Prefer table cell extraction
  const trs = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  for (const tr of trs) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      m[1]!
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    if (cells.length < 5) continue;
    // Skip header
    if (/Fecha|Latitud|Magnitud/i.test(cells.join(" "))) continue;

    // Find UTC datetime, lat lon, depth, mag in cells
    let utc = "";
    let place = "";
    let lat = NaN;
    let lon = NaN;
    let depth = 0;
    let mag = NaN;

    for (const c of cells) {
      const utcM = c.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
      if (utcM && !utc) {
        // first datetime often local; second is UTC — assign carefully
        if (!place && c.length > 20) place = c.replace(utcM[1]!, "").trim();
        if (utc) {
          // already have one — this is UTC
          utc = utcM[1]!;
        } else {
          utc = utcM[1]!; // provisional
        }
        continue;
      }
      const ll = c.match(/(-?\d+\.\d+)\s+(-?\d+\.\d+)/);
      if (ll) {
        lat = parseFloat(ll[1]!);
        lon = parseFloat(ll[2]!);
        continue;
      }
      const dep = c.match(/(\d+(?:\.\d+)?)\s*km/i);
      if (dep) {
        depth = parseFloat(dep[1]!);
        continue;
      }
      const mg = c.match(/(\d+\.\d+)\s*M/i) || c.match(/^(\d+\.\d+)$/);
      if (mg) mag = parseFloat(mg[1]!);
    }

    // Two-datetime rows: local in cell0, UTC in cell1
    if (cells[0] && cells[1]) {
      const t0 = cells[0].match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
      const t1 = cells[1].match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
      if (t0 && t1) {
        place = cells[0].replace(t0[1]!, "").trim() || place;
        utc = t1[1]!;
      } else if (t1) {
        utc = t1[1]!;
      } else if (t0) {
        utc = t0[1]!;
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) continue;
    // Chile-ish sanity
    if (lat > 0 || lat < -60 || lon > -60 || lon < -85) continue;

    const timeMs = Date.parse(utc.replace(" ", "T") + "Z");
    if (!Number.isFinite(timeMs)) continue;

    const id = `csn:${dayYmd}_${lat.toFixed(3)}_${lon.toFixed(3)}_${Math.round(timeMs / 1000)}`;
    features.push({
      type: "Feature",
      id,
      properties: {
        mag,
        place: place ? `${place}, Chile` : "Chile (CSN)",
        time: timeMs,
        url: CSN_HOME,
        title: `M${mag.toFixed(1)} ${place || "Chile"} (CSN)`,
        type: "earthquake",
        status: "reviewed",
        detail: "csn",
        net: "csn",
        magType: "MLv",
      },
      geometry: {
        type: "Point",
        coordinates: [lon, lat, depth],
      },
    });
  }

  // Fallback regex if table parse thin
  if (features.length < 3) {
    let m: RegExpExecArray | null;
    const re = rowRe;
    re.lastIndex = 0;
    while ((m = re.exec(html)) !== null) {
      const utc = m[3]!;
      const place = (m[2] || "").replace(/\s+/g, " ").trim();
      const lat = parseFloat(m[4]!);
      const lon = parseFloat(m[5]!);
      const depth = parseFloat(m[6]!);
      const mag = parseFloat(m[7]!);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) continue;
      const timeMs = Date.parse(utc.replace(" ", "T") + "Z");
      if (!Number.isFinite(timeMs)) continue;
      const id = `csn:${dayYmd}_${lat.toFixed(3)}_${lon.toFixed(3)}_${Math.round(timeMs / 1000)}`;
      if (features.some((f) => f.id === id)) continue;
      features.push({
        type: "Feature",
        id,
        properties: {
          mag,
          place: place ? `${place}, Chile` : "Chile (CSN)",
          time: timeMs,
          url: CSN_HOME,
          title: `M${mag.toFixed(1)} ${place || "Chile"} (CSN)`,
          type: "earthquake",
          status: "reviewed",
          detail: "csn",
          net: "csn",
          magType: "MLv",
        },
        geometry: { type: "Point", coordinates: [lon, lat, depth] },
      });
    }
  }

  return features;
}

/**
 * Phase B — fetch last N UTC days of CSN HTML catalogs and merge.
 */
export async function fetchCsnHtmlCatalog(opts?: {
  days?: number;
}): Promise<EqCollection> {
  const days = Math.min(opts?.days ?? 7, 14);
  const features: EqFeature[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86_400_000);
    const { ymd } = utcYmd(d);
    const url = csnCatalogUrlForDay(d);
    try {
      const res = await fetch(url, {
        cache: "no-cache",
        headers: {
          Accept: "text/html",
          "User-Agent": CSN_UA,
          Referer: "https://www.sismologia.cl/sismicidad/sismos-por-dia.html",
        },
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.includes("AccessDenied") || html.length < 500) continue;
      for (const f of parseCsnCatalogHtml(html, ymd)) {
        const key = String(f.id);
        if (seen.has(key)) continue;
        seen.add(key);
        features.push(f);
      }
    } catch {
      /* skip day */
    }
  }

  features.sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));
  return {
    type: "FeatureCollection",
    features,
    metadata: {
      generated: Date.now(),
      count: features.length,
      title: `CSN HTML catalog · ${CSN_ATTRIBUTION}`,
    },
  };
}

/**
 * Preferred Chile densify: HTML first, EMSC-CSN fill gaps.
 * Prefer CSN HTML ids; add EMSC features not near-duplicated.
 */
export async function fetchChileAuthorityCatalog(opts?: {
  days?: number;
  minMag?: number;
}): Promise<EqCollection> {
  const days = opts?.days ?? 7;
  const minMag = opts?.minMag ?? 2.0;

  const [html, emsc] = await Promise.all([
    fetchCsnHtmlCatalog({ days }),
    fetchEmscChile({ days, minMag }),
  ]);

  const base = [...html.features];
  const added: EqFeature[] = [];

  for (const ef of emsc.features) {
    if ((ef.properties.mag ?? 0) < minMag) continue;
    const [elon, elat] = ef.geometry.coordinates;
    const et = ef.properties.time;
    const emag = ef.properties.mag ?? 0;
    let dup = false;
    for (const bf of base) {
      const [blon, blat] = bf.geometry.coordinates;
      const bt = bf.properties.time;
      if (Math.abs(blat - elat) > 0.35 || Math.abs(blon - elon) > 0.4) continue;
      if (
        typeof bt === "number" &&
        typeof et === "number" &&
        Math.abs(bt - et) > 20 * 60_000
      )
        continue;
      if (Math.abs((bf.properties.mag ?? 0) - emag) > 0.8) continue;
      dup = true;
      break;
    }
    if (!dup) {
      // Keep CSN net tag when author was CSN
      added.push({
        ...ef,
        properties: {
          ...ef.properties,
          net: ef.properties.net === "csn" ? "csn" : ef.properties.net ?? "emsc",
          detail: ef.properties.net === "csn" ? "csn" : "emsc",
        },
      });
    }
  }

  const features = [...base, ...added]
    .filter((f) => (f.properties.mag ?? 0) >= minMag)
    .sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));

  return {
    type: "FeatureCollection",
    features,
    metadata: {
      generated: Date.now(),
      count: features.length,
      title: `Chile densify · CSN HTML + EMSC · ${CSN_ATTRIBUTION}`,
    },
  };
}

export function isCsnFeature(f: EqFeature): boolean {
  return (
    String(f.id || "").startsWith("csn:") ||
    f.properties.detail === "csn" ||
    f.properties.net === "csn"
  );
}
