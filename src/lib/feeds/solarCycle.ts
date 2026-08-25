/**
 * Solar Cycle 25 progression context from NOAA SWPC public JSON.
 * Envelope only — not a flare forecast.
 *
 * Endpoints:
 *   https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json
 *   https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json
 */

const SWPC = "https://services.swpc.noaa.gov/json/solar-cycle";

export type CyclePhase = "rising" | "maximum" | "declining" | "minimum" | "unknown";

export type CycleMonth = {
  timeTag: string; // YYYY-MM
  ssn: number | null;
  smoothedSsn: number | null;
  f107: number | null;
  predicted?: boolean;
};

export type SolarCycleBundle = {
  cycle: 25;
  phase: CyclePhase;
  /** SILSO/SWPC observed peak of the 13-month smoothed series */
  peak: { timeTag: string; smoothedSsn: number } | null;
  /** Latest month with a real monthly SSN */
  latestObserved: CycleMonth | null;
  /** Current SWPC predicted month (near now) */
  predictedNow: {
    timeTag: string;
    ssn: number;
    f107: number;
    highSsn: number;
    lowSsn: number;
  } | null;
  /** ~36 months monthly SSN for sparkline (observed, then predicted tail) */
  series: CycleMonth[];
  honesty: string;
  source: string;
  fetchedAt: number;
};

type ObservedRow = {
  "time-tag": string;
  ssn: number;
  smoothed_ssn: number;
  f10_7?: number;
  "f10.7"?: number;
};

type PredictedRow = {
  "time-tag": string;
  predicted_ssn: number;
  predicted_f10_7?: number;
  "predicted_f10.7"?: number;
  high_ssn: number;
  low_ssn: number;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`solar-cycle ${res.status}`);
  return (await res.json()) as T;
}

function f107Of(row: ObservedRow | PredictedRow): number | null {
  if ("f10.7" in row && row["f10.7"] != null) return Number(row["f10.7"]) || null;
  if ("predicted_f10.7" in row && row["predicted_f10.7"] != null)
    return Number(row["predicted_f10.7"]) || null;
  return null;
}

function inferPhase(
  peak: { timeTag: string; smoothedSsn: number } | null,
  latestSmoothed: number | null,
  latestTag: string | null,
): CyclePhase {
  if (!peak || !latestTag) return "unknown";
  if (latestTag > peak.timeTag) {
    if (latestSmoothed != null && latestSmoothed < peak.smoothedSsn * 0.85) return "declining";
    if (latestTag >= "2026-02") return "declining";
    return "maximum";
  }
  return "rising";
}

/**
 * Build lean Cycle 25 context for the Solar tab.
 * Failures return a static fallback so the strip never crashes the desk.
 */
export async function buildSolarCycleBundle(): Promise<SolarCycleBundle> {
  const honesty =
    "Cycle envelope from NOAA SWPC — not a flare forecast. Peak timing is SILSO smoothed SSN.";
  const source = "NOAA SWPC solar-cycle JSON · SILSO SSN v2";

  try {
    const [observed, predicted] = await Promise.all([
      getJson<ObservedRow[]>(`${SWPC}/observed-solar-cycle-indices.json`),
      getJson<PredictedRow[]>(`${SWPC}/predicted-solar-cycle.json`),
    ]);

    const from2020 = observed.filter((r) => (r["time-tag"] || "") >= "2020-01");
    const withSmooth = from2020.filter((r) => Number(r.smoothed_ssn) > 0);
    let peak: SolarCycleBundle["peak"] = null;
    if (withSmooth.length) {
      const top = withSmooth.reduce((a, b) =>
        Number(b.smoothed_ssn) > Number(a.smoothed_ssn) ? b : a,
      );
      peak = {
        timeTag: top["time-tag"],
        smoothedSsn: Number(top.smoothed_ssn),
      };
    }

    const observedTail = from2020.filter((r) => Number(r.ssn) >= 0).slice(-36);
    const series: CycleMonth[] = observedTail.map((r) => ({
      timeTag: r["time-tag"],
      ssn: Number(r.ssn) >= 0 ? Number(r.ssn) : null,
      smoothedSsn: Number(r.smoothed_ssn) > 0 ? Number(r.smoothed_ssn) : null,
      f107: f107Of(r),
      predicted: false,
    }));

    const lastObs = series.length ? series[series.length - 1]!.timeTag : "2026-01";
    for (const p of predicted) {
      if (p["time-tag"] <= lastObs) continue;
      if (series.length >= 48) break;
      series.push({
        timeTag: p["time-tag"],
        ssn: Number(p.predicted_ssn) || null,
        smoothedSsn: null,
        f107: f107Of(p),
        predicted: true,
      });
    }

    const latestObserved: CycleMonth | null = observedTail.length
      ? {
          timeTag: observedTail[observedTail.length - 1]!["time-tag"],
          ssn: Number(observedTail[observedTail.length - 1]!.ssn),
          smoothedSsn:
            Number(observedTail[observedTail.length - 1]!.smoothed_ssn) > 0
              ? Number(observedTail[observedTail.length - 1]!.smoothed_ssn)
              : null,
          f107: f107Of(observedTail[observedTail.length - 1]!),
          predicted: false,
        }
      : null;

    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const predRow =
      predicted.find((p) => p["time-tag"] === ym) ??
      predicted.find((p) => p["time-tag"] >= ym) ??
      predicted[0] ??
      null;

    const predictedNow = predRow
      ? {
          timeTag: predRow["time-tag"],
          ssn: Number(predRow.predicted_ssn) || 0,
          f107: f107Of(predRow) ?? 0,
          highSsn: Number(predRow.high_ssn) || 0,
          lowSsn: Number(predRow.low_ssn) || 0,
        }
      : null;

    const lastSmooth =
      withSmooth.length > 0 ? Number(withSmooth[withSmooth.length - 1]!.smoothed_ssn) : null;
    const lastSmoothTag =
      withSmooth.length > 0 ? withSmooth[withSmooth.length - 1]!["time-tag"] : null;

    return {
      cycle: 25,
      phase: inferPhase(peak, lastSmooth, lastSmoothTag ?? latestObserved?.timeTag ?? null),
      peak,
      latestObserved,
      predictedNow,
      series,
      honesty,
      source,
      fetchedAt: Date.now(),
    };
  } catch {
    return {
      cycle: 25,
      phase: "declining",
      peak: { timeTag: "2024-10", smoothedSsn: 160.9 },
      latestObserved: null,
      predictedNow: null,
      series: [],
      honesty,
      source,
      fetchedAt: Date.now(),
    };
  }
}

export const PHASE_LABEL: Record<CyclePhase, string> = {
  rising: "Rising",
  maximum: "Near maximum",
  declining: "Declining",
  minimum: "Minimum",
  unknown: "—",
};
