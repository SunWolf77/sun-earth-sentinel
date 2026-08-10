/**
 * EMSC / SeismicPortal FDSN event feed → EqCollection.
 * Strong Europe–Med coverage; often carries IMO-contributed Iceland events
 * before / denser than USGS. Complements GEOFON + national catalogs.
 * https://www.seismicportal.eu/fdsnws/event/1/
 */

import type { EqCollection, EqFeature } from "@/lib/feeds/usgs";

const EMSC_QUERY = "https://www.seismicportal.eu/fdsnws/event/1/query";

/**
 * Global EMSC week at minMag (default 2.5) — independent of USGS.
 */
export async function fetchEmscWeek(minMag = 2.5): Promise<EqCollection> {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86400_000);
  const url = new URL(EMSC_QUERY);
  url.searchParams.set("starttime", start.toISOString().slice(0, 19));
  url.searchParams.set("endtime", end.toISOString().slice(0, 19));
  url.searchParams.set("minmagnitude", String(minMag));
  url.searchParams.set("format", "text");
  url.searchParams.set("limit", "2000");
  url.searchParams.set("orderby", "time");

  try {
    const res = await fetch(url.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`EMSC ${res.status}`);
    return parseEmscText(await res.text());
  } catch {
    return {
      type: "FeatureCollection",
      features: [],
      metadata: { generated: Date.now(), count: 0, title: "EMSC (unavailable)" },
    };
  }
}

/**
 * Iceland bbox densify via EMSC (includes IMO-authored solutions).
 * Backup if direct IMO API is down.
 */
export async function fetchEmscIceland(days = 7, minMag = 1.5): Promise<EqCollection> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);
  const url = new URL(EMSC_QUERY);
  url.searchParams.set("starttime", start.toISOString().slice(0, 19));
  url.searchParams.set("endtime", end.toISOString().slice(0, 19));
  url.searchParams.set("minlatitude", "62.5");
  url.searchParams.set("maxlatitude", "67.5");
  url.searchParams.set("minlongitude", "-25.5");
  url.searchParams.set("maxlongitude", "-12.5");
  url.searchParams.set("minmagnitude", String(minMag));
  url.searchParams.set("format", "text");
  url.searchParams.set("limit", "500");
  url.searchParams.set("orderby", "time");

  try {
    const res = await fetch(url.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`EMSC-IS ${res.status}`);
    const col = parseEmscText(await res.text());
    return {
      ...col,
      metadata: { ...col.metadata, title: "EMSC Iceland" },
    };
  } catch {
    return {
      type: "FeatureCollection",
      features: [],
      metadata: { generated: Date.now(), count: 0, title: "EMSC Iceland (unavailable)" },
    };
  }
}

/** FDSN text: EventID|Time|Lat|Lon|Depth|Author|Catalog|Contributor|...|Mag|...|Place */
export function parseEmscText(text: string): EqCollection {
  const lines = text.trim().split("\n");
  const features: EqFeature[] = [];

  for (const line of lines) {
    if (!line || line.startsWith("#") || line.startsWith("EventID")) continue;
    const c = line.split("|");
    if (c.length < 11) continue;

    const id = (c[0] || "").trim();
    const timeMs = Date.parse(c[1] || "");
    const lat = parseFloat(c[2] || "");
    const lon = parseFloat(c[3] || "");
    const depth = parseFloat(c[4] || "0");
    const author = (c[5] || "").trim();
    let mag = parseFloat(c[10] || "");
    if (!Number.isFinite(mag)) mag = parseFloat(c[9] || "");
    const place = (c[12] || c[c.length - 1] || "EMSC").trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) continue;

    features.push({
      type: "Feature",
      id: id ? `emsc:${id}` : `emsc:${lat}_${lon}_${timeMs}`,
      properties: {
        mag,
        place: place || "EMSC",
        time: Number.isFinite(timeMs) ? timeMs : null,
        url: id
          ? `https://www.seismicportal.eu/eventdetails.html?unid=${encodeURIComponent(id)}`
          : "https://www.emsc-csem.org/",
        title: `M${mag.toFixed(1)} ${place} (EMSC${author ? `/${author}` : ""})`,
        type: "earthquake",
        status: "automatic",
        detail: "emsc",
        net: "emsc",
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
      title: "EMSC SeismicPortal",
    },
  };
}

export function isEmscFeature(f: EqFeature): boolean {
  return (
    String(f.id || "").startsWith("emsc:") ||
    f.properties.detail === "emsc" ||
    f.properties.net === "emsc"
  );
}

/** Merge EMSC into base — add unique events (tight match skips dups). */
export function mergeEmscIntoCollection(
  base: EqCollection | null,
  emsc: EqCollection | null,
  opts?: { maxAgeMs?: number },
): EqCollection {
  const baseFeats = [...(base?.features ?? [])];
  const emscFeats = emsc?.features ?? [];
  if (!emscFeats.length) {
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

  for (const ef of emscFeats) {
    const et = ef.properties.time;
    if (typeof et === "number" && now - et > maxAge) continue;
    const [elon, elat] = ef.geometry.coordinates;
    const emag = ef.properties.mag ?? 0;

    let matched = false;
    for (const bf of enriched) {
      if (isEmscFeature(bf)) continue;
      const [blon, blat] = bf.geometry.coordinates;
      const bt = bf.properties.time;
      const bmag = bf.properties.mag ?? 0;
      if (!Number.isFinite(blat) || !Number.isFinite(blon)) continue;
      if (Math.abs(blat - elat) > 0.5 || Math.abs(blon - elon) > 0.6) continue;
      if (
        typeof bt === "number" &&
        typeof et === "number" &&
        Math.abs(bt - et) > 15 * 60_000
      )
        continue;
      if (Math.abs(bmag - emag) > 1.2 && emag >= 3) continue;
      bf.properties.emscEnriched = true;
      matched = true;
      break;
    }
    if (!matched) added.push(ef);
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
      title: "USGS + EMSC",
    },
  };
}
