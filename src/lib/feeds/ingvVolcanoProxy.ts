/**
 * Server-side fetch for INGV status pages (CORS-blocked in browsers).
 */

import { createServerFn } from "@tanstack/react-start";

const ALLOWED = new Set([
  "https://www.ov.ingv.it/index.php/flegrei-stato-attuale",
  "https://www.ov.ingv.it/index.php/vesuvio-stato-attuale",
  "https://www.ct.ingv.it/",
]);

export const fetchIngvStatusHtml = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) => {
    const url = String(input?.url || "");
    if (!ALLOWED.has(url)) throw new Error("INGV url not allowed");
    return { url };
  })
  .handler(async ({ data }): Promise<{ url: string; html: string | null; status: number }> => {
    const { url } = data;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; SunEarthSentinel/1.0; observational volcano status)",
        },
      });
      if (!res.ok) return { url, html: null, status: res.status };
      const html = await res.text();
      return { url, html: html.slice(0, 250_000), status: res.status };
    } catch {
      return { url, html: null, status: 0 };
    }
  });
