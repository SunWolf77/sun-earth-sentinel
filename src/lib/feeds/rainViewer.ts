/**
 * RainViewer public weather maps (radar tiles) — free, no key.
 * https://www.rainviewer.com/api.html
 */

export type RainViewerFrame = {
  time: number;
  path: string;
};

export type RainViewerMaps = {
  host: string;
  generated: number;
  radarPast: RainViewerFrame[];
  radarNowcast: RainViewerFrame[];
};

let cache: { at: number; data: RainViewerMaps | null } = { at: 0, data: null };
const TTL_MS = 3 * 60_000;

export async function fetchRainViewerMaps(force = false): Promise<RainViewerMaps | null> {
  if (!force && cache.data && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!res.ok) return cache.data;
    const j = await res.json();
    const data: RainViewerMaps = {
      host: String(j.host || "https://tilecache.rainviewer.com"),
      generated: Number(j.generated) || 0,
      radarPast: Array.isArray(j.radar?.past)
        ? j.radar.past.map((f: { time: number; path: string }) => ({
            time: f.time,
            path: f.path,
          }))
        : [],
      radarNowcast: Array.isArray(j.radar?.nowcast)
        ? j.radar.nowcast.map((f: { time: number; path: string }) => ({
            time: f.time,
            path: f.path,
          }))
        : [],
    };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return cache.data;
  }
}

/** Latest radar frame path for tiles. */
export function latestRadarFrame(maps: RainViewerMaps | null): RainViewerFrame | null {
  if (!maps?.radarPast.length) return null;
  return maps.radarPast[maps.radarPast.length - 1]!;
}

/**
 * Tile URL template for Leaflet.
 * size 256, color 2 (universal blue), options 1_1 (smooth + snow)
 */
export function rainViewerTileUrl(host: string, framePath: string): string {
  const h = host.replace(/\/$/, "");
  const p = framePath.startsWith("/") ? framePath : `/${framePath}`;
  return `${h}${p}/256/{z}/{x}/{y}/2/1_1.png`;
}

export function formatRadarTime(unix: number): string {
  try {
    return new Date(unix * 1000).toISOString().replace("T", " ").slice(0, 16) + "Z";
  } catch {
    return String(unix);
  }
}
