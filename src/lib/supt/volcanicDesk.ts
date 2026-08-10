/**
 * Generic SUPT volcanic desk engine — catalog-first, non-alarmist.
 *
 * Phase A: per-zone rate + peer-baseline relative rate + per-zone SUPT spacing.
 * Phase B: same builder for any desk pack (Iceland, NZ, Japan, Andes, Kamchatka).
 *
 * Not a forecast. Official aviation / VALS colors are badges only.
 */

import type { EqFeature } from "@/lib/feeds/usgs";
import type { GlobalVolcAlert } from "@/lib/feeds/globalVolcanoAlerts";
import type { LatLonBounds } from "@/lib/geo/bounds";
import { pointInBounds } from "@/lib/geo/bounds";
import {
  bandPlainLabel,
  resonanceScore,
  resonanceVerdict,
  type ResonanceScore,
} from "@/lib/supt/probe";

export type ZoneActivityTone = "quiet" | "background" | "elevated" | "swarm";

export type VolcZoneDef = {
  id: string;
  name: string;
  bounds: LatLonBounds;
  center: [number, number];
  role: string;
  /** Agency code (IMO VALS, etc.) */
  agencyCode?: string;
  gvpUrl?: string;
};

export type VolcDeskLink = { label: string; href: string };

export type VolcDeskConfig = {
  deskId: string;
  name: string;
  shortName: string;
  networkOrder: number;
  authority: string;
  nodeBounds: LatLonBounds;
  zones: VolcZoneDef[];
  /** Min mag for SUPT spacing probe (desk-wide + per-zone) */
  probeMinMag: number;
  links: VolcDeskLink[];
  disclaimer: string;
  /** Match official alerts to this desk */
  matchAlert?: (a: GlobalVolcAlert) => boolean;
};

export type VolcZoneSnapshot = {
  id: string;
  name: string;
  agencyCode?: string;
  role: string;
  gvpUrl?: string;
  count: number;
  maxMag: number;
  m2: number;
  m3: number;
  lastMs: number | null;
  ratePerDay: number;
  /** Median rate among active peer zones (count≥1) */
  baselineRatePerDay: number;
  /** rate / max(baseline, floor) */
  relativeRate: number;
  relativePlain: string;
  tone: ZoneActivityTone;
  plain: string;
  spacing: ResonanceScore | null;
  spacingPlain: string;
  volcColor?: string;
  volcNative?: string;
};

export type VolcanicDeskModel = {
  deskId: string;
  name: string;
  shortName: string;
  networkOrder: number;
  authority: string;
  generatedAt: number;
  windowLabel: string;
  totalInBox: number;
  maxMag: number;
  zones: VolcZoneSnapshot[];
  headline: string;
  plain: string;
  spacing: ResonanceScore | null;
  spacingPlain: string;
  disclaimer: string;
  links: VolcDeskLink[];
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

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = nums.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!;
}

function zoneTone(
  count: number,
  maxMag: number,
  ratePerDay: number,
  relativeRate: number,
  days: number,
): ZoneActivityTone {
  if (count === 0) return "quiet";
  // Dense burst: high absolute rate OR strongly elevated vs peer median
  if (
    maxMag >= 4.5 ||
    (ratePerDay >= 40 && days <= 7) ||
    (relativeRate >= 4 && ratePerDay >= 8 && count >= 12)
  ) {
    return "swarm";
  }
  if (
    maxMag >= 3.0 ||
    ratePerDay >= 12 ||
    count >= 25 ||
    (relativeRate >= 2.2 && ratePerDay >= 4 && count >= 6)
  ) {
    return "elevated";
  }
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
      return `Dense burst relative to peers · n=${count} · max M${maxMag.toFixed(1)} — context only`;
  }
}

function spacingPlainFor(
  spacing: ResonanceScore | null,
  minMag: number,
): string {
  if (!spacing) return `Waiting for enough M≥${minMag.toFixed(1)} events`;
  if (spacing.n < 4) return `Need more M≥${minMag.toFixed(1)} events for spacing`;
  if (spacing.separated) {
    return `${bandPlainLabel(spacing.band)} · unusual vs random — still not a forecast`;
  }
  return `${bandPlainLabel(spacing.band)} · ordinary inter-event spacing`;
}

function relativePlain(rel: number, rate: number, base: number): string {
  if (rate <= 0) return "No rate in window";
  if (base <= 0.05) return `${rate.toFixed(1)}/d · peers quiet`;
  if (rel < 0.75) return `${rate.toFixed(1)}/d · ${rel.toFixed(1)}× peer median (quieter)`;
  if (rel <= 1.4) return `${rate.toFixed(1)}/d · ~peer median`;
  if (rel <= 2.5) return `${rate.toFixed(1)}/d · ${rel.toFixed(1)}× peer median`;
  return `${rate.toFixed(1)}/d · ${rel.toFixed(1)}× peer median (elevated)`;
}

function featuresInBounds(
  features: EqFeature[],
  bounds: LatLonBounds,
  minMag = 0,
): EqFeature[] {
  return features.filter((f) => {
    const mag = f.properties.mag ?? 0;
    if (mag < minMag) return false;
    const [lon, lat] = f.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    return pointInBounds(lat, lon, bounds);
  });
}

function assignZone(
  lat: number,
  lon: number,
  zones: VolcZoneDef[],
  nodeBounds: LatLonBounds,
): string {
  for (const z of zones) {
    if (pointInBounds(lat, lon, z.bounds)) return z.id;
  }
  if (pointInBounds(lat, lon, nodeBounds)) return "other";
  return "out";
}

function matchVolcAlert(
  z: VolcZoneDef,
  alerts: GlobalVolcAlert[],
  deskMatch?: (a: GlobalVolcAlert) => boolean,
): GlobalVolcAlert | undefined {
  const pool = deskMatch ? alerts.filter(deskMatch) : alerts;
  if (z.agencyCode) {
    const byCode = pool.find(
      (a) =>
        a.noticeId === z.agencyCode ||
        String(a.noticeId || "").toUpperCase() === z.agencyCode!.toUpperCase(),
    );
    if (byCode) return byCode;
  }
  const key = z.name.split(/[/\s–—-]/)[0]!.toLowerCase();
  return pool.find((a) => a.name.toLowerCase().includes(key));
}

/**
 * Build a volcanic desk model from live catalog + optional official alerts.
 */
export function buildVolcanicDesk(opts: {
  config: VolcDeskConfig;
  features: EqFeature[];
  volcAlerts?: GlobalVolcAlert[] | null;
  timeWindow?: string;
  now?: number;
}): VolcanicDeskModel {
  const { config } = opts;
  const now = opts.now ?? Date.now();
  const days = windowDays(opts.timeWindow || "week");
  const windowLabel =
    days < 1 ? "1h" : days <= 1 ? "24h" : days <= 7 ? "7d" : "30d";
  const probeMin = config.probeMinMag;

  const inBox = featuresInBounds(opts.features, config.nodeBounds, 0);
  let boxMax = 0;
  for (const f of inBox) {
    const m = f.properties.mag ?? 0;
    if (m > boxMax) boxMax = m;
  }

  // Zone defs + synthetic "other" for in-box unassigned
  const zoneDefs: VolcZoneDef[] = [
    ...config.zones,
    {
      id: "other",
      name: "Other / corridor",
      bounds: config.nodeBounds,
      center: [
        (config.nodeBounds[0][0] + config.nodeBounds[1][0]) / 2,
        (config.nodeBounds[0][1] + config.nodeBounds[1][1]) / 2,
      ],
      role: "Events in desk box outside named system zones",
    },
  ];

  type Raw = {
    def: VolcZoneDef;
    feats: EqFeature[];
    count: number;
    maxMag: number;
    m2: number;
    m3: number;
    lastMs: number | null;
    ratePerDay: number;
  };

  const raws: Raw[] = zoneDefs.map((def) => {
    const feats =
      def.id === "other"
        ? inBox.filter((f) => {
            const [lon, lat] = f.geometry.coordinates;
            return assignZone(lat, lon, config.zones, config.nodeBounds) === "other";
          })
        : inBox.filter((f) => {
            const [lon, lat] = f.geometry.coordinates;
            return assignZone(lat, lon, config.zones, config.nodeBounds) === def.id;
          });
    let maxMag = 0;
    let m2 = 0;
    let m3 = 0;
    let lastMs: number | null = null;
    for (const f of feats) {
      const mag = f.properties.mag ?? 0;
      if (mag > maxMag) maxMag = mag;
      if (mag >= 2) m2++;
      if (mag >= 3) m3++;
      const t = f.properties.time;
      if (typeof t === "number" && (lastMs == null || t > lastMs)) lastMs = t;
    }
    const ratePerDay = days > 0 ? feats.length / days : feats.length;
    return { def, feats, count: feats.length, maxMag, m2, m3, lastMs, ratePerDay };
  });

  // Peer baseline = median rate among zones with at least one event (exclude empty)
  const peerRates = raws
    .filter((r) => r.count >= 1 && r.def.id !== "other")
    .map((r) => r.ratePerDay);
  const baselineFloor = 0.5; // /d — avoid divide-by-near-zero
  const peerMedian = peerRates.length ? median(peerRates) : 0;

  const zones: VolcZoneSnapshot[] = raws.map((r) => {
    const base = Math.max(peerMedian, baselineFloor * 0.25);
    const relativeRate =
      r.ratePerDay <= 0 ? 0 : r.ratePerDay / Math.max(base, baselineFloor * 0.25);
    const tone = zoneTone(r.count, r.maxMag, r.ratePerDay, relativeRate, days);

    const probeFeats = r.feats.filter((f) => (f.properties.mag ?? 0) >= probeMin);
    const gaps = interEventSeconds(probeFeats);
    const spacing = gaps.length >= 3 ? resonanceScore(gaps, 60) : null;
    const spPlain = spacingPlainFor(spacing, probeMin);
    const v = resonanceVerdict(spacing);

    const volc = matchVolcAlert(
      r.def,
      opts.volcAlerts ?? [],
      config.matchAlert,
    );

    return {
      id: r.def.id,
      name: r.def.name,
      agencyCode: r.def.agencyCode,
      role: r.def.role,
      gvpUrl: r.def.gvpUrl,
      count: r.count,
      maxMag: r.maxMag,
      m2: r.m2,
      m3: r.m3,
      lastMs: r.lastMs,
      ratePerDay: r.ratePerDay,
      baselineRatePerDay: peerMedian,
      relativeRate,
      relativePlain: relativePlain(relativeRate, r.ratePerDay, peerMedian),
      tone,
      plain: tonePlain(tone, r.count, r.maxMag),
      spacing,
      spacingPlain: `${v.title} · ${spPlain}`,
      volcColor: volc?.colorCode,
      volcNative: volc?.officialNative,
    };
  }).sort((a, b) => {
    const rank = { swarm: 0, elevated: 1, background: 2, quiet: 3 } as const;
    if (rank[a.tone] !== rank[b.tone]) return rank[a.tone] - rank[b.tone];
    return b.count - a.count;
  });

  // Desk-wide spacing
  const forProbe = inBox.filter((f) => (f.properties.mag ?? 0) >= probeMin);
  const gaps = interEventSeconds(forProbe);
  const spacing = gaps.length >= 3 ? resonanceScore(gaps, 60) : null;
  const v = resonanceVerdict(spacing);
  const spacingPlain = `${v.title} · ${spacingPlainFor(spacing, probeMin)}`;

  const hot = zones.filter((z) => z.tone === "swarm" || z.tone === "elevated");
  const volcElevated = zones.filter(
    (z) =>
      z.volcColor &&
      z.volcColor !== "GREEN" &&
      z.volcColor !== "UNASSIGNED",
  );

  let headline: string;
  let plain: string;
  if (inBox.length === 0) {
    headline = `${config.shortName} quiet in this window`;
    plain = "No catalog events in the desk box — quiet is a real status.";
  } else if (hot.length === 0 && volcElevated.length === 0) {
    headline = `Background ${config.shortName} activity`;
    plain = `${inBox.length} events (max M${boxMax.toFixed(1)}) · no box above background · official status calm or not elevated.`;
  } else if (hot.length > 0) {
    headline = `Focus: ${hot
      .slice(0, 2)
      .map((z) => z.name.split("/")[0]!.trim())
      .join(" · ")}`;
    plain = `${hot.map((z) => `${z.name}: ${z.plain}`).join(" · ")}. Observational only — ${config.authority} remains authority.`;
  } else {
    headline = `Official: ${volcElevated.map((z) => z.name.split("/")[0]).join(", ")}`;
    plain = volcElevated
      .map(
        (z) =>
          `${z.name}: ${z.volcColor}${z.volcNative ? ` · ${z.volcNative}` : ""}`,
      )
      .join(" · ");
  }

  return {
    deskId: config.deskId,
    name: config.name,
    shortName: config.shortName,
    networkOrder: config.networkOrder,
    authority: config.authority,
    generatedAt: now,
    windowLabel,
    totalInBox: inBox.length,
    maxMag: boxMax,
    zones,
    headline,
    plain,
    spacing,
    spacingPlain,
    disclaimer: config.disclaimer,
    links: config.links,
  };
}
