import { createServerFn } from "@tanstack/react-start";
import { fetchWithRetry, LastGood } from "@/lib/feeds/resilientFetch";

const LOS = "https://gong.nso.edu/data/magmap/mod4.html";
const EARTH = "https://gong.nso.edu/data/magmap/mod6.html";

export type PfssViews = {
  los: string | null;
  earth: string | null;
};

export function pfssImage(html: string, pageUrl: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+\.(?:gif|png|jpg|jpeg))["']/i);
  if (!m?.[1]) return null;
  try {
    return new URL(m[1], pageUrl).href;
  } catch {
    return null;
  }
}

const cache = new LastGood<PfssViews>(30 * 60_000);

async function one(page: string): Promise<string | null> {
  const res = await fetchWithRetry(page, { timeoutMs: 10_000, retries: 1 });
  if (!res.ok) return null;
  return pfssImage(await res.text(), page);
}

/** Latest GONG potential-field plots. Null when the site does not answer. */
export const fetchPfss = createServerFn({ method: "GET" }).handler(async (): Promise<PfssViews> => {
  try {
    const [los, earth] = await Promise.all([
      one(LOS).catch(() => null),
      one(EARTH).catch(() => null),
    ]);
    const views = { los, earth };
    if (los || earth) cache.set("pfss", views);
    return views;
  } catch {
    return cache.get("pfss") ?? { los: null, earth: null };
  }
});
