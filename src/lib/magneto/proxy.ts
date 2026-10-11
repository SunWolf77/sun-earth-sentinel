/**
 * Server proxy → Richard Cordaro public tool (drmagneto.appspot.com).
 * Browser CORS / rate limits make direct calls unreliable.
 *
 * Fallback (1.29.x):
 * - Retry the requested station on 5xx / timeout.
 * - If still failing, try a short list of priority stations.
 * - If all fail, return the last good series for that station (warm instance).
 */

import { createServerFn } from "@tanstack/react-start";

const BASE = "https://drmagneto.appspot.com";

/** Preferred fallback order when the requested station is down. */
const FALLBACK_STATIONS = ["HYB", "IZN", "BOU", "HON", "CTA", "KNY", "EYR", "CNB", "GUA"];

const RETRIES = 2;
const RETRY_DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 8000;

export type DrmagnetoChart = {
  station_code: string;
  station_name: string;
  data_source: string;
  processed_data: number[];
  raw_data: number[];
  error?: string;
  fetchedAt: number;
  /** Set when we used a different station or a cached series. */
  fallbackFrom?: string;
  fromCache?: boolean;
};

type CacheEntry = DrmagnetoChart;

/** Per-instance last-good cache. Survives warm serverless invocations only. */
const lastGood = new Map<string, CacheEntry>();

function cacheKey(station: string, date: string | null): string {
  return `${station}|${date || "today"}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOne(
  station: string,
  threshold: number,
  date: string | null,
): Promise<DrmagnetoChart> {
  const path = date
    ? `/get_selected_date_data/${station}?selected_date=${date}&threshold=${threshold}`
    : `/get_chart_data/${station}?threshold=${threshold}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "WolfWatch-Sentinel/1.0 (research; credits @rrichcord)",
      },
    });

    if (!res.ok) {
      let err = `HTTP ${res.status}`;
      try {
        const j = (await res.json()) as { error?: string };
        if (j.error) err = j.error;
      } catch {
        /* body not json */
      }
      return {
        station_code: station,
        station_name: station,
        data_source: "",
        processed_data: [],
        raw_data: [],
        error: err,
        fetchedAt: Date.now(),
      };
    }

    const j = (await res.json()) as {
      station_code?: string;
      station_name?: string;
      data_source?: string;
      processed_data?: (number | string)[];
      raw_data?: (number | string)[];
    };

    const chart: DrmagnetoChart = {
      station_code: j.station_code || station,
      station_name: j.station_name || station,
      data_source: j.data_source || "H",
      processed_data: (j.processed_data || []).map((v) => Number(v) || 0),
      raw_data: (j.raw_data || []).map((v) => Number(v) || 0),
      fetchedAt: Date.now(),
    };

    if (chart.processed_data.length > 0) {
      lastGood.set(cacheKey(station, date), chart);
    }

    return chart;
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.name === "AbortError"
          ? "timeout"
          : e.message
        : "drmagneto unavailable";
    return {
      station_code: station,
      station_name: station,
      data_source: "",
      processed_data: [],
      raw_data: [],
      error: msg,
      fetchedAt: Date.now(),
    };
  } finally {
    clearTimeout(t);
  }
}

function isRetryable(err?: string): boolean {
  if (!err) return false;
  return /HTTP 5\d\d|timeout|unavailable|fetch|network|abort/i.test(err);
}

async function fetchWithRetry(
  station: string,
  threshold: number,
  date: string | null,
): Promise<DrmagnetoChart> {
  let last: DrmagnetoChart | null = null;
  for (let i = 0; i <= RETRIES; i++) {
    const r = await fetchOne(station, threshold, date);
    if (!r.error && r.processed_data.length > 0) return r;
    last = r;
    if (!isRetryable(r.error)) break;
    if (i < RETRIES) await sleep(RETRY_DELAY_MS * (i + 1));
  }
  return last!;
}

function fromCache(
  station: string,
  date: string | null,
  originalError: string,
): DrmagnetoChart | null {
  const hit = lastGood.get(cacheKey(station, date));
  if (!hit || !hit.processed_data.length) return null;
  return {
    ...hit,
    error: undefined,
    fromCache: true,
    fallbackFrom: originalError,
    fetchedAt: hit.fetchedAt,
  };
}

export const fetchDrmagnetoChart = createServerFn({ method: "POST" })
  .inputValidator((input: { station: string; threshold?: number; date?: string }) => ({
    station: String(input.station || "HYB").toUpperCase().slice(0, 6),
    threshold: typeof input.threshold === "number" ? input.threshold : 0.4,
    date: input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null,
  }))
  .handler(async ({ data }): Promise<DrmagnetoChart> => {
    const { station, threshold, date } = data;

    // 1. Requested station with retries
    const primary = await fetchWithRetry(station, threshold, date);
    if (!primary.error && primary.processed_data.length > 0) return primary;

    const primaryErr = primary.error || "no data";

    // 2. Alternate priority stations (skip the one we already tried)
    const alts = FALLBACK_STATIONS.filter((s) => s !== station);
    for (const alt of alts) {
      const r = await fetchWithRetry(alt, threshold, date);
      if (!r.error && r.processed_data.length > 0) {
        return {
          ...r,
          fallbackFrom: `${station} (${primaryErr})`,
        };
      }
    }

    // 3. Last-good for the requested station
    const cached = fromCache(station, date, primaryErr);
    if (cached) return cached;

    // 4. Last-good for any fallback station we have
    for (const alt of alts) {
      const c = fromCache(alt, date, primaryErr);
      if (c) {
        return {
          ...c,
          fallbackFrom: `${station} (${primaryErr}) · cached ${alt}`,
        };
      }
    }

    // 5. Honest failure
    return {
      station_code: station,
      station_name: station,
      data_source: "",
      processed_data: [],
      raw_data: [],
      error: `${primaryErr} · all fallbacks failed`,
      fetchedAt: Date.now(),
    };
  });
