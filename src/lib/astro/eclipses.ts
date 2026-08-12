/**
 * Eclipse Watch — curated solar / lunar eclipse calendar + awareness windows.
 * Observational sky context only. Not a forecast product.
 * Safety: never look at the Sun without certified eclipse glasses (solar only).
 *
 * Sources: NASA eclipse pages, timeanddate / EclipseWise public catalogs.
 * Times are approximate UTC peaks for ops briefing (verify official ephemerides).
 */

export type EclipseKind = "solar" | "lunar";
export type EclipseType =
  | "total"
  | "annular"
  | "partial"
  | "penumbral"
  | "hybrid";

export type EclipseEvent = {
  id: string;
  kind: EclipseKind;
  type: EclipseType;
  name: string;
  peakMs: number;
  peakLabel: string;
  watchStartMs: number;
  watchEndMs: number;
  path: string;
  regions: string;
  nasaUrl?: string;
  mapUrl?: string;
  syzygy: "new" | "full";
  safety: string;
  note: string;
};

const H = 3_600_000;
const D = 24 * H;

function utc(y: number, m: number, d: number, hh = 12, mm = 0): number {
  return Date.UTC(y, m - 1, d, hh, mm, 0);
}

const RAW_CATALOG: EclipseEvent[] = [
  {
    id: "se-2026-02-17-annular",
    kind: "solar",
    type: "annular",
    name: "Annular solar eclipse",
    peakMs: utc(2026, 2, 17, 12, 12),
    peakLabel: "2026-02-17 ~12:12 UTC",
    watchStartMs: utc(2026, 2, 10),
    watchEndMs: utc(2026, 2, 18, 23),
    path: "Annular path mainly Antarctica; partial over southern Chile/Argentina & southern Africa.",
    regions: "Antarctica · southern tip of South America · southern Africa (partial)",
    nasaUrl: "https://science.nasa.gov/eclipses/future-eclipses/",
    mapUrl: "https://www.timeanddate.com/eclipse/solar/2026-february-17",
    syzygy: "new",
    safety: "Solar — certified eclipse glasses required for any partial phases.",
    note: "Ring of fire for path of annularity only.",
  },
  {
    id: "le-2026-03-03-total",
    kind: "lunar",
    type: "total",
    name: "Total lunar eclipse",
    peakMs: utc(2026, 3, 3, 11, 34),
    peakLabel: "2026-03-03 ~11:34 UTC",
    watchStartMs: utc(2026, 2, 28),
    watchEndMs: utc(2026, 3, 4, 12),
    path: "Totality visible across much of the Americas; Asia/Australia also see stages.",
    regions: "Americas · Europe (partial) · Asia · Australia · Pacific",
    nasaUrl: "https://science.nasa.gov/eclipses/future-eclipses/",
    mapUrl: "https://www.timeanddate.com/eclipse/lunar/2026-march-3",
    syzygy: "full",
    safety: "Lunar — safe to view with unaided eyes (no solar filter).",
    note: "Full-moon total eclipse · blood-moon appearance possible in totality.",
  },
  {
    id: "se-2026-08-12-total",
    kind: "solar",
    type: "total",
    name: "Total solar eclipse",
    peakMs: utc(2026, 8, 12, 17, 47),
    peakLabel: "2026-08-12 ~17:47 UTC",
    watchStartMs: utc(2026, 8, 1),
    watchEndMs: utc(2026, 8, 13, 6),
    path: "Totality: Greenland · Iceland · Spain (and a thin corridor). Partial: most of Europe, N. Africa, parts of N. America.",
    regions: "Greenland · Iceland · Spain (total) · Europe · N. Africa · N. America (partial)",
    nasaUrl:
      "https://science.nasa.gov/eclipses/future-eclipses/total-solar-eclipse-on-august-12-2026/",
    mapUrl: "https://www.timeanddate.com/eclipse/solar/2026-august-12",
    syzygy: "new",
    safety:
      "Solar — never look at the Sun without ISO-certified eclipse glasses except during totality only (if in path).",
    note: "First total solar over western/central Europe since 1999 for many observers.",
  },
  {
    id: "le-2026-08-28-partial",
    kind: "lunar",
    type: "partial",
    name: "Partial lunar eclipse",
    peakMs: utc(2026, 8, 28, 4, 13),
    peakLabel: "2026-08-28 ~04:13 UTC",
    watchStartMs: utc(2026, 8, 25),
    watchEndMs: utc(2026, 8, 29),
    path: "Partial stages over Americas, Europe, Africa.",
    regions: "Americas · Europe · Africa · Atlantic",
    nasaUrl: "https://science.nasa.gov/eclipses/future-eclipses/",
    mapUrl: "https://www.timeanddate.com/eclipse/lunar/2026-august-28",
    syzygy: "full",
    safety: "Lunar — safe unaided.",
    note: "Companion lunar eclipse ~2 weeks after Aug 12 total solar (eclipse season).",
  },
  {
    id: "se-2027-02-06-annular",
    kind: "solar",
    type: "annular",
    name: "Annular solar eclipse",
    peakMs: utc(2027, 2, 6, 16, 0),
    peakLabel: "2027-02-06 ~16:00 UTC",
    watchStartMs: utc(2027, 1, 30),
    watchEndMs: utc(2027, 2, 7, 23),
    path: "Annularity: South America & West Africa corridor.",
    regions: "Chile · Argentina · Uruguay · Brazil · West Africa (annular/partial)",
    nasaUrl: "https://science.nasa.gov/eclipses/future-eclipses/",
    mapUrl: "https://www.timeanddate.com/eclipse/solar/2027-february-6",
    syzygy: "new",
    safety: "Solar — certified eclipse glasses required outside annularity path rules.",
    note: "Ring of fire over South Atlantic / Africa–America path.",
  },
  {
    id: "le-2027-02-20-penumbral",
    kind: "lunar",
    type: "penumbral",
    name: "Penumbral lunar eclipse",
    peakMs: utc(2027, 2, 20, 23, 13),
    peakLabel: "2027-02-20 ~23:13 UTC",
    watchStartMs: utc(2027, 2, 18),
    watchEndMs: utc(2027, 2, 21, 12),
    path: "Subtle penumbral shading — wide Earth visibility.",
    regions: "Americas · Europe · Africa · Asia · Australia",
    nasaUrl: "https://science.nasa.gov/eclipses/future-eclipses/",
    mapUrl: "https://www.timeanddate.com/eclipse/lunar/2027-february-20",
    syzygy: "full",
    safety: "Lunar — safe unaided; shading may be faint.",
    note: "Penumbral only — low visual drama, still real geometry.",
  },
  {
    id: "se-2027-08-02-total",
    kind: "solar",
    type: "total",
    name: "Total solar eclipse",
    peakMs: utc(2027, 8, 2, 10, 7),
    peakLabel: "2027-08-02 ~10:07 UTC",
    watchStartMs: utc(2027, 7, 20),
    watchEndMs: utc(2027, 8, 3, 6),
    path: "Long totality across N. Africa / Mediterranean / Arabia.",
    regions: "Spain (south) · Morocco · Algeria · Tunisia · Libya · Egypt · Saudi · Yemen",
    nasaUrl: "https://science.nasa.gov/eclipses/future-eclipses/",
    mapUrl: "https://www.timeanddate.com/eclipse/solar/2027-august-2",
    syzygy: "new",
    safety: "Solar — glasses required for all partial phases.",
    note: "One of the longer totalities of the decade along the African path.",
  },
];

export const ECLIPSE_CATALOG: EclipseEvent[] = RAW_CATALOG.slice().sort(
  (a, b) => a.peakMs - b.peakMs,
);

export type EclipseAwareness =
  | "dormant"
  | "approaching"
  | "elevated"
  | "active"
  | "recent";

export type EclipseWatchState = {
  nowMs: number;
  next: EclipseEvent | null;
  elevated: EclipseEvent | null;
  active: EclipseEvent | null;
  awareness: EclipseAwareness;
  hoursToPeak: number | null;
  daysToNext: number | null;
  chip: string;
  headline: string;
  upcoming: EclipseEvent[];
  seasonNote: string | null;
};

function awarenessFor(
  now: number,
  focus: EclipseEvent | null,
  next: EclipseEvent | null,
): EclipseAwareness {
  if (focus) {
    const dt = Math.abs(now - focus.peakMs);
    if (dt <= 6 * H) return "active";
    if (now >= focus.watchStartMs && now <= focus.watchEndMs) return "elevated";
    if (now > focus.peakMs && now - focus.peakMs < 3 * D) return "recent";
  }
  if (next) {
    const days = (next.peakMs - now) / D;
    if (days <= 14) return "approaching";
  }
  return "dormant";
}

export function formatEclipseType(e: EclipseEvent): string {
  const k = e.kind === "solar" ? "Solar" : "Lunar";
  const t =
    e.type === "total"
      ? "total"
      : e.type === "annular"
        ? "annular"
        : e.type === "partial"
          ? "partial"
          : e.type === "penumbral"
            ? "penumbral"
            : e.type;
  return `${k} · ${t}`;
}

export function computeEclipseWatch(nowMs: number = Date.now()): EclipseWatchState {
  const catalog = ECLIPSE_CATALOG;
  const elevated =
    catalog.find((e) => nowMs >= e.watchStartMs && nowMs <= e.watchEndMs) ?? null;

  const active =
    catalog.find((e) => Math.abs(nowMs - e.peakMs) <= 6 * H) ?? null;

  const next =
    catalog.find((e) => e.peakMs + 12 * H >= nowMs) ??
    catalog[catalog.length - 1] ??
    null;

  const focus = active ?? elevated ?? next;
  const awareness = awarenessFor(nowMs, elevated ?? active, next);

  const hoursToPeak = focus != null ? (focus.peakMs - nowMs) / H : null;
  const daysToNext = next != null ? (next.peakMs - nowMs) / D : null;

  const upcoming = catalog
    .filter((e) => e.peakMs + 6 * H >= nowMs)
    .slice(0, 4);

  let seasonNote: string | null = null;
  for (let i = 0; i < catalog.length - 1; i++) {
    const a = catalog[i]!;
    const b = catalog[i + 1]!;
    const gap = Math.abs(b.peakMs - a.peakMs);
    if (gap <= 35 * D) {
      const mid = (a.peakMs + b.peakMs) / 2;
      if (Math.abs(nowMs - mid) < 40 * D) {
        seasonNote = `Eclipse season · ${formatEclipseType(a)} ↔ ${formatEclipseType(b)} (~${Math.round(gap / D)} d apart)`;
        break;
      }
    }
  }

  let chip = "Eclipse watch · quiet";
  let headline = "No eclipse in the near elevated window.";

  if (active) {
    chip =
      active.kind === "solar"
        ? "Eclipse · ACTIVE solar shadow"
        : "Eclipse · ACTIVE lunar shadow";
    headline = `${active.name} near peak · ${active.peakLabel}`;
  } else if (elevated) {
    const h = hoursToPeak != null ? hoursToPeak : 0;
    const when =
      h > 24
        ? `in ${Math.round(h / 24)} d`
        : h >= 0
          ? `in ${Math.round(h)} h`
          : `${Math.round(-h)} h past peak`;
    chip = `Eclipse · elevated · ${elevated.kind === "solar" ? "solar" : "lunar"} ${when}`;
    headline = `${elevated.name} · elevated awareness · ${when}`;
  } else if (next && daysToNext != null && daysToNext < 45) {
    chip = `Next eclipse · ${Math.max(0, Math.round(daysToNext))} d · ${next.kind}`;
    headline = `Next: ${next.name} · ${next.peakLabel}`;
  } else if (next) {
    chip = `Next eclipse · ${next.peakLabel.slice(0, 10)}`;
    headline = `Next: ${next.name}`;
  }

  return {
    nowMs,
    next,
    elevated,
    active,
    awareness,
    hoursToPeak,
    daysToNext,
    chip,
    headline,
    upcoming,
    seasonNote,
  };
}

export function eclipseTone(
  a: EclipseAwareness,
): "danger" | "warn" | "gold" | "primary" | "muted" {
  if (a === "active") return "danger";
  if (a === "elevated") return "warn";
  if (a === "approaching") return "gold";
  if (a === "recent") return "primary";
  return "muted";
}
