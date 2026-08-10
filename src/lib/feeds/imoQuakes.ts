/**
 * Icelandic Meteorological Office (IMO / Veðurstofa) quake catalog.
 * Official API: https://api.vedur.is/quakes/ — CC BY 4.0
 * USGS under-samples Iceland; this densifies Reykjanes / transform zone microseismicity.
 */

import type { EqCollection, EqFeature } from "@/lib/feeds/usgs";
import {
  PROFILE_COMPACT,
  samePhysicalFeature,
} from "@/lib/seismology/sameEvent";

const IMO_EVENTS = "https://api.vedur.is/quakes/events";

/** WKT polygon covering Iceland + near offshore. */
export const ICELAND_POLYGON =
  "POLYGON((-25.5 62.8, -12.5 62.8, -12.5 67.3, -25.5 67.3, -25.5 62.8))";

type ImoProps = {
  event_id?: string;
  time?: string;
  magnitude?: number;
  depth?: number;
  region?: string;
  type?: string;
  evaluation_mode?: string;
  updated_time?: string;
};

type ImoFeature = {
  type: string;
  geometry?: { type: string; coordinates?: number[] };
  properties?: ImoProps;
};

/**
 * Fetch IMO SeisComP catalog for Iceland.
 * @param sizeMin magnitude floor (default 1.0 — still far denser than USGS M4+)
 * @param days lookback window
 */
export async function fetchImoQuakes(opts?: {
  sizeMin?: number;
  days?: number;
  limit?: number;
}): Promise<EqCollection> {
  const sizeMin = opts?.sizeMin ?? 1.0;
  const days = opts?.days ?? 7;
  const limit = opts?.limit ?? 800;
  const start = new Date(Date.now() - days * 86_400_000);
  const startStr = start.toISOString().slice(0, 19);

  const url = new URL(IMO_EVENTS);
  url.searchParams.set("start_time", startStr);
  url.searchParams.set("size_min", String(sizeMin));
  url.searchParams.set("size_max", "8");
  url.searchParams.set("depth_min", "0");
  url.searchParams.set("depth_max", "50");
  url.searchParams.set("format", "json");
  url.searchParams.set("system", "seiscomp");
  url.searchParams.set("polygon", ICELAND_POLYGON);

  try {
    const res = await fetch(url.toString(), { cache: "no-cache" });
    if (!res.ok) throw new Error(`IMO quakes ${res.status}`);
    const data = (await res.json()) as { features?: ImoFeature[] };
    return parseImoGeoJson(data.features ?? [], limit);
  } catch {
    return {
      type: "FeatureCollection",
      features: [],
      metadata: { generated: Date.now(), count: 0, title: "IMO (unavailable)" },
    };
  }
}

export function parseImoGeoJson(raw: ImoFeature[], limit = 800): EqCollection {
  const features: EqFeature[] = [];
  for (const f of raw) {
    const p = f.properties ?? {};
    if (p.type && p.type !== "earthquake") continue;
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    const mag = Number(p.magnitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) continue;
    const timeMs = p.time ? Date.parse(p.time) : NaN;
    const depth = Number(p.depth);
    const id = (p.event_id || "").trim();
    const place = (p.region || "Iceland").trim();
    const mode = p.evaluation_mode || "automatic";

    features.push({
      type: "Feature",
      id: id ? `imo:${id}` : `imo:${lat}_${lon}_${timeMs}`,
      properties: {
        mag,
        place: `${place}, Iceland`,
        time: Number.isFinite(timeMs) ? timeMs : null,
        url: "https://en.vedur.is/earthquakes-and-volcanism/earthquakes/",
        title: `M${mag.toFixed(1)} ${place} (IMO)`,
        type: "earthquake",
        status: mode === "manual" ? "reviewed" : "automatic",
        detail: "imo",
        net: "imo",
      },
      geometry: {
        type: "Point",
        coordinates: [lon, lat, Number.isFinite(depth) ? depth : 0],
      },
    });
  }

  features.sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));
  const capped = features.slice(0, limit);
  return {
    type: "FeatureCollection",
    features: capped,
    metadata: {
      generated: Date.now(),
      count: capped.length,
      title: "IMO Iceland",
    },
  };
}

export function isImoFeature(f: EqFeature): boolean {
  return (
    String(f.id || "").startsWith("imo:") ||
    f.properties.detail === "imo" ||
    f.properties.net === "imo"
  );
}

/**
 * Merge IMO densification into base catalog (USGS/EMSC/etc.).
 * Prefer keeping base event when duplicate; add unique Iceland hypocenters.
 */
export function mergeImoIntoCollection(
  base: EqCollection | null,
  imo: EqCollection | null,
  opts?: { maxAgeMs?: number },
): EqCollection {
  const baseFeats = [...(base?.features ?? [])];
  const imoFeats = imo?.features ?? [];
  if (!imoFeats.length) {
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

  for (const jf of imoFeats) {
    const jt = jf.properties.time;
    if (typeof jt === "number" && now - jt > maxAge) continue;

    let matched = false;
    for (const bf of enriched) {
      if (isImoFeature(bf)) continue;
      if (!samePhysicalFeature(bf, jf, PROFILE_COMPACT)) continue;
      bf.properties.imoEnriched = true;
      if (!bf.properties.detail || bf.properties.detail === "usgs") {
        bf.properties.detail = bf.properties.detail || "usgs+imo";
      }
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
      title: "USGS + multi-agency + IMO",
    },
  };
}
