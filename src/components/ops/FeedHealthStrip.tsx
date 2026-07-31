import { useMemo, useState, useEffect } from "react";
import { useObservatory } from "@/store/observatory";
import { buildFeedHealth } from "@/lib/ops/feedHealth";

/** Compact per-domain pull ages — honest waiting/loading, never bare dashes. */
export function FeedHealthStrip({ compact = false }: { compact?: boolean }) {
  const loading = useObservatory((s) => s.loading);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const livePulseAt = useObservatory((s) => s.livePulseAt);
  const eq = useObservatory((s) => s.eq);
  const scales = useObservatory((s) => s.scales);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const error = useObservatory((s) => s.error);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    void tick;
    return buildFeedHealth({
      loading,
      lastUpdate,
      livePulseAt,
      hasEq: !!(eq?.features?.length),
      hasScales: !!scales,
      hasVolc: usgsVolcAlerts.length > 0 || !!(eq && lastUpdate),
      error,
    });
  }, [tick, loading, lastUpdate, livePulseAt, eq, scales, usgsVolcAlerts.length, error]);

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${compact ? "text-[0.55rem]" : "text-[0.6rem]"}`}
      aria-label="Feed health"
    >
      {rows.map((r) => (
        <span
          key={r.id}
          title={`${r.label}: ${r.detail}`}
          className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono ${
            r.status === "ok"
              ? "border-ok/30 bg-ok/10 text-ok"
              : r.status === "loading"
                ? "border-primary/30 bg-primary/10 text-primary"
                : r.status === "stale"
                  ? "border-warn/30 bg-warn/10 text-warn"
                  : r.status === "error"
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : "border-border bg-panel text-dim"
          }`}
        >
          <span className="font-semibold opacity-80">{r.label}</span>
          <span>{r.detail}</span>
        </span>
      ))}
    </div>
  );
}
