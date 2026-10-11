/**
 * Server-side fetch for INGV status pages (CORS-blocked in browsers).
 * Fallback: retry on 5xx/timeout, then last-good HTML for the same URL.
 */

import { createServerFn } from "@tanstack/react-start";
import { fetchWithRetry, LastGood } from "@/lib/feeds/resilientFetch";

const ALLOWED = new Set([
  "https://www.ov.ingv.it/index.php/flegrei-stato-attuale",
  "https://www.ov.ingv.it/index.php/vesuvio-stato-attuale",
  "https://www.ct.ingv.it/",
]);

type IngvHit = { url: string; html: string; status: number; fetchedAt: number };
const cache = new LastGood<IngvHit>();

export const fetchIngvStatusHtml = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) => {
    const url = String(input?.url || "");
    if (!ALLOWED.has(url)) throw new Error("INGV url not allowed");
    return { url };
  })
  .handler(async ({ data }): Promise<{ url: string; html: string | null; status: number; fromCache?: boolean }> => {
    const { url } = data;
    try {
      const res = await fetchWithRetry(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; SunEarthSentinel/1.0; observational volcano status)",
        },
        timeoutMs: 10_000,
      });
      if (!res.ok) {
        const hit = cache.get(url);
        if (hit) return { url, html: hit.html, status: hit.status, fromCache: true };
        return { url, html: null, status: res.status };
      }
      const html = (await res.text()).slice(0, 250_000);
      cache.set(url, { url, html, status: res.status, fetchedAt: Date.now() });
      return { url, html, status: res.status };
    } catch (e) {
      const hit = cache.get(url);
      if (hit) return { url, html: hit.html, status: hit.status, fromCache: true };
      return { url, html: null, status: 0 };
    }
  });
