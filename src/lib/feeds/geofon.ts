/**
 * GFZ GEOFON FDSN text feed → EqCollection (USGS-shaped).
 * Complements USGS for multi-agency coverage (public seismic globe pattern).
 * https://geofon.gfz.de/
 *
 * Merge is spatial/time/mag — not ID-only. Agencies disagree on magnitude
 * (e.g. USGS M7.4 vs GFZ Mw 7.46) and place strings; same event must not
 * appear twice on the map or in Activity Story.
 */

import type { EqCollection, EqFeature } from "@/lib/feeds/usgs";

const GEOFON_QUERY = "https://geofon.gfz.de/fdsnws/event/1/query";

/**
 * FDSN text times are UTC without a Z suffix. `Date.parse` treats
 * datetime-without-offset as *local* — NZST users then saw GEOFON events
 * ~12 h older than USGS for the same origin. Force UTC.
 */
export function parseFdsnUtcMs(raw: string): number {
  const s = (raw || "").trim();
  if (!s) return NaN;
  // Already has Z or ±offset
  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
    return Date.parse(s);
  }
  // "2026-08-10T12:34:28.43" or with space
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  return Date.parse(`${normalized}Z`);
}

/**
 * Fetch ~7 days of GEOFON events as text FDSN, map into our feature shape.
 * Failures return empty collection (USGS remains primary).
 */
export async function fetchGeofonWeek(minMag = 0): Promise<EqCollection> {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86400_000);
  const url = new URL(GEOFON_QUERY);
  url.searchParams.set("starttime", start.toISOString().slice(0, 19));
  url.searchParams.set("endtime", end.toISOString().slice(0, 19));
  url.searchParams.set("minmag", String(minMag));
  url.searchParams.set("format", "text");
  url.searchParams.set("limit", "2000");
  url.searchParams.set("orderby", "time");

  try {
    const res = await fetch(url.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`GEOFON ${res.status}`);
    const text = await res.text();
    return parseGeofonText(text);
  } catch {
    return {
      type: "FeatureCollection",
      features: [],
      metadata: { generated: Date.now(), count: 0, title: "GEOFON (unavailable)" },
    };
  }
}

/** FDSN text: EventID|Time|Latitude|Longitude|Depth/km|...|Magnitude|...|EventLocationName */
export function parseGeofonText(text: string): EqCollection {
  const lines = text.trim().split("\n");
  const features: EqFeature[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line || line.startsWith("#") || line.startsWith("EventID")) continue;
    const c = line.split("|");
    if (c.length < 11) continue;

    const id = (c[0] || "").trim();
    const timeMs = parseFdsnUtcMs(c[1] || "");
    const lat = parseFloat(c[2] || "");
    const lon = parseFloat(c[3] || "");
    const depth = parseFloat(c[4] || "0");
    // Mag column is typically index 10 in GEOFON text
    let mag = parseFloat(c[10] || "");
    if (!Number.isFinite(mag)) mag = parseFloat(c[9] || "");
    const place = (c[12] || c[c.length - 1] || "GEOFON").trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) continue;

    features.push({
      type: "Feature",
      id: id ? `geofon:${id}` : `geofon:${lat}_${lon}_${timeMs}`,
      properties: {
        mag,
        place: place || "GEOFON",
        time: Number.isFinite(timeMs) ? timeMs : null,
        url: id
          ? `https://geofon.gfz.de/eqinfo/event.php?id=${encodeURIComponent(id)}`
          : undefined,
        title: `M${mag.toFixed(1)} ${place} (GEOFON)`,
        type: "earthquake",
        status: "automatic",
        // stash agency for UI
        detail: "geofon",
        net: "geofon",
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
      title: "GEOFON GFZ",
    },
  };
}

export function isGeofonFeature(f: EqFeature): boolean {
  return (
    String(f.id || "").startsWith("geofon:") ||
    f.properties.detail === "geofon" ||
    f.properties.net === "geofon" ||
    (f.properties.title || "").includes("(GEOFON)")
  );
}

export type GeofonMergeOpts = {
  maxAgeMs?: number;
  /** Degrees — loose enough for multi-agency epicenter scatter on large events */
  maxLatDeg?: number;
  maxLonDeg?: number;
  /** Origin-time window for same-event match */
  maxTimeMs?: number;
  /**
   * Mag delta allowed when pairing agencies.
   * Early automatic vs reviewed mww/mw routinely differ 0.2–0.5; 1.0 covers
   * most M6+ solutions without swallowing distinct nearby events.
   */
  maxMagDelta?: number;
};

/**
 * Merge GEOFON into base catalog.
 * - Prefer base (USGS / authority) when a spatial-time-mag match exists
 * - Mark matched base features `geofonEnriched` (secondary agency confirmed)
 * - Only inject GEOFON events that have no base twin
 */
export function mergeGeofonIntoCollection(
  base: EqCollection | null,
  geofon: EqCollection | null,
  opts?: GeofonMergeOpts,
): EqCollection {
  const baseFeats = [...(base?.features ?? [])];
  const geoFeats = geofon?.features ?? [];
  if (!geoFeats.length) {
    return (
      base ?? {
        type: "FeatureCollection",
        features: [],
        metadata: { generated: Date.now(), count: 0 },
      }
    );
  }

  const maxAge = opts?.maxAgeMs ?? 14 * 86_400_000;
  const maxLat = opts?.maxLatDeg ?? 0.6;
  const maxLon = opts?.maxLonDeg ?? 0.7;
  const maxTime = opts?.maxTimeMs ?? 20 * 60_000;
  const maxMagDelta = opts?.maxMagDelta ?? 1.0;
  const now = Date.now();

  const enriched = baseFeats.map((f) => ({
    ...f,
    properties: { ...f.properties },
  }));
  const added: EqFeature[] = [];

  for (const gf of geoFeats) {
    const gt = gf.properties.time;
    if (typeof gt === "number" && now - gt > maxAge) continue;
    const [glon, glat] = gf.geometry.coordinates;
    const gmag = gf.properties.mag ?? 0;
    if (!Number.isFinite(glat) || !Number.isFinite(glon)) continue;

    let matched = false;
    for (const bf of enriched) {
      if (isGeofonFeature(bf)) continue;
      const [blon, blat] = bf.geometry.coordinates;
      const bt = bf.properties.time;
      const bmag = bf.properties.mag ?? 0;
      if (!Number.isFinite(blat) || !Number.isFinite(blon)) continue;
      if (Math.abs(blat - glat) > maxLat || Math.abs(blon - glon) > maxLon) continue;
      if (
        typeof bt === "number" &&
        typeof gt === "number" &&
        Math.abs(bt - gt) > maxTime
      ) {
        continue;
      }
      // Mag range — agencies often disagree; still skip if wildly different
      if (Math.abs(bmag - gmag) > maxMagDelta && Math.min(bmag, gmag) >= 3) continue;

      bf.properties.geofonEnriched = true;
      // Keep preferred USGS place/mag; stash secondary mag for UI if useful
      if (Number.isFinite(gmag)) {
        bf.properties.geofonMag = gmag;
      }
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
      title: "USGS + GEOFON (spatial dedupe)",
    },
  };
}
