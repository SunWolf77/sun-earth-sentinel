/**
 * Pure true-LRU (ES6 Map insertion order).
 * Used by unit tests; mirrors public/sw.js in-memory path.
 */

export type LruEvictEvent = { victim: string; sizeAfter: number };

export class TrueLru {
  private map = new Map<string, true>();
  readonly max: number;
  readonly onEvict?: (e: LruEvictEvent) => void;

  constructor(max: number, onEvict?: (e: LruEvictEvent) => void) {
    if (max < 1) throw new Error("max must be >= 1");
    this.max = max;
    this.onEvict = onEvict;
  }

  get size(): number {
    return this.map.size;
  }

  /** Oldest → newest */
  order(): string[] {
    return [...this.map.keys()];
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  /** Move to MRU; evict oldest while over max. Returns victims. */
  touch(key: string): string[] {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, true);
    const victims: string[] = [];
    while (this.map.size > this.max) {
      const victim = this.map.keys().next().value as string;
      this.map.delete(victim);
      victims.push(victim);
      this.onEvict?.({ victim, sizeAfter: this.map.size });
    }
    return victims;
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  /** Restore order from persisted meta (oldest first). */
  load(order: string[]): void {
    this.map.clear();
    for (const k of order) {
      if (typeof k === "string" && k) this.map.set(k, true);
    }
    // Cap after load
    while (this.map.size > this.max) {
      const victim = this.map.keys().next().value as string;
      this.map.delete(victim);
    }
  }
}

/** SWR invalidation policy decision (pure). */
export type SwrKind = "immutable-hash" | "shell" | "mutable-static" | "bypass-live";

export function classifyAssetUrl(pathname: string): SwrKind {
  if (
    pathname.startsWith("/_server") ||
    pathname.includes("DONKI")
  ) {
    return "bypass-live";
  }
  // Vite content-hashed assets: /assets/index-Ab12Cd.js
  if (/\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?)$/i.test(pathname)) {
    return "immutable-hash";
  }
  if (pathname === "/" || pathname.endsWith(".html") || pathname.endsWith("manifest.webmanifest")) {
    return "shell";
  }
  if (/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(pathname)) {
    return "mutable-static";
  }
  return "mutable-static";
}

export type SwrStrategy = {
  kind: SwrKind;
  /** Return cached body immediately if present */
  serveCacheFirst: boolean;
  /** Kick network revalidate after serving cache */
  revalidateInBackground: boolean;
  /** Prefer conditional If-None-Match / If-Modified-Since when revalidating */
  conditional: boolean;
  /** Treat as immutable — skip revalidate entirely */
  skipRevalidate: boolean;
  note: string;
};

export function swrStrategyFor(kind: SwrKind): SwrStrategy {
  switch (kind) {
    case "immutable-hash":
      return {
        kind,
        serveCacheFirst: true,
        revalidateInBackground: false,
        conditional: false,
        skipRevalidate: true,
        note: "Content-hashed URL change = new key; old key LRU-evicted. No revalidate needed.",
      };
    case "shell":
      return {
        kind,
        serveCacheFirst: false,
        revalidateInBackground: false,
        conditional: true,
        skipRevalidate: false,
        note: "Network-first; shell snapshot is fallback only. Conditional GET when possible.",
      };
    case "mutable-static":
      return {
        kind,
        serveCacheFirst: true,
        revalidateInBackground: true,
        conditional: true,
        skipRevalidate: false,
        note: "SWR: serve cache, revalidate with If-None-Match when ETag known.",
      };
    case "bypass-live":
      return {
        kind,
        serveCacheFirst: false,
        revalidateInBackground: false,
        conditional: false,
        skipRevalidate: true,
        note: "Never cache live space-weather / seismic JSON.",
      };
  }
}
