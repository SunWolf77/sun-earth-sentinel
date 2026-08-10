/**
 * Field identity — SES is the field monitoring itself.
 *
 * One physical rupture = one event in the catalog. Agencies disagree on
 * magnitude, place string, and depth; they must not multiply the field.
 *
 * Spatial match uses haversine km (not degree boxes — those lie at latitude
 * and pretend 0.65° is the same length everywhere). Mag is a range check
 * with resolution-aware slack — see magResolution.ts.
 */

import type { EqFeature } from "@/lib/feeds/usgs";
import {
  identityMagSlack,
  magTypeRank,
} from "@/lib/seismology/magResolution";

export type EventProbe = {
  lat: number;
  lon: number;
  time: number | null | undefined;
  mag: number | null | undefined;
  depthKm?: number | null;
  magType?: string | null;
  status?: string | null;
};

export type SameEventProfile = {
  /**
   * Base max epicenter separation (km) for identity.
   * Scales up with magnitude — large events have looser early locations.
   */
  maxDistKm: number;
  /** Extra km allowed per magnitude unit above M5 */
  distKmPerMagAbove5: number;
  /** Max |Δorigin| ms when both times known */
  maxTimeMs: number;
  /**
   * If true, missing time on either side refuses identity
   * (safer for microseismicity; global strong may allow).
   */
  requireTime: boolean;
  /** Soft depth gate (km) when both depths known and both ≥ minDepthForGate */
  maxDepthDeltaKm: number;
  minDepthForGate: number;
};

/** Global multi-agency (USGS ↔ GEOFON ↔ EMSC) */
export const PROFILE_GLOBAL: SameEventProfile = {
  maxDistKm: 80,
  distKmPerMagAbove5: 12,
  maxTimeMs: 20 * 60_000,
  requireTime: true,
  maxDepthDeltaKm: 80,
  minDepthForGate: 50,
};

/** Japan / NZ national densify */
export const PROFILE_NATIONAL: SameEventProfile = {
  maxDistKm: 45,
  distKmPerMagAbove5: 8,
  maxTimeMs: 15 * 60_000,
  requireTime: true,
  maxDepthDeltaKm: 50,
  minDepthForGate: 40,
};

/** Iceland / compact swarms */
export const PROFILE_COMPACT: SameEventProfile = {
  maxDistKm: 25,
  distKmPerMagAbove5: 5,
  maxTimeMs: 12 * 60_000,
  requireTime: true,
  maxDepthDeltaKm: 30,
  minDepthForGate: 20,
};

/** Story / final catalog collapse — slightly looser, never double the field */
export const PROFILE_STORY: SameEventProfile = {
  maxDistKm: 100,
  distKmPerMagAbove5: 15,
  maxTimeMs: 30 * 60_000,
  requireTime: true,
  maxDepthDeltaKm: 100,
  minDepthForGate: 50,
};

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR;
  const dLon = (lon2 - lon1) * toR;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function maxIdentityDistKm(
  mag: number,
  profile: SameEventProfile,
): number {
  const m = Number.isFinite(mag) ? mag : 4;
  const extra = Math.max(0, m - 5) * profile.distKmPerMagAbove5;
  return profile.maxDistKm + extra;
}

export function probeFromFeature(f: EqFeature): EventProbe | null {
  const [lon, lat, depth] = f.geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    lat,
    lon,
    time: f.properties.time,
    mag: f.properties.mag,
    depthKm: typeof depth === "number" && Number.isFinite(depth) ? Math.abs(depth) : null,
    magType: f.properties.magType ?? null,
    status: f.properties.status ?? null,
  };
}

/**
 * True when two solutions describe the same physical event in the field.
 * Mag is resolution-aware slack — never exact equality.
 */
export function samePhysicalEvent(
  a: EventProbe,
  b: EventProbe,
  profile: SameEventProfile = PROFILE_GLOBAL,
): boolean {
  if (!Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return false;
  if (!Number.isFinite(a.lon) || !Number.isFinite(b.lon)) return false;

  const magRef = Math.max(
    typeof a.mag === "number" && Number.isFinite(a.mag) ? a.mag : 0,
    typeof b.mag === "number" && Number.isFinite(b.mag) ? b.mag : 0,
  );
  const dist = haversineKm(a.lat, a.lon, b.lat, b.lon);
  if (dist > maxIdentityDistKm(magRef, profile)) return false;

  const ta = a.time;
  const tb = b.time;
  const bothTime = typeof ta === "number" && typeof tb === "number";
  if (profile.requireTime && !bothTime) return false;
  if (bothTime && Math.abs(ta! - tb!) > profile.maxTimeMs) return false;

  const ma = a.mag;
  const mb = b.mag;
  if (
    typeof ma === "number" &&
    typeof mb === "number" &&
    Number.isFinite(ma) &&
    Number.isFinite(mb)
  ) {
    const slack = Math.max(
      identityMagSlack(ma, a.magType),
      identityMagSlack(mb, b.magType),
    );
    if (Math.abs(ma - mb) > slack) return false;
  }

  // Soft depth: only when both known and at least one is mid/deep
  const da = a.depthKm;
  const db = b.depthKm;
  if (
    typeof da === "number" &&
    typeof db === "number" &&
    Number.isFinite(da) &&
    Number.isFinite(db) &&
    Math.max(da, db) >= profile.minDepthForGate
  ) {
    if (Math.abs(da - db) > profile.maxDepthDeltaKm) return false;
  }

  return true;
}

export function samePhysicalFeature(
  a: EqFeature,
  b: EqFeature,
  profile: SameEventProfile = PROFILE_GLOBAL,
): boolean {
  const pa = probeFromFeature(a);
  const pb = probeFromFeature(b);
  if (!pa || !pb) return false;
  return samePhysicalEvent(pa, pb, profile);
}

export function isSecondaryAgencyFeature(f: EqFeature): boolean {
  const id = String(f.id || "");
  const net = String(f.properties.net || "").toLowerCase();
  const detail = String(f.properties.detail || "").toLowerCase();
  return (
    id.startsWith("geofon:") ||
    id.startsWith("emsc:") ||
    net === "geofon" ||
    net === "emsc" ||
    detail === "geofon" ||
    detail === "emsc"
  );
}

function statusRank(s?: string | null): number {
  const t = (s || "").toLowerCase();
  if (t.includes("reviewed") || t.includes("final")) return 3;
  if (t.includes("automatic") || t.includes("prelim")) return 1;
  return 2;
}

/**
 * Prefer the solution that best represents the field for display:
 * primary net > secondary, reviewed > automatic, moment mag > local.
 */
export function preferFieldPrimary(a: EqFeature, b: EqFeature): EqFeature {
  const aSec = isSecondaryAgencyFeature(a);
  const bSec = isSecondaryAgencyFeature(b);
  if (aSec && !bSec) return b;
  if (bSec && !aSec) return a;

  const sr = statusRank(b.properties.status) - statusRank(a.properties.status);
  if (sr > 0) return b;
  if (sr < 0) return a;

  const mr =
    magTypeRank(b.properties.magType) - magTypeRank(a.properties.magType);
  if (mr > 0) return b;
  if (mr < 0) return a;

  // Prefer higher mag only as weak tie-break (not identity)
  const ma = a.properties.mag ?? 0;
  const mb = b.properties.mag ?? 0;
  if (mb > ma + 0.15) return b;
  return a;
}

/**
 * Merge secondary solution metadata onto the survivor without inventing data.
 */
export function enrichFromTwin(primary: EqFeature, twin: EqFeature): EqFeature {
  const out: EqFeature = {
    ...primary,
    properties: { ...primary.properties },
  };
  const tid = String(twin.id || "");
  const tmag = twin.properties.mag;
  if (tid.startsWith("geofon:") || twin.properties.net === "geofon") {
    out.properties.geofonEnriched = true;
    if (typeof tmag === "number") out.properties.geofonMag = tmag;
  }
  if (tid.startsWith("emsc:") || twin.properties.net === "emsc") {
    out.properties.emscEnriched = true;
  }
  if (twin.properties.jmaMaxi && !out.properties.jmaMaxi) {
    out.properties.jmaMaxi = twin.properties.jmaMaxi;
    out.properties.jmaEnriched = true;
  }
  return out;
}

/**
 * Spatial identity clustering over a full catalog.
 * Greedy: strongest first, absorb twins, one survivor per rupture.
 * This is NOT map marker clustering (supercluster) — that groups *distinct*
 * nearby events for display. This collapses *the same* event from N agencies.
 */
export function collapseFieldTwins(
  features: EqFeature[],
  profile: SameEventProfile = PROFILE_STORY,
): EqFeature[] {
  if (features.length <= 1) return features;

  // Strongest first so the field anchor is the big solution
  const order = [...features].sort(
    (a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0),
  );
  const used = new Set<number>();
  const out: EqFeature[] = [];

  for (let i = 0; i < order.length; i++) {
    if (used.has(i)) continue;
    let survivor = order[i]!;
    used.add(i);
    for (let j = i + 1; j < order.length; j++) {
      if (used.has(j)) continue;
      const cand = order[j]!;
      if (!samePhysicalFeature(survivor, cand, profile)) continue;
      used.add(j);
      const preferred = preferFieldPrimary(survivor, cand);
      const other = preferred === survivor ? cand : survivor;
      survivor = enrichFromTwin(preferred, other);
    }
    out.push(survivor);
  }

  return out.sort(
    (a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0),
  );
}

/**
 * Final catalog pass after all agency merges.
 * Pairwise merges can still leak twins (order-dependent). This is the
 * hard stop: one rupture, one row, before cap/UI.
 */
export function resolveFieldCatalog(
  features: EqFeature[],
  profile: SameEventProfile = PROFILE_STORY,
): EqFeature[] {
  return collapseFieldTwins(features, profile);
}
