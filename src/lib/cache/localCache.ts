/**
 * Versioned localStorage cache + bounded history.
 * Prunes on quota / soft size limit (tighter on mobile).
 */

import { cacheSoftLimitBytes, historyCap, isMobileViewport } from "@/lib/device";

const PREFIX = "ww_";
const CACHE_VER = 3;
const VER_KEY = `${PREFIX}cache_ver`;

function ensureVersion(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const v = localStorage.getItem(VER_KEY);
    if (v === String(CACHE_VER)) return;
    // Wipe legacy ww_ keys on version bump (keeps wolfwatch_* prefs)
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

/** Drop oldest ww_ cache/history entries until under soft limit. */
export function pruneCache(force = false): void {
  if (typeof localStorage === "undefined") return;
  ensureVersion();
  const limit = cacheSoftLimitBytes();
  if (!force && approxBytes() < limit) return;

  type Entry = { key: string; ts: number };
  const entries: Entry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX) || k === VER_KEY) continue;
      let ts = 0;
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw) as { ts?: number };
          if (typeof parsed.ts === "number") ts = parsed.ts;
        }
      } catch {
        ts = 0;
      }
      entries.push({ key: k, ts });
    }
    entries.sort((a, b) => a.ts - b.ts); // oldest first
    for (const e of entries) {
      if (approxBytes() < limit * 0.75) break;
      // Prefer pruning hist_ and bulky feed keys first
      if (e.key.includes("hist_") || e.key.includes("eq") || e.key.includes("xray") || e.key.includes("donki")) {
        localStorage.removeItem(e.key);
      }
    }
    // Second pass any ww_
    for (const e of entries) {
      if (approxBytes() < limit * 0.85) break;
      if (localStorage.getItem(e.key) != null) localStorage.removeItem(e.key);
    }
  } catch {
    /* ignore */
  }
}

export function getCache<T>(key: string, maxAgeMs = 4 * 60 * 1000): T | null {
  ensureVersion();
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - ts < maxAgeMs) return data;
    // expired — drop
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
  return null;
}

export function setCache<T>(key: string, data: T): void {
  ensureVersion();
  try {
    // Don't persist huge donki on mobile
    if (isMobileViewport() && (key === "donki" || key === "xray" || key === "protons")) {
      // still cache but prune first
      pruneCache(true);
    }
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ ts: Date.now(), data, v: CACHE_VER }),
    );
  } catch {
    pruneCache(true);
    try {
      localStorage.setItem(
        PREFIX + key,
        JSON.stringify({ ts: Date.now(), data, v: CACHE_VER }),
      );
    } catch {
      /* give up */
    }
  }
  if (approxBytes() > cacheSoftLimitBytes()) pruneCache(true);
}

export function removeCache(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function getHistory<T>(key: string, maxItems?: number): T[] {
  ensureVersion();
  const cap = maxItems ?? historyCap();
  try {
    const raw = localStorage.getItem(PREFIX + "hist_" + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { ts?: number; data?: T[] } | T[];
    // support new {ts,data} and legacy bare array
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : [];
    return arr.slice(-cap);
  } catch {
    return [];
  }
}

export function pushHistory<T>(key: string, item: T, maxItems?: number): T[] {
  const cap = maxItems ?? historyCap();
  const prev = getHistory<T>(key, cap);
  // Dedupe rapid identical d_ij points within 30s
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
  try {
    localStorage.setItem(
      PREFIX + "hist_" + key,
      JSON.stringify({ ts: Date.now(), data: next, v: CACHE_VER }),
    );
  } catch {
    pruneCache(true);
    try {
      localStorage.setItem(
        PREFIX + "hist_" + key,
        JSON.stringify({ ts: Date.now(), data: next.slice(-Math.floor(cap / 2)), v: CACHE_VER }),
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
    "eq_pulse",
    "geofon",
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
    "donki",
    "volc",
  ];
  for (const k of keys) removeCache(k);
  pruneCache(true);
}
