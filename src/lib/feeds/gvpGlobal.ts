/**
 * Smithsonian Global Volcanism Program (GVP) — opt-in global volcano layer.
 * Source: GVP VOTW Holocene volcanoes WFS (public GeoServer).
 * Default filter: Last_Eruption_Year ≥ 2010 (~170 vents) so the layer stays light.
 * Profile links: https://volcano.si.edu/volcano.cfm?vn={VNUM}
 */

export type GvpVolcano = {
  id: string;
  vnum: string;
  name: string;
  lat: number;
  lon: number;
  country: string | null;
  region: string | null;
  elevationM: number | null;
  lastEruptionYear: number | null;
  gvpUrl: string;
};

const GVP_WFS =
  "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows" +
  "?service=WFS&version=1.0.0&request=GetFeature" +
  "&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes" +
  "&outputFormat=application/json" +
  "&CQL_FILTER=Last_Eruption_Year%3E%3D2010" +
  "&propertyName=Volcano_Number,Volcano_Name,Country,Region,Last_Eruption_Year,Elevation,Latitude,Longitude";

export function gvpProfileUrl(vnum: string | number | null | undefined): string | undefined {
  if (vnum == null || vnum === "") return undefined;
  return `https://volcano.si.edu/volcano.cfm?vn=${vnum}`;
}

export async function fetchGvpRecentVolcanoes(
  signal?: AbortSignal,
): Promise<GvpVolcano[]> {
  try {
    const res = await fetch(GVP_WFS, {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: number[] };
        properties?: Record<string, unknown>;
      }>;
    };
    const out: GvpVolcano[] = [];
    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      const vnumRaw = p.Volcano_Number;
      const vnum = vnumRaw != null ? String(vnumRaw) : "";
      let lat = Number(p.Latitude);
      let lon = Number(p.Longitude);
      const coords = f.geometry?.coordinates;
      if ((!Number.isFinite(lat) || !Number.isFinite(lon)) && coords && coords.length >= 2) {
        lon = Number(coords[0]);
        lat = Number(coords[1]);
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const name = String(p.Volcano_Name || "Volcano");
      const elev = Number(p.Elevation);
      const year = Number(p.Last_Eruption_Year);
      out.push({
        id: `gvp-${vnum || `${lat.toFixed(3)},${lon.toFixed(3)}`}`,
        vnum: vnum || `unknown-${out.length}`,
        name,
        lat,
        lon,
        country: p.Country != null ? String(p.Country) : null,
        region: p.Region != null ? String(p.Region) : null,
        elevationM: Number.isFinite(elev) ? elev : null,
        lastEruptionYear: Number.isFinite(year) ? year : null,
        gvpUrl: gvpProfileUrl(vnum) || "https://volcano.si.edu/",
      });
    }
    // Recent first
    out.sort(
      (a, b) => (b.lastEruptionYear ?? 0) - (a.lastEruptionYear ?? 0) || a.name.localeCompare(b.name),
    );
    return out;
  } catch {
    return [];
  }
}
