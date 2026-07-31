/** Human-readable feed age — never bare "—" for null. */

export function formatAgeMs(ms: number | null | undefined, now = Date.now()): string {
  if (ms == null || !Number.isFinite(ms)) return "waiting";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function formatEventAgeMs(ageMs: number | null | undefined): string {
  if (ageMs == null || !Number.isFinite(ageMs)) return "no events yet";
  const m = Math.round(ageMs / 60_000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export type FeedHealth = {
  id: string;
  label: string;
  status: "ok" | "waiting" | "loading" | "stale" | "error";
  detail: string;
};

export function buildFeedHealth(opts: {
  loading: boolean;
  lastUpdate: number | null;
  livePulseAt: number | null;
  hasEq: boolean;
  hasScales: boolean;
  hasVolc: boolean;
  error: string | null;
  now?: number;
}): FeedHealth[] {
  const now = opts.now ?? Date.now();
  const age = (t: number | null) => formatAgeMs(t, now);
  const stale =
    opts.lastUpdate != null && now - opts.lastUpdate > 15 * 60_000;

  return [
    {
      id: "pull",
      label: "Pull",
      status: opts.loading
        ? "loading"
        : opts.error && !opts.lastUpdate
          ? "error"
          : opts.lastUpdate
            ? stale
              ? "stale"
              : "ok"
            : "waiting",
      detail: opts.loading
        ? "loading"
        : opts.error && !opts.lastUpdate
          ? "error"
          : age(opts.lastUpdate),
    },
    {
      id: "eq",
      label: "Quakes",
      status: opts.hasEq ? "ok" : opts.loading ? "loading" : "waiting",
      detail: opts.hasEq ? age(opts.lastUpdate) : opts.loading ? "loading" : "waiting",
    },
    {
      id: "solar",
      label: "Solar",
      status: opts.hasScales ? "ok" : opts.loading ? "loading" : "waiting",
      detail: opts.hasScales ? age(opts.lastUpdate) : opts.loading ? "loading" : "waiting",
    },
    {
      id: "volc",
      label: "Volc",
      status: opts.hasVolc ? "ok" : opts.loading ? "loading" : "waiting",
      detail: opts.hasVolc ? age(opts.lastUpdate) : opts.loading ? "loading" : "waiting",
    },
    {
      id: "pulse",
      label: "Pulse",
      status: opts.livePulseAt ? "ok" : "waiting",
      detail: opts.livePulseAt ? age(opts.livePulseAt) : "idle",
    },
  ];
}
