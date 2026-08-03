/**
 * Near-Earth objects — NASA NeoWs (DEMO_KEY for free tier).
 * Solar tab list + optional map pins for close approaches.
 */

export type NeoItem = {
  id: string;
  name: string;
  neoUrl: string | null;
  hazardous: boolean;
  missKm: number | null;
  velocityKms: number | null;
  diameterM: number | null;
  approachDate: string | null;
  absoluteMagnitude: number | null;
};

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function fetchNeoToday(apiKey = "DEMO_KEY"): Promise<NeoItem[]> {
  try {
    const url = `https://api.nasa.gov/neo/rest/v1/feed/today?detailed=false&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      near_earth_objects?: Record<string, Record<string, unknown>[]>;
    };
    const days = j.near_earth_objects || {};
    const out: NeoItem[] = [];
    for (const list of Object.values(days)) {
      if (!Array.isArray(list)) continue;
      for (const n of list) {
        const approach = Array.isArray(n.close_approach_data)
          ? (n.close_approach_data[0] as Record<string, unknown> | undefined)
          : undefined;
        const rel = approach?.relative_velocity as Record<string, unknown> | undefined;
        const miss = approach?.miss_distance as Record<string, unknown> | undefined;
        const diam = n.estimated_diameter as
          | { meters?: { estimated_diameter_min?: number; estimated_diameter_max?: number } }
          | undefined;
        const dMin = diam?.meters?.estimated_diameter_min;
        const dMax = diam?.meters?.estimated_diameter_max;
        const diameterM =
          dMin != null && dMax != null ? (Number(dMin) + Number(dMax)) / 2 : null;
        out.push({
          id: String(n.id || n.neo_reference_id || n.name || Math.random()),
          name: String(n.name || "NEO"),
          neoUrl: n.nasa_jpl_url ? String(n.nasa_jpl_url) : null,
          hazardous: Boolean(n.is_potentially_hazardous_asteroid),
          missKm: miss?.kilometers != null ? num(miss.kilometers) : null,
          velocityKms: rel?.kilometers_per_second != null ? num(rel.kilometers_per_second) : null,
          diameterM: diameterM != null && Number.isFinite(diameterM) ? diameterM : null,
          approachDate: approach?.close_approach_date_full
            ? String(approach.close_approach_date_full)
            : approach?.close_approach_date
              ? String(approach.close_approach_date)
              : null,
          absoluteMagnitude: num(n.absolute_magnitude_h),
        });
      }
    }
    // Closest first
    out.sort((a, b) => (a.missKm ?? 1e15) - (b.missKm ?? 1e15));
    return out;
  } catch {
    return [];
  }
}
