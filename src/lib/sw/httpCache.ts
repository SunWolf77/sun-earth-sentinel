/**
 * HTTP Cache-Control / freshness helpers (pure, unit-tested).
 * Spec: https://www.rfc-editor.org/rfc/rfc9111
 *
 * Used to decide whether the service worker may store a Response and
 * how aggressively SWR should revalidate.
 */

export type CacheControlDirectives = {
  noStore: boolean;
  noCache: boolean;
  private: boolean;
  public: boolean;
  mustRevalidate: boolean;
  immutable: boolean;
  maxAge: number | null;
  sMaxAge: number | null;
  staleWhileRevalidate: number | null;
  staleIfError: number | null;
};

export function parseCacheControl(header: string | null | undefined): CacheControlDirectives {
  const out: CacheControlDirectives = {
    noStore: false,
    noCache: false,
    private: false,
    public: false,
    mustRevalidate: false,
    immutable: false,
    maxAge: null,
    sMaxAge: null,
    staleWhileRevalidate: null,
    staleIfError: null,
  };
  if (!header) return out;
  const parts = header.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
  for (const p of parts) {
    if (p === "no-store") out.noStore = true;
    else if (p === "no-cache") out.noCache = true;
    else if (p === "private") out.private = true;
    else if (p === "public") out.public = true;
    else if (p === "must-revalidate") out.mustRevalidate = true;
    else if (p === "immutable") out.immutable = true;
    else if (p.startsWith("max-age=")) {
      const n = Number(p.slice(8));
      if (Number.isFinite(n) && n >= 0) out.maxAge = n;
    } else if (p.startsWith("s-maxage=")) {
      const n = Number(p.slice(9));
      if (Number.isFinite(n) && n >= 0) out.sMaxAge = n;
    } else if (p.startsWith("stale-while-revalidate=")) {
      const n = Number(p.slice("stale-while-revalidate=".length));
      if (Number.isFinite(n) && n >= 0) out.staleWhileRevalidate = n;
    } else if (p.startsWith("stale-if-error=")) {
      const n = Number(p.slice("stale-if-error=".length));
      if (Number.isFinite(n) && n >= 0) out.staleIfError = n;
    }
  }
  return out;
}

export type StoreDecision = {
  mayStore: boolean;
  reason: string;
  preferImmutable: boolean;
  revalidateBeforeServe: boolean;
  maxAgeSec: number | null;
};

/** Decide if SW Cache Storage may keep this response. */
export function decideStore(opts: {
  cacheControl: string | null | undefined;
  status: number;
  /** true for content-hashed Vite assets */
  contentHashed?: boolean;
}): StoreDecision {
  const cc = parseCacheControl(opts.cacheControl);
  if (opts.status !== 200 && opts.status !== 0) {
    return {
      mayStore: false,
      reason: `non-OK status ${opts.status}`,
      preferImmutable: false,
      revalidateBeforeServe: true,
      maxAgeSec: null,
    };
  }
  if (cc.noStore) {
    return {
      mayStore: false,
      reason: "Cache-Control: no-store",
      preferImmutable: false,
      revalidateBeforeServe: true,
      maxAgeSec: null,
    };
  }
  // private responses: still OK for same-origin SW shell (single user browser)
  // but we flag revalidate
  const maxAgeSec = cc.sMaxAge ?? cc.maxAge;
  const preferImmutable = Boolean(cc.immutable || opts.contentHashed);
  return {
    mayStore: true,
    reason: preferImmutable
      ? "store (immutable / content-hashed)"
      : cc.noCache
        ? "store but revalidate before serve (no-cache)"
        : "store (default SW policy)",
    preferImmutable,
    revalidateBeforeServe: Boolean(cc.noCache || cc.mustRevalidate),
    maxAgeSec,
  };
}

export type Freshness = {
  fresh: boolean;
  ageSec: number;
  maxAgeSec: number | null;
  withinSwrWindow: boolean;
  withinSieWindow: boolean;
};

/** Freshness from Date header + Cache-Control max-age (or override). */
export function freshnessFrom(
  storedAtMs: number,
  nowMs: number,
  cacheControl: string | null | undefined,
): Freshness {
  const cc = parseCacheControl(cacheControl);
  const ageSec = Math.max(0, (nowMs - storedAtMs) / 1000);
  const maxAgeSec = cc.sMaxAge ?? cc.maxAge;
  const fresh = maxAgeSec == null ? true : ageSec <= maxAgeSec;
  const swr = cc.staleWhileRevalidate ?? 0;
  const sie = cc.staleIfError ?? 86_400; // default 1d stale-if-error for shell assets
  return {
    fresh,
    ageSec,
    maxAgeSec,
    withinSwrWindow: maxAgeSec != null ? ageSec <= maxAgeSec + swr : true,
    withinSieWindow: ageSec <= (maxAgeSec ?? 0) + sie || maxAgeSec == null,
  };
}

/** Cache Storage eviction policy constants (documented + tested). */
export const EVICTION_POLICY = {
  /** Soft cap on runtime cache entries */
  maxRuntimeEntries: 48,
  /** Under storage pressure, trim to this many */
  pressureTargetEntries: 24,
  /** Mutable-static entries older than this are preferred victims (secondary to LRU) */
  mutableMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  /** Shell cache never exceeds precache set */
  shellPrecacheOnly: true,
  /** Never store these host patterns */
  neverHosts: [
    "swpc.noaa.gov",
    "earthquake.usgs.gov",
    "ccmc.gsfc.nasa.gov",
    "sdo.gsfc.nasa.gov",
    "nascom.nasa.gov",
    "helioviewer.org",
  ],
} as const;

/**
 * Pick victims when over soft/hard cap.
 * Primary: LRU order (oldest first).
 * Secondary: prefer non-immutable / older mutable when ages provided.
 */
export function pickEvictionVictims(opts: {
  orderOldestFirst: string[];
  overBy: number;
  isImmutable?: (url: string) => boolean;
  ageMs?: (url: string) => number;
  mutableMaxAgeMs?: number;
}): string[] {
  if (opts.overBy <= 0) return [];
  const mutableMax = opts.mutableMaxAgeMs ?? EVICTION_POLICY.mutableMaxAgeMs;
  const scored = opts.orderOldestFirst.map((url, idx) => {
    const imm = opts.isImmutable?.(url) ?? false;
    const age = opts.ageMs?.(url) ?? 0;
    const staleMutable = !imm && age > mutableMax;
    // Higher score = evict first. LRU index dominates; stale mutable gets boost.
    const score = idx + (staleMutable ? -0.5 : 0) + (imm ? 1000 : 0);
    return { url, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, opts.overBy).map((s) => s.url);
}
