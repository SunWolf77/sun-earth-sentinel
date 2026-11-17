export type KpPoint = {
  time_tag: string;
  Kp: number;
  a_running?: number;
  station_count?: number;
};

export type XrayPoint = {
  time_tag: string;
  satellite?: number;
  flux: number;
  observed_flux?: number;
  energy?: string;
};

export type SolarWind = {
  speed: number | null;
  density: number | null;
  /** Proton temperature, kelvin. RTSW only. */
  temperature: number | null;
  bz: number | null;
  by: number | null;
  bx: number | null;
  bt: number | null;
  /** GSM clock angle, degrees. RTSW only. */
  phi: number | null;
  time: string | null;
  plasmaTime: string | null;
  magTime: string | null;
  /** SWPC `active` spacecraft on the 1-minute product (SOLAR1, ACE, IMAP, …). */
  source: string | null;
  /** True when the numbers are the 1-minute RTSW head, not the coarse summary. */
  rtsw: boolean;
  /** L1 azimuth flip that held, with a field dip. Null when none. */
  sheet: string | null;
  /** Fresh suprathermal electron rise at L1. Null when quiet or the feed is stale. */
  electrons: string | null;
};

export type NoaaScales = {
  R: string;
  S: string;
  G: string;
  RText?: string;
  SText?: string;
  GText?: string;
  /** Previous day / prior period scale (SWPC key "-1") — often shows recent peak */
  GPrev?: string;
  RPrev?: string;
  SPrev?: string;
  GPrevText?: string;
  /** Day+1 / Day+2 G scale if present */
  G1?: string;
  G2?: string;
  RMinorProb?: string;
  RMajorProb?: string;
  SProb?: string;
  /** ISO-ish stamp from SWPC now block */
  issued?: string | null;
};

export type ProtonPoint = {
  time_tag: string;
  flux: number;
  energy: string;
};

export type Flux10cm = {
  flux: number | null;
  time: string | null;
};

export type ForecastBundle = {
  threeDay: string;
  discussion: string;
  issued: string | null;
};

export type KpForecastPoint = {
  time_tag: string;
  kp: number;
  observed: string | null;
  noaa_scale: string | null;
};

export type EnlilFrame = {
  url: string;
  timeHint: string | null;
};

export type OvationFrame = {
  url: string;
  time_tag: string | null;
  hemi: "north" | "south";
};

export type OvationBundle = {
  north: OvationFrame | null;
  south: OvationFrame | null;
};

const SWPC = "https://services.swpc.noaa.gov";

export function fluxToClass(flux: number): string {
  if (flux >= 1e-4) return "X" + (flux / 1e-4).toFixed(1);
  if (flux >= 1e-5) return "M" + (flux / 1e-5).toFixed(1);
  if (flux >= 1e-6) return "C" + (flux / 1e-6).toFixed(1);
  if (flux >= 1e-7) return "B" + (flux / 1e-7).toFixed(1);
  return "A" + (Math.max(flux, 1e-9) / 1e-8).toFixed(1);
}

export async function fetchKp(): Promise<KpPoint[]> {
  const res = await fetch(`${SWPC}/products/noaa-planetary-k-index.json`);
  if (!res.ok) throw new Error(`Kp ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === "object" && raw[0] !== null && "Kp" in raw[0]) {
    return (raw as KpPoint[]).map((r) => ({
      ...r,
      Kp: Number(r.Kp) || 0,
    }));
  }
  const rows = raw as (string | number)[][];
  return rows.slice(1).map((r) => ({
    time_tag: String(r[0]),
    Kp: parseFloat(String(r[1])) || 0,
  }));
}

export async function fetchXrays(): Promise<XrayPoint[]> {
  const res = await fetch(`${SWPC}/json/goes/primary/xrays-1-day.json`);
  if (!res.ok) throw new Error(`X-ray ${res.status}`);
  return (await res.json()) as XrayPoint[];
}

function finite(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * RTSW files are newest-first and multi-megabyte. The head is enough for
 * the live desk — do not download the day.
 */
async function readRtswHead(path: string, maxBytes = 24575): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`${SWPC}${path}`, {
      headers: { Range: `bytes=0-${maxBytes}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status !== 206 && res.status !== 200) return [];
    const len = Number(res.headers.get("content-length") || 0);
    if (res.status === 200 && len > maxBytes + 8_000) return [];
    const text = await res.text();
    if (text.length > maxBytes + 8_000) return [];
    const cut = text.lastIndexOf("}");
    if (cut < 1) return [];
    let chunk = text.slice(0, cut + 1).trim().replace(/,\s*$/, "");
    if (!chunk.startsWith("[")) chunk = `[${chunk}`;
    if (!chunk.endsWith("]")) chunk = `${chunk}]`;
    const rows = JSON.parse(chunk) as unknown;
    return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

function latestActive(rows: Record<string, unknown>[]): Record<string, unknown> | null {
  return rows.find((r) => r.active === true) ?? rows[0] ?? null;
}

function circDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function circMean(degs: number[]): number | null {
  if (!degs.length) return null;
  let x = 0;
  let y = 0;
  for (const d of degs) {
    const r = (d * Math.PI) / 180;
    x += Math.cos(r);
    y += Math.sin(r);
  }
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** A held azimuth flip with a weak field between the two directions. */
function currentSheet(rows: Record<string, unknown>[]): string | null {
  const pts = rows
    .map((r) => ({
      t: Date.parse(typeof r.time_tag === "string" ? (r.time_tag.endsWith("Z") ? r.time_tag : `${r.time_tag}Z`) : ""),
      phi: finite(r.phi_gsm),
      bt: finite(r.bt),
    }))
    .filter((p) => Number.isFinite(p.t) && p.phi != null && p.bt != null)
    .sort((a, b) => b.t - a.t);
  if (pts.length < 40) return null;
  const newest = pts[0]!.t;
  const a = pts.filter((p) => newest - p.t <= 20 * 60_000);
  const b = pts.filter((p) => newest - p.t > 25 * 60_000 && newest - p.t <= 50 * 60_000);
  if (a.length < 8 || b.length < 8) return null;
  const ma = circMean(a.map((p) => p.phi!));
  const mb = circMean(b.map((p) => p.phi!));
  if (ma == null || mb == null || circDelta(ma, mb) < 130) return null;
  const hold = (sample: typeof a, mean: number) =>
    sample.filter((p) => circDelta(p.phi!, mean) < 35).length >= sample.length * 0.7;
  if (!hold(a, ma) || !hold(b, mb)) return null;
  const mid = pts.filter((p) => newest - p.t > 18 * 60_000 && newest - p.t < 28 * 60_000);
  const shoulder = [...a, ...b].reduce((n, p) => n + p.bt!, 0) / (a.length + b.length);
  const dip = mid.length ? Math.min(...mid.map((p) => p.bt!)) : shoulder;
  if (dip > shoulder * 0.7) return null;
  return "L1 current sheet: the field direction flipped and held, and the field weakened as it turned.";
}

async function readElectronTail(): Promise<string | null> {
  const res = await fetch(`${SWPC}/json/ace/epam/ace_epam_5m.json`, {
    headers: { Range: "bytes=-20000" },
    signal: AbortSignal.timeout(8_000),
  });
  if (res.status !== 206 && res.status !== 200) return null;
  const text = await res.text();
  if (text.length > 80_000) return null;
  const start = text.indexOf("{");
  if (start < 0) return null;
  let chunk = text.slice(start).trim().replace(/,\s*$/, "");
  if (!chunk.endsWith("]")) {
    const cut = chunk.lastIndexOf("}");
    if (cut < 1) return null;
    chunk = `${chunk.slice(0, cut + 1)}]`;
  }
  if (!chunk.startsWith("[")) chunk = `[${chunk}`;
  const rows = JSON.parse(chunk) as Record<string, unknown>[];
  if (!Array.isArray(rows) || rows.length < 12) return null;
  const pts = rows
    .map((r) => ({
      t: Date.parse(typeof r.time_tag === "string" ? (r.time_tag.endsWith("Z") ? r.time_tag : `${r.time_tag}Z`) : ""),
      v: r.dsflag_de1 === 0 ? finite(r.de1) : null,
    }))
    .filter((p) => Number.isFinite(p.t) && p.v != null && p.v > 0) as { t: number; v: number }[];
  if (pts.length < 12) return null;
  const last = pts[pts.length - 1]!.t;
  if (Date.now() - last > 6 * 3600_000) return null;
  const recent = pts.slice(-4);
  const base = pts.slice(0, -4).map((p) => p.v).sort((a, b) => a - b);
  const med = base[Math.floor(base.length / 2)] ?? 0;
  const avg = recent.reduce((n, p) => n + p.v, 0) / recent.length;
  if (med <= 0 || avg < med * 3 || avg < 500) return null;
  return `L1 suprathermal electrons are about ${Math.round(avg / med)}× the recent level.`;
}

export async function fetchSolarWind(): Promise<SolarWind> {
  const out: SolarWind = {
    speed: null,
    density: null,
    temperature: null,
    bz: null,
    by: null,
    bx: null,
    bt: null,
    phi: null,
    time: null,
    plasmaTime: null,
    magTime: null,
    source: null,
    rtsw: false,
    sheet: null,
    electrons: null,
  };
  try {
    const [magRows, windRows, electrons, spRes, magRes] = await Promise.all([
      readRtswHead("/json/rtsw/rtsw_mag_1m.json", 120_000),
      readRtswHead("/json/rtsw/rtsw_wind_1m.json"),
      readElectronTail().catch(() => null),
      fetch(`${SWPC}/products/summary/solar-wind-speed.json`).catch(() => null),
      fetch(`${SWPC}/products/summary/solar-wind-mag-field.json`).catch(() => null),
    ]);
    const mag = latestActive(magRows);
    const wind = latestActive(windRows);
    if (mag) {
      out.bt = finite(mag.bt);
      out.bz = finite(mag.bz_gsm);
      out.by = finite(mag.by_gsm);
      out.bx = finite(mag.bx_gsm);
      out.phi = finite(mag.phi_gsm);
      out.magTime = typeof mag.time_tag === "string" ? mag.time_tag : null;
      out.source = typeof mag.source === "string" ? mag.source : null;
      out.rtsw = out.bt != null || out.bz != null;
      out.sheet = currentSheet(magRows);
    }
    if (wind) {
      out.speed = finite(wind.proton_speed);
      out.density = finite(wind.proton_density);
      out.temperature = finite(wind.proton_temperature);
      out.plasmaTime = typeof wind.time_tag === "string" ? wind.time_tag : null;
      if (!out.source && typeof wind.source === "string") out.source = wind.source;
      if (out.speed != null) out.rtsw = true;
    }
    out.electrons = electrons;
    out.time = out.plasmaTime ?? out.magTime;

    if (spRes?.ok && out.speed == null) {
      const sp = await spRes.json();
      const latest = Array.isArray(sp) ? sp[sp.length - 1] : sp;
      if (latest) {
        out.speed = finite(latest.proton_speed ?? latest.speed);
        out.density = out.density ?? finite(latest.proton_density ?? latest.density);
        out.time = out.time ?? latest.time_tag ?? latest.time ?? null;
      }
    }
    if (magRes?.ok && out.bt == null && out.bz == null) {
      const magSum = await magRes.json();
      const latest = Array.isArray(magSum) ? magSum[magSum.length - 1] : magSum;
      if (latest) {
        out.bz = finite(latest.bz_gsm ?? latest.bz);
        out.bt = finite(latest.bt);
        if (!out.time) out.time = latest.time_tag ?? latest.time ?? null;
      }
    }
  } catch {
    /* graceful */
  }
  return out;
}

export async function fetchNoaaScales(): Promise<NoaaScales | null> {
  try {
    const res = await fetch(`${SWPC}/products/noaa-scales.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const now = data["0"] ?? data[0];
    const prev = data["-1"] ?? data[-1];
    const d1 = data["1"] ?? data[1];
    const d2 = data["2"] ?? data[2];
    const d3 = data["3"] ?? data[3];
    if (!now) return null;
    const stamp =
      now.DateStamp && now.TimeStamp
        ? `${now.DateStamp}T${now.TimeStamp}Z`
        : now.DateStamp
          ? String(now.DateStamp)
          : null;
    return {
      R: String(now.R?.Scale ?? "—"),
      S: String(now.S?.Scale ?? "—"),
      G: String(now.G?.Scale ?? "—"),
      RText: now.R?.Text ?? undefined,
      SText: now.S?.Text ?? undefined,
      GText: now.G?.Text ?? undefined,
      GPrev: prev?.G?.Scale != null ? String(prev.G.Scale) : undefined,
      RPrev: prev?.R?.Scale != null ? String(prev.R.Scale) : undefined,
      SPrev: prev?.S?.Scale != null ? String(prev.S.Scale) : undefined,
      GPrevText: prev?.G?.Text ?? undefined,
      G1: d1?.G?.Scale != null ? String(d1.G.Scale) : undefined,
      G2: d2?.G?.Scale != null ? String(d2.G.Scale) : d3?.G?.Scale != null ? String(d3.G.Scale) : undefined,
      RMinorProb: d1?.R?.MinorProb != null ? String(d1.R.MinorProb) : undefined,
      RMajorProb: d1?.R?.MajorProb != null ? String(d1.R.MajorProb) : undefined,
      SProb: d1?.S?.Prob != null ? String(d1.S.Prob) : undefined,
      issued: stamp,
    };
  } catch {
    return null;
  }
}

export async function fetchAlerts(): Promise<{ message?: string; issue_datetime?: string }[]> {
  try {
    const res = await fetch(`${SWPC}/products/alerts.json`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, 12) : [];
  } catch {
    return [];
  }
}

export async function fetch10cmFlux(): Promise<Flux10cm> {
  try {
    const res = await fetch(`${SWPC}/products/summary/10cm-flux.json`);
    if (!res.ok) return { flux: null, time: null };
    const data = await res.json();
    const latest = Array.isArray(data) ? data[data.length - 1] : data;
    return {
      flux: latest ? parseFloat(latest.flux ?? latest.Flux) || null : null,
      time: latest?.time_tag ?? latest?.time ?? null,
    };
  } catch {
    return { flux: null, time: null };
  }
}

/** Latest high-energy GOES proton channel (for S-scale context). */
export async function fetchProtons(): Promise<ProtonPoint[]> {
  try {
    const res = await fetch(`${SWPC}/json/goes/primary/integral-protons-1-day.json`);
    if (!res.ok) return [];
    const data = (await res.json()) as ProtonPoint[];
    // Prefer ≥10 MeV integral if present
    const p10 = data.filter((d) => />=?10|>=10|10 MeV/i.test(d.energy || ""));
    return p10.length ? p10 : data;
  } catch {
    return [];
  }
}

export async function fetchForecastBundle(): Promise<ForecastBundle> {
  const out: ForecastBundle = { threeDay: "", discussion: "", issued: null };
  try {
    const [fRes, dRes] = await Promise.all([
      fetch(`${SWPC}/text/3-day-forecast.txt`),
      fetch(`${SWPC}/text/discussion.txt`),
    ]);
    if (fRes.ok) {
      out.threeDay = await fRes.text();
      const m = out.threeDay.match(/:Issued:\s*(.+)/i);
      if (m) out.issued = m[1]!.trim();
    }
    if (dRes.ok) out.discussion = await dRes.text();
  } catch {
    /* graceful */
  }
  return out;
}

/** Latest WSA-ENLIL model frame (Earth-directed solar wind / CME propagation). */
export async function fetchEnlilLatest(): Promise<EnlilFrame | null> {
  try {
    const res = await fetch(`${SWPC}/products/animations/enlil.json`);
    if (!res.ok) return null;
    const frames = (await res.json()) as { url: string }[];
    if (!Array.isArray(frames) || !frames.length) return null;
    const last = frames[frames.length - 1]!;
    const path = last.url.startsWith("http") ? last.url : `${SWPC}${last.url}`;
    const hint = last.url.match(/(\d{8}T\d{6})/)?.[1] ?? null;
    return { url: path, timeHint: hint };
  } catch {
    return null;
  }
}

export async function fetchOvationLatest(): Promise<OvationFrame | null> {
  const b = await fetchOvationBundle();
  return b.north;
}

async function fetchOvationHemi(hemi: "north" | "south"): Promise<OvationFrame | null> {
  try {
    const res = await fetch(`${SWPC}/products/animations/ovation_${hemi}_24h.json`);
    if (!res.ok) {
      // Static latest stills always available
      return {
        hemi,
        url: `${SWPC}/images/animations/ovation/${hemi}/latest.jpg`,
        time_tag: null,
      };
    }
    const frames = (await res.json()) as { url: string; time_tag?: string }[];
    if (!Array.isArray(frames) || !frames.length) {
      return {
        hemi,
        url: `${SWPC}/images/animations/ovation/${hemi}/latest.jpg`,
        time_tag: null,
      };
    }
    const last = frames[frames.length - 1]!;
    const path = last.url.startsWith("http") ? last.url : `${SWPC}${last.url}`;
    return { hemi, url: path, time_tag: last.time_tag ?? null };
  } catch {
    return {
      hemi,
      url: `${SWPC}/images/animations/ovation/${hemi}/latest.jpg`,
      time_tag: null,
    };
  }
}

/** North + South OVATION short-term forecast stills (SWPC). */
export async function fetchOvationBundle(): Promise<OvationBundle> {
  const [north, south] = await Promise.all([
    fetchOvationHemi("north"),
    fetchOvationHemi("south"),
  ]);
  return { north, south };
}

/** NOAA Kp observed + forecast series (3h steps). */
export async function fetchKpForecast(): Promise<KpForecastPoint[]> {
  try {
    const res = await fetch(`${SWPC}/products/noaa-planetary-k-index-forecast.json`);
    if (!res.ok) return [];
    const raw = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r) => ({
        time_tag: String(r.time_tag ?? ""),
        kp: Number(r.kp) || 0,
        observed: r.observed != null ? String(r.observed) : null,
        noaa_scale: r.noaa_scale != null ? String(r.noaa_scale) : null,
      }))
      .filter((r) => r.time_tag);
  } catch {
    return [];
  }
}

/** Upcoming forecast-only points (not yet observed). */
export function upcomingKpForecast(points: KpForecastPoint[], limit = 8): KpForecastPoint[] {
  const now = Date.now();
  return points
    .filter((p) => {
      const t = Date.parse(p.time_tag);
      if (!Number.isFinite(t)) return false;
      const isForecast = (p.observed || "").toLowerCase() === "forecast" || t > now;
      return isForecast || t >= now - 3 * 3600_000;
    })
    .slice(0, limit);
}

export function longChannelXrays(data: XrayPoint[]): XrayPoint[] {
  const long = data.filter((d) => d.energy && d.energy.includes("0.1-0.8"));
  return long.length ? long : data;
}

export function peakFlare(series: XrayPoint[]): { class: string; time: string | null; flux: number } {
  let maxFlux = 0;
  let maxTime: string | null = null;
  for (const d of series) {
    const f = d.flux || d.observed_flux || 0;
    if (f > maxFlux) {
      maxFlux = f;
      maxTime = d.time_tag || null;
    }
  }
  return { class: fluxToClass(maxFlux), time: maxTime, flux: maxFlux };
}

/** Extract short human lines from 3-day forecast. */
export function forecastHighlights(text: string): string[] {
  if (!text) return [];
  const lines: string[] = [];
  const geo = text.match(/Rationale:\s*([^\n]+(?:\n(?![A-Z]\.|NOAA)[^\n]+)*)/i);
  if (geo) lines.push(geo[1]!.replace(/\s+/g, " ").trim().slice(0, 280));
  const kp = text.match(/greatest expected 3 hr Kp[^\n]+/i);
  if (kp) lines.push(kp[0]!.trim());
  const rad = text.match(/Solar Radiation Storm Forecast[\s\S]{0,200}?Rationale:\s*([^\n]+)/i);
  if (rad) lines.push(rad[1]!.replace(/\s+/g, " ").trim().slice(0, 200));
  return lines.filter(Boolean).slice(0, 4);
}
