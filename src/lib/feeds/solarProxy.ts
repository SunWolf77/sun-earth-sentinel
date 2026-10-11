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

/** Solar Cycle 25 progression envelope (SWPC observed + predicted). */
export const fetchSolarCycleFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SolarCycleBundle> => {
    return buildSolarCycleBundle();
  },
);
