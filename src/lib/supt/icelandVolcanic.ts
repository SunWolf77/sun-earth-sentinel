/**
 * SUPT-aligned Iceland volcanic analytics — observational, non-alarmist.
 * Uses dense IMO seismicity + VALS/VONA status already in store.
 * Not a forecast; plain labels first; SUPT spacing as credit method.
 */

import type { EqFeature } from "@/lib/feeds/usgs";
import type { GlobalVolcAlert } from "@/lib/feeds/globalVolcanoAlerts";
import {
  ICELAND_ZONES,
  assignIcelandZone,
  featuresInIceland,
  type IcelandZoneId,
} from "@/lib/feeds/icelandZones";
import {
  bandPlainLabel,
  resonanceScore,
  resonanceVerdict,
  type ResonanceScore,
} from "@/lib/supt/probe";

export type ZoneActivityTone = "quiet" | "background" | "elevated" | "swarm";

export type IcelandZoneSnapshot = {
  id: IcelandZoneId;
  name: string;
  imoCode?: string;
  role: string;
  gvpUrl?: string;
  count: number;
  maxMag: number;
  m2: number;
  m3: number;
  lastMs: number | null;
  ratePerDay: number;
  tone: ZoneActivityTone;
  plain: string;
  /** VALS/VONA from IMO when matched */
  volcColor?: string;
  volcNative?: string;
};

export type IcelandVolcanicDesk = {
  generatedAt: number;
  windowLabel: string;
  totalInBox: number;
  maxMag: number;
  zones: IcelandZoneSnapshot[];
  headline: string;
  plain: string;
  /** Island-wide SUPT spacing on M≥1.5 events (when N≥4) */
  spacing: ResonanceScore | null;
  spacingPlain: string;
  disclaimer: string;
};

function interEventSeconds(features: EqFeature[]): number[] {
  const times = features
    .map((f) => f.properties.time)
    .filter((t): t is number => typeof t === "number" && Number.isFinite(t))
    .sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const g = (times[i]! - times[i - 1]!) / 1000;
    if (g > 0 && Number.isFinite(g)) gaps.push(g);
  }
  return gaps;
}

function zoneTone(
  count: number,
  maxMag: number,
  ratePerDay: number,
  days: number,
): ZoneActivityTone {
  // Microseismicity is normal on Reykjanes — thresholds stay calm
  if (count === 0) return "quiet";
  if (maxMag >= 4.5 || (ratePerDay >= 40 && days <= 7)) return "swarm";
  if (maxMag >= 3.0 || ratePerDay >= 12 || count >= 25) return "elevated";
  if (count >= 3 || maxMag >= 1.5) return "background";
  return "quiet";
}

function tonePlain(t: ZoneActivityTone, count: number, maxMag: number): string {
  switch (t) {
    case "quiet":
      return "No notable catalog hits in this box";
    case "background":
      return `Background microseismicity · n=${count} · max M${maxMag.toFixed(1)}`;
    case "elevated":
      return `Above typical local clutter · n=${count} · max M${maxMag.toFixed(1)} — not a forecast`;
    case "swarm":
      return `Dense burst relative to calm boxes · n=${count} · max M${maxMag.toFixed(1)} — context only`;
  }
}

function windowDays(w: string): number {
  switch ((w || "week").toLowerCase()) {
    case "hour":
      return 1 / 24;
    case "day":
      return 1;
    case "month":
      return 30;
    default:
      return 7;
  }
}

/**
 * Build Iceland volcanic desk from live catalog + optional IMO volcano alerts.
 */
export function buildIcelandVolcanicDesk(opts: {
  features: EqFeature[];
  volcAlerts?: GlobalVolcAlert[] | null;
  timeWindow?: string;
  now?: number;
}): IcelandVolcanicDesk {
  const now = opts.now ?? Date.now();
  const days = windowDays(opts.timeWindow || "week");
  const windowLabel =
    days < 1 ? "1h" : days <= 1 ? "24h" : days <= 7 ? "7d" : "30d";

  const inIsland = featuresInIceland(opts.features, 0);
  let islandMax = 0;
  for (const f of inIsland) {
    const m = f.properties.mag ?? 0;
    if (m > islandMax) islandMax = m;
  }

  const volcByCode = new Map<string, GlobalVolcAlert>();
  for (const v of opts.volcAlerts ?? []) {
    if (v.source === "imo" && v.noticeId) volcByCode.set(String(v.noticeId), v);
    // also match name loosely
    if (v.source === "imo") volcByCode.set(v.name.toLowerCase(), v);
  }

  const zones: IcelandZoneSnapshot[] = ICELAND_ZONES.map((z) => {
    const zs = inIsland.filter((f) => {
      const [lon, lat] = f.geometry.coordinates;
      return assignIcelandZone(lat, lon) === z.id;
    });
    let maxMag = 0;
    let m2 = 0;
    let m3 = 0;
    let lastMs: number | null = null;
    for (const f of zs) {
      const mag = f.properties.mag ?? 0;
      if (mag > maxMag) maxMag = mag;
      if (mag >= 2) m2++;
      if (mag >= 3) m3++;
      const t = f.properties.time;
      if (typeof t === "number" && (lastMs == null || t > lastMs)) lastMs = t;
    }
    const ratePerDay = days > 0 ? zs.length / days : zs.length;
    const tone = zoneTone(zs.length, maxMag, ratePerDay, days);
    const volc =
      (z.imoCode && volcByCode.get(z.imoCode)) ||
      volcByCode.get(z.name.toLowerCase()) ||
      [...volcByCode.values()].find(
        (a) =>
          a.name.toLowerCase().includes(z.name.split(/[/\s]/)[0]!.toLowerCase()),
      );

    return {
      id: z.id,
      name: z.name,
      imoCode: z.imoCode,
      role: z.role,
      gvpUrl: z.gvpUrl,
      count: zs.length,
      maxMag,
      m2,
      m3,
      lastMs,
      ratePerDay,
      tone,
      plain: tonePlain(tone, zs.length, maxMag),
      volcColor: volc?.colorCode,
      volcNative: volc?.officialNative,
    };
  }).sort((a, b) => {
    const rank = { swarm: 0, elevated: 1, background: 2, quiet: 3 } as const;
    if (rank[a.tone] !== rank[b.tone]) return rank[a.tone] - rank[b.tone];
    return b.count - a.count;
  });

  // SUPT spacing on M≥1.5 island-wide (microseismicity path)
  const forProbe = inIsland.filter((f) => (f.properties.mag ?? 0) >= 1.5);
  const gaps = interEventSeconds(forProbe);
  const spacing = gaps.length >= 3 ? resonanceScore(gaps, 60) : null;
  const v = resonanceVerdict(spacing);
  const spacingPlain = spacing
    ? spacing.n < 4
      ? "Need more M≥1.5 events for spacing score"
      : spacing.separated
        ? `${bandPlainLabel(spacing.band)} · unusual vs random — still not a forecast`
        : `${bandPlainLabel(spacing.band)} · ordinary inter-event spacing`
    : "Waiting for enough M≥1.5 events";

  const hot = zones.filter((z) => z.tone === "swarm" || z.tone === "elevated");
  const volcElevated = zones.filter(
    (z) =>
      z.volcColor &&
      z.volcColor !== "GREEN" &&
      z.volcColor !== "UNASSIGNED",
  );

  let headline: string;
  let plain: string;
  if (inIsland.length === 0) {
    headline = "Iceland quiet in this window";
    plain = "No catalog events in the island box — quiet is a real status.";
  } else if (hot.length === 0 && volcElevated.length === 0) {
    headline = "Background Iceland activity";
    plain = `${inIsland.length} events (max M${islandMax.toFixed(1)}) · no box above background · VALS/VONA calm or not elevated.`;
  } else if (hot.length > 0) {
    headline = `Focus: ${hot
      .slice(0, 2)
      .map((z) => z.name.split("/")[0]!.trim())
      .join(" · ")}`;
    plain = `${hot.map((z) => `${z.name}: ${z.plain}`).join(" · ")}. Observational only — IMO remains authority.`;
  } else {
    headline = `VALS/VONA: ${volcElevated.map((z) => z.name.split("/")[0]).join(", ")}`;
    plain = volcElevated
      .map((z) => `${z.name}: ${z.volcColor}${z.volcNative ? ` · ${z.volcNative}` : ""}`)
      .join(" · ");
  }

  return {
    generatedAt: now,
    windowLabel,
    totalInBox: inIsland.length,
    maxMag: islandMax,
    zones,
    headline,
    plain,
    spacing,
    spacingPlain: `${v.title} · ${spacingPlain}`,
    disclaimer:
      "Educational volcanic analytics · IMO (Veðurstofa) is authority · not a forecast · SUPT spacing is a timing probe, not hazard.",
  };
}
