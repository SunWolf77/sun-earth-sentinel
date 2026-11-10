/**
 * Relay a confirmed agency eruption notice.
 * RED or WARNING from USGS, INGV, IMO, KVERT, or a VAAC.
 * Not a GVP weekly line, not a standing curated watch, not a civil alert.
 */

import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
import { buildShareFocusUrl } from "@/lib/pwa/shareFocus";
import { playQuakeAlert } from "@/lib/audio/alerts";

export type EruptionNotice = {
  id: string;
  name: string;
  level: string;
  color: string;
  agency: string;
  lat: number;
  lon: number;
  at: number;
  url?: string;
};

const AGENCIES = new Set(["usgs", "ingv", "imo", "kvert", "vaac"]);
const FRESH_MS = 12 * 3600_000;

const AGENCY_LABEL: Record<string, string> = {
  usgs: "USGS",
  ingv: "INGV",
  imo: "IMO",
  kvert: "KVERT",
  vaac: "VAAC",
};

let seeded = false;
const seen = new Set<string>();

function noticeMs(v: UsgsVolcanoAlert): number | null {
  if (v.sentUnix != null && Number.isFinite(v.sentUnix) && v.sentUnix > 0) {
    return v.sentUnix > 1e12 ? v.sentUnix : v.sentUnix * 1000;
  }
  if (v.sentUtc) {
    const t = Date.parse(v.sentUtc);
    if (Number.isFinite(t)) return t;
  }
  return null;
}

function isConfirmed(v: UsgsVolcanoAlert): boolean {
  const src = (v.source || "usgs").toLowerCase();
  if (!AGENCIES.has(src)) return false;
  const level = (v.alertLevel || "").toUpperCase();
  const color = (v.colorCode || "").toUpperCase();
  return level === "WARNING" || color === "RED";
}

function keyOf(v: UsgsVolcanoAlert): string {
  const id = v.vnum || v.id;
  const t = v.sentUnix || v.noticeId || "";
  return `${id}|${(v.alertLevel || "").toUpperCase()}|${(v.colorCode || "").toUpperCase()}|${t}`;
}

function toNotice(v: UsgsVolcanoAlert, at: number): EruptionNotice | null {
  if (v.lat == null || v.lon == null) return null;
  const src = (v.source || "usgs").toLowerCase();
  return {
    id: v.vnum || v.id,
    name: v.name,
    level: (v.alertLevel || "").toUpperCase(),
    color: (v.colorCode || "").toUpperCase(),
    agency: AGENCY_LABEL[src] || src.toUpperCase(),
    lat: v.lat,
    lon: v.lon,
    at,
    url: v.noticeUrl || v.volcanoUrl || undefined,
  };
}

export function eruptionFocusUrl(n: EruptionNotice, origin?: string): string {
  return buildShareFocusUrl({
    origin:
      origin ||
      (typeof window !== "undefined" ? window.location.origin : undefined),
    tab: "live",
    volcanoId: n.id,
    lat: n.lat,
    lon: n.lon,
    zoom: 6,
    place: n.name,
  });
}

export function showOsEruption(n: EruptionNotice): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const url = eruptionFocusUrl(n);
  const level = [n.color, n.level].filter(Boolean).join(" / ");
  try {
    const note = new Notification(`Eruption · ${n.name}`, {
      body: `${n.agency} ${level} · relay, not a civil alert`,
      tag: `ses-volc-${n.id}`,
      silent: false,
      data: { url },
    });
    note.onclick = () => {
      try {
        window.focus();
        window.location.assign(url);
      } catch {
        /* ignore */
      }
      note.close();
    };
  } catch {
    /* permission revoked */
  }
}

/**
 * First list seeds and stays quiet. Later, a new RED / WARNING notice
 * from the last 12 hours returns one notice.
 */
export function relayNewEruptions(
  alerts: UsgsVolcanoAlert[],
  opts: { desktop?: boolean; sound?: boolean } = {},
): EruptionNotice | null {
  const now = Date.now();
  const confirmed = alerts.filter(isConfirmed);
  if (!seeded) {
    seeded = true;
    for (const v of confirmed) seen.add(keyOf(v));
    return null;
  }
  const fresh: UsgsVolcanoAlert[] = [];
  for (const v of confirmed) {
    const key = keyOf(v);
    if (seen.has(key)) continue;
    seen.add(key);
    const at = noticeMs(v);
    if (at == null || now - at > FRESH_MS || now - at < -60_000) continue;
    fresh.push(v);
  }
  fresh.sort((a, b) => (noticeMs(b) ?? 0) - (noticeMs(a) ?? 0));
  const hit = fresh[0];
  if (!hit) return null;
  const notice = toNotice(hit, noticeMs(hit) ?? now);
  if (!notice) return null;
  if (opts.sound) playQuakeAlert(6);
  if (opts.desktop) showOsEruption(notice);
  return notice;
}
