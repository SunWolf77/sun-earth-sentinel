/**
 * Phase A — Guatemala focus vents (Fuego, Pacaya, Santiaguito, Tacaná).
 *
 * No INSIVUMEH HTML scrape. Enrichment only from GVP weekly + recently erupting
 * already fetched for the world elevated layer. National authority remains
 * INSIVUMEH; we label honestly as GVP-cited regional coverage.
 *
 * Hard cap: table length (≤4 pins).
 */

import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
import { gvpProfileUrl } from "@/lib/feeds/gvpGlobal";

export type GuatemalaVolc = {
  id: string;
  name: string;
  vnum: string;
  lat: number;
  lon: number;
  elevationM: number;
  region: string;
  aliases: string[];
};

/** Fixed set — never grows into a regional catalog. */
export const GUATEMALA_VOLCANOES: GuatemalaVolc[] = [
  {
    id: "fuego",
    name: "Fuego",
    vnum: "342090",
    lat: 14.4748,
    lon: -90.8806,
    elevationM: 3763,
    region: "Guatemala",
    aliases: ["Volcán de Fuego", "Fuego Volcano", "Volcan de Fuego"],
  },
  {
    id: "pacaya",
    name: "Pacaya",
    vnum: "342110",
    lat: 14.381,
    lon: -90.601,
    elevationM: 2552,
    region: "Guatemala",
    aliases: ["Volcán de Pacaya", "Pacaya Volcano"],
  },
  {
    id: "santiaguito",
    name: "Santiaguito",
    vnum: "342030",
    lat: 14.756,
    lon: -91.552,
    elevationM: 3772,
    region: "Guatemala",
    aliases: ["Santa María", "Santa Maria", "Santiaguito Dome"],
  },
  {
    id: "tacana",
    name: "Tacaná",
    vnum: "341130",
    lat: 15.132,
    lon: -92.109,
    elevationM: 4060,
    region: "Mexico–Guatemala",
    aliases: ["Tacana", "Volcán Tacaná", "Volcan Tacana"],
  },
];

const INSIVUMEH_HOME = "https://insivumeh.gob.gt/";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameMatches(alertName: string, v: GuatemalaVolc): boolean {
  const a = norm(alertName);
  if (!a) return false;
  if (a.includes(norm(v.name)) || norm(v.name).includes(a)) return true;
  for (const al of v.aliases) {
    const n = norm(al);
    if (a.includes(n) || n.includes(a)) return true;
  }
  // Santa María often listed under that name for Santiaguito complex
  if (v.id === "santiaguito" && (a.includes("santa maria") || a.includes("santiago"))) {
    return true;
  }
  return false;
}

function degDist(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = lat1 - lat2;
  const dLon = (lon1 - lon2) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

function findMatch(
  v: GuatemalaVolc,
  pool: UsgsVolcanoAlert[],
): UsgsVolcanoAlert | null {
  // Prefer vnum
  if (v.vnum) {
    const byNum = pool.find((a) => a.vnum && String(a.vnum) === v.vnum);
    if (byNum) return byNum;
  }
  // Name + proximity
  let best: UsgsVolcanoAlert | null = null;
  let bestD = 0.35;
  for (const a of pool) {
    if (a.lat == null || a.lon == null) continue;
    if (!nameMatches(a.name, v)) continue;
    const d = degDist(v.lat, v.lon, a.lat, a.lon);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

/**
 * Pure enrichment: no network. Weekly first (better severity/links), then erupting.
 * Only returns vents with a GVP signal — no speculative ORANGE.
 */
export function buildGuatemalaFromGvp(
  weekly: UsgsVolcanoAlert[],
  erupting: UsgsVolcanoAlert[],
): UsgsVolcanoAlert[] {
  const out: UsgsVolcanoAlert[] = [];

  for (const v of GUATEMALA_VOLCANOES) {
    const fromWeekly = findMatch(v, weekly);
    const fromErupt = findMatch(v, erupting);
    const hit = fromWeekly || fromErupt;
    if (!hit) continue;

    const fromWeeklyHit = !!fromWeekly;
    // Severity already encoded on weekly (ORANGE new eruptive, YELLOW continuing)
    const colorCode = hit.colorCode;
    const alertLevel = hit.alertLevel;
    if ((colorCode || "").toUpperCase() === "GREEN") continue;

    const noticeUrl =
      hit.noticeUrl ||
      gvpProfileUrl(v.vnum) ||
      "https://volcano.si.edu/reports_weekly.cfm";

    out.push({
      id: `gt-${v.vnum}`,
      name: v.name,
      vnum: v.vnum,
      alertLevel,
      colorCode,
      obsAbbr: "GT",
      obsName: fromWeeklyHit
        ? "GVP weekly · Guatemala (INSIVUMEH authority)"
        : "GVP recent eruption · Guatemala (INSIVUMEH authority)",
      sentUtc: hit.sentUtc,
      sentUnix: hit.sentUnix,
      noticeUrl,
      noticeId: hit.noticeId,
      lat: v.lat,
      lon: v.lon,
      elevationM: v.elevationM,
      region: v.region,
      volcanoUrl: gvpProfileUrl(v.vnum) ?? hit.volcanoUrl,
      source: "gvp-gt",
      restless: true,
      // Keep agency site as secondary context in notice when weekly missing
      officialNative: fromWeeklyHit ? "weekly report" : "recently erupting",
    });

    // Attach INSIVUMEH home when no better bulletin link than GVP profile alone
    if (!fromWeeklyHit && out[out.length - 1]) {
      const last = out[out.length - 1]!;
      if (!last.noticeUrl || last.noticeUrl.includes("volcano.si.edu/volcano.cfm")) {
        // Prefer GVP profile for science; INSIVUMEH is authority homepage
        last.noticeUrl = gvpProfileUrl(v.vnum) ?? INSIVUMEH_HOME;
      }
    }
  }

  return out.slice(0, GUATEMALA_VOLCANOES.length);
}
