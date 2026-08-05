import { useMemo, useState, useEffect } from "react";
import { useObservatory } from "@/store/observatory";
import { buildFeedHealth, healthToneClass } from "@/lib/ops/feedHealth";

/**
 * Per-source feed health strip — USGS / JMA / GEOFON / SWPC / Nodes / Volc / Pulse.
 * Ages update every 10s; error/stale/off tones are honest (not a single global pull).
 */
export function FeedHealthStrip({
  compact = false,
  hideOff = true,
}: {
  compact?: boolean;
  hideOff?: boolean;
}) {
  const loading = useObservatory((s) => s.loading);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const livePulseAt = useObservatory((s) => s.livePulseAt);
  const feedTimestamps = useObservatory((s) => s.feedTimestamps);
  const feedErrors = useObservatory((s) => s.feedErrors);
  const eq = useObservatory((s) => s.eq);
  const scales = useObservatory((s) => s.scales);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const useGeofon = useObservatory((s) => s.useGeofon);
  const error = useObservatory((s) => s.error);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    void tick;
    const feats = eq?.features ?? [];
    const hasJma =
      !!feedTimestamps.jma ||
      feats.some((f) => String(f.id ?? "").startsWith("jma-"));
    const hasBoards =
      !!feedTimestamps.boards ||
      feats.some((f) => {
        const id = String(f.id ?? "");
        return id.startsWith("gossip-") || id.startsWith("usgs-us");
      });

    return buildFeedHealth({
      loading,
      lastUpdate,
      livePulseAt,
      hasEq: feats.length > 0,
      hasScales: !!scales,
      hasVolc: usgsVolcAlerts.length > 0,
      hasJma,
      hasGeofon: !!feedTimestamps.geofon,
      hasBoards,
      useGeofon,
      error,
      feedTimestamps,
      feedErrors,
    });
  }, [
    tick,
    loading,
    lastUpdate,
    livePulseAt,
    eq,
    scales,
    usgsVolcAlerts.length,
    useGeofon,
    error,
    feedTimestamps,
    feedErrors,
  ]);

  const visible = hideOff ? rows.filter((r) => r.status !== "off") : rows;
  const bad = visible.filter((r) => r.status === "error" || r.status === "stale");
  const summaryTone =
    bad.some((r) => r.status === "error")
      ? "error"
      : bad.some((r) => r.status === "stale")
        ? "stale"
        : loading
          ? "loading"
          : "ok";

  const errFor = (id: string): string | null => {
    if (!feedErrors) return null;
    const key =
      id === "usgs" ? "eq" : id === "swpc" ? "solar" : id === "boards" ? "boards" : id;
    return (feedErrors as Record<string, string | null>)[key] ?? null;
  };

  return (
    <div
      className={`ww-feed-health ${compact ? "text-[0.55rem]" : "text-[0.6rem]"}`}
      aria-label="Feed health — per source"
    >
      <button
        type="button"
        className={`mb-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono sm:hidden ${healthToneClass(summaryTone)}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Toggle per-source feed ages"
      >
        <span className="font-semibold">Feeds</span>
        <span>
          {bad.length
            ? `${bad.length} issue${bad.length > 1 ? "s" : ""}`
            : loading
              ? "updating…"
              : "ok"}
        </span>
        <span className="opacity-70">{open ? "▾" : "▸"}</span>
      </button>

      <div
        className={`flex flex-wrap items-center gap-1 ${
          open ? "flex" : "hidden sm:flex"
        }`}
      >
        {visible.map((r) => {
          const err = errFor(r.id);
          const title = [
            r.hint || r.label,
            `Last ok: ${r.detail}`,
            err ? `Error: ${err}` : null,
            r.status === "stale" ? "Stale — last good data still shown" : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <span
              key={r.id}
              title={title}
              className={`inline-flex max-w-full items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono ${healthToneClass(r.status)}`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  r.status === "ok"
                    ? "bg-ok"
                    : r.status === "loading"
                      ? "bg-primary animate-pulse"
                      : r.status === "stale"
                        ? "bg-warn"
                        : r.status === "error"
                          ? "bg-danger"
                          : "bg-dim"
                }`}
                aria-hidden
              />
              <span className="font-semibold opacity-90">{r.label}</span>
              <span className="tabular-nums opacity-90">{r.detail}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
