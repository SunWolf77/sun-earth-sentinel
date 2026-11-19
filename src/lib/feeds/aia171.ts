import { createServerFn } from "@tanstack/react-start";
import { fetchWithRetry, LastGood } from "@/lib/feeds/resilientFetch";

const FILE = /(\d{8})_(\d{6})_1024_0171\.jpg/g;

export type AiaFrame = { time: string; url: string };

export function parseAia171(html: string, pageUrl: string): AiaFrame[] {
  const seen = new Set<string>();
  const out: AiaFrame[] = [];
  for (const m of html.matchAll(FILE)) {
    const name = `${m[1]}_${m[2]}_1024_0171.jpg`;
    if (seen.has(name)) continue;
    seen.add(name);
    const y = m[1].slice(0, 4);
    const mo = m[1].slice(4, 6);
    const d = m[1].slice(6, 8);
    out.push({
      time: `${y}-${mo}-${d}T${m[2].slice(0, 2)}:${m[2].slice(2, 4)}:${m[2].slice(4, 6)}Z`,
      url: new URL(name, pageUrl).href,
    });
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

function dayUrl(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `https://sdo.gsfc.nasa.gov/assets/img/browse/${y}/${mo}/${day}/`;
}

const cache = new LastGood<AiaFrame[]>(15 * 60_000);

/** SDO AIA 171 browse frames, about 10 minutes apart. These are the coronal loops. */
export const fetchAia171 = createServerFn({ method: "GET" }).handler(async (): Promise<AiaFrame[]> => {
  try {
    const pages = [dayUrl(0), dayUrl(-1)];
    const lists = await Promise.all(
      pages.map(async (page) => {
        const res = await fetchWithRetry(page, { timeoutMs: 12_000, retries: 1 });
        if (!res.ok) return [];
        return parseAia171(await res.text(), page);
      }),
    );
    const frames = lists.flat().sort((a, b) => a.time.localeCompare(b.time)).slice(-36);
    if (frames.length) cache.set("aia171", frames);
    return frames;
  } catch (e) {
    const hit = cache.get("aia171");
    if (hit?.length) return hit;
    throw e;
  }
});
