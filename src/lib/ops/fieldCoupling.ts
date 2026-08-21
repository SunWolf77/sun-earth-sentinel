/**
 * Sun–Earth field coupling — deterministic pairing, not a forecast.
 *
 * What this does: put M-class+ flares next to M6+ ruptures in the same
 * window, and measure how close one large quake sits to the antipode of
 * another. That is the "connect the dots" desk.
 *
 * What this is not: causation, early warning, or a probability that the
 * next M7 "must" fire. Pacific Ring antipodes often land on the Ring —
 * that is plate geography. We still report the measured offset and lag
 * so a human can see whether THIS pair is tighter than the wallpaper.
 */

import type { DonkiCme, DonkiFlare } from "@/lib/feeds/donki";
import { cmeImpactSummary } from "@/lib/feeds/donki";
import type { EqFeature } from "@/lib/feeds/usgs";

export const M45_MONTH =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson";

export type FlareClass = {
  raw: string;
  letter: "B" | "C" | "M" | "X";
  value: number;
  /** C=0–10, M=10–20, X=20+ so M8.2 → 18.2 */
  rank: number;
};

export type CouplingQuake = {
  id: string;
  lat: number;
  lon: number;
  mag: number;
  place: string;
  depth: number;
  time: number;
  url?: string;
};

export type CouplingFlare = {
  id: string;
  classType: string;
  parsed: FlareClass;
  peakMs: number;
  sourceLocation: string | null;
  link: string | null;
};

export type AntipodePair = {
  a: CouplingQuake;
  b: CouplingQuake;
  /** Degrees from B to the antipode of A (0 = exact opposite). */
  offsetDeg: number;
  lagHours: number;
  /** True geodesic A→B (near 180° when antipodal). */
  sepDeg: number;
};

export type FlareQuakeLink = {
  flare: CouplingFlare;
  quake: CouplingQuake;
  lagHours: number;
};

export type CouplingThread = {
  id: string;
  /** sun-led = flare peak before every listed rupture. geometry = antipodes only. */
  kind: "sun-led" | "geometry";
  attention: number;
  verdict: "read" | "look" | "background";
  headline: string;
  reading: string;
  /** Compact clock line: "20 Aug 11:42Z → 18:00Z" */
  when: string;
  flare: CouplingFlare | null;
  quakes: CouplingQuake[];
  antipode: AntipodePair | null;
  lagHours: number | null;
  /** limb / CME away / CME Earth — honest geometry of the flare, not a sermon. */
  flareNote: string | null;
};

export type CouplingReport = {
  generatedAt: number;
  windowDays: number;
  flares: CouplingFlare[];
  quakes: CouplingQuake[];
  antipodes: AntipodePair[];
  flareLinks: FlareQuakeLink[];
  threads: CouplingThread[];
  caveats: string[];
  ringNote: string;
};

export function parseFlareClass(raw: string | null | undefined): FlareClass | null {
  if (!raw) return null;
  const m = String(raw).trim().toUpperCase().match(/^([BCMX])\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  const letter = m[1] as FlareClass["letter"];
  const value = Number(m[2]);
  if (!Number.isFinite(value)) return null;
  const base = letter === "X" ? 20 : letter === "M" ? 10 : letter === "C" ? 0 : -10;
  return { raw: `${letter}${value}`, letter, value, rank: base + value };
}

export function antipode(lat: number, lon: number): { lat: number; lon: number } {
  let aLon = lon + 180;
  if (aLon > 180) aLon -= 360;
  if (aLon < -180) aLon += 360;
  return { lat: -lat, lon: aLon };
}

export function gcDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return (2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) * 180) / Math.PI;
}

/** How far B sits from the antipode of A. 0 = exact opposite point. */
export function antipodeOffsetDeg(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const p = antipode(aLat, aLon);
  return gcDeg(bLat, bLon, p.lat, p.lon);
}

export function asCouplingQuake(f: EqFeature): CouplingQuake | null {
  const mag = f.properties.mag;
  const time = f.properties.time;
  const coords = f.geometry?.coordinates;
  if (mag == null || !Number.isFinite(mag) || mag < 6) return null;
  if (time == null || !Number.isFinite(time)) return null;
  if (!coords || coords.length < 2) return null;
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  const depth = Number(coords[2] ?? 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const id = String(f.id || `${lat}_${lon}_${time}`);
  return {
    id,
    lat,
    lon,
    mag,
    place: (f.properties.place || "unknown").trim(),
    depth: Number.isFinite(depth) ? depth : 0,
    time,
    url: f.properties.url || undefined,
  };
}

export function asCouplingFlare(f: DonkiFlare): CouplingFlare | null {
  const parsed = parseFlareClass(f.classType);
  if (!parsed || parsed.rank < 15) return null; // M5+
  const peak = Date.parse(f.peakTime || f.beginTime || "");
  if (!Number.isFinite(peak)) return null;
  return {
    id: f.flrID,
    classType: parsed.raw,
    parsed,
    peakMs: peak,
    sourceLocation: f.sourceLocation || null,
    link: f.link || null,
  };
}

function eqLabel(m: number): string {
  return `EQ ${m.toFixed(1)}`;
}

function flareLabel(f: CouplingFlare): string {
  return `Flare ${f.classType}`;
}

function hoursBetween(a: number, b: number): number {
  return Math.abs(b - a) / 3_600_000;
}

/** "31 km NW of Aniso, Peru" → "Aniso, Peru" */
export function shortPlace(p: string): string {
  const cleaned = p.replace(/^\d+(?:\.\d+)?\s*km\s+[NSEW]{1,3}\s+of\s+/i, "").trim();
  return cleaned.length > 42 ? cleaned.slice(0, 40) + "…" : cleaned || p;
}

function utcStamp(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${mon} ${hh}:${mm}Z`;
}

export function formatLagHours(h: number): string {
  if (h < 10) return `${h.toFixed(1)} h`;
  return `${Math.round(h)} h`;
}

/** E/W ≥ 70° from disk center is a limb source — photons still hit Earth, CME usually does not. */
export function flareLimbNote(loc: string | null | undefined): string | null {
  if (!loc) return null;
  const m = loc.toUpperCase().match(/[EW](\d{2,3})/);
  if (!m) return null;
  const deg = Number(m[1]);
  if (!Number.isFinite(deg) || deg < 70) return null;
  return "limb";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function scoreThread(opts: {
  flare: CouplingFlare | null;
  quakes: CouplingQuake[];
  antipode: AntipodePair | null;
  lagHours: number | null;
}): number {
  let s = 0;
  if (opts.flare) s += clamp((opts.flare.parsed.rank - 10) * 4, 0, 40);
  const maxMag = opts.quakes.reduce((m, q) => Math.max(m, q.mag), 0);
  if (maxMag >= 6) s += clamp((maxMag - 6) * 16, 0, 36);
  if (opts.antipode) {
    const o = opts.antipode.offsetDeg;
    s += o < 12 ? 28 : o < 20 ? 20 : o < 30 ? 12 : o < 40 ? 6 : 0;
    if (opts.antipode.a.mag >= 7 && opts.antipode.b.mag >= 7) s += 8;
  }
  if (opts.lagHours != null) {
    s += opts.lagHours < 18 ? 10 : opts.lagHours < 48 ? 7 : opts.lagHours < 96 ? 4 : 2;
  }
  return Math.round(clamp(s, 0, 100));
}

function verdictOf(attn: number): CouplingThread["verdict"] {
  if (attn >= 70) return "read";
  if (attn >= 42) return "look";
  return "background";
}

function pairAntipodes(quakes: CouplingQuake[]): AntipodePair[] {
  const big = quakes.filter((q) => q.mag >= 6.5).sort((a, b) => b.mag - a.mag);
  const pairs: AntipodePair[] = [];
  for (let i = 0; i < big.length; i++) {
    for (let j = i + 1; j < big.length; j++) {
      const a = big[i]!;
      const b = big[j]!;
      const offset = antipodeOffsetDeg(a.lat, a.lon, b.lat, b.lon);
      if (offset > 40) continue;
      const lagHours = hoursBetween(a.time, b.time);
      if (lagHours > 14 * 24) continue;
      const first = a.time <= b.time ? a : b;
      const second = first === a ? b : a;
      pairs.push({
        a: first,
        b: second,
        offsetDeg: offset,
        lagHours,
        sepDeg: gcDeg(a.lat, a.lon, b.lat, b.lon),
      });
    }
  }
  return pairs.sort((x, y) => x.offsetDeg - y.offsetDeg || y.a.mag + y.b.mag - (x.a.mag + x.b.mag));
}

function linkFlares(
  flares: CouplingFlare[],
  quakes: CouplingQuake[],
): FlareQuakeLink[] {
  const links: FlareQuakeLink[] = [];
  for (const flare of flares) {
    for (const quake of quakes) {
      const lag = (quake.time - flare.peakMs) / 3_600_000;
      if (lag < 0 || lag > 120) continue;
      links.push({ flare, quake, lagHours: lag });
    }
  }
  return links.sort((a, b) => b.quake.mag - a.quake.mag || a.lagHours - b.lagHours);
}

function cmeNoteForFlare(flare: CouplingFlare, cmes: DonkiCme[]): string | null {
  const limb = flareLimbNote(flare.sourceLocation);
  const nearby = cmes.filter((c) => {
    const t = Date.parse(c.startTime);
    return Number.isFinite(t) && Math.abs(t - flare.peakMs) < 8 * 3_600_000;
  });
  const earth = nearby.some((c) => cmeImpactSummary(c).earth);
  if (earth) return limb ? "limb · CME Earth" : "CME Earth";
  if (nearby.length) return limb ? "limb · CME away" : "CME away";
  return limb;
}

export function buildCouplingReport(opts: {
  flares: DonkiFlare[];
  cmes?: DonkiCme[];
  features: EqFeature[];
  now?: number;
  windowDays?: number;
}): CouplingReport {
  const now = opts.now ?? Date.now();
  const windowDays = opts.windowDays ?? 14;
  const cutoff = now - windowDays * 86_400_000;

  const flares = opts.flares
    .map(asCouplingFlare)
    .filter((f): f is CouplingFlare => !!f && f.peakMs >= cutoff)
    .sort((a, b) => b.parsed.rank - a.parsed.rank || b.peakMs - a.peakMs);

  const seen = new Set<string>();
  const quakes: CouplingQuake[] = [];
  for (const f of opts.features) {
    const q = asCouplingQuake(f);
    if (!q || q.time < cutoff) continue;
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    quakes.push(q);
  }
  quakes.sort((a, b) => b.mag - a.mag || b.time - a.time);

  const antipodes = pairAntipodes(quakes);
  const flareLinks = linkFlares(flares, quakes.filter((q) => q.mag >= 6.5));
  const cmes = opts.cmes ?? [];

  const threads: CouplingThread[] = [];

  // 1. Sun-led only: flare peak BEFORE the rupture. No reverse stories.
  for (const link of flareLinks.slice(0, 10)) {
    const afterSameFlare = flareLinks
      .filter((l) => l.flare.id === link.flare.id && l.quake.id !== link.quake.id)
      .map((l) => l.quake);
    let antipode: AntipodePair | null = null;
    for (const other of afterSameFlare) {
      const offset = antipodeOffsetDeg(
        link.quake.lat,
        link.quake.lon,
        other.lat,
        other.lon,
      );
      if (offset > 40) continue;
      const first = link.quake.time <= other.time ? link.quake : other;
      const second = first === link.quake ? other : link.quake;
      antipode = {
        a: first,
        b: second,
        offsetDeg: offset,
        lagHours: hoursBetween(first.time, second.time),
        sepDeg: gcDeg(first.lat, first.lon, second.lat, second.lon),
      };
      break;
    }
    const attention = scoreThread({
      flare: link.flare,
      quakes: antipode ? [antipode.a, antipode.b] : [link.quake],
      antipode,
      lagHours: link.lagHours,
    });
    const id = antipode
      ? `sun:${link.flare.id}:${antipode.a.id}:${antipode.b.id}`
      : `sun:${link.flare.id}:${link.quake.id}`;
    if (threads.some((t) => t.id === id)) continue;
    const headline = antipode
      ? `${flareLabel(link.flare)} → ${eqLabel(antipode.a.mag)} ${shortPlace(antipode.a.place)} ↔ ${eqLabel(antipode.b.mag)} ${shortPlace(antipode.b.place)}`
      : `${flareLabel(link.flare)} → ${eqLabel(link.quake.mag)} ${shortPlace(link.quake.place)}`;
    const reading = antipode
      ? `${antipode.offsetDeg.toFixed(1)}° antipode · both after flare`
      : `+${formatLagHours(link.lagHours)}`;
    const when = antipode
      ? `${utcStamp(link.flare.peakMs)} → ${utcStamp(antipode.a.time)} / ${utcStamp(antipode.b.time)}`
      : `${utcStamp(link.flare.peakMs)} → ${utcStamp(link.quake.time)}`;
    threads.push({
      id,
      kind: "sun-led",
      attention,
      verdict: verdictOf(attention),
      headline,
      reading,
      when,
      flare: link.flare,
      quakes: antipode ? [antipode.a, antipode.b] : [link.quake],
      antipode,
      lagHours: link.lagHours,
      flareNote: cmeNoteForFlare(link.flare, cmes),
    });
  }

  // 2. Geometry only — never prefix a flare that did not lead both events.
  const sunIds = new Set(threads.flatMap((t) => t.quakes.map((q) => q.id)));
  for (const pair of antipodes.slice(0, 6)) {
    if (sunIds.has(pair.a.id) && sunIds.has(pair.b.id)) continue;
    const flareLedBoth = flares.find(
      (f) => f.peakMs <= pair.a.time && f.peakMs <= pair.b.time &&
        Math.min(pair.a.time, pair.b.time) - f.peakMs <= 120 * 3_600_000,
    );
    if (flareLedBoth) continue; // already represented as sun-led if both after
    const attention = scoreThread({
      flare: null,
      quakes: [pair.a, pair.b],
      antipode: pair,
      lagHours: pair.lagHours,
    });
    threads.push({
      id: `geo:${pair.a.id}:${pair.b.id}`,
      kind: "geometry",
      attention,
      verdict: verdictOf(attention),
      headline: `${eqLabel(pair.a.mag)} ${shortPlace(pair.a.place)} ↔ ${eqLabel(pair.b.mag)} ${shortPlace(pair.b.place)}`,
      reading: `${pair.offsetDeg.toFixed(1)}° antipode · ${formatLagHours(pair.lagHours)}`,
      when: `${utcStamp(pair.a.time)} → ${utcStamp(pair.b.time)}`,
      flare: null,
      quakes: [pair.a, pair.b],
      antipode: pair,
      lagHours: pair.lagHours,
      flareNote: null,
    });
  }

  const sunLedRaw = threads.filter((t) => t.kind === "sun-led").sort((a, b) => b.attention - a.attention);
  const seenFlare = new Set<string>();
  const sunLed: CouplingThread[] = [];
  for (const t of sunLedRaw) {
    const fid = t.flare?.id;
    if (t.antipode) {
      if (fid) seenFlare.add(fid);
      sunLed.push(t);
      continue;
    }
    if (fid && seenFlare.has(fid)) continue;
    if (fid) seenFlare.add(fid);
    sunLed.push(t);
  }
  const geo = threads.filter((t) => t.kind === "geometry").sort((a, b) => a.antipode!.offsetDeg - b.antipode!.offsetDeg);
  const top = [...sunLed.slice(0, 4), ...geo.slice(0, 3)];

  const earthCme = (opts.cmes ?? []).filter((c) => cmeImpactSummary(c).earth).length;

  const caveats = [
    "Flare class is GOES (Sun). EQ is earthquake magnitude. Not the same M.",
    earthCme
      ? `${earthCme} Earth-directed CME in window.`
      : "No Earth-directed CME in window.",
  ];

  return {
    generatedAt: now,
    windowDays,
    flares: flares.slice(0, 12),
    quakes: quakes.slice(0, 16),
    antipodes: antipodes.slice(0, 8),
    flareLinks: flareLinks.slice(0, 12),
    threads: top,
    caveats,
    ringNote: "Sun first. Antipode without a preceding flare is plates.",
  };
}

let monthCache: { at: number; feats: EqFeature[] } | null = null;

export async function fetchMonthM45(): Promise<EqFeature[]> {
  if (monthCache && Date.now() - monthCache.at < 10 * 60_000) return monthCache.feats;
  try {
    const res = await fetch(M45_MONTH, { cache: "no-cache" });
    if (!res.ok) return monthCache?.feats ?? [];
    const j = (await res.json()) as { features?: EqFeature[] };
    const feats = Array.isArray(j.features) ? j.features : [];
    monthCache = { at: Date.now(), feats };
    return feats;
  } catch {
    return monthCache?.feats ?? [];
  }
}
