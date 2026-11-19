/**
 * Day and week sheet for the share card.
 * Counts come from the loaded catalog and the Kp file.
 * A day is one UTC date, 0000–2359. A week is seven of those dates.
 * Not a forecast.
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
import { resonanceVerdict, type ResonanceScore } from "@/lib/supt/probe";

const DAY = 24 * 3600_000;
const M5_PER_DAY = 4;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const NODES = DRAGON_NODES.filter((n) => n.publishedFocus || n.watchPriority);

export type SheetBlock = {
  label: string;
  lines: string[];
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

function vsTypical(n: number, expectedDays: number): string {
  if (expectedDays < 0.15) {
    return n === 0 ? "No M5+ yet. UTC day still open." : `${n} M5+ so far. UTC day still open.`;
  }
  const expected = M5_PER_DAY * expectedDays;
  const ratio = n / expected;
  const span = expectedDays > 1.2 ? "week" : "day";
  if (n === 0) return `No M5+ in this ${span}.`;
  if (ratio >= 2) return `${n} M5+ · about ${ratio.toFixed(1)}× a typical ${span}.`;
  if (ratio <= 0.5) return `${n} M5+ · below a typical ${span}.`;
  return `${n} M5+ · near a typical ${span}.`;
}

function largest(list: Quake[]): string {
  const top = list[0];
  if (!top) return "No M5+.";
  return `Largest M${top.mag.toFixed(1)} · ${top.place}.`;
}

function nodesOf(list: Quake[]): string {
  const names = [...new Set(list.map((q) => q.node).filter((n): n is string => !!n))];
  if (!names.length) return "None on a watched node.";
  return `Nodes: ${names.slice(0, 4).join(", ")}.`;
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

function windLine(wind: SolarWind | null): string | null {
  if (!wind || (wind.speed == null && wind.bz == null)) return null;
  const speed = wind.speed != null ? `${Math.round(wind.speed)} km/s` : null;
  const bz = wind.bz != null ? `Bz ${wind.bz > 0 ? "+" : ""}${wind.bz.toFixed(0)}` : null;
  const pace =
    wind.speed == null ? null : wind.speed >= 550 ? "fast" : wind.speed >= 450 ? "elevated" : "quiet";
  return ["Wind now", pace, speed, bz].filter(Boolean).join(" ");
}

function volcanoLine(list: UsgsVolcanoAlert[] | undefined): string | null {
  const hot = (list ?? []).filter((v) => {
    const a = (v.alertLevel || "").toUpperCase();
    const c = (v.colorCode || "").toUpperCase();
    return a === "ADVISORY" || a === "WATCH" || a === "WARNING" || c === "YELLOW" || c === "ORANGE" || c === "RED";
  });
  if (!hot.length) return null;
  const names = hot.slice(0, 3).map((v) => `${v.name} ${v.colorCode.toLowerCase()}`);
  const more = hot.length > 3 ? ` +${hot.length - 3}` : "";
  return `Volcano: ${names.join(", ")}${more}.`;
}

function dayName(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** UTC calendar day containing `now`: 0000 through the next 0000. */
function utcDay(now: number): { start: number; end: number; open: boolean; fraction: number } {
  const d = new Date(now);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const end = start + DAY;
  const fraction = Math.min(1, Math.max(0, (now - start) / DAY));
  return { start, end, open: now < end, fraction };
}

export function buildDaySheet(input: {
  features?: EqFeature[];
  kp: KpPoint[];
  xray: XrayPoint[];
  wind: SolarWind | null;
  scales: NoaaScales | null;
  volcanoes?: UsgsVolcanoAlert[];
  resonance: ResonanceScore | null;
  now?: number;
}): DaySheet {
  const now = input.now ?? Date.now();
  const day = utcDay(now);
  const weekStart = day.start - 6 * DAY;
  const weekEnd = day.end;
  const dayQ = quakes(input.features, day.start, day.end);
  const weekQ = quakes(input.features, weekStart, weekEnd);
  const oldest = (input.features ?? []).reduce((min, f) => {
    const t = f.properties.time ?? 0;
    return t && t < min ? t : min;
  }, now);
  const weekReady = oldest <= weekStart + 3 * 3600_000;
  const weekDays = 6 + day.fraction;

  const dayPeak = peakKp(input.kp, day.start, day.end);
  const weekPeak = peakKp(input.kp, weekStart, weekEnd);
  const xPeak = xrayPeak(input.xray, day.start, day.end);
  const scales = input.scales ? `R${input.scales.R} S${input.scales.S} G${input.scales.G}` : null;
  const wind = windLine(input.wind);
  const volc = volcanoLine(input.volcanoes);
  const timing = resonanceVerdict(input.resonance);

  const dayWindow = `${dayName(day.start)} 0000–2359 UTC${day.open ? ", so far" : ""}`;
  const weekWindow = `${dayName(weekStart)} 0000 – ${dayName(day.start)} 2359 UTC${day.open ? ", today still open" : ""}`;

  const dailyLines = [
    dayWindow + ".",
    vsTypical(dayQ.length, day.fraction),
    largest(dayQ),
    nodesOf(dayQ),
    [xPeak ? `X-ray peak ${xPeak}` : null, dayPeak != null ? `Kp peak ${dayPeak.toFixed(1)}` : null, scales]
      .filter(Boolean)
      .join(" · "),
    wind,
    volc,
  ].filter((l): l is string => !!l);

  const weeklyLines = [
    weekWindow + ".",
    weekReady ? vsTypical(weekQ.length, weekDays) : "Catalog does not cover this full UTC week.",
    largest(weekQ),
    weekReady ? nodesOf(weekQ) : null,
    weekPeak != null ? `Kp peak ${weekPeak.toFixed(1)} over the Kp file.` : null,
    `Timing: ${timing.title}. Not a forecast.`,
    "X-ray chart is the last day, not the week.",
  ].filter((l): l is string => !!l);

  const when = dayWindow;
  const daily: SheetBlock = { label: "Day", lines: dailyLines };
  const weekly: SheetBlock = { label: "Week", lines: weeklyLines };
  // One paragraph. A share target that stores text as a web address turns
  // real line breaks into the characters %0A and shows them.
  const shareText = [
    "Sun Earth Sentinel.",
    `Day. ${dailyLines.join(" ")}`,
    `Week. ${weeklyLines.join(" ")}`,
  ].join(" ");

  return { stamp: when, daily, weekly, shareText };
}
