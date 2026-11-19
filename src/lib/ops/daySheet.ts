/**
 * Day and week sheet for the share card.
 * Counts come from the loaded catalog and the Kp file. Not a forecast.
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
const WEEK = 7 * DAY;
const M5_PER_DAY = 4;

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

function quakes(features: EqFeature[] | undefined, since: number): Quake[] {
  const out: Quake[] = [];
  for (const f of features ?? []) {
    const t = f.properties.time ?? 0;
    const mag = f.properties.mag;
    if (!t || mag == null || mag < 5 || t < since) continue;
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

function vsTypical(n: number, days: number): string {
  const expected = M5_PER_DAY * days;
  const ratio = n / expected;
  const span = days === 1 ? "day" : "week";
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

function peakKp(kp: KpPoint[], since: number): number | null {
  let peak: number | null = null;
  for (const p of kp) {
    const t = Date.parse(p.time_tag);
    const v = Number(p.Kp);
    if (!Number.isFinite(t) || t < since || !Number.isFinite(v)) continue;
    if (peak == null || v > peak) peak = v;
  }
  return peak;
}

function xrayPeak(xray: XrayPoint[], since: number): string | null {
  let max = 0;
  for (const p of longChannelXrays(xray)) {
    const t = Date.parse(p.time_tag);
    const f = p.flux || p.observed_flux || 0;
    if (!Number.isFinite(t) || t < since || f <= max) continue;
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
  return ["Wind", pace, speed, bz].filter(Boolean).join(" ");
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

function stamp(now: number): string {
  const d = new Date(now);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${hh}:${mm} UTC`;
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
  const dayQ = quakes(input.features, now - DAY);
  const weekQ = quakes(input.features, now - WEEK);
  const oldest = (input.features ?? []).reduce((min, f) => {
    const t = f.properties.time ?? 0;
    return t && t < min ? t : min;
  }, now);
  const spanDays = (now - oldest) / DAY;
  const weekReady = spanDays >= 5;

  const dayPeak = peakKp(input.kp, now - DAY);
  const weekPeak = peakKp(input.kp, now - WEEK);
  const xPeak = xrayPeak(input.xray, now - DAY);
  const scales = input.scales ? `R${input.scales.R} S${input.scales.S} G${input.scales.G}` : null;
  const wind = windLine(input.wind);
  const volc = volcanoLine(input.volcanoes);
  const timing = resonanceVerdict(input.resonance);

  const dailyLines = [
    vsTypical(dayQ.length, 1),
    largest(dayQ),
    nodesOf(dayQ),
    [xPeak ? `X-ray peak ${xPeak}` : null, dayPeak != null ? `Kp peak ${dayPeak.toFixed(1)}` : null, scales]
      .filter(Boolean)
      .join(" · "),
    wind,
    volc,
  ].filter((l): l is string => !!l);

  const weeklyLines = [
    weekReady ? vsTypical(weekQ.length, 7) : `Catalog covers ${Math.max(1, Math.round(spanDays))} days, not a full week.`,
    weekReady ? largest(weekQ) : largest(weekQ),
    weekReady ? nodesOf(weekQ) : null,
    weekPeak != null ? `Kp peak ${weekPeak.toFixed(1)} over the Kp file.` : null,
    `Timing: ${timing.title}. Not a forecast.`,
    "X-ray chart is the last day, not the week.",
  ].filter((l): l is string => !!l);

  const when = stamp(now);
  const daily: SheetBlock = { label: "Day", lines: dailyLines };
  const weekly: SheetBlock = { label: "Week", lines: weeklyLines };
  const shareText = [
    `Sun Earth Sentinel · ${when}`,
    "",
    "Day",
    ...dailyLines,
    "",
    "Week",
    ...weeklyLines,
    "",
    "Not a forecast.",
  ].join("\n");

  return { stamp: when, daily, weekly, shareText };
}
