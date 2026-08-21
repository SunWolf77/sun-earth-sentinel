/**
 * Versioned localStorage cache + bounded history.
 * Prunes on quota / soft size limit (tighter on mobile).
 *
 * Fat keys are dual-written to IndexedDB via dualWrite helpers (survives LS prune).
 *
 * Priority (highest → lowest survival on LS):
 *  1. Primary USGS window caches (eq_hour/day/week/month) + live pulse
 *  2. Resonance / attention history (hist_*)
 *  3. Small operational prefs & short feeds
 *  4. Bulky solar / secondary catalogs (xray, donki, protons, jma, node catalogs)
 *
 * Past bug: prune preferred keys matching "eq" and "hist_" first, so every
 * xray/jma write wiped earthquake history — Vercel/mobile looked empty while
 * a fresh Grok session still had in-memory feeds.
 */

import { cacheSoftLimitBytes, historyCap, isMobileViewport } from "@/lib/device";
import {
  dropMirroredFeed,
  mirrorFeedToIdb,
  readFeedDual,
} from "@/lib/cache/dualWrite";

const PREFIX = "ww_";
/** Bump wipes legacy ww_* so bad prune order / fat caches cannot stick. */
const CACHE_VER = 4;
const VER_KEY = `${PREFIX}cache_ver`;

function ensureVersion(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const v = localStorage.getItem(VER_KEY);
    if (v === String(CACHE_VER)) return;
    const kill: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && k !== VER_KEY) kill.push(k);
    }
    for (const k of kill) localStorage.removeItem(k);
    localStorage.setItem(VER_KEY, String(CACHE_VER));
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  try {
    ensureVersion();
  } catch {
    /* ignore */
  }
}

function approxBytes(): number {
  let n = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const v = localStorage.getItem(k) ?? "";
      n += k.length + v.length;
    }
  } catch {
    /* ignore */
  }
  return n * 2; // UTF-16 rough
}

/** Bare key (no ww_ prefix) helpers. */
function bare(key: string): string {
  return key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
}

/**
 * Lower number = prune sooner (sacrificial).
 * Higher number = protect until last resort.
 */
function pruneRank(fullKey: string): number {
  const k = bare(fullKey);
  // Protect primary seismic catalog + live tip
  if (/^eq_(hour|day|week|month)$/.test(k) || k === "eq_pulse") return 100;
  // First-visit UI flags — keep until CACHE_VER wipe / site-data clear
  if (k.startsWith("ui_")) return 99;
  // Protect resonance / attention history series
  if (k.startsWith("hist_")) return 90;
  // Small, useful ops
  if (
    k === "scales" ||
    k === "sw" ||
    k === "flux10" ||
    k === "kp" ||
    k === "alerts" ||
    k === "forecast" ||
    k === "enlil" ||
    k === "ovation" ||
    k === "usgs_volc_alerts_v4" ||
    k === "volc"
  ) {
    return 70;
  }
  // Secondary seismic densifiers (re-fetchable)
  if (k === "geofon" || k.startsWith("node_catalog_")) return 40;
  if (k === "jma" || k === "global_seismic") return 35;
  // Fat solar blobs — drop first
  if (k === "xray" || k === "protons" || k === "donki" || k === "ovationBundle" || k === "kp_fc") {
    return 10;
  }
  return 50;
}

type Entry = { key: string; ts: number; rank: number; bytes: number };

function listEntries(): Entry[] {
  const entries: Entry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX) || k === VER_KEY) continue;
      const raw = localStorage.getItem(k) ?? "";
      let ts = 0;
      try {
        const parsed = JSON.parse(raw) as { ts?: number };
        if (typeof parsed.ts === "number") ts = parsed.ts;
      } catch {
        ts = 0;
      }
      entries.push({
        key: k,
        ts,
        rank: pruneRank(k),
        bytes: (k.length + raw.length) * 2,
      });
    }
  } catch {
    /* ignore */
  }
  // Sacrificial first (low rank), then oldest, then largest
  entries.sort((a, b) => a.rank - b.rank || a.ts - b.ts || b.bytes - a.bytes);
  return entries;
}

/**
 * Drop sacrificial ww_ entries until under target fraction of soft limit.
 * Never deletes VER_KEY. Protected ranks only fall if still over after a full pass.
 */
export function pruneCache(force = false): void {
  if (typeof localStorage === "undefined") return;
  ensureVersion();
  const limit = cacheSoftLimitBytes();
  if (!force && approxBytes() < limit) return;

  try {
    const target = limit * 0.72;
    const entries = listEntries();

    // Pass 1: rank < 80 (everything except hist + primary eq)
    for (const e of entries) {
      if (approxBytes() < target) return;
      if (e.rank >= 80) continue;
      localStorage.removeItem(e.key);
    }
    // Pass 2: history (if still over)
    for (const e of entries) {
      if (approxBytes() < target) return;
      if (e.rank < 80 || e.rank >= 100) continue;
      localStorage.removeItem(e.key);
    }
    // Pass 3 last resort: primary eq windows (newest-protected last)
    const eqLast = entries
      .filter((e) => e.rank >= 100)
      .sort((a, b) => a.ts - b.ts);
    for (const e of eqLast) {
      if (approxBytes() < target) return;
      localStorage.removeItem(e.key);
    }
  } catch {
    /* ignore */
  }
}

/** Free space specifically so a protected write can succeed. */
function freeSpaceForWrite(incomingBytes: number, protectBareKey: string): void {
  const limit = cacheSoftLimitBytes();
  const need = approxBytes() + incomingBytes;
  if (need < limit * 0.9) return;

  const protectFull = PREFIX + protectBareKey;
  const entries = listEntries().filter((e) => e.key !== protectFull);
  for (const e of entries) {
    if (approxBytes() + incomingBytes < limit * 0.85) break;
    // Prefer dropping non-protected
    if (e.rank >= 100 && protectBareKey.startsWith("eq_")) continue;
    localStorage.removeItem(e.key);
  }
}

/**
 * Slim GeoJSON-like collections before persist — strip bulky unused props.
 * Keeps mag/place/time/geometry/id which the map + boards need.
 */
export function slimEqPayload<T>(data: T, maxFeatures?: number): T {
  if (!data || typeof data !== "object") return data;
  const col = data as {
    type?: string;
    features?: Array<{
      type?: string;
      id?: unknown;
      properties?: Record<string, unknown>;
      geometry?: { type?: string; coordinates?: number[] };
    }>;
    metadata?: Record<string, unknown>;
  };
  if (!Array.isArray(col.features)) return data;

  const mobile = isMobileViewport();
  const cap =
    maxFeatures ??
    (mobile ? 500 : 900);

  // Prefer stronger / newer when capping for cache
  const sorted = [...col.features].sort((a, b) => {
    const ma = Number(a.properties?.mag ?? 0);
    const mb = Number(b.properties?.mag ?? 0);
    if (mb !== ma) return mb - ma;
    const ta = Number(a.properties?.time ?? 0);
    const tb = Number(b.properties?.time ?? 0);
    return tb - ta;
  });
  const slice = sorted.slice(0, cap);

  const features = slice.map((f) => {
    const p = f.properties ?? {};
    const coords = Array.isArray(f.geometry?.coordinates)
      ? f.geometry!.coordinates!.slice(0, 3)
      : [0, 0, 0];
    return {
      type: "Feature" as const,
      id: f.id,
      properties: {
        mag: p.mag ?? null,
        place: p.place ?? null,
        time: p.time ?? null,
        updated: p.updated,
        url: p.url,
        title: p.title,
        type: p.type,
        status: p.status,
        mmi: p.mmi,
        types: p.types,
        felt: p.felt,
        cdi: p.cdi,
        alert: p.alert,
        tsunami: p.tsunami,
        sig: p.sig,
        net: p.net,
        magType: p.magType,
        // JMA extras when present
        jmaMaxi: p.jmaMaxi,
        jmaEid: p.jmaEid,
        jmaProduct: p.jmaProduct,
        jmaEnriched: p.jmaEnriched,
        detail: p.detail,
        sesSource: p.sesSource,
      },
      geometry: {
        type: "Point" as const,
        coordinates: coords as [number, number, number?],
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
    metadata: {
      ...(col.metadata ?? {}),
      count: features.length,
      slimmed: true,
    },
  } as T;
}

/** Down-sample dense time series (xray / protons) for localStorage. */
export function slimSeriesPayload<T>(data: T, maxPoints = 360): T {
  if (!Array.isArray(data)) return data;
  const arr = data as unknown[];
  if (arr.length <= maxPoints) return data;
  const stride = Math.ceil(arr.length / maxPoints);
  const out: unknown[] = [];
  for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
  // Always keep the newest sample
  const last = arr[arr.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out as T;
}

function prepareForStorage<T>(key: string, data: T): T {
  if (
    key.startsWith("eq_") ||
    key === "geofon" ||
    key === "jma" ||
    key === "volc" ||
    key.startsWith("node_catalog_")
  ) {
    return slimEqPayload(data);
  }
  if (key === "global_seismic" && data && typeof data === "object") {
    const g = data as {
      significant?: unknown;
      m45?: unknown;
      m25?: unknown;
      fetchedAt?: number;
    };
    return {
      ...g,
      significant: g.significant ? slimEqPayload(g.significant, 80) : g.significant,
      m45: g.m45 ? slimEqPayload(g.m45, 200) : g.m45,
      m25: g.m25 ? slimEqPayload(g.m25, 300) : g.m25,
    } as T;
  }
  if (key === "xray") {
    return slimSeriesPayload(data, isMobileViewport() ? 240 : 480);
  }
  if (key === "protons") {
    return slimSeriesPayload(data, isMobileViewport() ? 180 : 360);
  }
  if (key === "donki" && isMobileViewport()) {
    // Mobile: keep shallow counts only — full DONKI is huge
    const d = data as {
      cmes?: unknown[];
      flares?: unknown[];
      fetchedAt?: number;
    };
    return {
      cmes: Array.isArray(d.cmes) ? d.cmes.slice(0, 12) : d.cmes,
      flares: Array.isArray(d.flares) ? d.flares.slice(0, 12) : d.flares,
      fetchedAt: d.fetchedAt,
      slimmed: true,
    } as T;
  }
  return data;
}

export function getCache<T>(key: string, maxAgeMs = 4 * 60 * 1000): T | null {
  ensureVersion();
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - ts < maxAgeMs) return data;
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
  return null;
}

export function setCache<T>(key: string, data: T): void {
  ensureVersion();
  const prepared = prepareForStorage(key, data);

  // Mobile: keep fat solar out of LS when EQ is already cached near soft limit.
  // Still mirror to IDB so offline solar can live outside the LS budget.
  if (shouldSkipMobileSolarWrite(key)) {
    removeLocalOnly(key);
    mirrorFeedToIdb(key, prepared);
    return;
  }

  writeLocalStoragePayload(key, prepared);
  mirrorFeedToIdb(key, prepared);
}

/** True when mobile should refuse to persist fat solar into localStorage. */
function shouldSkipMobileSolarWrite(key: string): boolean {
  if (!isMobileViewport()) return false;
  if (key !== "donki" && key !== "xray" && key !== "protons" && key !== "ovationBundle") {
    return false;
  }
  const hasEq =
    getCache("eq_week", 600_000) != null ||
    getCache("eq_day", 600_000) != null ||
    getCache("eq_month", 600_000) != null;
  return hasEq && approxBytes() > cacheSoftLimitBytes() * 0.55;
}

/**
 * Persist prepared payload to localStorage with prune/retry.
 * Returns whether the final setItem likely succeeded.
 */
function writeLocalStoragePayload<T>(key: string, prepared: T): boolean {
  const payload = JSON.stringify({ ts: Date.now(), data: prepared, v: CACHE_VER });
  const incomingBytes = (PREFIX.length + key.length + payload.length) * 2;

  const tryWrite = (): boolean => {
    try {
      freeSpaceForWrite(incomingBytes, key);
      localStorage.setItem(PREFIX + key, payload);
      return true;
    } catch {
      return false;
    }
  };

  if (tryWrite()) {
    if (approxBytes() > cacheSoftLimitBytes()) pruneCache(true);
    return true;
  }

  pruneCache(true);
  if (tryWrite()) {
    if (approxBytes() > cacheSoftLimitBytes()) pruneCache(true);
    return true;
  }

  // Last ditch for primary EQ: drop solar fat keys and retry once
  if (key.startsWith("eq_")) {
    for (const fat of ["xray", "protons", "donki", "ovationBundle", "jma", "kp_fc"]) {
      removeLocalOnly(fat);
    }
    if (tryWrite()) return true;
  }
  return false;
}

/** Remove LS entry without touching IDB (used when cascading frees space). */
function removeLocalOnly(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function removeCache(key: string): void {
  removeLocalOnly(key);
  dropMirroredFeed(key);
}

export function getHistory<T>(key: string, maxItems?: number): T[] {
  ensureVersion();
  const cap = maxItems ?? historyCap();
  try {
    const raw = localStorage.getItem(PREFIX + "hist_" + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { ts?: number; data?: T[] } | T[];
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : [];
    return arr.slice(-cap);
  } catch {
    return [];
  }
}

export function pushHistory<T>(key: string, item: T, maxItems?: number): T[] {
  const cap = maxItems ?? historyCap();
  const prev = getHistory<T>(key, cap);
  const last = prev[prev.length - 1] as { t?: number; d_ij?: number | null } | undefined;
  const nextItem = item as { t?: number; d_ij?: number | null };
  if (
    last &&
    typeof last.t === "number" &&
    typeof nextItem.t === "number" &&
    nextItem.t - last.t < 30_000 &&
    last.d_ij === nextItem.d_ij
  ) {
    return prev;
  }
  const next = [...prev, item].slice(-cap);
  const payload = JSON.stringify({ ts: Date.now(), data: next, v: CACHE_VER });
  try {
    freeSpaceForWrite((payload.length + 20) * 2, "hist_" + key);
    localStorage.setItem(PREFIX + "hist_" + key, payload);
  } catch {
    pruneCache(true);
    try {
      localStorage.setItem(
        PREFIX + "hist_" + key,
        JSON.stringify({
          ts: Date.now(),
          data: next.slice(-Math.floor(cap / 2)),
          v: CACHE_VER,
        }),
      );
    } catch {
      /* ignore */
    }
  }
  return next;
}

/** Attention / ops brief history point */
export type AttentionHistoryPoint = {
  t: number;
  attention: number;
  level: string;
  kp: number | null;
};

export function clearFeedCaches(): void {
  const keys = [
    "eq",
    "eq_hour",
    "eq_day",
    "eq_week",
    "eq_month",
    "eq_pulse",
    "geofon",
    "jma",
    "kp",
    "xray",
    "sw",
    "scales",
    "alerts",
    "flux10",
    "protons",
    "forecast",
    "enlil",
    "ovation",
    "ovationBundle",
    "donki",
    "volc",
    "global_seismic",
  ];
  for (const k of keys) removeCache(k);
  // Also drop node catalogs
  try {
    const kill: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX + "node_catalog_")) kill.push(k);
    }
    for (const k of kill) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  pruneCache(true);
}

/**
 * Async get: IndexedDB first for preferred keys, then localStorage.
 * Use when hydrate can wait a tick (boot / background refresh).
 */
export async function getCacheAsync<T>(
  key: string,
  maxAgeMs = 4 * 60 * 1000,
): Promise<T | null> {
  return readFeedDual<T>(key, maxAgeMs, getCache);
}
