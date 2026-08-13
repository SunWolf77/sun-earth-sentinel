/**
 * EarthScope FDSN station + dataselect (GeoCSV).
 * irisws-timeseries retires 26 Aug 2026 — do not call it.
 * On-demand, one BHZ window. Not a continuous global waveform bus.
 */

import { createServerFn } from "@tanstack/react-start";

const STATION = "https://service.earthscope.org/fdsnws/station/1/query";
const SELECT = "https://service.earthscope.org/fdsnws/dataselect/1/query";
const UA =
  "SunEarthSentinel/1.0 (github.com/SunWolf77/sun-earth-sentinel; observational)";

export type IrisStationHit = {
  net: string;
  sta: string;
  loc: string;
  cha: string;
  lat: number;
  lon: number;
  elevM: number | null;
  distDeg: number;
};

export type IrisTraceResult = {
  ok: boolean;
  error?: string;
  station?: IrisStationHit;
  startIso?: string;
  endIso?: string;
  sps?: number;
  samples?: number[];
};

function havDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return (2 * R * Math.asin(Math.min(1, Math.sqrt(a)))) / 111.195;
}

function isoUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function esGet(url: string, accept: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": UA, Accept: accept },
  });
}

function parseStationText(
  text: string,
  lat: number,
  lon: number,
): IrisStationHit[] {
  const hits: IrisStationHit[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const p = line.split("|");
    if (p.length < 7) continue;
    const slat = Number(p[4]);
    const slon = Number(p[5]);
    if (!Number.isFinite(slat) || !Number.isFinite(slon)) continue;
    const elev = Number(p[6]);
    hits.push({
      net: (p[0] || "").trim(),
      sta: (p[1] || "").trim(),
      loc: (p[2] || "").trim() || "--",
      cha: (p[3] || "").trim() || "BHZ",
      lat: slat,
      lon: slon,
      elevM: Number.isFinite(elev) ? elev : null,
      distDeg: havDeg(lat, lon, slat, slon),
    });
  }
  return hits.sort((a, b) => a.distDeg - b.distDeg);
}

/** GeoCSV 2.0 from EarthScope dataselect `format=geocsv`. */
export function parseGeoCsv(text: string): { samples: number[]; sps: number } {
  let sps = 20;
  const samples: number[] = [];
  let inData = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const m = line.match(/#\s*sample_rate_hz:\s*([\d.]+)/i);
      if (m) sps = Number(m[1]) || sps;
      continue;
    }
    if (/^time\s*,\s*sample/i.test(line)) {
      inData = true;
      continue;
    }
    if (!inData && !line.includes(",")) continue;
    inData = true;
    const comma = line.lastIndexOf(",");
    if (comma < 0) continue;
    const v = Number(line.slice(comma + 1).trim());
    if (Number.isFinite(v)) samples.push(v);
  }
  return { samples, sps };
}

export const fetchIrisTrace = createServerFn({ method: "POST" })
  .inputValidator((input: { lat: number; lon: number; time: number; maxDeg?: number }) => ({
    lat: Number(input.lat),
    lon: Number(input.lon),
    time: Number(input.time),
    maxDeg: typeof input.maxDeg === "number" ? input.maxDeg : 12,
  }))
  .handler(async ({ data }): Promise<IrisTraceResult> => {
    const { lat, lon, time, maxDeg } = data;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(time)) {
      return { ok: false, error: "Need lat/lon/origin time" };
    }
    const age = Date.now() - time;
    if (age < 90_000) {
      return { ok: false, error: "Origin too fresh — archive usually lags 1–3 min" };
    }
    if (age > 30 * 86_400_000) {
      return { ok: false, error: "Window older than 30 days — use the laptop SAC pipeline" };
    }

    const start = isoUtc(time);
    const end = isoUtc(time + 150_000);
    const staUrl =
      `${STATION}?latitude=${lat}&longitude=${lon}&maxradius=${maxDeg}` +
      `&channel=BHZ&level=channel&format=text&nodata=404&endafter=${start}`;

    let staText = "";
    try {
      const res = await esGet(staUrl, "text/plain");
      if (!res.ok) {
        return { ok: false, error: `Station ${res.status} — no BHZ within ${maxDeg}°` };
      }
      staText = await res.text();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Station service unreachable" };
    }

    const stations = parseStationText(staText, lat, lon).slice(0, 4);
    if (!stations.length) {
      return { ok: false, error: `No BHZ station within ${maxDeg}°` };
    }

    for (const st of stations) {
      const loc = st.loc && st.loc !== "" ? st.loc : "--";
      const qs =
        `net=${encodeURIComponent(st.net)}&sta=${encodeURIComponent(st.sta)}` +
        `&loc=${encodeURIComponent(loc)}&cha=${encodeURIComponent(st.cha)}` +
        `&starttime=${encodeURIComponent(start)}&endtime=${encodeURIComponent(end)}` +
        `&format=geocsv&nodata=404`;
      try {
        const res = await esGet(`${SELECT}?${qs}`, "text/csv");
        if (!res.ok) continue;
        const text = await res.text();
        const { samples, sps } = parseGeoCsv(text);
        if (samples.length < 64) continue;
        const cap = 12_000;
        const step = Math.max(1, Math.ceil(samples.length / cap));
        const slim = samples.filter((_, i) => i % step === 0);
        return {
          ok: true,
          station: st,
          startIso: start,
          endIso: end,
          sps: sps / step,
          samples: slim,
        };
      } catch {
        continue;
      }
    }

    return {
      ok: false,
      error: `Stations found (${stations.map((s) => s.sta).join(",")}) but no dataselect window yet`,
    };
  });
