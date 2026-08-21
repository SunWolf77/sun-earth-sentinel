/**
 * USGS Volcano Hazards Program — HANS public API
 * https://volcanoes.usgs.gov/hans-public/
 *
 * Elevated volcanoes = alert level above NORMAL and/or aviation color above GREEN.
 * Dynamic watchlist: present while elevated; drop when feed returns to baseline (green).
 */

import type { DragonNode } from "@/lib/feeds/usgs";

export type UsgsAlertLevel =
  | "NORMAL"
  | "ADVISORY"
  | "WATCH"
  | "WARNING"
  | string;

export type UsgsColorCode =
  | "GREEN"
  | "YELLOW"
  | "ORANGE"
  | "RED"
  | "UNASSIGNED"
  | string;

export type UsgsVolcanoAlert = {
  id: string;
  name: string;
  vnum: string | null;
  alertLevel: UsgsAlertLevel;
  colorCode: UsgsColorCode;
  obsAbbr: string;
  obsName: string;
  sentUtc: string | null;
  sentUnix: number | null;
  noticeUrl: string | null;
  noticeId: string | null;
  lat: number | null;
  lon: number | null;
  elevationM: number | null;
  region: string | null;
  volcanoUrl: string | null;
  /** Multi-source: usgs | ingv | kvert | official */
  source?: string;
  /** Native agency level (e.g. GIALLO) */
  officialNative?: string;
  /** Reuse SES/app node id — avoids second map pin */
  preferNodeId?: string;
  restless?: boolean;
};

export type VolcWatchTransition = {
  id: string;
  name: string;
  kind: "elevated" | "baseline";
  colorCode: string;
  alertLevel: string;
  at: number;
};

const HANS = "https://volcanoes.usgs.gov/hans-public/api";

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

function rankAlert(a: string): number {
  switch ((a || "").toUpperCase()) {
    case "WARNING":
      return 4;
    case "WATCH":
      return 3;
    case "ADVISORY":
      return 2;
    case "NORMAL":
      return 1;
    default:
      return 0;
  }
}

export function colorCodeHex(c: string): string {
  switch ((c || "").toUpperCase()) {
    case "RED":
      return "#f43f5e";
    case "ORANGE":
      return "#fb923c";
    case "YELLOW":
      return "#fbbf24";
    case "GREEN":
      return "#34d399";
    default:
      return "#94a3b8";
  }
}

export function colorToAviation(
  c: string,
): "green" | "yellow" | "orange" | "red" {
  switch ((c || "").toUpperCase()) {
    case "RED":
      return "red";
    case "ORANGE":
      return "orange";
    case "YELLOW":
      return "yellow";
    default:
      return "green";
  }
}

/** ~deg half-box around vent for node focus filter / fly zoom context */
function boundsAround(lat: number, lon: number, halfDeg = 0.75): [[number, number], [number, number]] {
  return [
    [lat - halfDeg, lon - halfDeg],
    [lat + halfDeg, lon + halfDeg],
  ];
}

/** Map elevated HANS alert → DragonNode watch (only while elevated). */
export function alertToWatchNode(v: UsgsVolcanoAlert): DragonNode | null {
  if (v.lat == null || v.lon == null) return null;
  const av = colorToAviation(v.colorCode);
  if (av === "green" && rankAlert(v.alertLevel) <= 1) return null;
  const id = v.preferNodeId || `usgs-volc-${v.vnum || v.id}`;
  const src =
    v.source === "ingv"
      ? "INGV/PC"
      : v.source === "kvert"
        ? "KVERT"
        : v.source === "official"
          ? "Official"
          : "USGS HANS";
  const native = v.officialNative ? ` · ${v.officialNative}` : "";
  return {
    id,
    name: v.name,
    role: `${src} ${v.alertLevel} · ${v.colorCode}${native}`,
    kind: "volcano",
    bounds: boundsAround(v.lat, v.lon, v.preferNodeId ? 0.2 : 0.75),
    center: [v.lat, v.lon],
    aviationCode: av,
    monitorUrl: v.volcanoUrl || v.noticeUrl || undefined,
    agencyUrl: v.noticeUrl || undefined,
    gvpUrl: v.vnum
      ? `https://volcano.si.edu/volcano.cfm?vn=${v.vnum}`
      : undefined,
    watchPriority: true,
    publishedFocus: !!v.preferNodeId,
    focusNote: `Live ${src} alert (${v.alertLevel} / ${v.colorCode}${native}). ${
      v.region || ""
    } · ${v.obsName}. Updates with official feeds. Not a forecast.`,
    aliases: v.vnum ? [v.vnum, v.id] : [v.id],
  };
}

export function alertsToWatchNodes(alerts: UsgsVolcanoAlert[]): DragonNode[] {
  const out: DragonNode[] = [];
  for (const a of alerts) {
    const n = alertToWatchNode(a);
    if (n) out.push(n);
  }
  return out;
}

/** Diff previous elevated ids vs next — smart watchlist transitions. */
export function diffVolcWatch(
  prev: UsgsVolcanoAlert[],
  next: UsgsVolcanoAlert[],
): VolcWatchTransition[] {
  const prevMap = new Map(prev.map((v) => [v.vnum || v.id, v]));
  const nextMap = new Map(next.map((v) => [v.vnum || v.id, v]));
  const now = Date.now();
  const transitions: VolcWatchTransition[] = [];

  for (const [id, v] of nextMap) {
    if (!prevMap.has(id)) {
      transitions.push({
        id: `usgs-volc-${id}`,
        name: v.name,
        kind: "elevated",
        colorCode: v.colorCode,
        alertLevel: v.alertLevel,
        at: now,
      });
    } else {
      const p = prevMap.get(id)!;
      // level/color upgrade
      if (
        rankColor(v.colorCode) > rankColor(p.colorCode) ||
        rankAlert(v.alertLevel) > rankAlert(p.alertLevel)
      ) {
        transitions.push({
          id: `usgs-volc-${id}`,
          name: v.name,
          kind: "elevated",
          colorCode: v.colorCode,
          alertLevel: v.alertLevel,
          at: now,
        });
      }
    }
  }
  for (const [id, v] of prevMap) {
    if (!nextMap.has(id)) {
      transitions.push({
        id: `usgs-volc-${id}`,
        name: v.name,
        kind: "baseline",
        colorCode: "GREEN",
        alertLevel: "NORMAL",
        at: now,
      });
    }
  }
  return transitions;
}

function shortObs(full: string, abbr?: string | null): string {
  if (abbr && abbr.length <= 6) return abbr.toUpperCase();
  const f = full.toLowerCase();
  if (f.includes("alaska")) return "AVO";
  if (f.includes("hawaiian") || f.includes("hawaii")) return "HVO";
  if (f.includes("mariana")) return "NMI";
  if (f.includes("cascade")) return "CVO";
  if (f.includes("yellowstone")) return "YVO";
  if (f.includes("california")) return "CalVO";
  return full.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "USGS";
}

function pick(r: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (r[k] != null && r[k] !== "") return r[k];
  }
  return undefined;
}

function str(r: Record<string, unknown>, ...keys: string[]): string | null {
  const v = pick(r, ...keys);
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function num(r: Record<string, unknown>, ...keys: string[]): number | null {
  const v = pick(r, ...keys);
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Map HANS getElevatedVolcanoes row — camelCase (live) and snake_case (older dumps). */
export function parseHansElevatedRow(
  r: Record<string, unknown>,
  i = 0,
): UsgsVolcanoAlert {
  const vnum = str(r, "vnum", "volcano_number");
  const name = str(r, "volcano_name", "volcanoName", "name") || "Volcano";
  const observatory = str(r, "obs_fullname", "obsFullname", "observatory") || "USGS";
  const abbrRaw = str(r, "obs_abbr", "obsAbbr");
  const abbr = shortObs(observatory, abbrRaw);
  return {
    id: vnum || str(r, "notice_identifier", "noticeId") || name || `volc-${i}`,
    name,
    vnum,
    alertLevel: (str(r, "alert_level", "alertLevel") || "ADVISORY") as UsgsAlertLevel,
    colorCode: (str(r, "color_code", "colorCode") || "YELLOW") as UsgsColorCode,
    obsAbbr: abbr,
    obsName: observatory,
    sentUtc: str(r, "sent_utc", "sent_time", "sentTime"),
    sentUnix: num(r, "sent_unixtime", "sentUnixtime"),
    noticeUrl: str(r, "notice_url", "noticeUrl"),
    noticeId: str(r, "notice_identifier", "noticeId"),
    lat: num(r, "latitude", "lat"),
    lon: num(r, "longitude", "lon"),
    elevationM: num(r, "elevation_meters", "elevationMeters"),
    region: str(r, "region"),
    volcanoUrl: str(r, "volcano_url", "volcanoUrl"),
    source: "usgs",
  };
}

export function parseHansVolcanoDetail(
  v: UsgsVolcanoAlert,
  d: Record<string, unknown>,
): UsgsVolcanoAlert {
  const lat = num(d, "latitude", "lat");
  const lon = num(d, "longitude", "lon");
  const elev = num(d, "elevation_meters", "elevationMeters");
  const name = str(d, "volcano_name", "volcanoName", "name");
  const region = str(d, "region");
  const url = str(d, "volcano_url", "volcanoUrl");
  const obsName = str(d, "obs_fullname", "obsFullname", "observatory");
  const obsAbbr = str(d, "obs_abbr", "obsAbbr");
  return {
    ...v,
    lat: lat ?? v.lat,
    lon: lon ?? v.lon,
    elevationM: elev ?? v.elevationM,
    region: region ?? v.region,
    volcanoUrl: url ?? v.volcanoUrl,
    name: name ?? v.name,
    obsName: obsName ?? v.obsName,
    obsAbbr: obsAbbr ? obsAbbr.toUpperCase() : v.obsAbbr,
  };
}

export async function fetchUsgsElevatedVolcanoes(): Promise<UsgsVolcanoAlert[]> {
  try {
    const res = await fetch(`${HANS}/volcano/getElevatedVolcanoes`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(raw)) return [];

    const base: UsgsVolcanoAlert[] = raw.map((r, i) => parseHansElevatedRow(r, i));

    const enriched = await Promise.all(
      base.map(async (v) => {
        if (!v.vnum) return v;
        try {
          const r = await fetch(`${HANS}/volcano/getVolcano/${v.vnum}`, {
            headers: { Accept: "application/json" },
          });
          if (!r.ok) return v;
          const d = (await r.json()) as Record<string, unknown>;
          return parseHansVolcanoDetail(v, d);
        } catch {
          return v;
        }
      }),
    );

    return enriched
      .filter((v) => v.lat != null && v.lon != null)
      .sort((a, b) => {
        const c = rankColor(b.colorCode) - rankColor(a.colorCode);
        if (c) return c;
        return rankAlert(b.alertLevel) - rankAlert(a.alertLevel);
      });
  } catch {
    return [];
  }
}
