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

export type FeedHealthStatus =
  | "ok"
  | "waiting"
  | "loading"
  | "stale"
  | "error"
  | "off";

export type FeedHealth = {
  id: string;
  label: string;
  status: FeedHealthStatus;
  detail: string;
  /** Optional longer tooltip */
  hint?: string;
};

/** Per-source last success (ms). */
export type FeedTimestampInput = {
  eq: number | null;
  solar: number | null;
  volc: number | null;
  geofon?: number | null;
  jma?: number | null;
  emsc?: number | null;
  imo?: number | null;
  global?: number | null;
  pulse?: number | null;
  donki?: number | null;
  gvp?: number | null;
  boards?: number | null;
};

/** Last error message per source id (null = clear). */
export type FeedSourceErrors = Partial<
  Record<
    | "eq"
    | "jma"
    | "geofon"
    | "emsc"
    | "imo"
    | "solar"
    | "volc"
    | "boards"
    | "pulse"
    | "donki"
    | "gvp"
    | "pull",
    string | null
  >
>;

function layerStatus(
  ts: number | null | undefined,
  opts: {
    loading: boolean;
    hasData: boolean;
    error: string | null | undefined;
    now: number;
    staleMs?: number;
    off?: boolean;
  },
): Pick<FeedHealth, "status" | "detail"> {
  if (opts.off) return { status: "off", detail: "off" };
  const age = formatAgeMs(ts, opts.now);
  const staleMs = opts.staleMs ?? 15 * 60_000;
  if (opts.loading && !opts.hasData && !ts) return { status: "loading", detail: "…" };
  // Error only when we have no successful stamp / data — stale success stays ok/stale
  if (opts.error && !opts.hasData && !ts) return { status: "error", detail: "err" };
  if (opts.error && ts != null && opts.now - ts > staleMs) {
    return { status: "error", detail: age };
  }
  if (!opts.hasData && !ts) return { status: "waiting", detail: "—" };
  if (ts != null && opts.now - ts > staleMs) return { status: "stale", detail: age };
  if (opts.hasData || ts) return { status: "ok", detail: age };
  return { status: "waiting", detail: "—" };
}

/**
 * Per-source health chips for the chrome strip.
 * Prefer true layer stamps + per-source errors over a single global "lastUpdate".
 */
export function buildFeedHealth(opts: {
  loading: boolean;
  lastUpdate: number | null;
  livePulseAt: number | null;
  hasEq: boolean;
  hasScales: boolean;
  hasVolc: boolean;
  hasJma?: boolean;
  hasGeofon?: boolean;
  hasEmsc?: boolean;
  hasImo?: boolean;
  hasBoards?: boolean;
  useGeofon?: boolean;
  error: string | null;
  feedTimestamps?: FeedTimestampInput | null;
  feedErrors?: FeedSourceErrors | null;
  now?: number;
}): FeedHealth[] {
  const now = opts.now ?? Date.now();
  const ft = opts.feedTimestamps;
  const err = opts.feedErrors ?? {};

  const eqTs = ft?.eq ?? null;
  const jmaTs = ft?.jma ?? null;
  const geoTs = ft?.geofon ?? null;
  const emscTs = ft?.emsc ?? null;
  const imoTs = ft?.imo ?? null;
  const solarTs = ft?.solar ?? null;
  const volcTs = ft?.volc ?? null;
  const boardsTs = ft?.boards ?? null;
  const pulseTs = ft?.pulse ?? opts.livePulseAt;

  const pullAge = formatAgeMs(opts.lastUpdate, now);
  const pullStale = opts.lastUpdate != null && now - opts.lastUpdate > 15 * 60_000;

  const usgs = layerStatus(eqTs, {
    loading: opts.loading,
    hasData: opts.hasEq,
    error: err.eq ?? (opts.error && !eqTs ? opts.error : null),
    now,
  });
  const jma = layerStatus(jmaTs, {
    loading: opts.loading,
    hasData: !!opts.hasJma || !!jmaTs,
    error: err.jma,
    now,
    staleMs: 20 * 60_000,
  });
  const geofon = layerStatus(geoTs, {
    loading: opts.loading && !!opts.useGeofon,
    hasData: !!opts.hasGeofon || !!geoTs,
    error: err.geofon,
    now,
    off: !opts.useGeofon,
    staleMs: 20 * 60_000,
  });
  const emsc = layerStatus(emscTs, {
    loading: opts.loading,
    hasData: !!opts.hasEmsc || !!emscTs,
    error: err.emsc,
    now,
    staleMs: 20 * 60_000,
  });
  const imo = layerStatus(imoTs, {
    loading: opts.loading,
    hasData: !!opts.hasImo || !!imoTs,
    error: err.imo,
    now,
    staleMs: 20 * 60_000,
  });
  const solar = layerStatus(solarTs, {
    loading: opts.loading,
    hasData: opts.hasScales,
    error: err.solar,
    now,
  });
  const boards = layerStatus(boardsTs, {
    loading: opts.loading,
    hasData: !!opts.hasBoards || !!boardsTs,
    error: err.boards,
    now,
    staleMs: 12 * 60_000,
  });
  const volc = layerStatus(volcTs, {
    loading: opts.loading,
    hasData: opts.hasVolc,
    error: err.volc,
    now,
    staleMs: 30 * 60_000,
  });
  const pulse = layerStatus(pulseTs, {
    loading: false,
    hasData: !!pulseTs,
    error: err.pulse,
    now,
    staleMs: 5 * 60_000,
  });

  return [
    {
      id: "usgs",
      label: "USGS",
      status: usgs.status,
      detail: usgs.detail,
      hint: "USGS ComCat earthquakes",
    },
    {
      id: "jma",
      label: "JMA",
      status: jma.status,
      detail: jma.detail,
      hint: "Japan Meteorological Agency quakes",
    },
    {
      id: "emsc",
      label: "EMSC",
      status: emsc.status,
      detail: emsc.detail,
      hint: "EMSC SeismicPortal · Europe/Med + regional agencies",
    },
    {
      id: "imo",
      label: "IMO",
      status: imo.status,
      detail: imo.detail,
      hint: "Iceland Met Office · dense national catalog + volcanoes",
    },
    {
      id: "geofon",
      label: "GEOFON",
      status: geofon.status,
      detail: geofon.detail,
      hint: opts.useGeofon
        ? "GFZ GEOFON (enabled)"
        : "GFZ GEOFON (toggle off in filters)",
    },
    {
      id: "swpc",
      label: "SWPC",
      status: solar.status,
      detail: solar.detail,
      hint: "NOAA SWPC solar / scales / wind",
    },
    {
      id: "boards",
      label: "Nodes",
      status: boards.status,
      detail: boards.detail,
      hint: "Published boards: Tonga · Campi · Japan · Kamchatka · Iceland",
    },
    {
      id: "volc",
      label: "Volc",
      status: volc.status,
      detail: volc.detail,
      hint: "Elevated volcano alerts (USGS HANS + partners)",
    },
    {
      id: "pulse",
      label: "Pulse",
      status: pulseTs ? pulse.status : "waiting",
      detail: pulseTs ? pulse.detail : "idle",
      hint: "Realtime USGS hour pulse",
    },
    {
      id: "pull",
      label: "Pull",
      status: opts.loading
        ? "loading"
        : err.pull || (opts.error && !opts.lastUpdate)
          ? "error"
          : opts.lastUpdate
            ? pullStale
              ? "stale"
              : "ok"
            : "waiting",
      detail: opts.loading
        ? "…"
        : err.pull || (opts.error && !opts.lastUpdate)
          ? "err"
          : pullAge,
      hint: "Last full catalog refresh",
    },
  ];
}

export function healthToneClass(status: FeedHealthStatus): string {
  switch (status) {
    case "ok":
      return "border-ok/30 bg-ok/10 text-ok";
    case "loading":
      return "border-primary/30 bg-primary/10 text-primary";
    case "stale":
      return "border-warn/30 bg-warn/10 text-warn";
    case "error":
      return "border-danger/30 bg-danger/10 text-danger";
    case "off":
      return "border-border/50 bg-panel/50 text-dim opacity-70";
    default:
      return "border-border bg-panel text-dim";
  }
}

/** Serializable snapshot for clipboard / `window.__SES_FEEDS()`. */
export type FeedHealthSnapshot = {
  at: string;
  ua?: string;
  loading: boolean;
  error: string | null;
  sources: Array<{
    id: string;
    label: string;
    status: FeedHealthStatus;
    detail: string;
    err: string | null;
  }>;
  timestamps: FeedTimestampInput | null;
  errors: FeedSourceErrors | null;
  counts?: {
    eq?: number;
    volc?: number;
  };
};

export function buildFeedHealthSnapshot(opts: {
  loading: boolean;
  lastUpdate: number | null;
  livePulseAt: number | null;
  hasEq: boolean;
  hasScales: boolean;
  hasVolc: boolean;
  hasJma?: boolean;
  hasGeofon?: boolean;
  hasBoards?: boolean;
  useGeofon?: boolean;
  error: string | null;
  feedTimestamps?: FeedTimestampInput | null;
  feedErrors?: FeedSourceErrors | null;
  eqCount?: number;
  volcCount?: number;
  now?: number;
}): FeedHealthSnapshot {
  const now = opts.now ?? Date.now();
  const rows = buildFeedHealth({ ...opts, now });
  const errMap = opts.feedErrors ?? {};
  const errFor = (id: string): string | null => {
    const key =
      id === "usgs" ? "eq" : id === "swpc" ? "solar" : id === "boards" ? "boards" : id;
    return (errMap as Record<string, string | null>)[key] ?? null;
  };
  return {
    at: new Date(now).toISOString(),
    ua: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    loading: opts.loading,
    error: opts.error,
    sources: rows.map((r) => ({
      id: r.id,
      label: r.label,
      status: r.status,
      detail: r.detail,
      err: errFor(r.id),
    })),
    timestamps: opts.feedTimestamps ?? null,
    errors: opts.feedErrors ?? null,
    counts: {
      eq: opts.eqCount,
      volc: opts.volcCount,
    },
  };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
