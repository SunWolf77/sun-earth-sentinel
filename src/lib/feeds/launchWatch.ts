import { createServerFn } from "@tanstack/react-start";
import { fetchWithRetry, LastGood } from "@/lib/feeds/resilientFetch";
import type { ActiveRegion } from "@/lib/feeds/solarRegions";
import type { XraFlare } from "@/lib/feeds/solarRegions";

const SUVI_DIR = "https://services.swpc.noaa.gov/images/animations/suvi/primary/131/";
const SUVI_FILE = /or_suvi-l2-ci131_g19_s(\d{8})T(\d{4})\d{2}Z[^"<> ]+\.png/g;

export type StillFrame = { time: string; url: string };

export type DiskLaunch = {
  klass: string;
  at: string;
  region: number | null;
  facing: boolean;
  where: string;
};

const cache = new LastGood<StillFrame[]>(10 * 60_000);

export function parseSuvi131(html: string): StillFrame[] {
  const seen = new Set<string>();
  const out: StillFrame[] = [];
  for (const m of html.matchAll(SUVI_FILE)) {
    const name = m[0];
    if (seen.has(name)) continue;
    seen.add(name);
    const y = m[1].slice(0, 4);
    const mo = m[1].slice(4, 6);
    const d = m[1].slice(6, 8);
    out.push({
      time: `${y}-${mo}-${d}T${m[2].slice(0, 2)}:${m[2].slice(2, 4)}:00Z`,
      url: `${SUVI_DIR}${name}`,
    });
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

/** Last ~80 minutes of GOES SUVI 131. A launch shows as a brightening, then dimming, in this band. */
export const fetchSuvi131 = createServerFn({ method: "GET" }).handler(async (): Promise<StillFrame[]> => {
  try {
    const res = await fetchWithRetry(SUVI_DIR, { timeoutMs: 12_000 });
    if (!res.ok) throw new Error(`SUVI ${res.status}`);
    const frames = parseSuvi131(await res.text()).slice(-20);
    if (frames.length) cache.set("suvi131", frames);
    return frames;
  } catch (e) {
    const hit = cache.get("suvi131");
    if (hit?.length) return hit;
    throw e;
  }
});

/** M or X flares in the last 6 hours, marked when the region is still on the Earth-facing disk. */
export function diskLaunches(
  xra: XraFlare[] | undefined,
  regions: ActiveRegion[] | undefined,
  now = Date.now(),
): DiskLaunch[] {
  const out: DiskLaunch[] = [];
  for (const f of xra ?? []) {
    if (!/^[MX]/i.test(f.klass)) continue;
    const t = Date.parse(f.at);
    if (!Number.isFinite(t) || now - t > 6 * 3600_000 || t > now + 120_000) continue;
    const region = regions?.find((r) => r.region === f.region);
    const facing = region != null && (region.phase === "direct" || region.phase === "entering" || region.phase === "leaving");
    const where =
      region?.phase === "direct"
        ? "center disk"
        : region
          ? region.phaseLabel
          : f.region
            ? "not on the latest disk file"
            : "region not named";
    out.push({ klass: f.klass, at: f.at, region: f.region, facing, where });
  }
  out.sort((a, b) => b.at.localeCompare(a.at));
  return out.slice(0, 3);
}
