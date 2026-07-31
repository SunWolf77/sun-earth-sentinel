/**
 * GFZ GEOFON FDSN text feed → EqCollection (USGS-shaped).
 * Complements USGS for multi-agency coverage (public seismic globe pattern).
 * https://geofon.gfz.de/
 */

import type { EqCollection, EqFeature } from "@/lib/feeds/usgs";

const GEOFON_QUERY = "https://geofon.gfz.de/fdsnws/event/1/query";

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
    const timeMs = Date.parse(c[1] || "");
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
        url: id ? `https://geofon.gfz.de/eqinfo/event.php?id=${encodeURIComponent(id)}` : undefined,
        title: `M${mag.toFixed(1)} ${place} (GEOFON)`,
        type: "earthquake",
        status: "automatic",
        // stash agency for UI
        detail: "geofon",
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
    (f.properties.title || "").includes("(GEOFON)")
  );
}
