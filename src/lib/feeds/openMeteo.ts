/**
 * Open-Meteo free weather / marine / air-quality samples (no API key).
 * Model guidance only — not an official forecast product.
 */

export type WeatherModelId = "best_match" | "gfs_seamless" | "icon_seamless" | "ecmwf_ifs025";

export const WEATHER_MODELS: {
  id: WeatherModelId;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    id: "best_match",
    label: "Best match",
    short: "Auto",
    hint: "Open-Meteo blends best local/global models",
  },
  {
    id: "gfs_seamless",
    label: "GFS seamless",
    short: "GFS",
    hint: "NOAA GFS global",
  },
  {
    id: "icon_seamless",
    label: "ICON seamless",
    short: "ICON",
    hint: "DWD ICON global",
  },
  {
    id: "ecmwf_ifs025",
    label: "ECMWF IFS 0.25°",
    short: "ECMWF",
    hint: "ECMWF IFS open data",
  },
];

const MODEL_STORAGE_KEY = "wolfwatch_wx_model_v1";

export function loadWeatherModel(): WeatherModelId {
  if (typeof window === "undefined") return "best_match";
  try {
    const v = localStorage.getItem(MODEL_STORAGE_KEY);
    if (
      v === "best_match" ||
      v === "gfs_seamless" ||
      v === "icon_seamless" ||
      v === "ecmwf_ifs025"
    ) {
      return v;
    }
  } catch {
    /* */
  }
  return "best_match";
}

export function saveWeatherModel(id: WeatherModelId): void {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, id);
  } catch {
    /* */
  }
}

export function weatherModelLabel(id: WeatherModelId): string {
  return WEATHER_MODELS.find((m) => m.id === id)?.short ?? id;
}

export type WindSample = {
  lat: number;
  lon: number;
  speedKmh: number;
  dirDeg: number;
  u: number;
  v: number;
};

export type HourlyPoint = {
  time: string;
  tempC: number | null;
  precipMm: number | null;
  windKmh: number | null;
  weatherCode: number | null;
};

export type WeatherProbe = {
  lat: number;
  lon: number;
  time: string | null;
  model: WeatherModelId;
  windSpeedKmh: number | null;
  windDirDeg: number | null;
  windGustKmh: number | null;
  tempC: number | null;
  precipMm: number | null;
  cloudPct: number | null;
  capeJkg: number | null;
  pressureHpa: number | null;
  weatherCode: number | null;
  weatherLabel: string | null;
  waveHeightM: number | null;
  waveDirDeg: number | null;
  wavePeriodS: number | null;
  swellHeightM: number | null;
  pm25: number | null;
  dust: number | null;
  usAqi: number | null;
  hourly: HourlyPoint[];
  source: "open-meteo";
};

export type GridScalar = {
  lat: number;
  lon: number;
  value: number;
};

const OM = "https://api.open-meteo.com/v1/forecast";
const MARINE = "https://marine-api.open-meteo.com/v1/marine";
const AQ = "https://air-quality-api.open-meteo.com/v1/air-quality";

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
  const sp = speedKmh / 3.6;
  const rad = (dirDeg * Math.PI) / 180;
  return {
    u: -sp * Math.sin(rad),
    v: -sp * Math.cos(rad),
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

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

/** WMO Weather interpretation codes (Open-Meteo) — short labels */
export function wmoWeatherLabel(code: number | null | undefined): string | null {
  if (code == null || !Number.isFinite(code)) return null;
  const c = Math.round(code);
  if (c === 0) return "Clear";
  if (c === 1) return "Mainly clear";
  if (c === 2) return "Partly cloudy";
  if (c === 3) return "Overcast";
  if (c === 45 || c === 48) return "Fog";
  if (c >= 51 && c <= 57) return "Drizzle";
  if (c >= 61 && c <= 67) return "Rain";
  if (c >= 71 && c <= 77) return "Snow";
  if (c >= 80 && c <= 82) return "Rain showers";
  if (c >= 85 && c <= 86) return "Snow showers";
  if (c === 95) return "Thunderstorm";
  if (c === 96 || c === 99) return "Thunderstorm + hail";
  return `Code ${c}`;
}

type OmCurrentBlock = {
  latitude?: number;
  longitude?: number;
  current?: {
    time?: string;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
    temperature_2m?: number;
    precipitation?: number;
    cloud_cover?: number;
    cape?: number;
    pressure_msl?: number;
    weather_code?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    precipitation?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    weather_code?: (number | null)[];
  };
};

function modelQuery(model: WeatherModelId): string {
  if (model === "best_match") return "";
  return `&models=${model}`;
}

async function fetchMultiCurrent(
  lats: number[],
  lons: number[],
  hourlyVars: string,
  model: WeatherModelId = "best_match",
): Promise<OmCurrentBlock[]> {
  if (!lats.length) return [];
  const BATCH = 24;
  const out: OmCurrentBlock[] = [];
  for (let i = 0; i < lats.length; i += BATCH) {
    const la = lats.slice(i, i + BATCH);
    const lo = lons.slice(i, i + BATCH);
    const key = `om:${model}:${hourlyVars}:${la.map((x) => x.toFixed(2)).join(",")}:${lo.map((x) => x.toFixed(2)).join(",")}`;
    const url =
      `${OM}?latitude=${la.map((x) => x.toFixed(3)).join(",")}` +
      `&longitude=${lo.map((x) => x.toFixed(3)).join(",")}` +
      `&current=${hourlyVars}&timezone=UTC${modelQuery(model)}`;
    try {
      const data = await cachedJson(key, url);
      if (!data) continue;
      if (Array.isArray(data)) out.push(...(data as OmCurrentBlock[]));
      else out.push(data as OmCurrentBlock);
    } catch {
      /* skip batch */
    }
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
  model: WeatherModelId = "best_match",
): Promise<WindSample[]> {
  const { lats, lons } = buildGeoGrid(south, west, north, east, cols, rows);
  const blocks = await fetchMultiCurrent(
    lats,
    lons,
    "wind_speed_10m,wind_direction_10m",
    model,
  );
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
  model: WeatherModelId = "best_match",
): Promise<GridScalar[]> {
  const { lats, lons } = buildGeoGrid(south, west, north, east, cols, rows);
  const blocks = await fetchMultiCurrent(lats, lons, "cloud_cover", model);
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
  model: WeatherModelId = "best_match",
): Promise<GridScalar[]> {
  const { lats, lons } = buildGeoGrid(south, west, north, east, cols, rows);
  const blocks = await fetchMultiCurrent(lats, lons, "cape", model);
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

/** PM2.5 grid for air-quality opt-in layer */
export async function fetchAirQualityGrid(
  south: number,
  west: number,
  north: number,
  east: number,
  cols = 7,
  rows = 5,
): Promise<GridScalar[]> {
  const { lats, lons } = buildGeoGrid(south, west, north, east, cols, rows);
  const out: GridScalar[] = [];
  const BATCH = 20;
  for (let i = 0; i < lats.length; i += BATCH) {
    const la = lats.slice(i, i + BATCH);
    const lo = lons.slice(i, i + BATCH);
    const key = `aq:pm25:${la.map((x) => x.toFixed(2)).join(",")}:${lo.map((x) => x.toFixed(2)).join(",")}`;
    const url =
      `${AQ}?latitude=${la.map((x) => x.toFixed(3)).join(",")}` +
      `&longitude=${lo.map((x) => x.toFixed(3)).join(",")}` +
      `&current=pm2_5,dust`;
    try {
      const data = await cachedJson(key, url);
      if (!data) continue;
      const blocks = Array.isArray(data) ? data : [data];
      for (let k = 0; k < blocks.length; k++) {
        const b = blocks[k] as {
          latitude?: number;
          longitude?: number;
          current?: { pm2_5?: number; dust?: number };
        };
        const pm = Number(b.current?.pm2_5);
        const dust = Number(b.current?.dust);
        // Prefer PM2.5; fall back to dust mass for arid regions
        const v = Number.isFinite(pm) ? pm : Number.isFinite(dust) ? dust : NaN;
        if (!Number.isFinite(v)) continue;
        out.push({
          lat: b.latitude ?? la[k]!,
          lon: b.longitude ?? lo[k]!,
          value: v,
        });
      }
    } catch {
      /* skip */
    }
    if (i + BATCH < lats.length) await new Promise((r) => setTimeout(r, 100));
  }
  return out;
}

export async function fetchWeatherProbe(
  lat: number,
  lon: number,
  model: WeatherModelId = "best_match",
): Promise<WeatherProbe> {
  const base: WeatherProbe = {
    lat,
    lon,
    time: null,
    model,
    windSpeedKmh: null,
    windDirDeg: null,
    windGustKmh: null,
    tempC: null,
    precipMm: null,
    cloudPct: null,
    capeJkg: null,
    pressureHpa: null,
    weatherCode: null,
    weatherLabel: null,
    waveHeightM: null,
    waveDirDeg: null,
    wavePeriodS: null,
    swellHeightM: null,
    pm25: null,
    dust: null,
    usAqi: null,
    hourly: [],
    source: "open-meteo",
  };
  try {
    const url =
      `${OM}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,precipitation,cloud_cover,cape,pressure_msl,weather_code` +
      `&hourly=temperature_2m,precipitation,wind_speed_10m,weather_code` +
      `&forecast_days=1&timezone=UTC${modelQuery(model)}`;
    const data = (await cachedJson(
      `probe:${model}:${lat.toFixed(3)},${lon.toFixed(3)}`,
      url,
    )) as OmCurrentBlock | null;
    if (data) {
      const c = data.current;
      base.time = c?.time ?? null;
      base.windSpeedKmh = numOrNull(c?.wind_speed_10m);
      base.windDirDeg = numOrNull(c?.wind_direction_10m);
      base.windGustKmh = numOrNull(c?.wind_gusts_10m);
      base.tempC = numOrNull(c?.temperature_2m);
      base.precipMm = numOrNull(c?.precipitation);
      base.cloudPct = numOrNull(c?.cloud_cover);
      base.capeJkg = numOrNull(c?.cape);
      base.pressureHpa = numOrNull(c?.pressure_msl);
      base.weatherCode = numOrNull(c?.weather_code);
      base.weatherLabel = wmoWeatherLabel(base.weatherCode);
      const h = data.hourly;
      if (h?.time?.length) {
        const n = Math.min(12, h.time.length);
        for (let i = 0; i < n; i++) {
          base.hourly.push({
            time: h.time[i]!,
            tempC: numOrNull(h.temperature_2m?.[i]),
            precipMm: numOrNull(h.precipitation?.[i]),
            windKmh: numOrNull(h.wind_speed_10m?.[i]),
            weatherCode: numOrNull(h.weather_code?.[i]),
          });
        }
      }
    }
  } catch {
    /* graceful */
  }
  try {
    const murl =
      `${MARINE}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&current=wave_height,wave_direction,wave_period,swell_wave_height`;
    const md = (await cachedJson(
      `marine:${lat.toFixed(3)},${lon.toFixed(3)}`,
      murl,
    )) as {
      current?: {
        wave_height?: number;
        wave_direction?: number;
        wave_period?: number;
        swell_wave_height?: number;
      };
    } | null;
    if (md?.current) {
      base.waveHeightM = numOrNull(md.current.wave_height);
      base.waveDirDeg = numOrNull(md.current.wave_direction);
      base.wavePeriodS = numOrNull(md.current.wave_period);
      base.swellHeightM = numOrNull(md.current.swell_wave_height);
    }
  } catch {
    /* land */
  }
  try {
    const aurl =
      `${AQ}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&current=pm2_5,dust,us_aqi`;
    const ad = (await cachedJson(
      `aq:${lat.toFixed(3)},${lon.toFixed(3)}`,
      aurl,
    )) as {
      current?: { pm2_5?: number; dust?: number; us_aqi?: number };
    } | null;
    if (ad?.current) {
      base.pm25 = numOrNull(ad.current.pm2_5);
      base.dust = numOrNull(ad.current.dust);
      base.usAqi = numOrNull(ad.current.us_aqi);
    }
  } catch {
    /* */
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
      const key = `wave:${la.map((x) => x.toFixed(2)).join(",")}`;
      const url =
        `${MARINE}?latitude=${la.map((x) => x.toFixed(3)).join(",")}` +
        `&longitude=${lo.map((x) => x.toFixed(3)).join(",")}` +
        `&current=wave_height`;
      const data = await cachedJson(key, url);
      if (!data) continue;
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
  if (bestD > 25) return null;
  return { u: best.u, v: best.v, speedKmh: best.speedKmh };
}

/** Rough Australia mainland + TAS box for MetCentre / BoM link-out */
export function isOverAustralia(lat: number, lon: number): boolean {
  return lat >= -44.5 && lat <= -10 && lon >= 112 && lon <= 154.5;
}

export const METCENTRE_URL = "https://metcentre.weatherwatch.net.au/";
export const BOM_WARNINGS_URL = "https://www.bom.gov.au/australia/warnings/";
