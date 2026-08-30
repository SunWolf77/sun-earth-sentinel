/**
 * Look zones — pattern highlight for this catalog window.
 * Not a forecast. Not a civil watch. Look here, then read the authority.
 */

import {
  DRAGON_NODES,
  nodeStatus,
  type DragonNode,
  type EqFeature,
  type NodeStatus,
} from "@/lib/feeds/usgs";
import { pointInBounds } from "@/lib/geo/bounds";
import type { DonkiFlare } from "@/lib/feeds/donki";
import { antipode, gcDeg, parseFlareClass } from "@/lib/ops/fieldCoupling";
import { RAISED, isFresh } from "@/lib/ops/raisedTimeout";
import { interEventSeconds, resonanceScore } from "@/lib/supt/probe";

export const LOOK_COLOR = "#f59e0b";

export type LookReason = "large" | "rate" | "sun-led" | "antipode" | "spacing" | "agency";

export type LookZone = {
  id: string;
  name: string;
  status: NodeStatus;
  look: boolean;
  reasons: LookReason[];
  /** Independent pattern count (1 = weak look, 2+ = stacked). */
  strength: number;
  maxMag: number;
  n: number;
  relativeRate: number;
  why: string;
  lat: number;
  lon: number;
};

export type LookZonesReport = {
  generatedAt: number;
  looks: LookZone[];
  all: LookZone[];
  headline: string;
};

const LAG_H = RAISED.look.sunLedH;
const ANTIPODE_DEG = 7;

function magOf(f: EqFeature): number {
  const m = f.properties.mag;
  return typeof m === "number" && Number.isFinite(m) ? m : NaN;
}

function inNode(f: EqFeature, node: DragonNode): boolean {
  const [lon, lat] = f.geometry.coordinates;
  return pointInBounds(lat, lon, node.bounds);
}

function nodeCenter(n: DragonNode): { lat: number; lon: number } {
  if (n.center) return { lat: n.center[0], lon: n.center[1] };
  const [[a, b], [c, d]] = n.bounds;
  return { lat: (a + c) / 2, lon: b <= d ? (b + d) / 2 : (b + d) / 2 };
}

function peakMs(f: DonkiFlare): number {
  const raw = f.peakTime || f.beginTime;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function sunLedHits(
  node: DragonNode,
  features: EqFeature[],
  flares: DonkiFlare[],
  now: number,
): number {
  const big = features.filter(
    (f) =>
      inNode(f, node) &&
      magOf(f) >= 6.5 &&
      isFresh(f.properties.time, RAISED.look.sunLedH, now),
  );
  if (!big.length) return 0;
  const strong = flares.filter((fl) => {
    const p = parseFlareClass(fl.classType);
    if (!p) return false;
    return p.letter === "X" || (p.letter === "M" && p.value >= 5);
  });
  let n = 0;
  for (const fl of strong) {
    const t0 = peakMs(fl);
    if (!t0) continue;
    for (const q of big) {
      const lag = (Number(q.properties.time) - t0) / 3_600_000;
      if (lag >= 0 && lag <= LAG_H) n++;
    }
  }
  return n;
}

function antipodeHits(node: DragonNode, features: EqFeature[], now: number): number {
  const big = features.filter(
    (f) => magOf(f) >= 6.5 && isFresh(f.properties.time, RAISED.look.antipodeH, now),
  );
  let n = 0;
  for (const q of big) {
    if (inNode(q, node)) continue;
    const [lon, lat] = q.geometry.coordinates;
    const ap = antipode(lat, lon);
    const c = nodeCenter(node);
    if (gcDeg(ap.lat, ap.lon, c.lat, c.lon) <= ANTIPODE_DEG) n++;
  }
  return n;
}

function whyLine(z: Omit<LookZone, "why">): string {
  const bits: string[] = [];
  if (z.reasons.includes("large")) bits.push(`M${z.maxMag.toFixed(1)}`);
  if (z.reasons.includes("sun-led")) bits.push("sun-led");
  if (z.reasons.includes("antipode")) bits.push("antipode");
  if (z.reasons.includes("rate")) bits.push(`${z.relativeRate.toFixed(1)}× peers`);
  if (z.reasons.includes("spacing")) bits.push("unusual spacing");
  if (z.reasons.includes("agency")) bits.push("agency color");
  return bits.join(" · ") || z.status;
}

function rank(z: LookZone): number {
  return (
    z.strength * 10 +
    (z.reasons.includes("sun-led") ? 8 : 0) +
    (z.reasons.includes("large") ? 6 : 0) +
    (z.reasons.includes("antipode") ? 4 : 0) +
    (z.reasons.includes("agency") ? 3 : 0) +
    (z.reasons.includes("rate") ? 2 : 0) +
    z.maxMag
  );
}

export function buildLookZones(opts: {
  features: EqFeature[];
  /** Wider catalog (month) for sun-led / antipode so a 24h map still sees 14 d pattern. */
  wideFeatures?: EqFeature[];
  flares?: DonkiFlare[];
  timeWindow?: string;
  now?: number;
}): LookZonesReport {
  const now = opts.now ?? Date.now();
  const features = opts.features ?? [];
  const wide = opts.wideFeatures?.length ? opts.wideFeatures : features;
  const flares = opts.flares ?? [];
  const pool = DRAGON_NODES.filter((n) => n.publishedFocus || n.watchPriority);
  const days =
    opts.timeWindow === "hour"
      ? 1 / 24
      : opts.timeWindow === "day"
        ? 1
        : opts.timeWindow === "month"
          ? 30
          : 7;

  const counts = pool.map((node) => {
    const hits = features.filter((f) => inNode(f, node) && (magOf(f) >= 4 || Number.isNaN(magOf(f))));
    let maxMag = 0;
    let recentMaxMag = 0;
    let n = 0;
    for (const f of hits) {
      n++;
      const m = magOf(f);
      if (Number.isFinite(m) && m > maxMag) maxMag = m;
      if (
        Number.isFinite(m) &&
        m > recentMaxMag &&
        isFresh(f.properties.time, RAISED.look.largeH, now)
      ) {
        recentMaxMag = m;
      }
    }
    return { node, n, maxMag, recentMaxMag, rate: n / Math.max(days, 1 / 24) };
  });

  const rates = counts.map((c) => c.rate).filter((r) => r > 0).sort((a, b) => a - b);
  const median =
    rates.length === 0
      ? 0
      : rates.length % 2
        ? rates[(rates.length - 1) / 2]!
        : (rates[rates.length / 2 - 1]! + rates[rates.length / 2]!) / 2;

  const all: LookZone[] = counts.map(({ node, n, maxMag, recentMaxMag, rate }) => {
    const status = nodeStatus(features, node, {
      timeWindow: opts.timeWindow,
      now,
    });
    const rel = median > 0.05 ? rate / median : rate > 0 ? 3 : 0;
    const reasons: LookReason[] = [];
    if (status === "watch" || recentMaxMag >= 6.5) reasons.push("large");
    if (rel >= 2.4 && n >= 5) reasons.push("rate");
    if (sunLedHits(node, wide, flares, now) > 0) reasons.push("sun-led");
    if (antipodeHits(node, wide, now) > 0) reasons.push("antipode");
    if (
      node.kind === "volcano" &&
      (node.aviationCode === "yellow" ||
        node.aviationCode === "orange" ||
        node.aviationCode === "red")
    ) {
      reasons.push("agency");
    }
    if (n >= 6) {
      const times = features
        .filter((f) => inNode(f, node) && magOf(f) >= 4.5)
        .map((f) => f.properties.time)
        .filter((t): t is number => typeof t === "number");
      const gaps = interEventSeconds(times);
      if (gaps.length >= 4) {
        const sc = resonanceScore(gaps, 32);
        if (sc.separated && rel >= 1.3) reasons.push("spacing");
      }
    }
    const strength = reasons.length;
    const look =
      reasons.includes("agency") ||
      recentMaxMag >= 7 ||
      strength >= 2 ||
      (reasons.includes("rate") && n >= 8) ||
      (reasons.includes("sun-led") && (reasons.includes("large") || reasons.includes("antipode")));
    const c = nodeCenter(node);
    const z: LookZone = {
      id: node.id,
      name: node.name,
      status,
      look,
      reasons,
      strength,
      maxMag,
      n,
      relativeRate: rel,
      why: "",
      lat: c.lat,
      lon: c.lon,
    };
    z.why = whyLine(z);
    return z;
  });

  const looks = all.filter((z) => z.look).sort((a, b) => rank(b) - rank(a)).slice(0, RAISED.look.cap);

  const headline = looks.length
    ? `Look · ${looks.map((z) => z.name.split(/[–/]/)[0]!.trim()).join(" · ")}`
    : "No pattern zones in this window";

  return { generatedAt: now, looks, all, headline };
}
