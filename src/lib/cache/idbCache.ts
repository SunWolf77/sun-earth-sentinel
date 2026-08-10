/**
 * IndexedDB cache wrapper for WolfWatch feed payloads larger than localStorage
 * soft limits allow. Native IDB — no extra dependency.
 *
 * Stores:
 *  - feeds:   { key, ts, v, data, bytes? }
 *  - history: { key, ts, v, data }
 *  - meta:    schema / lastPrune
 *
 * Browser-only. SSR-safe no-ops. Structured clone (objects OK; no functions).
 *
 * Soft budget is advisory (prune by rank + age). Origin quota is browser-owned.
 */

import { isMobileViewport } from "@/lib/device";

export const IDB_NAME = "wolfwatch-idb";
export const IDB_VERSION = 1;

const FEEDS = "feeds";
const HISTORY = "history";
const META = "meta";

/** Schema stamp stored in meta */
export const IDB_SCHEMA = 1;

/** Soft budget for feed store (bytes estimate) — not browser hard limit */
export function idbSoftBudgetBytes(): number {
  return isMobileViewport() ? 28_000_000 : 96_000_000;
}

export type IdbFeedRecord<T = unknown> = {
  key: string;
  ts: number;
  v: number;
  data: T;
  /** Rough JSON size estimate at write */
  bytes?: number;
  rank?: number;
};

export type IdbHistoryRecord<T = unknown> = {
  key: string;
  ts: number;
  v: number;
  data: T[];
};

export type IdbStatus = {
  available: boolean;
  open: boolean;
  name: string;
  version: number;
  error?: string;
};

type RankFn = (key: string) => number;

/** Same survival ranks as localCache — lower prunes first */
export function idbPruneRank(key: string): number {
  if (/^eq_(hour|day|week|month)$/.test(key) || key === "eq_pulse") return 100;
  if (key.startsWith("hist_")) return 90;
  if (
    key === "scales" ||
    key === "sw" ||
    key === "flux10" ||
    key === "kp" ||
    key === "alerts" ||
    key === "forecast" ||
    key === "enlil" ||
    key === "ovation" ||
    key === "usgs_volc_alerts_v4" ||
    key === "volc"
  ) {
    return 70;
  }
  if (key === "geofon" || key.startsWith("node_catalog_")) return 40;
  if (key === "jma" || key === "global_seismic") return 35;
  if (
    key === "xray" ||
    key === "protons" ||
    key === "donki" ||
    key === "ovationBundle" ||
    key === "kp_fc"
  ) {
    return 10;
  }
  return 50;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
let lastError: string | undefined;

function canUseIdb(): boolean {
  return typeof indexedDB !== "undefined" && typeof window !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIdb()) {
    lastError = "indexedDB unavailable";
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    let settled = false;
    const fail = (msg: string) => {
      lastError = msg;
      if (!settled) {
        settled = true;
        dbPromise = null;
        resolve(null);
      }
    };

    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onerror = () => fail(String(req.error?.message || "open failed"));
      req.onblocked = () => {
        /* another tab upgrading — still wait */
      };
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(FEEDS)) {
          const store = db.createObjectStore(FEEDS, { keyPath: "key" });
          store.createIndex("byTs", "ts", { unique: false });
          store.createIndex("byRank", "rank", { unique: false });
        }
        if (!db.objectStoreNames.contains(HISTORY)) {
          const h = db.createObjectStore(HISTORY, { keyPath: "key" });
          h.createIndex("byTs", "ts", { unique: false });
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: "key" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        db.onclose = () => {
          dbPromise = null;
        };
        // stamp schema
        try {
          const tx = db.transaction(META, "readwrite");
          tx.objectStore(META).put({ key: "schema", value: IDB_SCHEMA, ts: Date.now() });
        } catch {
          /* ignore */
        }
        settled = true;
        resolve(db);
      };
    } catch (e) {
      fail(e instanceof Error ? e.message : "open threw");
    }
  });

  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb request failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("idb tx aborted"));
  });
}

function estimateBytes(key: string, data: unknown): number {
  try {
    return (key.length + JSON.stringify(data).length) * 2;
  } catch {
    return key.length * 2 + 1024;
  }
}

export async function idbStatus(): Promise<IdbStatus> {
  if (!canUseIdb()) {
    return {
      available: false,
      open: false,
      name: IDB_NAME,
      version: IDB_VERSION,
      error: lastError || "unavailable",
    };
  }
  const db = await openDb();
  return {
    available: true,
    open: Boolean(db),
    name: IDB_NAME,
    version: IDB_VERSION,
    error: db ? undefined : lastError,
  };
}

/** Reset open promise (tests / after deleteDatabase). */
export function idbResetClient(): void {
  dbPromise = null;
  lastError = undefined;
}

// ── feeds ──────────────────────────────────────────────────────────

export async function idbGetFeed<T>(
  key: string,
  maxAgeMs = 4 * 60 * 1000,
  now = Date.now(),
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(FEEDS, "readonly");
    const rec = (await reqToPromise(
      tx.objectStore(FEEDS).get(key),
    )) as IdbFeedRecord<T> | undefined;
    await txDone(tx);
    if (!rec || rec.data === undefined) return null;
    if (now - rec.ts >= maxAgeMs) {
      // expired — delete async, don't block
      void idbDeleteFeed(key);
      return null;
    }
    return rec.data;
  } catch (e) {
    lastError = e instanceof Error ? e.message : "get failed";
    return null;
  }
}

export async function idbSetFeed<T>(
  key: string,
  data: T,
  opts?: { rank?: number; now?: number },
): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  const now = opts?.now ?? Date.now();
  const rank = opts?.rank ?? idbPruneRank(key);
  const bytes = estimateBytes(key, data);
  const rec: IdbFeedRecord<T> = {
    key,
    ts: now,
    v: IDB_SCHEMA,
    data,
    bytes,
    rank,
  };
  try {
    const tx = db.transaction(FEEDS, "readwrite");
    tx.objectStore(FEEDS).put(rec);
    await txDone(tx);
    // Advisory prune — fire and forget
    void idbPruneFeedsIfNeeded();
    return true;
  } catch (e) {
    lastError = e instanceof Error ? e.message : "set failed";
    // Quota — hard prune then retry once
    try {
      await idbPruneFeeds(true);
      const db2 = await openDb();
      if (!db2) return false;
      const tx2 = db2.transaction(FEEDS, "readwrite");
      tx2.objectStore(FEEDS).put(rec);
      await txDone(tx2);
      return true;
    } catch (e2) {
      lastError = e2 instanceof Error ? e2.message : "set retry failed";
      return false;
    }
  }
}

export async function idbDeleteFeed(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(FEEDS, "readwrite");
    tx.objectStore(FEEDS).delete(key);
    await txDone(tx);
  } catch {
    /* ignore */
  }
}

export async function idbListFeeds(): Promise<
  Array<{ key: string; ts: number; bytes: number; rank: number }>
> {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(FEEDS, "readonly");
    const all = (await reqToPromise(
      tx.objectStore(FEEDS).getAll(),
    )) as IdbFeedRecord[];
    await txDone(tx);
    return all.map((r) => ({
      key: r.key,
      ts: r.ts,
      bytes: r.bytes ?? 0,
      rank: r.rank ?? idbPruneRank(r.key),
    }));
  } catch {
    return [];
  }
}

export async function idbFeedsBytes(): Promise<number> {
  const list = await idbListFeeds();
  return list.reduce((s, e) => s + (e.bytes || 0), 0);
}

/**
 * Drop sacrificial feeds until under budget (or force aggressive prune).
 */
export async function idbPruneFeeds(
  force = false,
  rankOf: RankFn = idbPruneRank,
): Promise<number> {
  const db = await openDb();
  if (!db) return 0;
  const budget = idbSoftBudgetBytes();
  let list = await idbListFeeds();
  let total = list.reduce((s, e) => s + e.bytes, 0);
  if (!force && total < budget) return 0;

  const target = budget * 0.75;
  // Sort: low rank first, then oldest, then largest
  list = list
    .map((e) => ({ ...e, rank: e.rank || rankOf(e.key) }))
    .sort((a, b) => a.rank - b.rank || a.ts - b.ts || b.bytes - a.bytes);

  let removed = 0;
  for (const e of list) {
    if (total < target) break;
    // Prefer not to delete rank 100 until necessary
    if (!force && e.rank >= 100 && total < budget) break;
    await idbDeleteFeed(e.key);
    total -= e.bytes;
    removed++;
  }

  try {
    const db2 = await openDb();
    if (db2) {
      const tx = db2.transaction(META, "readwrite");
      tx.objectStore(META).put({
        key: "lastPrune",
        value: { at: Date.now(), removed, total },
        ts: Date.now(),
      });
      await txDone(tx);
    }
  } catch {
    /* ignore */
  }
  return removed;
}

async function idbPruneFeedsIfNeeded(): Promise<void> {
  const total = await idbFeedsBytes();
  if (total > idbSoftBudgetBytes()) await idbPruneFeeds(false);
}

// ── history ────────────────────────────────────────────────────────

export async function idbGetHistory<T>(
  key: string,
  maxItems?: number,
): Promise<T[]> {
  const db = await openDb();
  if (!db) return [];
  const cap = maxItems ?? (isMobileViewport() ? 48 : 96);
  try {
    const tx = db.transaction(HISTORY, "readonly");
    const rec = (await reqToPromise(
      tx.objectStore(HISTORY).get(key),
    )) as IdbHistoryRecord<T> | undefined;
    await txDone(tx);
    if (!rec || !Array.isArray(rec.data)) return [];
    return rec.data.slice(-cap);
  } catch {
    return [];
  }
}

export async function idbSetHistory<T>(
  key: string,
  points: T[],
  maxItems?: number,
): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  const cap = maxItems ?? (isMobileViewport() ? 48 : 96);
  const data = points.slice(-cap);
  const rec: IdbHistoryRecord<T> = {
    key,
    ts: Date.now(),
    v: IDB_SCHEMA,
    data,
  };
  try {
    const tx = db.transaction(HISTORY, "readwrite");
    tx.objectStore(HISTORY).put(rec);
    await txDone(tx);
    return true;
  } catch {
    return false;
  }
}

export async function idbPushHistory<T>(
  key: string,
  item: T,
  maxItems?: number,
): Promise<T[]> {
  const prev = await idbGetHistory<T>(key, maxItems);
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
  const next = [...prev, item];
  await idbSetHistory(key, next, maxItems);
  return idbGetHistory<T>(key, maxItems);
}

// ── bulk / maintenance ─────────────────────────────────────────────

export async function idbClearFeeds(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(FEEDS, "readwrite");
    tx.objectStore(FEEDS).clear();
    await txDone(tx);
  } catch {
    /* ignore */
  }
}

export async function idbClearAll(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction([FEEDS, HISTORY, META], "readwrite");
    tx.objectStore(FEEDS).clear();
    tx.objectStore(HISTORY).clear();
    tx.objectStore(META).clear();
    await txDone(tx);
  } catch {
    /* ignore */
  }
}

/**
 * Keys that benefit from IDB (fat / re-fetchable catalogs).
 * Tiny prefs stay on localStorage.
 */
export function isIdbPreferredKey(key: string): boolean {
  if (key.startsWith("eq_")) return true;
  if (key.startsWith("node_catalog_")) return true;
  if (key.startsWith("hist_")) return true;
  return (
    key === "geofon" ||
    key === "jma" ||
    key === "global_seismic" ||
    key === "xray" ||
    key === "protons" ||
    key === "donki" ||
    key === "ovationBundle" ||
    key === "volc" ||
    key === "eq_pulse"
  );
}

/**
 * Async cache get: IDB first, then optional localStorage fallback reader.
 */
export async function idbGetCache<T>(
  key: string,
  maxAgeMs = 4 * 60 * 1000,
  lsFallback?: () => T | null,
): Promise<T | null> {
  const fromIdb = await idbGetFeed<T>(key, maxAgeMs);
  if (fromIdb != null) return fromIdb;
  if (lsFallback) {
    const ls = lsFallback();
    if (ls != null && isIdbPreferredKey(key)) {
      // promote LS → IDB for next time
      void idbSetFeed(key, ls);
    }
    return ls;
  }
  return null;
}

/**
 * Async cache set (IDB). Returns false if IDB unavailable / failed.
 */
export async function idbSetCache<T>(key: string, data: T): Promise<boolean> {
  return idbSetFeed(key, data);
}

/** Snapshot for About / debug */
export async function idbDebugSnapshot(): Promise<{
  status: IdbStatus;
  feedCount: number;
  feedBytes: number;
  softBudget: number;
  keys: Array<{ key: string; ts: number; bytes: number; rank: number }>;
}> {
  const status = await idbStatus();
  const keys = await idbListFeeds();
  const feedBytes = keys.reduce((s, k) => s + k.bytes, 0);
  return {
    status,
    feedCount: keys.length,
    feedBytes,
    softBudget: idbSoftBudgetBytes(),
    keys: keys.sort((a, b) => b.bytes - a.bytes).slice(0, 40),
  };
}
