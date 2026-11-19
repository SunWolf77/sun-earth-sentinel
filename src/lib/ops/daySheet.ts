/**
 * Day and week sheet for the share card.
 * Same row order on both sides. The day is the past 24 hours and the
 * week is the past 7 days, ending now. A calendar day would read empty
 * just after 0000 even when the day before was busy. Not a forecast.
 */

import { DRAGON_NODES, type EqFeature } from "@/lib/feeds/usgs";
import { pointInBounds } from "@/lib/geo/bounds";
import {
  fluxToClass,
  longChannelXrays,
  type KpPoint,
  type NoaaScales,
  type SolarWind,
  type XrayPoint,
} from "@/lib/feeds/swpc";
import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
import type { DonkiFlare } from "@/lib/feeds/donki";
import { resonanceVerdict, type ResonanceScore } from "@/lib/supt/probe";

const DAY = 24 * 3600_000;
const WEEK = 7 * DAY;
const M5_PER_DAY = 4;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const NODES = DRAGON_NODES.filter((n) => n.publishedFocus || n.watchPriority);

export type SheetRow = {
  key: string;
  value: string;
};

export type SheetBlock = {
  label: string;
  window: string;
  rows: SheetRow[];
};

export type DaySheet = {
  stamp: string;
  daily: SheetBlock;
  weekly: SheetBlock;
  shareText: string;
};

type Quake = { t: number; mag: number; place: string; node: string | null };

function quakes(features: EqFeature[] | undefined, start: number, end: number): Quake[] {
  const out: Quake[] = [];
  for (const f of features ?? []) {
    const t = f.properties.time ?? 0;
    const mag = f.properties.mag;
    if (!t || mag == null || mag < 5 || t < start || t >= end) continue;
    const [lon, lat] = f.geometry?.coordinates ?? [];
    let node: string | null = null;
    if (lat != null && lon != null) {
      for (const n of NODES) {
        if (pointInBounds(lat, lon, n.bounds)) {
          node = n.name;
          break;
        }
      }
    }
    out.push({ t, mag, place: f.properties.place || "unknown", node });
  }
  out.sort((a, b) => b.mag - a.mag || b.t - a.t);
  return out;
}

function quakeValue(n: number, expectedDays: number): string {
  if (expectedDays < 0.15) {
    return n === 0 ? "No M5+ yet. Day still open" : `${n} M5+ so far. Day still open`;
  }
  const expected = M5_PER_DAY * expectedDays;
  const ratio = n / expected;
  const span = expectedDays > 1.2 ? "week" : "day";
  if (n === 0) return "No M5+";
  if (ratio >= 2) return `${n} M5+ · ${ratio.toFixed(1)}× a typical ${span}`;
  if (ratio <= 0.5) return `${n} M5+ · below a typical ${span}`;
  return `${n} M5+ · near a typical ${span}`;
}

function largestValue(list: Quake[]): string {
  const top = list[0];
  if (!top) return "None";
  return `M${top.mag.toFixed(1)} · ${top.place}`;
}

function nodesValue(list: Quake[]): string {
  const names = [...new Set(list.map((q) => q.node).filter((n): n is string => !!n))];
  if (!names.length) return "None";
  return names.slice(0, 4).join(", ");
}

function peakKp(kp: KpPoint[], start: number, end: number): number | null {
  let peak: number | null = null;
  for (const p of kp) {
    const t = Date.parse(p.time_tag);
    const v = Number(p.Kp);
    if (!Number.isFinite(t) || t < start || t >= end || !Number.isFinite(v)) continue;
    if (peak == null || v > peak) peak = v;
  }
  return peak;
}

function classRank(klass: string): number {
  const m = klass.trim().toUpperCase().match(/^([ABCMX])(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const letter = { A: 1, B: 2, C: 3, M: 4, X: 5 }[m[1] as "A" | "B" | "C" | "M" | "X"] ?? 0;
  return letter * 100 + Number(m[2]);
}

function flareMs(f: DonkiFlare): number | null {
  const t = Date.parse(f.peakTime || f.beginTime || "");
  return Number.isFinite(t) ? t : null;
}

/** Highest catalogued flare in the window, and every AR that produced one at M or above. */
function flareBit(flares: DonkiFlare[] | undefined, start: number, end: number, chart: string | null): string | null {
  const inWin = (flares ?? []).filter((f) => {
    const t = flareMs(f);
    return t != null && t >= start && t < end && !!f.classType;
  });
  inWin.sort((a, b) => classRank(b.classType || "") - classRank(a.classType || ""));
  const top = inWin[0];
  const topRank = top ? classRank(top.classType || "") : 0;
  const chartRank = chart ? classRank(chart) : 0;
  const eruptive = inWin.filter((f) => classRank(f.classType || "") >= classRank("M1.0"));
  const pool = eruptive.length
    ? eruptive
    : inWin.filter((f) => classRank(f.classType || "") >= topRank && topRank >= classRank("C1.0"));
  const names = [...new Set(pool.map((f) => f.activeRegionNum).filter((n): n is number => n != null && n > 0))].map(
    (n) => `AR${n}`,
  );
  if (pool.some((f) => !f.activeRegionNum)) names.push("region not named yet");
  const ars = names.length ? names.join(", ") : null;

  if (chart && chartRank >= classRank("M1.0") && chartRank > topRank) {
    return [`Chart ${chart}`, top ? `catalog ${top.classType}` : "catalog has not named it", ars].filter(Boolean).join(" · ");
  }
  if (!top) return null;
  return [`Highest ${top.classType}`, ars].filter(Boolean).join(" · ");
}

function xrayPeak(xray: XrayPoint[], start: number, end: number): string | null {
  let max = 0;
  for (const p of longChannelXrays(xray)) {
    const t = Date.parse(p.time_tag);
    const f = p.flux || p.observed_flux || 0;
    if (!Number.isFinite(t) || t < start || t >= end || f <= max) continue;
    max = f;
  }
  return max > 0 ? fluxToClass(max) : null;
}

function windBit(wind: SolarWind | null): string | null {
  if (!wind || (wind.speed == null && wind.bz == null)) return null;
  const speed = wind.speed != null ? `${Math.round(wind.speed)} km/s` : null;
  const bz = wind.bz != null ? `Bz ${wind.bz > 0 ? "+" : ""}${wind.bz.toFixed(0)}` : null;
  const pace =
    wind.speed == null ? null : wind.speed >= 550 ? "fast" : wind.speed >= 450 ? "elevated" : "quiet";
  return ["wind now", pace, speed, bz].filter(Boolean).join(" ");
}

function noticeMs(v: UsgsVolcanoAlert): number | null {
  if (v.sentUnix != null && Number.isFinite(v.sentUnix) && v.sentUnix > 0) {
    return v.sentUnix > 1e12 ? v.sentUnix : v.sentUnix * 1000;
  }
  if (v.sentUtc) {
    const t = Date.parse(v.sentUtc);
    if (Number.isFinite(t)) return t;
  }
  return null;
}

function rank(v: UsgsVolcanoAlert): number {
  const c = (v.colorCode || "").toUpperCase();
  const a = (v.alertLevel || "").toUpperCase();
  if (c === "RED" || a === "WARNING") return 3;
  if (c === "ORANGE" || a === "WATCH") return 2;
  if (c === "YELLOW" || a === "ADVISORY") return 1;
  return 0;
}

function inWindow(v: UsgsVolcanoAlert, start: number, end: number): boolean {
  const t = noticeMs(v);
  return t != null && t >= start && t < end;
}

function volcanoBrief(
  list: UsgsVolcanoAlert[] | undefined,
  dayStart: number,
  dayEnd: number,
  weekStart: number,
): { day: string | null; week: string | null } {
  const all = list ?? [];
  const label = (v: UsgsVolcanoAlert) => `${v.name} ${(v.colorCode || v.alertLevel || "").toLowerCase()}`;
  const dayShifts = all.filter((v) => inWindow(v, dayStart, dayEnd));
  const weekShifts = all.filter((v) => inWindow(v, weekStart, dayStart));
  const up = dayShifts.filter((v) => rank(v) >= 2);
  const down = dayShifts.filter((v) => rank(v) === 0);
  const standing = all.filter((v) => rank(v) >= 2 && !up.some((u) => u.name === v.name));

  const dayParts: string[] = [];
  if (up.length) dayParts.push(`Up: ${up.slice(0, 4).map(label).join(", ")}`);
  if (down.length) dayParts.push(`Eased: ${down.slice(0, 4).map(label).join(", ")}`);
  if (standing.length) {
    const names = standing.slice(0, 4).map(label);
    const more = standing.length > 4 ? ` and ${standing.length - 4} more` : "";
    dayParts.push(`Elevated now: ${names.join(", ")}${more}`);
  }

  const weekUp = weekShifts.filter((v) => rank(v) >= 2);
  const weekDown = weekShifts.filter((v) => rank(v) === 0);
  const weekParts: string[] = [];
  if (weekUp.length) weekParts.push(`Up: ${weekUp.slice(0, 4).map(label).join(", ")}`);
  if (weekDown.length) weekParts.push(`Eased: ${weekDown.slice(0, 4).map(label).join(", ")}`);

  return {
    day: dayParts.length ? dayParts.join(". ") : null,
    week: weekParts.length ? weekParts.join(". ") : null,
  };
}

function dayName(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function clock(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dayName(ms)} ${hh}:${mm} UTC`;
}

function rowsOf(items: Array<[string, string | null]>): SheetRow[] {
  return items.filter((item): item is [string, string] => !!item[1]).map(([key, value]) => ({ key, value }));
}

function blockText(block: SheetBlock): string {
  return [`${block.label} · ${block.window}`, ...block.rows.map((r) => `${r.key} — ${r.value}`)].join("\n");
}

export function buildDaySheet(input: {
  features?: EqFeature[];
  kp: KpPoint[];
  xray: XrayPoint[];
  wind: SolarWind | null;
  scales: NoaaScales | null;
  volcanoes?: UsgsVolcanoAlert[];
  flares?: DonkiFlare[];
  resonance: ResonanceScore | null;
  now?: number;
}): DaySheet {
  const now = input.now ?? Date.now();
  const dayStart = now - DAY;
  const weekStart = now - WEEK;
  const dayQ = quakes(input.features, dayStart, now);
  const weekQ = quakes(input.features, weekStart, now);
  const oldest = (input.features ?? []).reduce((min, f) => {
    const t = f.properties.time ?? 0;
    return t && t < min ? t : min;
  }, now);
  const weekReady = oldest <= weekStart + 3 * 3600_000;

  const dayPeak = peakKp(input.kp, dayStart, now);
  const weekPeak = peakKp(input.kp, weekStart, now);
  const xPeak = xrayPeak(input.xray, dayStart, now);
  const dayFlare = flareBit(input.flares, dayStart, now, xPeak);
  const weekFlare = flareBit(input.flares, weekStart, now, null);
  const scales = input.scales ? `R${input.scales.R} S${input.scales.S} G${input.scales.G}` : null;
  const wind = windBit(input.wind);
  const volc = volcanoBrief(input.volcanoes, dayStart, now, weekStart);
  const timing = resonanceVerdict(input.resonance);

  const ended = clock(now);
  const dayWindow = `Past 24 hours · to ${ended}`;
  const weekWindow = `Past 7 days · to ${ended}`;
  const daySolar = [dayFlare ?? "No catalogued flare", dayPeak != null ? `Kp ${dayPeak.toFixed(1)}` : null, scales, wind]
    .filter(Boolean)
    .join(" · ");
  const weekSolar = [weekFlare ?? "No catalogued flare", weekPeak != null ? `Kp ${weekPeak.toFixed(1)}` : null]
    .filter(Boolean)
    .join(" · ");

  const daily: SheetBlock = {
    label: "Day",
    window: dayWindow,
    rows: rowsOf([
      ["Quakes", quakeValue(dayQ.length, 1)],
      ["Largest", largestValue(dayQ)],
      ["Nodes", nodesValue(dayQ)],
      ["Solar", daySolar || null],
      ["Volcano", volc.day],
    ]),
  };
  const weekly: SheetBlock = {
    label: "Week",
    window: weekWindow,
    rows: rowsOf([
      ["Quakes", weekReady ? quakeValue(weekQ.length, 7) : "Catalog does not cover this week"],
      ["Largest", largestValue(weekQ)],
      ["Nodes", weekReady ? nodesValue(weekQ) : null],
      ["Solar", weekSolar],
      ["Volcano", volc.week],
      ["Timing", `${timing.title}. Not a forecast`],
    ]),
  };

  const shareText = ["Sun Earth Sentinel", blockText(daily), "", blockText(weekly), "", "wolfwatch.site"].join("\n");
  return { stamp: dayWindow, daily, weekly, shareText };
}
