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

export type FeedTimestampInput = {
  eq: number | null;
  solar: number | null;
  volc: number | null;
  pulse: number | null;
  geofon?: number | null;
  global?: number | null;
};

function layerStatus(
  ts: number | null | undefined,
  opts: { loading: boolean; hasData: boolean; error: string | null; now: number; staleMs?: number },
): Pick<FeedHealth, "status" | "detail"> {
  const age = formatAgeMs(ts, opts.now);
  const staleMs = opts.staleMs ?? 15 * 60_000;
  if (opts.loading && !opts.hasData) return { status: "loading", detail: "loading" };
  if (opts.error && !opts.hasData && !ts) return { status: "error", detail: "error" };
  if (!opts.hasData && !ts) return { status: "waiting", detail: "waiting" };
  if (ts != null && opts.now - ts > staleMs) return { status: "stale", detail: age };
  if (opts.hasData || ts) return { status: "ok", detail: age };
  return { status: "waiting", detail: "waiting" };
}

export function buildFeedHealth(opts: {
  loading: boolean;
  lastUpdate: number | null;
  livePulseAt: number | null;
  hasEq: boolean;
  hasScales: boolean;
  hasVolc: boolean;
  error: string | null;
  /** Prefer true per-layer stamps when available. */
  feedTimestamps?: FeedTimestampInput | null;
  now?: number;
}): FeedHealth[] {
  const now = opts.now ?? Date.now();
  const ft = opts.feedTimestamps;
  const pullAge = formatAgeMs(opts.lastUpdate, now);
  const pullStale =
    opts.lastUpdate != null && now - opts.lastUpdate > 15 * 60_000;

  const eqTs = ft?.eq ?? opts.lastUpdate;
  const solarTs = ft?.solar ?? opts.lastUpdate;
  const volcTs = ft?.volc ?? opts.lastUpdate;
  const pulseTs = ft?.pulse ?? opts.livePulseAt;

  const eq = layerStatus(eqTs, {
    loading: opts.loading,
    hasData: opts.hasEq,
    error: opts.error,
    now,
  });
  const solar = layerStatus(solarTs, {
    loading: opts.loading,
    hasData: opts.hasScales,
    error: opts.error,
    now,
  });
  const volc = layerStatus(volcTs, {
    loading: opts.loading,
    hasData: opts.hasVolc,
    error: opts.error,
    now,
    staleMs: 30 * 60_000,
  });
  const pulse = layerStatus(pulseTs, {
    loading: false,
    hasData: !!pulseTs,
    error: null,
    now,
    staleMs: 5 * 60_000,
  });

  return [
    {
      id: "pull",
      label: "Pull",
      status: opts.loading
        ? "loading"
        : opts.error && !opts.lastUpdate
          ? "error"
          : opts.lastUpdate
            ? pullStale
              ? "stale"
              : "ok"
            : "waiting",
      detail: opts.loading
        ? "loading"
        : opts.error && !opts.lastUpdate
          ? "error"
          : pullAge,
    },
    {
      id: "eq",
      label: "Quakes",
      status: eq.status,
      detail: eq.detail,
    },
    {
      id: "solar",
      label: "Solar",
      status: solar.status,
      detail: solar.detail,
    },
    {
      id: "volc",
      label: "Volc",
      status: volc.status,
      detail: volc.detail,
    },
    {
      id: "pulse",
      label: "Pulse",
      status: pulseTs ? pulse.status : "waiting",
      detail: pulseTs ? pulse.detail : "idle",
    },
  ];
}
