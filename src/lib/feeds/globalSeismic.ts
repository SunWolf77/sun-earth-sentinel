/**
 * Global seismic activity layers — free USGS summary feeds.
 * Complements windowed local quakes with worldwide context.
 */

import type { EqCollection } from "@/lib/feeds/usgs";

const SIG_DAY =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson";
const M45_DAY =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";
const M25_DAY =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

export type GlobalSeismicBundle = {
  significant: EqCollection | null;
  m45: EqCollection | null;
  m25: EqCollection | null;
  fetchedAt: number;
};

async function fetchGeo(url: string): Promise<EqCollection | null> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    return (await res.json()) as EqCollection;
  } catch {
    return null;
  }
}

export async function fetchGlobalSeismic(): Promise<GlobalSeismicBundle> {
  const [significant, m45, m25] = await Promise.all([
    fetchGeo(SIG_DAY),
    fetchGeo(M45_DAY),
    fetchGeo(M25_DAY),
  ]);
  return { significant, m45, m25, fetchedAt: Date.now() };
}
