/**
 * Dual-write policy: localStorage (sync, small) + IndexedDB (async, fat).
 *
 * Call sites should only use these helpers — never scatter idbSetFeed checks
 * inside localStorage write paths.
 *
 * Policy:
 *  - Preferred (fat) keys → always attempt IDB mirror after LS write
 *  - Preferred keys → IDB delete when LS remove
 *  - Read path (async) → IDB first, then LS, promote LS hit into IDB
 *  - Prefs / visit / tiny flags → localStorage only (not preferred)
 */

import {
  idbDeleteFeed,
  idbGetFeed,
  idbSetFeed,
  isIdbPreferredKey,
} from "@/lib/cache/idbCache";

/** Mirror a prepared feed payload into IDB when the key is dual-write eligible. */
export function mirrorFeedToIdb<T>(key: string, prepared: T): void {
  if (!isIdbPreferredKey(key)) return;
  void idbSetFeed(key, prepared).catch(() => {
    /* quota / private mode — LS remains source of truth for this session */
  });
}

/** Drop dual-written IDB copy when LS entry is removed. */
export function dropMirroredFeed(key: string): void {
  if (!isIdbPreferredKey(key)) return;
  void idbDeleteFeed(key).catch(() => {
    /* ignore */
  });
}

/**
 * Async read: IDB → localStorage fallback → optional promote to IDB.
 * `readLocal` should be the sync LS getter (e.g. getCache).
 */
export async function readFeedDual<T>(
  key: string,
  maxAgeMs: number,
  readLocal: (key: string, maxAgeMs: number) => T | null,
): Promise<T | null> {
  if (isIdbPreferredKey(key)) {
    try {
      const fromIdb = await idbGetFeed<T>(key, maxAgeMs);
      if (fromIdb != null) return fromIdb;
    } catch {
      /* fall through to LS */
    }
  }

  const fromLs = readLocal(key, maxAgeMs);
  if (fromLs != null && isIdbPreferredKey(key)) {
    mirrorFeedToIdb(key, fromLs);
  }
  return fromLs;
}

export { isIdbPreferredKey };
