/**
 * Smithsonian GVP — lean international volcano activity (not full Holocene).
 *
 * 1) Weekly Volcanic Activity Report RSS (~15–40 vents) with georss
 * 2) VOTW Holocene filter Last_Eruption_Year ≥ (year−1) for currently erupting
 *    vents missing from the weekly letter (e.g. Fuego between report weeks)
 *
 * Cap + de-dupe keep the map light on mobile.
 */

import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
import { gvpProfileUrl } from "@/lib/feeds/gvpGlobal";

const WEEKLY_RSS = "https://volcano.si.edu/news/WeeklyVolcanoRSS.xml";

const VOTW_ERUPTING = (minYear: number) =>
  "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows" +
  "?service=WFS&version=1.0.0&request=GetFeature" +
  "&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes" +
  "&outputFormat=application/json" +
  `&CQL_FILTER=Last_Eruption_Year%3E%3D${minYear}` +
  "&propertyName=Volcano_Number,Volcano_Name,Country,Region,Last_Eruption_Year,Elevation,Latitude,Longitude";

/** Hard cap after parse — world coverage without Holocene clutter */
export const GVP_ACTIVITY_CAP = 80;

export type GvpActivityKind =
  | "new_eruptive"
  | "new_unrest"
  | "continuing"
  | "erupting";

function stripHtml(s: string): string {
  return s
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTitle(title: string): {
  name: string;
  country: string | null;
  kind: GvpActivityKind;
} {
  // "Fuego (Guatemala) - Report for 16 July-22 July 2026 - Continuing Eruptive Activity"
  const t = stripHtml(title);
  let kind: GvpActivityKind = "continuing";
  if (/New\s+Eruptive/i.test(t)) kind = "new_eruptive";
  else if (/New\s+Unrest/i.test(t)) kind = "new_unrest";
  else if (/Continuing/i.test(t)) kind = "continuing";

  const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*-/);
  if (m) {
    return { name: m[1]!.trim(), country: m[2]!.trim(), kind };
  }
  const bare = t.split(" - ")[0]?.trim() || t;
  return { name: bare, country: null, kind };
}

function colorForKind(kind: GvpActivityKind): {
  colorCode: UsgsVolcanoAlert["colorCode"];
  alertLevel: UsgsVolcanoAlert["alertLevel"];
} {
  switch (kind) {
    case "new_eruptive":
      return { colorCode: "UNASSIGNED", alertLevel: "WEEKLY" };
    case "new_unrest":
      return { colorCode: "UNASSIGNED", alertLevel: "WEEKLY" };
    case "continuing":
      return { colorCode: "UNASSIGNED", alertLevel: "WEEKLY" };
    case "erupting":
    default:
      return { colorCode: "UNASSIGNED", alertLevel: "CATALOG" };
  }
}

/** Weekly report — highest-value international activity summary. */
export async function fetchGvpWeeklyAlerts(
  signal?: AbortSignal,
): Promise<UsgsVolcanoAlert[]> {
  try {
    const res = await fetch(WEEKLY_RSS, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal,
    });
    if (!res.ok) return [];
    const text = await res.text();
    const items = text.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
    const out: UsgsVolcanoAlert[] = [];

    for (const item of items) {
      const titleM = item.match(/<title>([\s\S]*?)<\/title>/i);
      const linkM = item.match(/<link>([\s\S]*?)<\/link>/i);
      const geoM =
        item.match(/georss:point>\s*([-\d.]+)\s+([-\d.]+)/i) ||
        item.match(/<geo:lat>([-\d.]+)<\/geo:lat>[\s\S]*?<geo:long>([-\d.]+)<\/geo:long>/i);
      if (!titleM || !geoM) continue;
      const title = stripHtml(titleM[1] ?? "");
      const { name, country, kind } = parseTitle(title);
      const lat = Number(geoM[1]);
      const lon = Number(geoM[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const { colorCode, alertLevel } = colorForKind(kind);
      const link = linkM ? stripHtml(linkM[1] ?? "").trim() : null;
      // VNUM from report links when present
      const vnM = (link || title).match(/vn=(\d+)/i) || item.match(/vn=(\d+)/i);
      const vnum = vnM ? vnM[1]! : null;

      out.push({
        id: `gvp-weekly-${vnum || `${lat.toFixed(3)},${lon.toFixed(3)}`}`,
        name,
        vnum,
        alertLevel,
        colorCode,
        obsAbbr: "GVP",
        obsName: "Smithsonian / USGS Weekly Volcanic Activity Report",
        sentUtc: null,
        sentUnix: null,
        noticeUrl: link || "https://volcano.si.edu/reports_weekly.cfm",
        noticeId: null,
        lat,
        lon,
        elevationM: null,
        region: country,
        volcanoUrl: vnum ? gvpProfileUrl(vnum) ?? null : "https://volcano.si.edu/",
        source: "gvp",
      });
    }
    return out.slice(0, GVP_ACTIVITY_CAP);
  } catch {
    return [];
  }
}

/**
 * Currently erupting / very recent (Last_Eruption_Year ≥ minYear).
 * Fills gaps between weekly reports (Fuego, etc.). Lower priority than weekly.
 */
export async function fetchGvpRecentlyEruptingAlerts(
  signal?: AbortSignal,
  minYear = new Date().getUTCFullYear() - 1,
): Promise<UsgsVolcanoAlert[]> {
  try {
    const res = await fetch(VOTW_ERUPTING(minYear), {
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
    const out: UsgsVolcanoAlert[] = [];
    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      const vnumRaw = p.Volcano_Number;
      const vnum = vnumRaw != null ? String(vnumRaw) : null;
      let lat = Number(p.Latitude);
      let lon = Number(p.Longitude);
      const coords = f.geometry?.coordinates;
      if ((!Number.isFinite(lat) || !Number.isFinite(lon)) && coords && coords.length >= 2) {
        lon = Number(coords[0]);
        lat = Number(coords[1]);
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const name = String(p.Volcano_Name || "Volcano");
      const year = Number(p.Last_Eruption_Year);
      const elev = Number(p.Elevation);
      const country = p.Country != null ? String(p.Country) : null;
      const { colorCode, alertLevel } = colorForKind("erupting");
      // Prefer current-year eruptions in sort later
      out.push({
        id: `gvp-erupt-${vnum || `${lat.toFixed(3)},${lon.toFixed(3)}`}`,
        name,
        vnum,
        alertLevel,
        colorCode,
        obsAbbr: "GVP",
        obsName: `GVP · last eruption ${Number.isFinite(year) ? year : "recent"}`,
        sentUtc: null,
        sentUnix: Number.isFinite(year) ? year : null,
        noticeUrl: vnum ? gvpProfileUrl(vnum) ?? null : null,
        noticeId: null,
        lat,
        lon,
        elevationM: Number.isFinite(elev) ? elev : null,
        region: country,
        volcanoUrl: vnum ? gvpProfileUrl(vnum) ?? null : null,
        source: "gvp",
      });
    }
    // Current year first
    out.sort((a, b) => (b.sentUnix ?? 0) - (a.sentUnix ?? 0) || a.name.localeCompare(b.name));
    return out.slice(0, GVP_ACTIVITY_CAP);
  } catch {
    return [];
  }
}

/** One network pair — shared by world GVP + Guatemala Phase A. */
export async function fetchGvpWeeklyAndErupting(signal?: AbortSignal): Promise<{
  weekly: UsgsVolcanoAlert[];
  erupting: UsgsVolcanoAlert[];
}> {
  const [weekly, erupting] = await Promise.all([
    fetchGvpWeeklyAlerts(signal),
    fetchGvpRecentlyEruptingAlerts(signal),
  ]);
  return { weekly, erupting };
}

/** Parallel weekly + recently erupting; caller de-dupes with USGS/INGV. */
export async function fetchGvpInternationalAlerts(
  signal?: AbortSignal,
): Promise<UsgsVolcanoAlert[]> {
  const { weekly, erupting } = await fetchGvpWeeklyAndErupting(signal);
  // Weekly first so de-dupe keeps report links when same vent
  return [...weekly, ...erupting];
}
