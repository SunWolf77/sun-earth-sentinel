/**
 * Cache Storage quota investigation helpers (browser only).
 * Spec: StorageManager.estimate()
 *
 * Practical notes:
 *  - Quotas are origin-scoped and browser-dependent (often a % of free disk, with caps).
 *  - estimate().usage includes Cache Storage + IndexedDB + sometimes OPFS — not SW-only.
 *  - quota can shrink under pressure; browser may evict non-persisted data.
 *  - navigator.storage.persist() requests durable storage (permissioned).
 *  - WolfWatch: shell+runtime caches stay small; live SWPC/USGS never enter Cache Storage.
 *    localStorage soft-limit (ww_*) is a separate layer.
 */

export type QuotaSnapshot = {
  supported: boolean;
  usage: number | null;
  quota: number | null;
  usageDetails: Record<string, number> | null;
  persisted: boolean | null;
  cacheNames: string[];
  approxCacheEntries: number;
  note: string;
};

export function formatBytes(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function probeCacheQuota(): Promise<QuotaSnapshot> {
  if (typeof navigator === "undefined" || !("storage" in navigator)) {
    return {
      supported: false,
      usage: null,
      quota: null,
      usageDetails: null,
      persisted: null,
      cacheNames: [],
      approxCacheEntries: 0,
      note: "StorageManager not available in this environment.",
    };
  }

  let usage: number | null = null;
  let quota: number | null = null;
  let usageDetails: Record<string, number> | null = null;
  let persisted: boolean | null = null;

  try {
    const est = await navigator.storage.estimate();
    usage = est.usage ?? null;
    quota = est.quota ?? null;
    const details = (est as { usageDetails?: Record<string, number> }).usageDetails;
    if (details) usageDetails = details;
  } catch {
    /* ignore */
  }

  try {
    if (navigator.storage.persisted) persisted = await navigator.storage.persisted();
  } catch {
    persisted = null;
  }

  let cacheNames: string[] = [];
  let approxCacheEntries = 0;
  try {
    if ("caches" in globalThis) {
      cacheNames = (await caches.keys()).filter(
        (k) => k.startsWith("ww-shell") || k.startsWith("ww-runtime"),
      );
      for (const name of cacheNames) {
        const c = await caches.open(name);
        const keys = await c.keys();
        approxCacheEntries += keys.length;
      }
    }
  } catch {
    /* ignore */
  }

  const pctStr =
    usage != null && quota != null && quota > 0
      ? ` · ${((100 * usage) / quota).toFixed(1)}% of estimate quota`
      : "";

  return {
    supported: true,
    usage,
    quota,
    usageDetails,
    persisted,
    cacheNames,
    approxCacheEntries,
    note: `Origin storage ~${formatBytes(usage)} / ${formatBytes(quota)}${pctStr}. WolfWatch caches: ${cacheNames.join(", ") || "none"} (${approxCacheEntries} entries). Live feeds never use Cache Storage.`,
  };
}
