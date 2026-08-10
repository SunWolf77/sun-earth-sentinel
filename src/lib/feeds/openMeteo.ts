/**
 * Open-Meteo free weather / marine samples (no API key).
 * Used for wind particles, point probe, cloud/CAPE grids, waves.
 * Not an official forecast product — model guidance only.
 */

export type WindSample = {
  lat: number;
  lon: number;
  /** km/h */
  speedKmh: number;
  /** Meteorological direction: degrees FROM which wind blows (0=N) */
  dirDeg: number;
  /** Eastward m/s */
  u: number;
  /** Northward m/s */
  v: number;
};

export type WeatherProbe = {
  lat: number;
  lon: number;
  time: string | null;
  windSpeedKmh: number | null;
  windDirDeg: number | null;
  tempC: number | null;
  precipMm: number | null;
  cloudPct: number | null;
  capeJkg: number | null;
  waveHeightM: number | null;
  waveDirDeg: number | null;
  wavePeriodS: number | null;
  source: "open-meteo";
};

export type GridScalar = {
  lat: number;
  lon: number;
  value: number;
};

const OM = "https://api.open-meteo.com/v1/forecast";
const MARINE = "https://marine-api.open-meteo.com/v1/marine";

/** Simple in-memory cache to avoid Open-Meteo 429s */
const cache = new Map<string, { at: number; data: unknown }>();
const CACHE_TTL = 8 * 60_000;

async function cachedJson(key: string, url: string): Promise<unknown | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;
  const res = await fetch(url);
  if (!res.ok) {
    if (hit) return hit.data;
    return null;
  }
  const data = await res.json();
  cache.set(key, { at: Date.now(), data });
  return data;
}

function dirSpeedToUV(speedKmh: number, dirDeg: number): { u: number; v: number } {
  // Convert km/h → m/s for advection scale
  const sp = speedKmh / 3.6;
  const rad = (dirDeg * Math.PI) / 180;
  // Wind FROM direction → vector TO is opposite
  return {
    u: -sp * Math.sin(rad),
    v: -sp * Math.cos(rad),
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Build a lat/lon grid covering bounds (inclusive-ish). */
export function buildGeoGrid(
  south: number,
  west: number,
  north: number,
  east: number,
  cols: number,
  rows: number,
): { lats: number[]; lons: number[] } {
  const s = clamp(south, -85, 85);
  const n = clamp(north, -85, 85);
  let w = west;
  let e = east;
  if (e < w) {
    // antimeridian — sample shorter arc
    e = w + Math.min(180, 360 - (w - e));
  }
  const lats: number[] = [];
  const lons: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const lon = w + ((e - w) * (i + 0.5)) / cols;
      const lat = s + ((n - s) * (j + 0.5)) / rows;
      lats.push(lat);
      lons.push((((lon + 540) % 360) - 180));
    }
  }
  return { lats, lons };
}

type OmCurrentBlock = {
  latitude?: number;
  longitude?: number;
  current?: {
    time?: string;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    temperature_2m?: number;
    precipitation?: number;
    cloud_cover?: number;
    cape?: number;
  };
};

async function fetchMultiCurrent(
  lats: number[],
  lons: number[],
  hourlyVars: string,
): Promise<OmCurrentBlock[]> {
  if (!lats.length) return [];
  const BATCH = 24;
  const out: OmCurrentBlock[] = [];
  for (let i = 0; i < lats.length; i += BATCH) {
    const la = lats.slice(i, i + BATCH);
    const lo = lons.slice(i, i + BATCH);
    const key = `om:${hourlyVars}:${la.map((x) => x.toFixed(2)).join(",")}:${lo.map((x) => x.toFixed(2)).join(",")}`;
    const url =
      `${OM}?latitude=${la.map((x) => x.toFixed(3)).join(",")}` +
      `&longitude=${lo.map((x) => x.toFixed(3)).join(",")}` +
      `&current=${hourlyVars}&timezone=UTC`;
    try {
      const data = await cachedJson(key, url);
      if (!data) continue;
      if (Array.isArray(data)) out.push(...(data as OmCurrentBlock[]));
      else out.push(data as OmCurrentBlock);
    } catch {
      /* skip batch */
    }
    // polite spacing between batches
    if (i + BATCH < lats.length) await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

export async function fetchWindGrid(
  south: number,
  west: number,
  north: number,
  east: number,
  cols = 10,
  rows = 7,
): Promise<WindSample[]> {
  const { lats, lons } = buildGeoGrid(south, west, north, east, cols, rows);
  const blocks = await fetchMultiCurrent(lats, lons, "wind_speed_10m,wind_direction_10m");
  const samples: WindSample[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    const lat = b.latitude ?? lats[i]!;
    const lon = b.longitude ?? lons[i]!;
    const speed = Number(b.current?.wind_speed_10m);
    const dir = Number(b.current?.wind_direction_10m);
    if (!Number.isFinite(speed) || !Number.isFinite(dir)) continue;
    const { u, v } = dirSpeedToUV(speed, dir);
    samples.push({ lat, lon, speedKmh: speed, dirDeg: dir, u, v });
  }
  return samples;
}

export async function fetchCloudGrid(
  south: number,
  west: number,
  north: number,
  east: number,
  cols = 10,
  rows = 7,
): Promise<GridScalar[]> {
  const { lats, lons } = buildGeoGrid(south, west, north, east, cols, rows);
  const blocks = await fetchMultiCurrent(lats, lons, "cloud_cover");
  const out: GridScalar[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    const v = Number(b.current?.cloud_cover);
    if (!Number.isFinite(v)) continue;
    out.push({
      lat: b.latitude ?? lats[i]!,
      lon: b.longitude ?? lons[i]!,
      value: v,
    });
  }
  return out;
}

export async function fetchCapeGrid(
  south: number,
  west: number,
  north: number,
  east: number,
  cols = 8,
  rows = 6,
): Promise<GridScalar[]> {
  const { lats, lons } = buildGeoGrid(south, west, north, east, cols, rows);
  const blocks = await fetchMultiCurrent(lats, lons, "cape");
  const out: GridScalar[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    const v = Number(b.current?.cape);
    if (!Number.isFinite(v)) continue;
    out.push({
      lat: b.latitude ?? lats[i]!,
      lon: b.longitude ?? lons[i]!,
      value: v,
    });
  }
  return out;
}

export async function fetchWeatherProbe(lat: number, lon: number): Promise<WeatherProbe> {
  const base: WeatherProbe = {
    lat,
    lon,
    time: null,
    windSpeedKmh: null,
    windDirDeg: null,
    tempC: null,
    precipMm: null,
    cloudPct: null,
    capeJkg: null,
    waveHeightM: null,
    waveDirDeg: null,
    wavePeriodS: null,
    source: "open-meteo",
  };
  try {
    const url =
      `${OM}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&current=wind_speed_10m,wind_direction_10m,temperature_2m,precipitation,cloud_cover,cape` +
      `&timezone=UTC`;
    const res = await fetch(url);
    if (res.ok) {
      const d = (await res.json()) as OmCurrentBlock;
      const c = d.current;
      base.time = c?.time ?? null;
      base.windSpeedKmh = numOrNull(c?.wind_speed_10m);
      base.windDirDeg = numOrNull(c?.wind_direction_10m);
      base.tempC = numOrNull(c?.temperature_2m);
      base.precipMm = numOrNull(c?.precipitation);
      base.cloudPct = numOrNull(c?.cloud_cover);
      base.capeJkg = numOrNull(c?.cape);
    }
  } catch {
    /* graceful */
  }
  try {
    const murl =
      `${MARINE}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&current=wave_height,wave_direction,wave_period`;
    const mres = await fetch(murl);
    if (mres.ok) {
      const md = await mres.json();
      const c = md.current as {
        wave_height?: number;
        wave_direction?: number;
        wave_period?: number;
      } | undefined;
      base.waveHeightM = numOrNull(c?.wave_height);
      base.waveDirDeg = numOrNull(c?.wave_direction);
      base.wavePeriodS = numOrNull(c?.wave_period);
    }
  } catch {
    /* land or fail */
  }
  return base;
}

export async function fetchWaveGrid(
  south: number,
  west: number,
  north: number,
  east: number,
  cols = 8,
  rows = 5,
): Promise<GridScalar[]> {
  const { lats, lons } = buildGeoGrid(south, west, north, east, cols, rows);
  const out: GridScalar[] = [];
  const BATCH = 20;
  for (let i = 0; i < lats.length; i += BATCH) {
    const la = lats.slice(i, i + BATCH);
    const lo = lons.slice(i, i + BATCH);
    try {
      const url =
        `${MARINE}?latitude=${la.map((x) => x.toFixed(3)).join(",")}` +
        `&longitude=${lo.map((x) => x.toFixed(3)).join(",")}` +
        `&current=wave_height`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const blocks = Array.isArray(data) ? data : [data];
      for (let k = 0; k < blocks.length; k++) {
        const b = blocks[k] as {
          latitude?: number;
          longitude?: number;
          current?: { wave_height?: number };
        };
        const v = Number(b.current?.wave_height);
        if (!Number.isFinite(v) || v < 0) continue;
        out.push({
          lat: b.latitude ?? la[k]!,
          lon: b.longitude ?? lo[k]!,
          value: v,
        });
      }
    } catch {
      /* skip batch */
    }
  }
  return out;
}

function numOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Bilinear-ish nearest wind sample for particle advection */
export function sampleWind(
  samples: WindSample[],
  lat: number,
  lon: number,
): { u: number; v: number; speedKmh: number } | null {
  if (!samples.length) return null;
  let best = samples[0]!;
  let bestD = Infinity;
  for (const s of samples) {
    const dlat = s.lat - lat;
    let dlon = s.lon - lon;
    if (dlon > 180) dlon -= 360;
    if (dlon < -180) dlon += 360;
    const d = dlat * dlat + dlon * dlon;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  // Reject if absurdly far (empty ocean gap)
  if (bestD > 25) return null; // ~5°
  return { u: best.u, v: best.v, speedKmh: best.speedKmh };
}
