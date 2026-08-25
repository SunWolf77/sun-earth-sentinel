/**
 * GOES X-ray Elevation Attention — nowcast from the rise already under way.
 * Not a day-ahead M/X forecast. Lead times are minutes; impulsive events collapse.
 */

import { fluxToClass, type XrayPoint } from "@/lib/feeds/swpc";

export type AttentionState =
  | "quiet"
  | "elevated"
  | "rising"
  | "m_approach"
  | "m_active"
  | "x_approach"
  | "x_active";

export const STATE_RANK: Record<AttentionState, number> = {
  quiet: 0,
  elevated: 1,
  rising: 2,
  m_approach: 3,
  m_active: 4,
  x_approach: 5,
  x_active: 6,
};

export const STATE_LABEL: Record<AttentionState, string> = {
  quiet: "Quiet",
  elevated: "Elevated",
  rising: "Rising",
  m_approach: "M approach",
  m_active: "M active",
  x_approach: "X approach",
  x_active: "X active",
};

const M1 = 1e-5;
const X1 = 1e-4;
const C1 = 1e-6;
const SWPC = "https://services.swpc.noaa.gov";

export type AttentionLive = {
  t: string;
  className: string;
  state: AttentionState;
  rate5: number | null;
  etaM: number | null;
  etaX: number | null;
  logDistM: number;
  logDistX: number;
  dualDelta: number | null;
  disagree: boolean;
  fluxL: number;
  fluxS: number | null;
};

export type FlareEventCard = {
  maxClass: string;
  begin: string;
  peak: string;
  end: string | null;
  riseMin: number;
  approachLeadMin: number | null;
  risingLeadMin: number | null;
  impulsive: boolean;
  maxFlux: number;
  maxRatio: number | null;
};

export type AttentionSkill = {
  n: number;
  approachMedian: number | null;
  approachMean: number | null;
  approachMin: number | null;
  approachMax: number | null;
  risingMedian: number | null;
  impulsiveShortLead: number;
  window: string;
};

export type XrayAttentionBundle = {
  live: AttentionLive | null;
  events: FlareEventCard[];
  skill: AttentionSkill;
  generated: number;
  honesty: string;
};

type FlareRow = {
  begin_time: string;
  max_time: string;
  end_time?: string | null;
  begin_class?: string;
  max_class?: string;
  max_xrlong?: number;
  max_ratio?: number;
};

function isLong(energy?: string) {
  return !!energy && energy.includes("0.1-0.8");
}
function isShort(energy?: string) {
  return !!energy && energy.includes("0.05-0.4");
}

function fluxOf(p: XrayPoint): number | null {
  const f = p.flux ?? p.observed_flux;
  if (f == null || !Number.isFinite(f) || f <= 0) return null;
  return f;
}

function toMinuteMap(rows: XrayPoint[], long: boolean): Map<number, number> {
  const map = new Map<number, number>();
  for (const p of rows) {
    if (long ? !isLong(p.energy) : !isShort(p.energy)) continue;
    const f = fluxOf(p);
    if (f == null) continue;
    const ms = Date.parse(p.time_tag);
    if (!Number.isFinite(ms)) continue;
    const t = Math.floor(ms / 60_000) * 60_000;
    map.set(t, f);
  }
  return map;
}

function rateLog(map: Map<number, number>, t: number, minutes = 5): number | null {
  const f1 = map.get(t);
  const f0 = map.get(t - minutes * 60_000);
  if (f1 == null || f0 == null || f0 <= 0 || f1 <= 0) return null;
  return (Math.log10(f1) - Math.log10(f0)) / minutes;
}

export function evaluateState(flux: number, rate5: number | null): AttentionState {
  const rising = rate5 != null && rate5 > 0.015;
  const logDistM = Math.log10(M1) - Math.log10(Math.max(flux, 1e-12));
  const logDistX = Math.log10(X1) - Math.log10(Math.max(flux, 1e-12));
  const etaM = rate5 && rate5 > 0 && flux < M1 ? logDistM / rate5 : null;
  const etaX = rate5 && rate5 > 0 && flux < X1 ? logDistX / rate5 : null;

  if (flux >= X1) return "x_active";
  if (flux < X1 && ((logDistX < 0.35 && rising) || (etaX != null && etaX > 0 && etaX <= 15))) {
    return "x_approach";
  }
  if (flux >= M1) return "m_active";
  if (flux < M1 && ((logDistM < 0.35 && rising) || (etaM != null && etaM > 0 && etaM <= 15))) {
    return "m_approach";
  }
  if (rising || (rate5 != null && rate5 > 0.01 && flux >= C1)) return "rising";
  if (flux >= C1) return "elevated";
  return "quiet";
}

function sampleAt(
  t: number,
  longMap: Map<number, number>,
  shortMap: Map<number, number>,
  secMap: Map<number, number> | null,
): AttentionLive | null {
  const f = longMap.get(t);
  if (f == null) return null;
  const fs = shortMap.get(t) ?? null;
  const rate5 = rateLog(longMap, t, 5);
  const state = evaluateState(f, rate5);
  const logDistM = Math.log10(M1) - Math.log10(Math.max(f, 1e-12));
  const logDistX = Math.log10(X1) - Math.log10(Math.max(f, 1e-12));
  const etaM = rate5 && rate5 > 0 && f < M1 ? logDistM / rate5 : null;
  const etaX = rate5 && rate5 > 0 && f < X1 ? logDistX / rate5 : null;

  let dualDelta: number | null = null;
  let disagree = false;
  if (secMap) {
    const f2 = secMap.get(t);
    if (f2 != null && f2 > 0 && f > 0) {
      dualDelta = Math.abs(Math.log10(f) - Math.log10(f2));
      const rateSec = rateLog(secMap, t, 5);
      const risingP = rate5 != null && rate5 > 0.015;
      const risingS = rateSec != null && rateSec > 0.015;
      if (dualDelta > 0.25 && risingP !== risingS) disagree = true;
    }
  }

  return {
    t: new Date(t).toISOString(),
    className: fluxToClass(f),
    state,
    rate5,
    etaM,
    etaX,
    logDistM,
    logDistX,
    dualDelta,
    disagree,
    fluxL: f,
    fluxS: fs,
  };
}

function analyzeEvent(fl: FlareRow, longMap: Map<number, number>): FlareEventCard | null {
  const begin = Date.parse(fl.begin_time);
  const peak = Date.parse(fl.max_time);
  if (!Number.isFinite(begin) || !Number.isFinite(peak)) return null;
  const maxFlux = Number(fl.max_xrlong) || 0;
  const maxClass = fl.max_class || (maxFlux > 0 ? fluxToClass(maxFlux) : "");
  if (!maxClass || (maxClass[0] !== "M" && maxClass[0] !== "X")) return null;

  const threshold = maxClass[0] === "X" ? X1 : M1;
  const lookback = begin - 30 * 60_000;
  let firstApproach: number | null = null;
  let firstRising: number | null = null;
  let firstCross: number | null = null;

  for (let t = lookback; t <= peak + 5 * 60_000; t += 60_000) {
    const f = longMap.get(t);
    if (f == null) continue;
    const rate5 = rateLog(longMap, t, 5);
    const st = evaluateState(f, rate5);
    if (STATE_RANK[st] >= STATE_RANK.rising && firstRising == null) firstRising = t;
    if (STATE_RANK[st] >= STATE_RANK.m_approach && firstApproach == null) firstApproach = t;
    if (f >= threshold && firstCross == null) firstCross = t;
  }

  const riseMin = (peak - begin) / 60_000;
  const approachLeadMin =
    firstApproach != null && firstCross != null ? (firstCross - firstApproach) / 60_000 : null;
  const risingLeadMin =
    firstRising != null && firstCross != null ? (firstCross - firstRising) / 60_000 : null;

  return {
    maxClass,
    begin: new Date(begin).toISOString(),
    peak: new Date(peak).toISOString(),
    end: fl.end_time ? new Date(Date.parse(fl.end_time)).toISOString() : null,
    riseMin,
    approachLeadMin,
    risingLeadMin,
    impulsive: riseMin < 8,
    maxFlux,
    maxRatio: fl.max_ratio ?? null,
  };
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SWPC}${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Live attention + M/X event cards + 7d skill summary from SWPC public JSON.
 * Uses 7-day series so skill has enough events; live sample is the latest minute.
 */
export async function buildXrayAttentionBundle(): Promise<XrayAttentionBundle> {
  const [primary, secondary, flares] = await Promise.all([
    fetchJson<XrayPoint[]>("/json/goes/primary/xrays-7-day.json"),
    fetchJson<XrayPoint[]>("/json/goes/secondary/xrays-7-day.json"),
    fetchJson<FlareRow[]>("/json/goes/primary/xray-flares-7-day.json"),
  ]);

  const longMap = toMinuteMap(primary ?? [], true);
  const shortMap = toMinuteMap(primary ?? [], false);
  const secMap = toMinuteMap(secondary ?? [], true);

  let live: AttentionLive | null = null;
  if (longMap.size) {
    const latest = Math.max(...longMap.keys());
    live = sampleAt(latest, longMap, shortMap, secMap.size ? secMap : null);
  }

  const events: FlareEventCard[] = [];
  for (const fl of flares ?? []) {
    const ev = analyzeEvent(fl, longMap);
    if (!ev) continue;
    const p = Date.parse(ev.peak);
    const b = Date.parse(ev.begin);
    if (!longMap.has(Math.floor(p / 60_000) * 60_000) && !longMap.has(Math.floor(b / 60_000) * 60_000)) {
      let near = false;
      for (let dt = -5; dt <= 5; dt++) {
        if (longMap.has(Math.floor(p / 60_000) * 60_000 + dt * 60_000)) {
          near = true;
          break;
        }
      }
      if (!near) continue;
    }
    events.push(ev);
  }
  events.sort((a, b) => Date.parse(b.peak) - Date.parse(a.peak));

  const approachLeads = events
    .map((e) => e.approachLeadMin)
    .filter((x): x is number => x != null);
  const risingLeads = events
    .map((e) => e.risingLeadMin)
    .filter((x): x is number => x != null);

  const skill: AttentionSkill = {
    n: events.length,
    approachMedian: median(approachLeads),
    approachMean: approachLeads.length
      ? approachLeads.reduce((a, b) => a + b, 0) / approachLeads.length
      : null,
    approachMin: approachLeads.length ? Math.min(...approachLeads) : null,
    approachMax: approachLeads.length ? Math.max(...approachLeads) : null,
    risingMedian: median(risingLeads),
    impulsiveShortLead: events.filter(
      (e) => e.impulsive && (e.approachLeadMin == null || e.approachLeadMin < 3),
    ).length,
    window: "7d",
  };

  return {
    live,
    events: events.slice(0, 12),
    skill,
    generated: Date.now(),
    honesty:
      "Elevation attention from GOES rise — minutes of lead when the rise is already under way, not a day-ahead forecast.",
  };
}
