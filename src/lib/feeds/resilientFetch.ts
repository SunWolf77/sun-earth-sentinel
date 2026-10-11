/**
 * Shared resilient fetch for SES server proxies.
 * Timeout + limited retries on 5xx/network, plus a tiny last-good cache.
 * Warm-instance only — serverless instances do not share memory.
 */

export type RetryOpts = {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
};

const DEFAULT_TIMEOUT = 8_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_DELAY = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** Fetch with timeout and retries. Throws on final failure. */
export async function fetchWithRetry(
  url: string,
  opts: RetryOpts = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const delay = opts.retryDelayMs ?? DEFAULT_DELAY;

  let lastErr: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: opts.method,
        body: opts.body,
        headers: opts.headers,
        signal: ctrl.signal,
      });
      if (res.ok || !isRetryableStatus(res.status)) {
        clearTimeout(t);
        return res;
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr =
        e instanceof Error
          ? e.name === "AbortError"
            ? new Error("timeout")
            : e
          : new Error("fetch failed");
    } finally {
      clearTimeout(t);
    }
    if (i < retries) await sleep(delay * (i + 1));
  }

  throw lastErr ?? new Error("fetch failed");
}

/** Per-key last-good store. Optional TTL; expired entries are still returned if nothing fresher. */
export class LastGood<T> {
  private map = new Map<string, { at: number; value: T }>();

  constructor(private ttlMs = 30 * 60_000) {}

  set(key: string, value: T): void {
    this.map.set(key, { at: Date.now(), value });
  }

  get(key: string): T | undefined {
    return this.map.get(key)?.value;
  }

  /** Fresh if within TTL. */
  getFresh(key: string): T | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at > this.ttlMs) return undefined;
    return hit.value;
  }
}
