/**
 * Field identity — SES is the field monitoring itself.
 *
 * One physical rupture = one event in the catalog. Agencies disagree on
 * magnitude, place string, and depth; they must not multiply the field.
 * Every multi-agency merge and story ranker should ask this module first.
 */

import type { EqFeature } from "@/lib/feeds/usgs";

export type EventProbe = {
  lat: number;
  lon: number;
  time: number | null | undefined;
  mag: number | null | undefined;
};

export type SameEventProfile = {
  /** Max |Δlat| degrees */
  maxLatDeg: number;
  /** Max |Δlon| degrees */
  maxLonDeg: number;
  /** Max |Δorigin| ms */
  maxTimeMs: number;
  /**
   * Max |Δmag| when both mags known and the smaller is ≥ minMagForDelta.
   * Agencies routinely differ 0.2–0.5; early automatic solutions more.
   */
  maxMagDelta: number;
  /** Only enforce mag delta when min(magA, magB) ≥ this (small events noisier) */
  minMagForDelta: number;
};

/** Global multi-agency (USGS ↔ GEOFON ↔ EMSC) — room for large-event scatter */
export const PROFILE_GLOBAL: SameEventProfile = {
  maxLatDeg: 0.65,
  maxLonDeg: 0.75,
  maxTimeMs: 20 * 60_000,
  maxMagDelta: 1.0,
  minMagForDelta: 3,
};

/** Japan / dense national (slightly tighter epicenters) */
export const PROFILE_NATIONAL: SameEventProfile = {
  maxLatDeg: 0.45,
  maxLonDeg: 0.55,
  maxTimeMs: 15 * 60_000,
  maxMagDelta: 1.2,
  minMagForDelta: 3,
};

/** Iceland / compact swarms */
export const PROFILE_COMPACT: SameEventProfile = {
  maxLatDeg: 0.25,
  maxLonDeg: 0.35,
  maxTimeMs: 12 * 60_000,
  maxMagDelta: 1.0,
  minMagForDelta: 2,
};

/** Activity Story / UI collapse — slightly looser, never double-card a rupture */
export const PROFILE_STORY: SameEventProfile = {
  maxLatDeg: 0.75,
  maxLonDeg: 0.85,
  maxTimeMs: 30 * 60_000,
  maxMagDelta: 1.0,
  minMagForDelta: 3,
};

export function probeFromFeature(f: EqFeature): EventProbe | null {
  const [lon, lat] = f.geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    lat,
    lon,
    time: f.properties.time,
    mag: f.properties.mag,
  };
}

/**
 * True when two solutions describe the same physical event in the field.
 * Mag is a range check, not identity — different mags must still match.
 */
export function samePhysicalEvent(
  a: EventProbe,
  b: EventProbe,
  profile: SameEventProfile = PROFILE_GLOBAL,
): boolean {
  if (!Number.isFinite(a.lat) || !Number.isFinite(b.lat)) return false;
  if (!Number.isFinite(a.lon) || !Number.isFinite(b.lon)) return false;
  if (Math.abs(a.lat - b.lat) > profile.maxLatDeg) return false;
  if (Math.abs(a.lon - b.lon) > profile.maxLonDeg) return false;

  const ta = a.time;
  const tb = b.time;
  if (typeof ta === "number" && typeof tb === "number") {
    if (Math.abs(ta - tb) > profile.maxTimeMs) return false;
  }

  const ma = a.mag;
  const mb = b.mag;
  if (
    typeof ma === "number" &&
    typeof mb === "number" &&
    Number.isFinite(ma) &&
    Number.isFinite(mb)
  ) {
    const lo = Math.min(ma, mb);
    if (lo >= profile.minMagForDelta && Math.abs(ma - mb) > profile.maxMagDelta) {
      return false;
    }
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

/** Secondary / complementary agency tags — enrich primary, do not double-count */
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

/** Prefer USGS / primary catalog over secondary agency twin */
export function preferFieldPrimary(a: EqFeature, b: EqFeature): EqFeature {
  const aSec = isSecondaryAgencyFeature(a);
  const bSec = isSecondaryAgencyFeature(b);
  if (aSec && !bSec) return b;
  if (bSec && !aSec) return a;
  return a;
}

/**
 * Collapse multi-agency twins in a feature list (story / display path).
 * Order preserved for first-seen preferred survivor.
 */
export function collapseFieldTwins(
  features: EqFeature[],
  profile: SameEventProfile = PROFILE_STORY,
): EqFeature[] {
  const kept: EqFeature[] = [];
  for (const f of features) {
    let twinIdx = -1;
    for (let i = 0; i < kept.length; i++) {
      if (samePhysicalFeature(f, kept[i]!, profile)) {
        twinIdx = i;
        break;
      }
    }
    if (twinIdx < 0) kept.push(f);
    else kept[twinIdx] = preferFieldPrimary(kept[twinIdx]!, f);
  }
  return kept;
}
