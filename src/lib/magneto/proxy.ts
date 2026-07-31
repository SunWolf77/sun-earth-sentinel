/**
 * Server proxy → Richard Cordaro public tool (drmagneto.appspot.com).
 * Browser CORS / rate limits make direct calls unreliable.
 */

import { createServerFn } from "@tanstack/react-start";

const BASE = "https://drmagneto.appspot.com";

export type DrmagnetoChart = {
  station_code: string;
  station_name: string;
  data_source: string;
  processed_data: number[];
  raw_data: number[];
  error?: string;
  fetchedAt: number;
};

export const fetchDrmagnetoChart = createServerFn({ method: "POST" })
  .inputValidator((input: { station: string; threshold?: number; date?: string }) => ({
    station: String(input.station || "HYB").toUpperCase().slice(0, 6),
    threshold: typeof input.threshold === "number" ? input.threshold : 0.4,
    date: input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null,
  }))
  .handler(async ({ data }): Promise<DrmagnetoChart> => {
    const { station, threshold, date } = data;
    const path = date
      ? `/get_selected_date_data/${station}?selected_date=${date}&threshold=${threshold}`
      : `/get_chart_data/${station}?threshold=${threshold}`;
    try {
      const res = await fetch(`${BASE}${path}`, {
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
          /* */
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
      return {
        station_code: j.station_code || station,
        station_name: j.station_name || station,
        data_source: j.data_source || "H",
        processed_data: (j.processed_data || []).map((v) => Number(v) || 0),
        raw_data: (j.raw_data || []).map((v) => Number(v) || 0),
        fetchedAt: Date.now(),
      };
    } catch (e) {
      return {
        station_code: station,
        station_name: station,
        data_source: "",
        processed_data: [],
        raw_data: [],
        error: e instanceof Error ? e.message : "drmagneto unavailable",
        fetchedAt: Date.now(),
      };
    }
  });
