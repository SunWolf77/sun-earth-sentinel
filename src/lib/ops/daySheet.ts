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
import type { DonkiCme, DonkiFlare } from "@/lib/feeds/donki";
import { earthDirectedCmes } from "@/lib/feeds/donki";
import type { XraFlare } from "@/lib/feeds/solarRegions";
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

function nodesWeek(list: Quake[]): string {
  const counts = new Map<string, number>();
  for (const q of list) {
    if (!q.node) continue;
    counts.set(q.node, (counts.get(q.node) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!rows.length) return "None";
  const shown = rows.slice(0, 4).map(([name, n]) => `${name} ${n}`);
  const more = rows.length > 4 ? ` and ${rows.length - 4} more` : "";
  return `${shown.join(", ")}${more}`;
}

function m6Count(list: Quake[]): number {
  return list.filter((q) => q.mag >= 6).length;
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

function gScale(kp: number): string {
  if (kp >= 9) return "G5";
  if (kp >= 8) return "G4";
  if (kp >= 7) return "G3";
  if (kp >= 6) return "G2";
  if (kp >= 5) return "G1";
  return "below storm";
}

/** Peak, when it happened, and how much of the file was actually at storm. */
function kpWeek(kp: KpPoint[], start: number, end: number): string | null {
  let peak: number | null = null;
  let peakAt: number | null = null;
  let storm = 0;
  let n = 0;
  let oldest = end;
  for (const p of kp) {
    const t = Date.parse(p.time_tag);
    const v = Number(p.Kp);
    if (!Number.isFinite(t) || t < start || t >= end || !Number.isFinite(v)) continue;
    n += 1;
    if (t < oldest) oldest = t;
    if (v >= 5) storm += 1;
    if (peak == null || v > peak) {
      peak = v;
      peakAt = t;
    }
  }
  if (peak == null || peakAt == null) return null;
  const coverDays = (end - oldest) / DAY;
  const cover = n > 0 && coverDays < 5 ? `file covers ${Math.max(1, Math.round(coverDays))} days` : null;
  const blocks =
    peak < 5 ? "no storm block" : storm === 1 ? "one 3-hour block" : `${storm} storm blocks`;
  return [`Kp ${peak.toFixed(1)} at ${clock(peakAt)}`, gScale(peak), blocks, cover].filter(Boolean).join(" · ");
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

type NamedFlare = { klass: string; at: number; region: number | null };

function namedFlares(
  donki: DonkiFlare[] | undefined,
  xra: XraFlare[] | undefined,
  start: number,
  end: number,
): NamedFlare[] {
  const byMin = new Map<number, NamedFlare>();
  const put = (klass: string, at: number, region: number | null) => {
    if (at < start || at >= end) return;
    const k = klass.trim().toUpperCase().split(/[/\s]/)[0] ?? "";
    if (!/^[ABCMX]\d/.test(k)) return;
    const minute = Math.floor(at / 60_000);
    const prev = byMin.get(minute);
    if (!prev) {
      byMin.set(minute, { klass: k, at, region });
      return;
    }
    const better = classRank(k) > classRank(prev.klass);
    byMin.set(minute, {
      klass: better ? k : prev.klass,
      at: better ? at : prev.at,
      region: prev.region ?? region,
    });
  };
  for (const f of xra ?? []) {
    const t = Date.parse(f.at);
    if (Number.isFinite(t)) put(f.klass, t, f.region);
  }
  for (const f of donki ?? []) {
    const t = flareMs(f);
    if (t == null || !f.classType) continue;
    const region = f.activeRegionNum != null && f.activeRegionNum > 0 ? f.activeRegionNum : null;
    put(f.classType, t, region);
  }
  return [...byMin.values()];
}

function describeFlares(list: NamedFlare[]): string | null {
  const eruptive = list.filter((f) => classRank(f.klass) >= classRank("M1.0"));
  if (!eruptive.length) return null;
  const sorted = [...eruptive].sort((a, b) => classRank(b.klass) - classRank(a.klass) || b.at - a.at);
  const top = sorted[0]!;
  const m = sorted.filter((f) => f.klass.startsWith("M")).length;
  const x = sorted.filter((f) => f.klass.startsWith("X")).length;
  const names = [...new Set(sorted.map((f) => f.region).filter((n): n is number => n != null))].map((n) => `AR${n}`);
  if (sorted.some((f) => f.region == null)) names.push("region not named yet");
  return [`${m} M · ${x} X`, `Highest ${top.klass} at ${clock(top.at)}`, names.join(", ")].filter(Boolean).join(" · ");
}

function cmeBit(cmes: DonkiCme[] | undefined, start: number, end: number): string | null {
  const inWin = (cmes ?? []).filter((c) => {
    const t = Date.parse(c.startTime || "");
    return Number.isFinite(t) && t >= start && t < end;
  });
  const n = earthDirectedCmes(inWin).length;
  if (!n) return null;
  return n === 1 ? "1 Earth-directed CME" : `${n} Earth-directed CMEs`;
}

function xrayPeak(xray: XrayPoint[], start: number, end: number): { klass: string; at: number } | null {
  let max = 0;
  let at = 0;
  for (const p of longChannelXrays(xray)) {
    const t = Date.parse(p.time_tag);
    const f = p.flux || p.observed_flux || 0;
    if (!Number.isFinite(t) || t < start || t >= end || f <= max) continue;
    max = f;
    at = t;
  }
  if (max <= 0) return null;
  const klass = fluxToClass(max);
  return classRank(klass) >= classRank("M1.0") ? { klass, at } : null;
}

/** A flux peak the flare list has not closed yet still counts. Same event stays one flare. */
function withFluxPeak(list: NamedFlare[], peak: { klass: string; at: number } | null): NamedFlare[] {
  if (!peak) return list;
  const near = list.find((f) => Math.abs(f.at - peak.at) <= 20 * 60_000);
  if (!near) return [...list, { klass: peak.klass, at: peak.at, region: null }];
  if (classRank(peak.klass) <= classRank(near.klass)) return list;
  return list.map((f) => (f === near ? { ...f, klass: peak.klass, at: peak.at } : f));
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
  const weekShifts = all.filter((v) => inWindow(v, weekStart, dayEnd));
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
  if (weekUp.length) {
    const more = weekUp.length > 4 ? ` and ${weekUp.length - 4} more` : "";
    weekParts.push(`Up: ${weekUp.slice(0, 4).map(label).join(", ")}${more}`);
  }
  if (weekDown.length) {
    const more = weekDown.length > 4 ? ` and ${weekDown.length - 4} more` : "";
    weekParts.push(`Eased: ${weekDown.slice(0, 4).map(label).join(", ")}${more}`);
  }

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
  xra?: XraFlare[];
  cmes?: DonkiCme[];
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
  const dayList = withFluxPeak(namedFlares(input.flares, input.xra, dayStart, now), xrayPeak(input.xray, dayStart, now));
  const weekList = withFluxPeak(namedFlares(input.flares, input.xra, weekStart, now), xrayPeak(input.xray, weekStart, now));
  const dayFlare = describeFlares(dayList);
  const weekFlare = describeFlares(weekList);
  const weekCme = cmeBit(input.cmes, weekStart, now);
  const scales = input.scales ? `R${input.scales.R} S${input.scales.S} G${input.scales.G}` : null;
  const wind = windBit(input.wind);
  const volc = volcanoBrief(input.volcanoes, dayStart, now, weekStart);
  const timing = resonanceVerdict(input.resonance);

  const ended = clock(now);
  const dayWindow = `Past 24 hours · to ${ended}`;
  const weekWindow = `Past 7 days · to ${ended}`;
  const daySolar = [dayFlare ?? "No M/X", dayPeak != null ? `Kp ${dayPeak.toFixed(1)}` : null, scales, wind]
    .filter(Boolean)
    .join(" · ");
  const weekSolar = [weekFlare ?? "No M/X", weekCme, kpWeek(input.kp, weekStart, now)]
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
      ["Quakes", weekReady ? [quakeValue(weekQ.length, 7), m6Count(weekQ) ? `${m6Count(weekQ)} M6+` : null].filter(Boolean).join(" · ") : "Catalog does not cover this week"],
      ["Largest", largestValue(weekQ)],
      ["Nodes", weekReady ? nodesWeek(weekQ) : null],
      ["Solar", weekSolar],
      ["Volcano", volc.week],
      ["Timing", `${timing.title}. Not a forecast`],
    ]),
  };

  const shareText = ["Sun Earth Sentinel", blockText(daily), "", blockText(weekly), "", "wolfwatch.site"].join("\n");
  return { stamp: dayWindow, daily, weekly, shareText };
}
