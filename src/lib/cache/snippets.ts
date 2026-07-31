/** Copyable snippets — keep in sync with sw.js / lru.ts / httpCache.ts / cacheQuota.ts */

export const CACHE_SNIPPETS = {
  localCacheCore: `// localStorage feed cache (short TTL) — separate from Cache Storage
export function getCache<T>(key: string, maxAgeMs = 4 * 60_000): T | null {
  const raw = localStorage.getItem("ww_" + key);
  if (!raw) return null;
  const { ts, data } = JSON.parse(raw);
  if (Date.now() - ts < maxAgeMs) return data;
  localStorage.removeItem("ww_" + key);
  return null;
}`,

  history: `// pushHistory — cap + 30s d_ij dedupe (mobile 24 / desktop 48)`,

  serviceWorkerPolicy: `// SW v6: ww-shell-v6 · ww-runtime-v6
// Eviction: soft 48 · pressure 24 · prefer stale mutable · never live APIs
// HTTP: honor no-store / no-cache / immutable / max-age / SWR / ETag`,

  swInstallHandler: `// install parallel PRECACHE + skipWaiting; activate drops legacy caches`,

  swLruEviction: `// True LRU + secondary prefer-evict stale mutable
function pickEvictionVictims({ orderOldestFirst, overBy, isImmutable, ageMs }) {
  const scored = orderOldestFirst.map((url, idx) => {
    const imm = isImmutable?.(url) ?? false;
    const staleMutable = !imm && (ageMs?.(url) ?? 0) > 7 * 864e5;
    return { url, score: idx + (staleMutable ? -0.5 : 0) + (imm ? 1000 : 0) };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, overBy).map((s) => s.url);
}
// QuotaExceededError → hardTrim(24)
// npm run test:lru`,

  swPerf: `// in-memory LRU · debounced meta · classed SWR · live early-return`,

  swrInvalidation: `// Classed SWR (v6)
// immutable-hash → cache-first, no revalidate
// shell → network-first
// mutable-static → SWR + If-None-Match; honor max-age / no-cache
// bypass-live → never intercept`,

  cacheQuota: `// navigator.storage.estimate() — origin usage/quota
// WolfWatch keeps Cache Storage tiny; live JSON never stored`,

  httpCacheControl: `// HTTP Cache-Control (src/lib/sw/httpCache.ts)
parseCacheControl("max-age=3600, stale-while-revalidate=600, immutable")
// → { maxAge: 3600, staleWhileRevalidate: 600, immutable: true }

decideStore({ cacheControl, status, contentHashed })
// no-store → mayStore false
// no-cache / must-revalidate → revalidateBeforeServe true
// immutable || contentHashed → preferImmutable true

// SW putRuntime: if (!mayStoreResponse(res)) return
// SW fetch mutable: if (no-cache && !fresh) await revalidateConditional`,

  evictionPolicy: `// Cache Storage eviction policy (EVICTION_POLICY)
maxRuntimeEntries: 48       // soft cap
pressureTargetEntries: 24   // TRIM / QuotaExceeded
mutableMaxAgeMs: 7d         // secondary eviction preference
shellPrecacheOnly: true     // shell never unbounded
neverHosts: swpc, usgs, donki, sdo, soho, helioviewer
// Primary order: LRU. Secondary: stale mutable before immutable-hash.`,

  shortcutsImpl: `// Manifest shortcuts → ?tab= → syncTabToUrl`,

  solarCoreHeavy: `// Lite: heavy:false skips X-ray / protons / ENLIL / OVATION`,
} as const;
