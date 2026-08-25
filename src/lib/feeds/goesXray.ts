/**
 * NOAA SWPC GOES XRS plot series — Carrington-style watch desk.
 * Primary ≈ GOES-18, secondary ≈ GOES-19. Public JSON tops out at 7 days.
 */

import { fluxToClass, type XrayPoint } from "@/lib/feeds/swpc";

export type GoesXrayWindow = "6h" | "1d" | "3d" | "7d";

export const GOES_XRAY_WINDOWS: { id: GoesXrayWindow; label: string }[] = [
  { id: "6h", label: "6h" },
  { id: "1d", label: "1d" },
  { id: "3d", label: "3d" },
  { id: "7d", label: "7d" },
];

const FILE: Record<GoesXrayWindow, string> = {
  "6h": "xrays-6-hour.json",
  "1d": "xrays-1-day.json",
  "3d": "xrays-3-day.json",
  "7d": "xrays-7-day.json",
};

const BUCKETS: Record<GoesXrayWindow, number> = {
  "6h": 280,
  "1d": 360,
  "3d": 420,
  "7d": 480,
};

const SWPC = "https://services.swpc.noaa.gov";

export type GoesXrayRow = {
  t: number;
  label: string;
  /** primary long 0.1–0.8 nm */
  pl: number | null;
  /** primary short 0.05–0.4 nm */
  ps: number | null;
  sl: number | null;
  ss: number | null;
};

export type GoesXrayPlot = {
  window: GoesXrayWindow;
  generated: number;
  primarySat: number | null;
  secondarySat: number | null;
  latest: {
    pl: number | null;
    ps: number | null;
    sl: number | null;
    ss: number | null;
  };
  series: GoesXrayRow[];
  note: string;
};

function isLong(energy?: string) {
  return !!energy && energy.includes("0.1-0.8");
}
function isShort(energy?: string) {
  return !!energy && energy.includes("0.05-0.4");
}

async function fetchSat(
  which: "primary" | "secondary",
  window: GoesXrayWindow,
): Promise<XrayPoint[]> {
  const res = await fetch(`${SWPC}/json/goes/${which}/${FILE[window]}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as XrayPoint[];
  return Array.isArray(body) ? body : [];
}

function fluxOf(p: XrayPoint): number | null {
  const f = p.flux ?? p.observed_flux;
  if (f == null || !Number.isFinite(f) || f <= 0) return null;
  return f;
}

type Slot = { pl: number | null; ps: number | null; sl: number | null; ss: number | null };

function ingest(
  rows: XrayPoint[],
  map: Map<number, Slot>,
  side: "p" | "s",
): number | null {
  let sat: number | null = null;
  for (const p of rows) {
    const ms = Date.parse(p.time_tag);
    if (!Number.isFinite(ms)) continue;
    if (sat == null && p.satellite != null) sat = Number(p.satellite);
    let slot = map.get(ms);
    if (!slot) {
      slot = { pl: null, ps: null, sl: null, ss: null };
      map.set(ms, slot);
    }
    const f = fluxOf(p);
    if (f == null) continue;
    if (side === "p") {
      if (isLong(p.energy)) slot.pl = f;
      else if (isShort(p.energy)) slot.ps = f;
    } else {
      if (isLong(p.energy)) slot.sl = f;
      else if (isShort(p.energy)) slot.ss = f;
    }
  }
  return sat;
}

function labelFor(ms: number, window: GoesXrayWindow): string {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (window === "6h" || window === "1d") return `${hh}:${mm}`;
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${mo}-${day} ${hh}h`;
}

/** Keep flare peaks: two samples per bucket (min + max long flux). */
function downsample(times: number[], map: Map<number, Slot>, maxBuckets: number): number[] {
  if (times.length <= maxBuckets * 2) return times;
  const out: number[] = [];
  const size = times.length / maxBuckets;
  for (let b = 0; b < maxBuckets; b++) {
    const a = Math.floor(b * size);
    const z = Math.min(times.length, Math.floor((b + 1) * size));
    if (a >= z) continue;
    let iMin = a;
    let iMax = a;
    let minV = Infinity;
    let maxV = -Infinity;
    for (let i = a; i < z; i++) {
      const s = map.get(times[i]!)!;
      const v = Math.max(s.pl ?? 0, s.sl ?? 0);
      if (v < minV) {
        minV = v;
        iMin = i;
      }
      if (v > maxV) {
        maxV = v;
        iMax = i;
      }
    }
    const lo = Math.min(iMin, iMax);
    const hi = Math.max(iMin, iMax);
    out.push(times[lo]!);
    if (hi !== lo) out.push(times[hi]!);
  }
  const last = times[times.length - 1]!;
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

export async function buildGoesXrayPlot(window: GoesXrayWindow): Promise<GoesXrayPlot> {
  const [primary, secondary] = await Promise.all([
    fetchSat("primary", window),
    fetchSat("secondary", window),
  ]);
  const map = new Map<number, Slot>();
  const primarySat = ingest(primary, map, "p");
  const secondarySat = ingest(secondary, map, "s");
  const times = [...map.keys()].sort((a, b) => a - b);
  const kept = downsample(times, map, BUCKETS[window]);
  const series: GoesXrayRow[] = kept.map((t) => {
    const s = map.get(t)!;
    return { t, label: labelFor(t, window), ...s };
  });
  const last = series[series.length - 1];
  return {
    window,
    generated: Date.now(),
    primarySat,
    secondarySat,
    latest: {
      pl: last?.pl ?? null,
      ps: last?.ps ?? null,
      sl: last?.sl ?? null,
      ss: last?.ss ?? null,
    },
    series,
    note: "NOAA SWPC GOES XRS · long 0.1–0.8 nm is the class people quote · not a forecast",
  };
}

export function classPair(longFlux: number | null, shortFlux: number | null): string {
  const L = longFlux != null ? fluxToClass(longFlux) : "—";
  const S = shortFlux != null ? fluxToClass(shortFlux) : "—";
  return `${L} · ${S}`;
}

export const XRAY_BANDS: { id: string; y1: number; y2: number; fill: string; label: string }[] = [
  { id: "A", y1: 1e-8, y2: 1e-7, fill: "#14532d", label: "A" },
  { id: "B", y1: 1e-7, y2: 1e-6, fill: "#134e4a", label: "B" },
  { id: "C", y1: 1e-6, y2: 1e-5, fill: "#3f6212", label: "C" },
  { id: "M", y1: 1e-5, y2: 1e-4, fill: "#854d0e", label: "M" },
  { id: "X", y1: 1e-4, y2: 1e-3, fill: "#7f1d1d", label: "X" },
];
