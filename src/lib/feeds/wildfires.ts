/**
 * Active wildfire events via NASA EONET (no API key, CORS-open).
 * Opt-in map layer — not a fire-weather forecast product.
 */

export type WildfireEvent = {
  id: string;
  title: string;
  lat: number;
  lon: number;
  date: string | null;
  link: string | null;
  sources: string[];
};

type EonetGeometry = {
  type?: string;
  coordinates?: number[] | number[][];
  date?: string;
};

type EonetEvent = {
  id?: string;
  title?: string;
  link?: string;
  geometry?: EonetGeometry[];
  sources?: { id?: string; url?: string }[];
};

function coordsOf(g: EonetGeometry | undefined): { lat: number; lon: number } | null {
  if (!g?.coordinates) return null;
  const c = g.coordinates;
  // Point: [lon, lat]
  if (typeof c[0] === "number" && typeof c[1] === "number") {
    const lon = c[0] as number;
    const lat = c[1] as number;
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  }
  // Multi / line — take first point
  if (Array.isArray(c[0])) {
    const first = c[0] as number[];
    if (typeof first[0] === "number" && typeof first[1] === "number") {
      return { lat: first[1], lon: first[0] };
    }
  }
  return null;
}

export async function fetchOpenWildfires(limit = 80): Promise<WildfireEvent[]> {
  try {
    const url = `https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const j = (await res.json()) as { events?: EonetEvent[] };
    const events = Array.isArray(j.events) ? j.events : [];
    const out: WildfireEvent[] = [];
    for (const e of events) {
      const geos = Array.isArray(e.geometry) ? e.geometry : [];
      const last = geos[geos.length - 1];
      const pt = coordsOf(last) ?? coordsOf(geos[0]);
      if (!pt) continue;
      out.push({
        id: String(e.id || `${pt.lat},${pt.lon}`),
        title: String(e.title || "Wildfire"),
        lat: pt.lat,
        lon: pt.lon,
        date: last?.date ? String(last.date) : null,
        link: e.link ? String(e.link) : null,
        sources: (e.sources || []).map((s) => s.id || s.url || "").filter(Boolean),
      });
    }
    return out;
  } catch {
    return [];
  }
}
