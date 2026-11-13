import { createServerFn } from "@tanstack/react-start";
import type { DonkiBundle, DonkiCme, DonkiFlare } from "@/lib/feeds/donki";
import { daysAgoIso, isoDate } from "@/lib/feeds/donki";
import type {
  EnlilFrame,
  Flux10cm,
  ForecastBundle,
  KpPoint,
  NoaaScales,
  OvationFrame,
  OvationBundle,
  ProtonPoint,
  SolarWind,
  XrayPoint,
  KpForecastPoint,
} from "@/lib/feeds/swpc";
import {
  fetch10cmFlux,
  fetchAlerts,
  fetchEnlilLatest,
  fetchForecastBundle,
  fetchKp,
  fetchNoaaScales,
  fetchOvationLatest,
  fetchOvationBundle,
  fetchProtons,
  fetchSolarWind,
  fetchXrays,
  fetchKpForecast,
} from "@/lib/feeds/swpc";
import { HELIOVIEWER, soloScreenshotUrl } from "@/lib/feeds/solarMedia";
import { buildGoesXrayPlot, type GoesXrayPlot, type GoesXrayWindow } from "@/lib/feeds/goesXray";
import { buildXrayAttentionBundle, type XrayAttentionBundle } from "@/lib/feeds/xrayAttention";
import { buildSolarCycleBundle, type SolarCycleBundle } from "@/lib/feeds/solarCycle";
import { fetchWithRetry, LastGood } from "@/lib/feeds/resilientFetch";
import { fetchSolarRegions, type ActiveRegion } from "@/lib/feeds/solarRegions";
import { buildFlareOutlook, type CatalogFlare, type FlareOutlook } from "@/lib/solar/flareOutlook";
import { buildFlareAtlas, type FlareAtlas } from "@/lib/solar/flareAtlas";
import { buildFarSideWatch, type FarSideWatch } from "@/lib/solar/farSideWatch";
import { readHmiPolarity, type HmiPolarity } from "@/lib/solar/hmiPolarity";
import {
  linkRegionChains,
  parseHoleNote,
  parseWindReturns,
  carringtonFrame,
  type SolarContinuity,
} from "@/lib/solar/regionIdentity";
import { getFlareDecade } from "@/lib/solar/flareHistory";

const DONKI = "https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get";

const donkiCache = new LastGood<DonkiBundle>(45 * 60_000);

async function getJson<T>(url: string): Promise<T> {
  const res = await fetchWithRetry(url, {
    headers: { Accept: "application/json" },
    timeoutMs: 12_000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** DONKI is Origin-blocked in browsers — always pull server-side. */
export const fetchDonkiBundle = createServerFn({ method: "GET" }).handler(
  async (): Promise<DonkiBundle> => {
    const start = daysAgoIso(14);
    const end = isoDate();
    try {
      const [cmes, flares] = await Promise.all([
        getJson<DonkiCme[]>(`${DONKI}/CME?startDate=${start}&endDate=${end}`).catch(
          () => [] as DonkiCme[],
        ),
        getJson<DonkiFlare[]>(`${DONKI}/FLR?startDate=${start}&endDate=${end}`).catch(
          () => [] as DonkiFlare[],
        ),
      ]);
      const sortedCmes = [...cmes].sort((a, b) =>
        (b.startTime || "").localeCompare(a.startTime || ""),
      );
      const sortedFlares = [...flares].sort((a, b) =>
        (b.peakTime || b.beginTime || "").localeCompare(a.peakTime || a.beginTime || ""),
      );
      const bundle: DonkiBundle = {
        cmes: sortedCmes.slice(0, 36),
        flares: sortedFlares.slice(0, 48),
        fetchedAt: Date.now(),
      };
      if (bundle.cmes.length || bundle.flares.length) donkiCache.set("d", bundle);
      return bundle;
    } catch (e) {
      const hit = donkiCache.get("d");
      if (hit) return { ...hit, error: `cached · ${e instanceof Error ? e.message : "DONKI"}` };
      return {
        cmes: [],
        flares: [],
        fetchedAt: Date.now(),
        error: e instanceof Error ? e.message : "DONKI unavailable",
      };
    }
  },
);

export type SolarCoreBundle = {
  kp: KpPoint[];
  xray: XrayPoint[];
  solarWind: SolarWind;
  scales: NoaaScales | null;
  alerts: { message?: string; issue_datetime?: string }[];
  flux10cm: Flux10cm;
  forecast: ForecastBundle;
  enlil: EnlilFrame | null;
  ovation: OvationFrame | null;
  ovationBundle: OvationBundle | null;
  protons: ProtonPoint[];
  kpForecast: KpForecastPoint[];
};

export type SolarCoreInput = {
  /** Include X-ray series, protons, ENLIL, OVATION (off on mobile Lite). */
  heavy?: boolean;
};

const solarCache = new LastGood<SolarCoreBundle>(20 * 60_000);

function solarHasSignal(b: SolarCoreBundle): boolean {
  return Boolean(b.kp?.length || b.scales || b.solarWind || b.flux10cm);
}

export type SolarNowBundle = {
  kp: KpPoint[];
  solarWind: SolarWind;
  scales: NoaaScales | null;
  flux10cm: Flux10cm;
  regions: ActiveRegion[];
};

/** Kp, RTSW minute, NOAA scales, F10.7 — the part of Solar that should not wait on ENLIL. */
export const fetchSolarNow = createServerFn({ method: "GET" }).handler(
  async (): Promise<SolarNowBundle> => {
    const [kp, solarWind, scales, flux10cm, regions] = await Promise.all([
      fetchKp().catch(() => [] as KpPoint[]),
      fetchSolarWind(),
      fetchNoaaScales(),
      fetch10cmFlux(),
      fetchSolarRegions().catch(() => [] as ActiveRegion[]),
    ]);
    return { kp, solarWind, scales, flux10cm, regions };
  },
);

/**
 * Server-side SWPC batch — `heavy: false` keeps first-open mobile lean.
 * On total failure, returns the last good bundle for that weight.
 */
export const fetchSolarCore = createServerFn({ method: "POST" })
  .inputValidator((input: SolarCoreInput | undefined) => ({
    heavy: input?.heavy !== false,
  }))
  .handler(async ({ data }): Promise<SolarCoreBundle> => {
    const heavy = data.heavy;
    const key = heavy ? "heavy" : "lite";
    try {
      const base = await Promise.all([
        fetchKp().catch(() => [] as KpPoint[]),
        heavy ? fetchXrays().catch(() => [] as XrayPoint[]) : Promise.resolve([] as XrayPoint[]),
        fetchSolarWind(),
        fetchNoaaScales(),
        fetchAlerts(),
        fetch10cmFlux(),
        fetchForecastBundle(),
        heavy ? fetchEnlilLatest() : Promise.resolve(null),
        fetchOvationBundle().catch(() => ({ north: null, south: null }) as OvationBundle),
        heavy ? fetchProtons().catch(() => [] as ProtonPoint[]) : Promise.resolve([] as ProtonPoint[]),
        fetchKpForecast().catch(() => [] as KpForecastPoint[]),
      ]);
      const [kp, xray, solarWind, scales, alerts, flux10cm, forecast, enlil, ovationBundle, protons, kpForecast] =
        base;
      const ovation = ovationBundle?.north ?? null;
      const bundle: SolarCoreBundle = {
        kp,
        xray,
        solarWind,
        scales,
        alerts,
        flux10cm,
        forecast,
        enlil,
        ovation,
        ovationBundle,
        protons,
        kpForecast,
      };
      if (solarHasSignal(bundle)) solarCache.set(key, bundle);
      return bundle;
    } catch (e) {
      const hit = solarCache.get(key);
      if (hit) return hit;
      throw e;
    }
  });

export type SoloFrame = {
  url: string | null;
  meta: string;
  date: string | null;
};

const soloCache = new LastGood<SoloFrame>(60 * 60_000);

/** Solar Orbiter EUI via Helioviewer — API is CORS-restricted from browsers. */
export const fetchSoloFrame = createServerFn({ method: "GET" }).handler(
  async (): Promise<SoloFrame> => {
    try {
      const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      const res = await fetchWithRetry(
        `${HELIOVIEWER}/getClosestImage/?date=${encodeURIComponent(now)}&sourceId=84`,
        { timeoutMs: 10_000 },
      );
      if (!res.ok) {
        const hit = soloCache.get("s");
        if (hit) return { ...hit, meta: `${hit.meta} · cached` };
        return { url: null, meta: `Helioviewer ${res.status}`, date: null };
      }
      const d = (await res.json()) as { date?: string; name?: string };
      if (!d.date) {
        const hit = soloCache.get("s");
        if (hit) return hit;
        return { url: null, meta: "No Solo EUI frame indexed", date: null };
      }
      const iso = d.date.includes("T") ? d.date : `${d.date.replace(" ", "T")}Z`;
      const lagDays = Math.max(
        0,
        Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000),
      );
      const meta = `${d.name || "EUI FSI 174"} · ${new Date(iso).toUTCString().replace("GMT", "UTC")}${
        lagDays > 2 ? ` · ~${lagDays}d lag (downlink)` : ""
      }`;
      const frame: SoloFrame = {
        url: soloScreenshotUrl(iso, "174"),
        meta,
        date: iso,
      };
      soloCache.set("s", frame);
      return frame;
    } catch (e) {
      const hit = soloCache.get("s");
      if (hit) return { ...hit, meta: `${hit.meta} · cached` };
      return {
        url: null,
        meta: e instanceof Error ? e.message : "Solo unavailable",
        date: null,
      };
    }
  },
);

const GOES_WINDOWS = new Set(["6h", "1d", "3d", "7d"]);

/** Downsampled GOES-18/19 XRS for the X-ray desk (7d JSON is ~4 MB raw). */
export const fetchGoesXrayPlotFn = createServerFn({ method: "POST" })
  .inputValidator((input: { window?: string } | undefined) => {
    const w = String(input?.window || "1d");
    return { window: (GOES_WINDOWS.has(w) ? w : "1d") as GoesXrayWindow };
  })
  .handler(async ({ data }): Promise<GoesXrayPlot> => {
    return buildGoesXrayPlot(data.window);
  });

/** Elevation attention + M/X event cards + 7d skill (SWPC GOES XRS). */
export const fetchXrayAttentionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<XrayAttentionBundle> => {
    return buildXrayAttentionBundle();
  },
);

/** 6-hour flare window. Catalogued flares are placed on the 7-day X-ray chart. */
let flareOutlookCache: { at: number; value: FlareOutlook } | null = null;

export const fetchFlareOutlookFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<FlareOutlook> => {
    if (flareOutlookCache && Date.now() - flareOutlookCache.at < 5 * 60_000) {
      return flareOutlookCache.value;
    }
    const load = (path: string) =>
      fetch(`https://services.swpc.noaa.gov${path}`, { headers: { Accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
    const [xrays, regions, flares, decade] = await Promise.all([
      load("/json/goes/primary/xrays-7-day.json"),
      fetchSolarRegions().catch(() => [] as ActiveRegion[]),
      load("/json/goes/primary/xray-flares-7-day.json"),
      getFlareDecade().catch(() => null),
    ]);
    const value = buildFlareOutlook(
      Array.isArray(xrays) ? xrays : [],
      regions,
      Array.isArray(flares) ? (flares as CatalogFlare[]) : [],
      decade,
    );
    flareOutlookCache = { at: Date.now(), value };
    return value;
  },
);

/** Each C/M/X flare this week, placed on the GOES chart with a harmonic read. */
let flareAtlasCache: { at: number; value: FlareAtlas } | null = null;

export const fetchFlareAtlasFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<FlareAtlas> => {
    if (flareAtlasCache && Date.now() - flareAtlasCache.at < 5 * 60_000) {
      return flareAtlasCache.value;
    }
    const load = (path: string) =>
      fetch(`https://services.swpc.noaa.gov${path}`, { headers: { Accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
    const [xrays, flares, decade, cycle] = await Promise.all([
      load("/json/goes/primary/xrays-7-day.json"),
      load("/json/goes/primary/xray-flares-7-day.json"),
      getFlareDecade().catch(() => null),
      buildSolarCycleBundle().catch(() => null),
    ]);
    const ssn = cycle?.latestObserved?.ssn;
    const phaseLine = cycle
      ? `Solar cycle 25 is ${cycle.phase}${ssn != null ? `, sunspot number ${Math.round(ssn)}` : ""}.`
      : null;
    const value = buildFlareAtlas(
      Array.isArray(xrays) ? (xrays as XrayPoint[]) : [],
      Array.isArray(flares) ? flares : [],
      decade?.medianRiseMin ?? null,
      phaseLine,
    );
    flareAtlasCache = { at: Date.now(), value };
    return value;
  },
);

/** Solar Cycle 25 progression envelope (SWPC observed + predicted). */
export const fetchSolarCycleFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SolarCycleBundle> => {
    return buildSolarCycleBundle();
  },
);

const farSideCache = new LastGood<FarSideWatch>(6 * 60 * 60_000);

/** STEREO and Solar Orbiter longitudes from the SSC “where” table. */
export const fetchFarSideWatchFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<FarSideWatch> => {
    const fresh = farSideCache.getFresh("where");
    if (fresh) return fresh;
    const hit = farSideCache.get("where");
    try {
      const res = await fetchWithRetry("https://stereo-ssc.nascom.nasa.gov/where.shtml", {
        timeoutMs: 12_000,
      });
      if (!res.ok) return hit ?? buildFarSideWatch({});
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ");
      const m = text.match(
        /Heliographic \(HEEQ\) longitude\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)/,
      );
      const asOf = text.match(/Positions of STEREO A and B for ([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/)?.[1] ?? null;
      const watch = buildFarSideWatch({
        asOf,
        stereoA: m ? Number(m[3]) : null,
        solo: m ? Number(m[5]) : null,
      });
      if (m) farSideCache.set("where", watch);
      return m ? watch : (hit ?? watch);
    } catch {
      return hit ?? buildFarSideWatch({});
    }
  },
);

const continuityCache = new LastGood<SolarContinuity>(30 * 60_000);

/** Regions that came back under a new NOAA number, and the wind dates the 27-day outlook repeats. */
export const fetchSolarContinuityFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SolarContinuity> => {
    const fresh = continuityCache.getFresh("c");
    if (fresh) return fresh;
    const load = async (url: string) => {
      const res = await fetchWithRetry(url, { timeoutMs: 12_000 });
      if (!res.ok) return "";
      return res.text();
    };
    const [regionsRaw, discussion, outlook] = await Promise.all([
      fetch("https://services.swpc.noaa.gov/json/solar_regions.json", { headers: { Accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      load("https://services.swpc.noaa.gov/text/discussion.txt"),
      load("https://services.swpc.noaa.gov/text/27-day-outlook.txt"),
    ]);
    const frame = carringtonFrame(regionsRaw);
    const value: SolarContinuity = {
      chains: linkRegionChains(regionsRaw).slice(0, 6),
      holeText: parseHoleNote(discussion),
      windReturns: parseWindReturns(outlook).slice(0, 6),
      rotation: frame.rotation,
      central: frame.central,
      east: frame.east,
      marks: frame.marks,
      due: frame.due,
    };
    continuityCache.set("c", value);
    return value;
  },
);

const hmiCache = new LastGood<HmiPolarity>(20 * 60_000);

/** Field direction at each NOAA point on the latest HMI magnetogram. */
export const fetchHmiPolarityFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<HmiPolarity> => {
    const fresh = hmiCache.getFresh("hmi");
    if (fresh) return fresh;
    const [img, regions] = await Promise.all([
      fetchWithRetry("https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIB.jpg", { timeoutMs: 12_000 }),
      fetch("https://services.swpc.noaa.gov/json/solar_regions.json", { headers: { Accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]);
    if (!img.ok) return hmiCache.get("hmi") ?? { points: [] };
    const jpeg = new Uint8Array(await img.arrayBuffer());
    const value = readHmiPolarity(jpeg, regions);
    hmiCache.set("hmi", value);
    return value;
  },
);
