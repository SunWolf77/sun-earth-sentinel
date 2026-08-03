/**
 * Local lunar phase ephemeris — no network.
 * Mean synodic model (good to ~hours for UI; not for navigation/occultation).
 * Observational sky context only — not a forecast or causal claim.
 */

/** Mean synodic month (days) */
export const SYNODIC_MONTH_DAYS = 29.530588853;

/**
 * Reference new moon (UTC): 2000-01-06 18:14
 * Meeus Astronomical Algorithms — mean new moon epoch used widely for age models.
 */
export const NEW_MOON_JD_REF = 2451550.1;

export type LunarPhaseId =
  | "new"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

export type LunarPhaseSnapshot = {
  /** Instant used (UTC) */
  atMs: number;
  /** Julian Date (UTC) */
  jd: number;
  /** Days since mean new moon [0, synodic) */
  ageDays: number;
  /** 0…1 illuminated fraction (geometric mean model) */
  illumination: number;
  /** 0…100 percent lit */
  illuminationPct: number;
  /** Phase id for icons / copy */
  phaseId: LunarPhaseId;
  /** Everyday label */
  phaseLabel: string;
  /** Short label for chips */
  phaseShort: string;
  /** True if illumination increasing (new → full) */
  waxing: boolean;
  /** Sun–Moon elongation ≈ mean age × 360/synodic (deg, 0–360) */
  elongationDeg: number;
  /** Geometric tag for observational desks */
  aspectTag: "syzygy_new" | "syzygy_full" | "quadrature" | "open";
  aspectLabel: string;
  /** Next mean new moon */
  nextNewMs: number;
  /** Next mean full moon */
  nextFullMs: number;
  daysToNew: number;
  daysToFull: number;
  /** Human note */
  note: string;
};

/** UTC → Julian Date */
export function dateToJulian(d: Date): number {
  return d.getTime() / 86_400_000 + 2_440_587.5;
}

export function julianToMs(jd: number): number {
  return (jd - 2_440_587.5) * 86_400_000;
}

/** Mean age in days since reference new moon. */
export function lunarAgeDays(jd: number): number {
  let age = (jd - NEW_MOON_JD_REF) % SYNODIC_MONTH_DAYS;
  if (age < 0) age += SYNODIC_MONTH_DAYS;
  return age;
}

/** Illuminated fraction from mean age (0 = new, 1 = full). */
export function illuminationFromAge(ageDays: number): number {
  const phase = (2 * Math.PI * ageDays) / SYNODIC_MONTH_DAYS;
  return (1 - Math.cos(phase)) / 2;
}

export function phaseIdFromAge(ageDays: number): LunarPhaseId {
  // 8 equal-ish sectors of the synodic month
  const t = ageDays / SYNODIC_MONTH_DAYS; // 0…1
  if (t < 0.03 || t >= 0.97) return "new";
  if (t < 0.22) return "waxing_crescent";
  if (t < 0.28) return "first_quarter";
  if (t < 0.47) return "waxing_gibbous";
  if (t < 0.53) return "full";
  if (t < 0.72) return "waning_gibbous";
  if (t < 0.78) return "last_quarter";
  return "waning_crescent";
}

const PHASE_LABEL: Record<LunarPhaseId, string> = {
  new: "New moon",
  waxing_crescent: "Waxing crescent",
  first_quarter: "First quarter",
  waxing_gibbous: "Waxing gibbous",
  full: "Full moon",
  waning_gibbous: "Waning gibbous",
  last_quarter: "Last quarter",
  waning_crescent: "Waning crescent",
};

const PHASE_SHORT: Record<LunarPhaseId, string> = {
  new: "New",
  waxing_crescent: "Waxing ☾",
  first_quarter: "1st Q",
  waxing_gibbous: "Waxing",
  full: "Full",
  waning_gibbous: "Waning",
  last_quarter: "3rd Q",
  waning_crescent: "Waning ☾",
};

export function isWaxing(ageDays: number): boolean {
  return ageDays < SYNODIC_MONTH_DAYS / 2;
}

export function elongationFromAge(ageDays: number): number {
  const e = (360 * ageDays) / SYNODIC_MONTH_DAYS;
  return ((e % 360) + 360) % 360;
}

export function aspectFromElongation(elongDeg: number): {
  tag: LunarPhaseSnapshot["aspectTag"];
  label: string;
} {
  // Near 0° or 180° = syzygy; near 90°/270° = quadrature
  const d0 = Math.min(elongDeg, 360 - elongDeg);
  const d180 = Math.abs(elongDeg - 180);
  const d90 = Math.abs(elongDeg - 90);
  const d270 = Math.abs(elongDeg - 270);
  if (d0 <= 12) return { tag: "syzygy_new", label: "Near new (syzygy)" };
  if (d180 <= 12) return { tag: "syzygy_full", label: "Near full (syzygy)" };
  if (d90 <= 12 || d270 <= 12) return { tag: "quadrature", label: "Near quarter (quadrature)" };
  return { tag: "open", label: "Open phase" };
}

export function computeLunarPhase(at: Date = new Date()): LunarPhaseSnapshot {
  const atMs = at.getTime();
  const jd = dateToJulian(at);
  const ageDays = lunarAgeDays(jd);
  const illumination = illuminationFromAge(ageDays);
  const phaseId = phaseIdFromAge(ageDays);
  const elong = elongationFromAge(ageDays);
  const aspect = aspectFromElongation(elong);

  const daysToNew = (SYNODIC_MONTH_DAYS - ageDays) % SYNODIC_MONTH_DAYS || SYNODIC_MONTH_DAYS;
  const half = SYNODIC_MONTH_DAYS / 2;
  let daysToFull = half - ageDays;
  if (daysToFull <= 0) daysToFull += SYNODIC_MONTH_DAYS;

  const nextNewMs = atMs + daysToNew * 86_400_000;
  const nextFullMs = atMs + daysToFull * 86_400_000;

  return {
    atMs,
    jd,
    ageDays,
    illumination,
    illuminationPct: Math.round(illumination * 1000) / 10,
    phaseId,
    phaseLabel: PHASE_LABEL[phaseId],
    phaseShort: PHASE_SHORT[phaseId],
    waxing: isWaxing(ageDays),
    elongationDeg: Math.round(elong * 10) / 10,
    aspectTag: aspect.tag,
    aspectLabel: aspect.label,
    nextNewMs,
    nextFullMs,
    daysToNew: Math.round(daysToNew * 100) / 100,
    daysToFull: Math.round(daysToFull * 100) / 100,
    note:
      "Mean synodic model (local). Good for UI context — not precise occultation times. " +
      "Sky geometry only; not a quake forecast. Field data lives under Magneto (Cordaro / INTERMAGNET).",
  };
}

/** Compact age string e.g. "12.4 d" */
export function formatAgeDays(age: number): string {
  return `${age.toFixed(1)} d`;
}

export function formatDaysUntil(days: number): string {
  if (days < 1) {
    const h = Math.round(days * 24);
    return h <= 1 ? "~1 h" : `~${h} h`;
  }
  if (days < 2) return `${days.toFixed(1)} days`;
  return `${days.toFixed(1)} days`;
}
