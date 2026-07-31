/**
 * USGS ShakeMap technology — notes + product helpers.
 * Manual: https://ghsc.code-pages.usgs.gov/esi/shakemap/
 */

import { pointInBounds, type LatLonBounds } from "@/lib/geo/bounds";

export const SHAKEMAP_NOTES = {
  title: "USGS ShakeMap technology",
  oneLiner:
    "Near-real-time maps of estimated ground shaking (not epicenter dots) after significant earthquakes — stations + GMPE fill-in + site amplification.",
  pipeline: [
    {
      step: "1. Observations",
      detail:
        "Instrumental peak motions (PGA, PGV, PSA) from seismic networks + optional DYFI macroseismic reports.",
    },
    {
      step: "2. GMPE backbone",
      detail:
        "Ground-motion prediction equations estimate shaking where stations are sparse.",
    },
    {
      step: "3. Site amplification",
      detail: "Vs30 (often topographic slope proxy) adjusts rock predictions.",
    },
    {
      step: "4. Bias & interpolate",
      detail: "Station residuals adjust the continuous intensity field.",
    },
    {
      step: "5. Intensity (MMI)",
      detail: "GMICE converts peak motions ↔ Modified Mercalli Intensity.",
    },
    {
      step: "6. Products",
      detail: "PNG/PDF, cont_mmi.json contours, coverage grids, rupture, uncertainty.",
    },
  ],
  intensityMeasures: [
    { code: "MMI", name: "Modified Mercalli Intensity", use: "Human/felt scale map (I–X+)" },
    { code: "PGA", name: "Peak ground acceleration", use: "Short-period structural demand" },
    { code: "PGV", name: "Peak ground velocity", use: "Damage proxy; mid-period" },
    { code: "PSA 0.3 / 1.0 / 3.0 s", name: "Pseudo-spectral acceleration", use: "Building-period sensitive" },
  ],
  access: {
    catalog: "ComCat producttype=shakemap",
    detail: "properties.products.shakemap[0].contents",
    usefulContents: [
      "download/cont_mmi.json — MMI contours (Leaflet overlay)",
      "download/intensity.jpg — intensity image",
      "download/info.json — metadata / bounds",
      "download/attenuation_curves.json",
      "download/rupture.json",
    ],
    eventPage: "https://earthquake.usgs.gov/earthquakes/eventpage/{eventid}/shakemap",
  },
  vsSentinel: {
    shakemap: "Spatial field of shaking intensity for one significant event",
    heat: "Magnitude × time-decay density of many hypocenters (swarm viz)",
    depth: "Hypocentral depth palette — source geometry, not site shaking",
  },
  stance:
    "WolfWatch does not recompute ShakeMaps. Focused Node mode may draw official USGS cont_mmi.json contours for a single preferred event. Authoritative product remains USGS.",
};

export function shakeMapEventUrl(eventId: string | undefined | null): string | null {
  if (!eventId) return null;
  return `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(String(eventId))}/shakemap`;
}

export function eventPageUrl(eventId: string | undefined | null): string | null {
  if (!eventId) return null;
  return `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(String(eventId))}`;
}

export function hasShakeMapProduct(types: string | null | undefined): boolean {
  if (!types) return false;
  return types.split(",").map((t) => t.trim()).includes("shakemap");
}

export function formatMmi(mmi: number | null | undefined): string {
  if (mmi == null || !Number.isFinite(mmi)) return "—";
  return mmi.toFixed(1);
}

export function mmiContourColor(value: number): string {
  if (value >= 9) return "#960000";
  if (value >= 8) return "#c80000";
  if (value >= 7) return "#ff0000";
  if (value >= 6) return "#ff6400";
  if (value >= 5) return "#ffba00";
  if (value >= 4) return "#ffff00";
  if (value >= 3) return "#c8ff64";
  if (value >= 2.5) return "#afd9ff";
  if (value >= 2) return "#7db7ff";
  return "#b0c4de";
}

export type MmiContourCollection = GeoJSON.FeatureCollection & {
  metadata?: Record<string, unknown>;
  bbox?: number[];
};

export type ShakeMapContourResult = {
  eventId: string;
  mag: number | null;
  place: string | null;
  mmi: number | null;
  time: number | null;
  contours: MmiContourCollection;
  shakeMapUrl: string;
  productUpdated: number | null;
};

type DetailJson = {
  id?: string;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number | null;
    mmi?: number | null;
    url?: string;
    products?: {
      shakemap?: Array<{
        updateTime?: number;
        contents?: Record<string, { url?: string; contentType?: string }>;
      }>;
    };
  };
};

export type EqLike = {
  id?: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number | null;
    mmi?: number | null;
    types?: string | null;
  };
  geometry: { coordinates: [number, number, number?] };
};

export async function fetchMmiContours(
  eventId: string,
  signal?: AbortSignal,
): Promise<ShakeMapContourResult | null> {
  const detailUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=${encodeURIComponent(eventId)}&format=geojson`;
  const res = await fetch(detailUrl, { cache: "no-cache", signal });
  if (!res.ok) throw new Error(`ComCat detail ${res.status}`);
  const detail = (await res.json()) as DetailJson;
  const sm = detail.properties?.products?.shakemap?.[0];
  if (!sm?.contents) return null;

  const cont =
    sm.contents["download/cont_mmi.json"] ||
    sm.contents["cont_mmi.json"] ||
    Object.entries(sm.contents).find(([k]) => /cont_mmi\.json$/i.test(k))?.[1];

  if (!cont?.url) return null;

  const cRes = await fetch(cont.url, { cache: "no-cache", signal });
  if (!cRes.ok) throw new Error(`cont_mmi ${cRes.status}`);
  const contours = (await cRes.json()) as MmiContourCollection;
  if (!contours?.features?.length) return null;

  const id = detail.id || eventId;
  return {
    eventId: id,
    mag: detail.properties?.mag ?? null,
    place: detail.properties?.place ?? null,
    mmi: detail.properties?.mmi ?? null,
    time: detail.properties?.time ?? null,
    contours,
    shakeMapUrl: shakeMapEventUrl(id)!,
    productUpdated: sm.updateTime ?? null,
  };
}

export async function fetchShakeMapCandidatesInBounds(
  bounds: LatLonBounds,
  opts: { minMag?: number; limit?: number; padDeg?: number; signal?: AbortSignal } = {},
): Promise<EqLike[]> {
  const { minMag = 4.5, limit = 8, padDeg = 1.5, signal } = opts;
  const [[latMin, lonMin], [latMax, lonMax]] = bounds;
  const minlatitude = latMin - padDeg;
  const maxlatitude = latMax + padDeg;

  const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
  url.searchParams.set("format", "geojson");
  url.searchParams.set("producttype", "shakemap");
  url.searchParams.set("orderby", "magnitude");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("minmagnitude", String(minMag));
  url.searchParams.set("minlatitude", String(minlatitude));
  url.searchParams.set("maxlatitude", String(maxlatitude));
  // Dateline wrap → query full lon, filter client-side
  if (lonMin > lonMax) {
    url.searchParams.set("minlongitude", "-180");
    url.searchParams.set("maxlongitude", "180");
  } else {
    url.searchParams.set("minlongitude", String(lonMin - padDeg));
    url.searchParams.set("maxlongitude", String(lonMax + padDeg));
  }
  const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  url.searchParams.set("starttime", start);

  const res = await fetch(url.toString(), { cache: "no-cache", signal });
  if (!res.ok) throw new Error(`ComCat shakemap catalog ${res.status}`);
  const data = (await res.json()) as { features?: EqLike[] };
  return (data.features ?? []).filter((f) => {
    const [lon, lat] = f.geometry.coordinates;
    return pointInBounds(lat, lon, bounds, padDeg);
  });
}

export function pickFocusShakeMapCandidate(
  features: EqLike[],
  bounds: LatLonBounds,
  minMag = 4.5,
  padDeg = 1.25,
): EqLike | null {
  const pool = features.filter((f) => {
    const mag = f.properties.mag ?? 0;
    if (mag < minMag || !f.id) return false;
    const [lon, lat] = f.geometry.coordinates;
    return pointInBounds(lat, lon, bounds, padDeg);
  });
  if (!pool.length) return null;

  const scored = [...pool].sort((a, b) => {
    const aSm =
      (hasShakeMapProduct(a.properties.types) ? 2 : 0) +
      (a.properties.mmi != null ? 1 : 0);
    const bSm =
      (hasShakeMapProduct(b.properties.types) ? 2 : 0) +
      (b.properties.mmi != null ? 1 : 0);
    if (bSm !== aSm) return bSm - aSm;
    const dMag = (b.properties.mag ?? 0) - (a.properties.mag ?? 0);
    if (Math.abs(dMag) > 0.05) return dMag;
    return (b.properties.time ?? 0) - (a.properties.time ?? 0);
  });

  return scored[0] ?? null;
}

export async function resolveFocusMmiEvent(
  feedFeatures: EqLike[],
  bounds: LatLonBounds,
  signal?: AbortSignal,
): Promise<EqLike | null> {
  const fromFeed = pickFocusShakeMapCandidate(feedFeatures, bounds, 4.5, 1.25);
  if (
    fromFeed &&
    (hasShakeMapProduct(fromFeed.properties.types) || fromFeed.properties.mmi != null)
  ) {
    return fromFeed;
  }

  try {
    const catalog = await fetchShakeMapCandidatesInBounds(bounds, {
      minMag: 4.5,
      limit: 10,
      padDeg: 1.5,
      signal,
    });
    if (catalog.length) return catalog[0] ?? null;
  } catch {
    /* fall through */
  }

  return fromFeed;
}
