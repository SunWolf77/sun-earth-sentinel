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

export async function fetchUsgsElevatedVolcanoes(): Promise<UsgsVolcanoAlert[]> {
  try {
    const res = await fetch(`${HANS}/volcano/getElevatedVolcanoes`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(raw)) return [];

    const base: UsgsVolcanoAlert[] = raw.map((r, i) => {
      const vnum = r.vnum != null ? String(r.vnum) : null;
      const name = String(r.volcano_name || "Volcano");
      return {
        id: vnum || String(r.notice_identifier || name) || `volc-${i}`,
        name,
        vnum,
        alertLevel: String(r.alert_level || "ADVISORY") as UsgsAlertLevel,
        colorCode: String(r.color_code || "YELLOW") as UsgsColorCode,
        obsAbbr: String(r.obs_abbr || "").toUpperCase(),
        obsName: String(r.obs_fullname || r.obs_abbr || "USGS"),
        sentUtc: r.sent_utc != null ? String(r.sent_utc) : null,
        sentUnix: typeof r.sent_unixtime === "number" ? r.sent_unixtime : null,
        noticeUrl: r.notice_url != null ? String(r.notice_url) : null,
        noticeId: r.notice_identifier != null ? String(r.notice_identifier) : null,
        lat: null,
        lon: null,
        elevationM: null,
        region: null,
        volcanoUrl: null,
      };
    });

    const enriched = await Promise.all(
      base.map(async (v) => {
        if (!v.vnum) return v;
        try {
          const r = await fetch(`${HANS}/volcano/getVolcano/${v.vnum}`, {
            headers: { Accept: "application/json" },
          });
          if (!r.ok) return v;
          const d = (await r.json()) as Record<string, unknown>;
          const lat = Number(d.latitude);
          const lon = Number(d.longitude);
          return {
            ...v,
            lat: Number.isFinite(lat) ? lat : null,
            lon: Number.isFinite(lon) ? lon : null,
            elevationM:
              typeof d.elevation_meters === "number" ? d.elevation_meters : null,
            region: d.region != null ? String(d.region) : null,
            volcanoUrl: d.volcano_url != null ? String(d.volcano_url) : null,
            name: d.volcano_name != null ? String(d.volcano_name) : v.name,
          };
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
