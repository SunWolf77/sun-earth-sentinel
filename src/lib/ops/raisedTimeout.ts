/**
 * Raised-status decay — observational desk, not a stacking alert board.
 * Watch / warning / look / chip chrome must time out. Catalog history stays
 * on the map; the raised UI does not.
 *
 * Honesty: timeout ≠ “all-clear from an authority”. SWPC/USGS remain source.
 */

export const HOUR_MS = 3_600_000;

export const RAISED = {
  swpc: {
    summaryH: 18,
    otherH: 18,
    watchH: 36,
    alertH: 48,
    warningH: 72,
    cap: 6,
  },
  node: {
    /** M6+ keeps node watch this long */
    m6WatchH: 48,
    /** M7+ keeps node watch this long */
    m7WatchH: 72,
    /** Dual M5 burst window */
    dualM5WatchH: 24,
  },
  look: {
    sunLedH: 48,
    antipodeH: 48,
    largeH: 48,
    cap: 4,
  },
  crossFeed: {
    m6ChipH: 36,
    cap: 4,
  },
  volcToast: {
    ttlH: 4,
    cap: 8,
  },
  /** Live volcano LOOK / Pulse — not the toast strip. */
  volc: {
    /** Hardcoded aviation notes expire unless a live feed confirms */
    curatedH: 14,
    /** Darwin / Washington VAA DTG freshness */
    vaacH: 30,
    /** GVP weekly letter is map context after this, not Pulse hot */
    gvpWeeklyH: 10,
    /** Max agency volcanoes on LOOK — rest stay on the volcano list */
    lookCap: 2,
    /** Darwin LOOK/Pulse lead only at this FL+ (or RED). Routine FL070–150 stays listed. */
    lookMinFl: 200,
  },
  story: {
    /** Hard "now" slots on Pulse */
    nowCap: 2,
    /** Ranked stories kept after unify */
    deskCap: 8,
  },
} as const;

export type SwpcAgeTier = "warning" | "watch" | "alert" | "summary" | "other";

export function hoursMs(h: number): number {
  return h * HOUR_MS;
}

export function ageMs(t: number | null | undefined, now: number): number | null {
  if (t == null || !Number.isFinite(t)) return null;
  return now - t;
}

export function isFresh(
  t: number | null | undefined,
  maxH: number,
  now: number,
): boolean {
  const age = ageMs(t, now);
  return age != null && age >= 0 && age <= hoursMs(maxH);
}

/** SWPC issue_datetime is usually "YYYY-MM-DD HH:mm:ss.SSS" UTC, no Z. */
export function parseIssuedMs(issued: string | null | undefined): number | null {
  if (!issued) return null;
  const s = issued.trim();
  if (!s) return null;
  const iso = /T/.test(s) ? s : s.replace(" ", "T");
  const stamped = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const t = Date.parse(stamped);
  return Number.isFinite(t) ? t : null;
}

export function swpcMaxAgeH(tier: SwpcAgeTier): number {
  switch (tier) {
    case "warning":
      return RAISED.swpc.warningH;
    case "watch":
      return RAISED.swpc.watchH;
    case "alert":
      return RAISED.swpc.alertH;
    case "summary":
      return RAISED.swpc.summaryH;
    default:
      return RAISED.swpc.otherH;
  }
}

export type AgeableSwpc = {
  tier: SwpcAgeTier;
  title: string;
  issued: string | null;
};

/**
 * Drop stale SWPC rows, keep one per title, cap the desk.
 * Missing issue time is kept (feed sometimes omits it) but sorts last.
 */
export function pruneRaisedSwpc<T extends AgeableSwpc>(
  rows: T[],
  now = Date.now(),
): T[] {
  const live: T[] = [];
  for (const row of rows) {
    const issuedMs = parseIssuedMs(row.issued);
    if (issuedMs == null) {
      live.push(row);
      continue;
    }
    if (isFresh(issuedMs, swpcMaxAgeH(row.tier), now)) live.push(row);
  }

  const byKey = new Map<string, T>();
  for (const row of live) {
    const key = row.title.slice(0, 80).toLowerCase();
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    const a = parseIssuedMs(row.issued) ?? 0;
    const b = parseIssuedMs(prev.issued) ?? 0;
    if (a >= b) byKey.set(key, row);
  }

  const TIER_ORDER: Record<SwpcAgeTier, number> = {
    warning: 0,
    watch: 1,
    alert: 2,
    summary: 3,
    other: 4,
  };
  return [...byKey.values()]
    .sort((a, b) => {
      const td = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
      if (td !== 0) return td;
      return (parseIssuedMs(b.issued) ?? 0) - (parseIssuedMs(a.issued) ?? 0);
    })
    .slice(0, RAISED.swpc.cap);
}

export function pruneVolcTransitions<T extends { at: number }>(
  list: T[],
  now = Date.now(),
): T[] {
  const ttl = hoursMs(RAISED.volcToast.ttlH);
  return list.filter((t) => now - t.at >= 0 && now - t.at <= ttl).slice(0, RAISED.volcToast.cap);
}
