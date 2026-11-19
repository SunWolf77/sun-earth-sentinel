import { createServerFn } from "@tanstack/react-start";
import { fetchWithRetry, LastGood } from "@/lib/feeds/resilientFetch";

const DIR = "https://services.swpc.noaa.gov/images/animations/ccor1/";
const FILE = /(\d{8})_(\d{4})_ccor1_1024by960\.jpg/g;

export type CcorFrame = {
  time: string;
  url: string;
};

/** Newest frames last. Same file name from the directory listing is one frame. */
export function parseCcorListing(html: string): CcorFrame[] {
  const seen = new Set<string>();
  const out: CcorFrame[] = [];
  for (const m of html.matchAll(FILE)) {
    const name = `${m[1]}_${m[2]}_ccor1_1024by960.jpg`;
    if (seen.has(name)) continue;
    seen.add(name);
    const y = m[1].slice(0, 4);
    const mo = m[1].slice(4, 6);
    const d = m[1].slice(6, 8);
    const hh = m[2].slice(0, 2);
    const mm = m[2].slice(2, 4);
    out.push({
      time: `${y}-${mo}-${d}T${hh}:${mm}:00Z`,
      url: `${DIR}${name}`,
    });
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

const cache = new LastGood<CcorFrame[]>(10 * 60_000);

/** Last 12 hours of GOES CCOR-1 stills, 15 minutes apart. The CME in a coronagraph is the motion between these frames. */
export const fetchCcorFrames = createServerFn({ method: "GET" }).handler(async (): Promise<CcorFrame[]> => {
  try {
    const res = await fetchWithRetry(DIR, { timeoutMs: 12_000 });
    if (!res.ok) throw new Error(`CCOR ${res.status}`);
    const frames = parseCcorListing(await res.text()).slice(-120);
    if (frames.length) cache.set("ccor", frames);
    return frames;
  } catch (e) {
    const hit = cache.get("ccor");
    if (hit?.length) return hit;
    throw e;
  }
});
