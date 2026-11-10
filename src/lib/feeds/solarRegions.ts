/**
 * NOAA SWPC solar region summary.
 * Hale class and disk position, so a beta-gamma-delta region can be
 * read against Earth without opening a magnetogram.
 * https://services.swpc.noaa.gov/json/solar_regions.json
 */

const URL = "https://services.swpc.noaa.gov/json/solar_regions.json";

export type HaleCode = "A" | "B" | "BG" | "BD" | "BGD" | "";

export type EarthPhase =
  | "off"
  | "east"
  | "entering"
  | "direct"
  | "leaving"
  | "departing";

export type ActiveRegion = {
  region: number;
  lat: number;
  lon: number;
  location: string;
  hale: HaleCode;
  haleLabel: string;
  spotClass: string | null;
  spots: number | null;
  area: number | null;
  cEvents: number;
  mEvents: number;
  xEvents: number;
  cProb: number;
  mProb: number;
  xProb: number;
  observed: string;
  /** Oldest → newest Hale codes, blanks dropped. */
  haleTrail: HaleCode[];
  growing: boolean;
  reachedDelta: boolean;
  phase: EarthPhase;
  phaseLabel: string;
  sentence: string;
};

type Raw = Record<string, unknown>;

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function haleOf(v: unknown): HaleCode {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "A" || s === "B" || s === "BG" || s === "BD" || s === "BGD") return s;
  return "";
}

export function haleRank(h: HaleCode | string | null | undefined): number {
  switch (String(h ?? "").toUpperCase()) {
    case "BGD":
      return 5;
    case "BD":
      return 4;
    case "BG":
      return 3;
    case "B":
      return 2;
    case "A":
      return 1;
    default:
      return 0;
  }
}

export function haleLabel(h: HaleCode): string {
  switch (h) {
    case "BGD":
      return "beta-gamma-delta";
    case "BD":
      return "beta-delta";
    case "BG":
      return "beta-gamma";
    case "B":
      return "beta";
    case "A":
      return "alpha";
    default:
      return "unclassified";
  }
}

/** SWPC longitude: positive is east, negative is west. 0 faces Earth. */
export function earthPhase(lon: number): { phase: EarthPhase; label: string; clause: string } {
  if (lon > 90 || lon < -90) {
    return { phase: "off", label: "Off the Earth disk", clause: "off the Earth-facing disk" };
  }
  if (lon > 45) {
    return { phase: "east", label: "East of Earth", clause: "east of Earth, rotating in" };
  }
  if (lon > 15) {
    return { phase: "entering", label: "Entering Earth-direct", clause: "entering the Earth-direct phase" };
  }
  if (lon >= -15) {
    return { phase: "direct", label: "Earth-direct", clause: "in the Earth-direct phase" };
  }
  if (lon >= -45) {
    return { phase: "leaving", label: "Leaving Earth-direct", clause: "leaving the Earth-direct phase" };
  }
  return { phase: "departing", label: "West of Earth", clause: "west of Earth, rotating off" };
}

function sentence(region: number, hale: HaleCode, clause: string, location: string): string {
  const klass = hale ? haleLabel(hale) : "unclassified";
  return `AR${region} is ${klass} and ${clause} (${location}).`;
}

export function parseSolarRegions(raw: unknown): ActiveRegion[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.filter((r): r is Raw => !!r && typeof r === "object");
  const dates = rows
    .map((r) => String(r.observed_date ?? ""))
    .filter(Boolean)
    .sort();
  const latest = dates[dates.length - 1];
  if (!latest) return [];

  const history = new Map<number, Raw[]>();
  for (const r of rows) {
    const id = num(r.region);
    if (id == null) continue;
    const list = history.get(id) ?? [];
    list.push(r);
    history.set(id, list);
  }

  const today = rows.filter((r) => String(r.observed_date ?? "") === latest);
  const out: ActiveRegion[] = [];
  for (const r of today) {
    const id = num(r.region);
    const lat = num(r.latitude);
    const lon = num(r.longitude);
    if (id == null || lat == null || lon == null) continue;
    const hist = (history.get(id) ?? [])
      .slice()
      .sort((a, b) => String(a.observed_date).localeCompare(String(b.observed_date)));
    const haleTrail = hist.map((h) => haleOf(h.mag_class)).filter((h) => h !== "");
    const hale = haleOf(r.mag_class) || haleTrail[haleTrail.length - 1] || "";
    const prev = haleTrail.length >= 2 ? haleTrail[haleTrail.length - 2]! : "";
    const phase = earthPhase(lon);
    const location = String(r.location ?? "").trim() || `${lat}°, ${lon}°`;
    out.push({
      region: id,
      lat,
      lon,
      location,
      hale,
      haleLabel: haleLabel(hale),
      spotClass: r.spot_class ? String(r.spot_class) : null,
      spots: num(r.number_spots),
      area: num(r.area),
      cEvents: num(r.c_xray_events) ?? 0,
      mEvents: num(r.m_xray_events) ?? 0,
      xEvents: num(r.x_xray_events) ?? 0,
      cProb: num(r.c_flare_probability) ?? 0,
      mProb: num(r.m_flare_probability) ?? 0,
      xProb: num(r.x_flare_probability) ?? 0,
      observed: latest,
      haleTrail,
      growing: haleRank(hale) > haleRank(prev),
      reachedDelta: haleRank(hale) >= 4 && haleRank(prev) < 4,
      phase: phase.phase,
      phaseLabel: phase.label,
      sentence: sentence(id, hale, phase.clause, location),
    });
  }

  return out.sort((a, b) => interest(b) - interest(a));
}

export function interest(r: ActiveRegion): number {
  const earth =
    r.phase === "direct" ? 4 : r.phase === "entering" || r.phase === "leaving" ? 3 : r.phase === "east" ? 1 : 0;
  return haleRank(r.hale) * 10 + earth + (r.growing ? 2 : 0);
}

export async function fetchSolarRegions(): Promise<ActiveRegion[]> {
  const res = await fetch(URL, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  return parseSolarRegions(await res.json());
}
