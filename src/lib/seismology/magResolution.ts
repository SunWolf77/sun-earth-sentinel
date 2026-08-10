/**
 * Magnitude resolution limits — brutal, not marketing.
 *
 * Mag is a *solution*, not a barcode on the rupture. Free public catalogs
 * (USGS, GEOFON, EMSC, national nets) publish to ~0.1, but cross-agency
 * scatter on the *same* event is routinely 0.2–0.5 and can exceed that on
 * early automatic picks. Treating M7.4 vs M7.5 as two standouts is how a
 * free observatory becomes a feed mirror instead of a field instrument.
 */

export type MagTypeKind =
  | "moment" // mww, mw, mwc, mwb — preferred for large events
  | "body" // mb, mB
  | "surface" // ms
  | "local" // ml, md, mh — regional scales, noisy at distance
  | "unknown";

/** Display quanta almost every agency rounds to. */
export const MAG_DISPLAY_STEP = 0.1;

/**
 * Cross-agency Δmag that is still *noise* for identity (same rupture).
 * Above this, treat as different events *unless* space/time already fail.
 */
export function identityMagSlack(mag: number, magType?: string | null): number {
  const kind = classifyMagType(magType);
  // Local/duration mags scatter more; moment is stabler at M6+
  if (kind === "local") return mag >= 5 ? 1.0 : 1.3;
  if (kind === "body" || kind === "surface") return 1.1;
  if (kind === "moment") return mag >= 6.5 ? 0.8 : 1.0;
  return 1.0;
}

/**
 * When is a *displayed* mag difference meaningful to a human observer?
 * Below this, UI should not imply two different "sizes" of the field.
 */
export function significantMagDelta(mag: number): number {
  // Small events: 0.3 is often still network noise
  if (mag < 4) return 0.4;
  if (mag < 6) return 0.3;
  return 0.25;
}

export function classifyMagType(raw?: string | null): MagTypeKind {
  const t = (raw || "").toLowerCase().trim();
  if (!t) return "unknown";
  if (/^mw|mww|mwc|mwb|mwr/.test(t)) return "moment";
  if (/^mb|mB/.test(t) || t === "mb_lg" || t === "mb_lg") return "body";
  if (/^ms/.test(t)) return "surface";
  if (/^ml|md|mh|mL|Ml/.test(t) || t === "mlv" || t === "mlev") return "local";
  return "unknown";
}

/** Prefer higher-quality mag type when choosing which solution to surface. */
export function magTypeRank(raw?: string | null): number {
  switch (classifyMagType(raw)) {
    case "moment":
      return 4;
    case "surface":
      return 3;
    case "body":
      return 2;
    case "local":
      return 1;
    default:
      return 0;
  }
}

/**
 * Format mag for UI without fake precision across agencies.
 * Single solution: one decimal. Twin secondary: show range if significant.
 */
export function formatMagField(
  primary: number,
  secondary?: number | null,
): string {
  if (!Number.isFinite(primary)) return "—";
  const p = Math.round(primary * 10) / 10;
  if (
    secondary == null ||
    !Number.isFinite(secondary) ||
    Math.abs(secondary - primary) < significantMagDelta(primary)
  ) {
    return `M${p.toFixed(1)}`;
  }
  const s = Math.round(secondary * 10) / 10;
  const lo = Math.min(p, s);
  const hi = Math.max(p, s);
  return `M${lo.toFixed(1)}–${hi.toFixed(1)}`;
}

/** Honest one-liner for About / help — not a disclaimer dump. */
export const MAG_RESOLUTION_NOTE =
  "Magnitude is a network solution rounded to ~0.1. Different agencies often differ 0.2–0.5 on the same rupture — SES treats that as one event, not two.";
