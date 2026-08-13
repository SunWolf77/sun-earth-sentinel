/**
 * Catalog notice — relay a public-agency origin as soon as the pulse sees it.
 * Not EEW, not WEA, not a civil alert. We are the desk, not the authority.
 */

import type { EqFeature } from "@/lib/feeds/usgs";

export type CatalogNotice = {
  id: string;
  mag: number | null;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depth: number;
  url?: string;
  /** Human agency label (USGS, JMA, …) */
  authority: string;
  /** Network tag if known */
  net: string | null;
};

const NET_AUTHORITY: Record<string, string> = {
  us: "USGS",
  ak: "USGS / AEC",
  ci: "USGS / SCSN",
  nc: "USGS / NCSN",
  nn: "USGS / NSL",
  uw: "USGS / PNSN",
  hv: "USGS / HVO",
  pr: "USGS / PRSN",
  tx: "TexNet",
  official: "USGS",
  jma: "JMA",
  jp: "JMA",
  iv: "INGV",
  ingv: "INGV",
  emsc: "EMSC",
  csem: "EMSC",
  gfz: "GEOFON",
  geofon: "GEOFON",
  imo: "IMO",
  vedur: "IMO",
  nz: "GeoNet",
  geonet: "GeoNet",
  guc: "CSN",
  csn: "CSN",
};

export function authorityLabel(
  net?: string | null,
  sources?: string | null,
): string {
  const src = (sources || "").trim();
  if (src) {
    const first = src.split(/[,\s]+/)[0]!.toLowerCase();
    if (NET_AUTHORITY[first]) return NET_AUTHORITY[first]!;
    if (/ingv/i.test(src)) return "INGV";
    if (/jma/i.test(src)) return "JMA";
    if (/imo|vedur/i.test(src)) return "IMO";
    if (/geonet|gns/i.test(src)) return "GeoNet";
    if (/csn|sismologia/i.test(src)) return "CSN";
    if (/usgs/i.test(src)) return "USGS";
  }
  const n = (net || "").trim().toLowerCase();
  return NET_AUTHORITY[n] ?? (n ? n.toUpperCase() : "catalog");
}

export function featureId(f: EqFeature): string {
  return String(f.id || `${f.properties.time ?? 0}_${f.properties.mag ?? 0}`);
}

export function noticeFromFeature(f: EqFeature): CatalogNotice | null {
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat, depth] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const t = f.properties.time;
  if (t == null || !Number.isFinite(t)) return null;
  return {
    id: featureId(f),
    mag: f.properties.mag,
    place: f.properties.place?.trim() || "location pending",
    time: t,
    lat,
    lon,
    depth: Number.isFinite(depth) ? (depth as number) : 0,
    url: f.properties.url || undefined,
    authority: authorityLabel(f.properties.net, f.properties.sources),
    net: f.properties.net ?? null,
  };
}

export function collectFreshNotices(
  features: EqFeature[],
  prevIds: Set<string>,
  opts: { minMag?: number; maxAgeMs?: number; max?: number } = {},
): { nextIds: Set<string>; fresh: CatalogNotice[] } {
  const minMag = opts.minMag ?? 4.5;
  const maxAgeMs = opts.maxAgeMs ?? 30 * 60_000;
  const max = opts.max ?? 3;
  const nextIds = new Set<string>();
  const fresh: CatalogNotice[] = [];
  const now = Date.now();

  for (const f of features) {
    const id = featureId(f);
    nextIds.add(id);
    if (prevIds.size === 0) continue; // first paint — seed ids, no burst
    if (prevIds.has(id)) continue;
    const mag = f.properties.mag;
    if (mag == null || !Number.isFinite(mag) || mag < minMag) continue;
    const age = now - (f.properties.time ?? 0);
    if (age < 0 || age > maxAgeMs) continue;
    const n = noticeFromFeature(f);
    if (n) fresh.push(n);
  }

  fresh.sort((a, b) => (b.mag ?? 0) - (a.mag ?? 0));
  return { nextIds, fresh: fresh.slice(0, max) };
}

export function formatRelayLine(n: CatalogNotice): string {
  const mag = n.mag != null && Number.isFinite(n.mag) ? `M${n.mag.toFixed(1)}` : "M–";
  return `${n.authority} catalog · ${mag} · ${n.place}`;
}

export function formatRelaySub(n: CatalogNotice): string {
  return "SES relay · not a civil alert";
}

export function osNotifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function osNotifyPermission(): NotificationPermission | "unsupported" {
  if (!osNotifySupported()) return "unsupported";
  return Notification.permission;
}

export async function requestOsNotify(): Promise<boolean> {
  if (!osNotifySupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}

/** Browser/OS notification — sourced relay, never “warning / take cover”. */
export function showOsRelay(n: CatalogNotice): void {
  if (!osNotifySupported() || Notification.permission !== "granted") return;
  const mag = n.mag != null && Number.isFinite(n.mag) ? `M${n.mag.toFixed(1)}` : "M–";
  try {
    const note = new Notification(`${mag} · ${n.place}`, {
      body: `${n.authority} catalog · SES relay — not an official alert`,
      tag: `ses-eq-${n.id}`,
      silent: false,
    });
    note.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      note.close();
    };
  } catch {
    /* permission revoked mid-flight */
  }
}
