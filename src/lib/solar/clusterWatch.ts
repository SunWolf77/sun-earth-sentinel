/**
 * Activity cluster from the GOES flare list, new NOAA region numbers,
 * and the daily X-ray peak. A Rossby wave is one reading of a cluster.
 * This file does not measure the wave.
 */

import { fluxToClass, type XrayPoint } from "@/lib/feeds/swpc";

export type FluxDay = { day: string; peak: number; peakClass: string };

export type ClusterRead = {
  level: "quiet" | "cluster";
  line: string;
  tape: string;
  note: string;
};

const NOTE =
  "A Rossby wave is one reading of a cluster like this. These counts are the X-ray file and the region list, not a wave detection.";

function rank(klass: string): number {
  const m = klass.trim().toUpperCase().match(/^([MX])(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  return (m[1] === "X" ? 2 : 1) * 100 + Number(m[2]);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.floor(s.length / 2);
  if (!s.length) return 0;
  return s.length % 2 ? s[i]! : (s[i - 1]! + s[i]!) / 2;
}

export function fluxSlope(days: FluxDay[]): "rising" | "easing" | "flat" | "short" {
  if (days.length < 5) return "short";
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const early = median(sorted.slice(0, 3).map((d) => d.peak));
  const late = median(sorted.slice(-2).map((d) => d.peak));
  if (early <= 0) return "short";
  if (late >= early * 1.5) return "rising";
  if (late <= early * 0.67) return "easing";
  return "flat";
}

export function dailyFluxPeaks(raw: unknown): FluxDay[] {
  if (!Array.isArray(raw)) return [];
  const by = new Map<string, number>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const e = row as XrayPoint;
    if (!e.energy?.includes("0.1-0.8")) continue;
    const day = String(e.time_tag ?? "").slice(0, 10);
    const f = e.flux || e.observed_flux || 0;
    if (!day || f <= 0) continue;
    if (f > (by.get(day) ?? 0)) by.set(day, f);
  }
  return [...by.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, peak]) => ({ day, peak, peakClass: fluxToClass(peak) }));
}

let fluxCache: { at: number; days: FluxDay[] } | null = null;

/** Seven daily peaks from the GOES long channel. Cached so the desk does not pull the raw file every minute. */
export async function fetchFluxDays(): Promise<FluxDay[]> {
  if (fluxCache && Date.now() - fluxCache.at < 30 * 60_000) return fluxCache.days;
  try {
    const res = await fetch("https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return fluxCache?.days ?? [];
    const days = dailyFluxPeaks(await res.json());
    fluxCache = { at: Date.now(), days };
    return days;
  } catch {
    return fluxCache?.days ?? [];
  }
}

export function clusterWatch(input: {
  xra?: { klass: string; at: string; region: number | null }[];
  regions?: { region: number; firstSeen: string; lon: number }[];
  fluxDays?: FluxDay[];
  now?: number;
}): ClusterRead {
  const now = input.now ?? Date.now();
  const week = now - 7 * 86400000;
  const flares = (input.xra ?? []).filter((f) => {
    const t = Date.parse(f.at);
    return Number.isFinite(t) && t >= week && t <= now + 120_000 && /^[MX]/i.test(f.klass);
  });
  const m = flares.filter((f) => f.klass.toUpperCase().startsWith("M")).length;
  const x = flares.filter((f) => f.klass.toUpperCase().startsWith("X")).length;
  const top = [...flares].sort((a, b) => rank(b.klass) - rank(a.klass))[0];

  const freshCut = now - 10 * 86400000;
  const fresh = (input.regions ?? []).filter((r) => {
    const t = Date.parse(`${r.firstSeen}T00:00:00Z`);
    return Number.isFinite(t) && t >= freshCut;
  });
  const flux = fluxSlope(input.fluxDays ?? []);
  const named = fresh
    .slice()
    .sort((a, b) => a.region - b.region)
    .slice(0, 4)
    .map((r) => `AR${r.region}`);
  const extra = fresh.length > named.length ? ` +${fresh.length - named.length}` : "";

  const hot = (input.regions ?? []).filter(
    (r) => fresh.some((f) => f.region === r.region) || flares.some((f) => f.region === r.region),
  );
  const lons = hot.map((r) => r.lon).sort((a, b) => a - b);
  const stacked = lons.length >= 3 && lons[lons.length - 1]! - lons[0]! <= 50;

  const cluster =
    m + x >= 3 || (m + x >= 2 && fresh.length >= 2) || (flux === "rising" && m + x >= 1);

  const bits = [
    `${m} M · ${x} X in 7 days`,
    top ? `highest ${top.klass}` : null,
    fresh.length
      ? `${fresh.length} new region number${fresh.length === 1 ? "" : "s"} in 10 days (${named.join(", ")}${extra})`
      : "no new region numbers in 10 days",
    flux === "short" ? "daily peak file is short" : `daily X-ray peak is ${flux}`,
    stacked ? "several sit in one longitude band" : null,
  ].filter(Boolean);

  const head = cluster ? "Activity cluster" : "No activity cluster";
  return {
    level: cluster ? "cluster" : "quiet",
    line: `${head}. ${bits.join(". ")}.`,
    tape: `Cluster · ${m} M · ${x} X in 7 days${fresh.length ? ` · ${fresh.length} new` : ""}`,
    note: NOTE,
  };
}
