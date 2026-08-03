/**
 * Multi-source elevated volcano alerts — merge without overlapping pins.
 * Sources: USGS HANS · INGV/PC Italy · curated official watches (e.g. KVERT).
 */

import {
  fetchUsgsElevatedVolcanoes,
  type UsgsVolcanoAlert,
} from "@/lib/feeds/usgsVolcanoAlerts";
import { fetchIngvItalyElevated } from "@/lib/feeds/ingvVolcanoAlerts";
import { VOLCANO_WATCHES } from "@/lib/feeds/volcanoWatches";
import { fetchGvpInternationalAlerts } from "@/lib/feeds/gvpActivity";

export type VolcAlertSource = "usgs" | "ingv" | "kvert" | "gvp" | "official" | string;

/** Extended fields on alerts (optional on USGS raw). */
export type GlobalVolcAlert = UsgsVolcanoAlert & {
  source?: VolcAlertSource;
  /** Italian native level etc. */
  officialNative?: string;
  /** Attach to existing SES/app node id instead of usgs-volc-* */
  preferNodeId?: string;
  restless?: boolean;
};

function rankColor(c: string): number {
  switch ((c || "").toUpperCase()) {
    case "RED":
      return 4;
    case "ORANGE":
      return 3;
    case "YELLOW":
      return 2;
    case "GREEN":
      return 1;
    default:
      return 0;
  }
}

function rankSource(s?: string): number {
  // Local / national authority preferred over global summaries
  switch (s) {
    case "ingv":
      return 5;
    case "kvert":
      return 4;
    case "usgs":
      return 3;
    case "official":
      return 2;
    case "gvp":
      return 1; // weekly / VOTW fill — yield to USGS/INGV on same vent
    default:
      return 0;
  }
}

function degDist(a: GlobalVolcAlert, b: GlobalVolcAlert): number {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return 999;
  const dLat = a.lat - b.lat;
  const dLon = (a.lon - b.lon) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

function tagUsgs(list: UsgsVolcanoAlert[]): GlobalVolcAlert[] {
  return list.map((v) => ({ ...v, source: v.source || "usgs" }));
}

/** Curated watches that are still elevated (manual official note). */
function curatedElevated(): GlobalVolcAlert[] {
  const out: GlobalVolcAlert[] = [];
  for (const w of VOLCANO_WATCHES) {
    if (w.aviationCode === "green") continue;
    const color =
      w.aviationCode === "red"
        ? "RED"
        : w.aviationCode === "orange"
          ? "ORANGE"
          : w.aviationCode === "yellow"
            ? "YELLOW"
            : "GREEN";
    const alert =
      color === "RED" ? "WARNING" : color === "ORANGE" ? "WATCH" : color === "YELLOW" ? "ADVISORY" : "NORMAL";
    if (color === "GREEN") continue;
    out.push({
      id: `official-${w.id}`,
      name: w.name,
      vnum: null,
      alertLevel: alert,
      colorCode: color,
      obsAbbr: w.region.includes("Kamchatka") ? "KVERT" : "OPS",
      obsName: w.agencyUrl?.includes("kvert") ? "KVERT" : "Official watch",
      sentUtc: null,
      sentUnix: null,
      noticeUrl: w.agencyUrl || w.gvpUrl || null,
      noticeId: w.id,
      lat: w.center[0],
      lon: w.center[1],
      elevationM: w.elevationM ?? null,
      region: w.region,
      volcanoUrl: w.gvpUrl || w.monitorUrl || null,
      source: w.region.includes("Kamchatka") ? "kvert" : "official",
      preferNodeId: w.id,
      restless: true,
    });
  }
  return out;
}

/**
 * Spatial + identity de-dupe: keep highest severity, prefer local agency.
 * Within ~0.25° (~25 km) → single pin.
 */
export function dedupeVolcanoAlerts(alerts: GlobalVolcAlert[]): GlobalVolcAlert[] {
  const sorted = [...alerts].sort((a, b) => {
    const c = rankColor(b.colorCode) - rankColor(a.colorCode);
    if (c) return c;
    return rankSource(b.source) - rankSource(a.source);
  });

  const kept: GlobalVolcAlert[] = [];
  for (const a of sorted) {
    if (a.lat == null || a.lon == null) continue;
    const clash = kept.find((k) => {
      if ((a.vnum && k.vnum && a.vnum === k.vnum) || a.id === k.id) return true;
      if (
        a.preferNodeId &&
        k.preferNodeId &&
        a.preferNodeId === k.preferNodeId
      )
        return true;
      return degDist(a, k) < 0.25;
    });
    if (clash) {
      // Merge preferNodeId / higher source metadata onto winner already kept
      if (!clash.preferNodeId && a.preferNodeId) clash.preferNodeId = a.preferNodeId;
      if (rankSource(a.source) > rankSource(clash.source)) {
        clash.source = a.source;
        clash.obsAbbr = a.obsAbbr;
        clash.obsName = a.obsName;
        if (a.noticeUrl) clash.noticeUrl = a.noticeUrl;
        if (a.officialNative) clash.officialNative = a.officialNative;
      }
      continue;
    }
    kept.push({ ...a });
  }

  return kept.sort((a, b) => {
    const c = rankColor(b.colorCode) - rankColor(a.colorCode);
    if (c) return c;
    return a.name.localeCompare(b.name);
  });
}

/** Fetch all sources in parallel and merge (no overlapping pins). */
export async function fetchAllElevatedVolcanoes(): Promise<GlobalVolcAlert[]> {
  const [usgs, ingv, gvp, curated] = await Promise.all([
    fetchUsgsElevatedVolcanoes().catch(() => [] as UsgsVolcanoAlert[]),
    fetchIngvItalyElevated().catch(() => [] as UsgsVolcanoAlert[]),
    fetchGvpInternationalAlerts().catch(() => [] as UsgsVolcanoAlert[]),
    Promise.resolve(curatedElevated()),
  ]);

  // Prefer local agencies over GVP when same vent; hard cap keeps mobile light
  const merged = dedupeVolcanoAlerts([
    ...tagUsgs(usgs),
    ...tagUsgs(ingv),
    ...curated,
    ...tagUsgs(gvp),
  ]).slice(0, 100);

  return merged;
}

export function alertSourceLabel(v: GlobalVolcAlert): string {
  switch (v.source) {
    case "ingv":
      return v.officialNative
        ? `INGV/PC · ${v.officialNative}`
        : "INGV · Protezione Civile";
    case "kvert":
      return "KVERT";
    case "usgs":
      return `USGS HANS · ${v.obsAbbr || "USGS"}`;
    case "gvp":
      return v.obsName?.includes("Weekly")
        ? "GVP · Weekly activity"
        : v.obsName || "GVP · Recent eruption";
    case "official":
      return v.obsName || "Official";
    default:
      return v.obsName || v.obsAbbr || "Agency";
  }
}
