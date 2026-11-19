/**
 * NOAA SWPC solar region summary.
 * Hale class and disk position, so a beta-gamma-delta region can be
 * read against Earth without opening a magnetogram.
 * https://services.swpc.noaa.gov/json/solar_regions.json
 */

const URL = "https://services.swpc.noaa.gov/json/solar_regions.json";
const EVENTS = "https://services.swpc.noaa.gov/json/edited_events.json";

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
  /** Sum of NOAA's daily counts for this number. A new number starts again. */
  cLife: number;
  mLife: number;
  xLife: number;
  /** Strongest recent X-ray flare NOAA has assigned to this number. */
  lastFlare: { klass: string; at: string } | null;
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
    const cLife = hist.reduce((n, h) => n + (num(h.c_xray_events) ?? 0), 0);
    const mLife = hist.reduce((n, h) => n + (num(h.m_xray_events) ?? 0), 0);
    const xLife = hist.reduce((n, h) => n + (num(h.x_xray_events) ?? 0), 0);
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
      cLife,
      mLife,
      xLife,
      lastFlare: null,
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

export type XraFlare = {
  klass: string;
  at: string;
  region: number | null;
};

function klassRank(klass: string): number {
  const m = klass.match(/^([CMX])(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const letter = { C: 1, M: 2, X: 3 }[m[1] as "C" | "M" | "X"] ?? 0;
  return letter * 100 + Number(m[2]);
}

/** Assigned X-ray flares from SWPC edited events. Same minute from two GOES birds is one flare. */
export function listXraFlares(raw: unknown): XraFlare[] {
  if (!Array.isArray(raw)) return [];
  const byMin = new Map<number, XraFlare>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const e = row as Record<string, unknown>;
    if (e.type !== "XRA") continue;
    const klass = String(e.particulars1 ?? "")
      .trim()
      .toUpperCase()
      .split(/[/\s]/)[0];
    if (!klass || !/^[CMX]\d/.test(klass)) continue;
    const at = String(e.max_datetime ?? e.begin_datetime ?? "");
    const t = Date.parse(at);
    if (!Number.isFinite(t)) continue;
    const region = num(e.region);
    const named = region != null && region > 0 ? region : null;
    const prev = byMin.get(Math.floor(t / 60_000));
    if (!prev) {
      byMin.set(Math.floor(t / 60_000), { klass, at, region: named });
      continue;
    }
    const better = klassRank(klass) > klassRank(prev.klass);
    byMin.set(Math.floor(t / 60_000), {
      klass: better ? klass : prev.klass,
      at: better ? at : prev.at,
      region: prev.region ?? named,
    });
  }
  return [...byMin.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function tallyAssignedFlares(raw: unknown): Map<number, { c: number; m: number; x: number; lastFlare: { klass: string; at: string } | null }> {
  const out = new Map<number, { c: number; m: number; x: number; lastFlare: { klass: string; at: string } | null }>();
  if (!Array.isArray(raw)) return out;
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const e = row as Record<string, unknown>;
    if (e.type !== "XRA") continue;
    const region = num(e.region);
    if (region == null || region <= 0) continue;
    const klass = String(e.particulars1 ?? "").trim().toUpperCase();
    const letter = klass[0];
    if (letter !== "C" && letter !== "M" && letter !== "X") continue;
    const at = String(e.max_datetime ?? e.begin_datetime ?? "");
    const key = `${region}|${at.slice(0, 16)}|${klass}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const bucket = out.get(region) ?? { c: 0, m: 0, x: 0, lastFlare: null };
    if (letter === "C") bucket.c += 1;
    else if (letter === "M") bucket.m += 1;
    else bucket.x += 1;
    if (!bucket.lastFlare || at > bucket.lastFlare.at) bucket.lastFlare = { klass, at };
    out.set(region, bucket);
  }
  return out;
}

export async function fetchSolarRegionPack(): Promise<{ regions: ActiveRegion[]; xra: XraFlare[] }> {
  const [regRes, evRes] = await Promise.all([
    fetch(URL, { headers: { Accept: "application/json" } }),
    fetch(EVENTS, { headers: { Accept: "application/json" } }).catch(() => null),
  ]);
  if (!regRes.ok) return { regions: [], xra: [] };
  let regions = parseSolarRegions(await regRes.json());
  if (!evRes?.ok) return { regions, xra: [] };
  const raw = await evRes.json();
  const tally = tallyAssignedFlares(raw);
  regions = regions.map((r) => {
    const hit = tally.get(r.region);
    if (!hit) return r;
    return { ...r, cLife: hit.c, mLife: hit.m, xLife: hit.x, lastFlare: hit.lastFlare };
  });
  return { regions, xra: listXraFlares(raw) };
}

export async function fetchSolarRegions(): Promise<ActiveRegion[]> {
  return (await fetchSolarRegionPack()).regions;
}
