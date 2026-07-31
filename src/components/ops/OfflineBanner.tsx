import { WifiOff, RefreshCw } from "lucide-react";
import { useObservatory } from "@/store/observatory";

/** Shown when last refresh failed but we still have cached ops data. */
export function OfflineBanner() {
  const error = useObservatory((s) => s.error);
  const scales = useObservatory((s) => s.scales);
  const eq = useObservatory((s) => s.eq);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const refresh = useObservatory((s) => s.refresh);
  const loading = useObservatory((s) => s.loading);

  if (!error) return null;
  const hasCache = Boolean(scales || eq?.features?.length);
  if (!hasCache) return null;

  const age =
    lastUpdate != null
      ? Math.round((Date.now() - lastUpdate) / 60_000)
      : null;

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b border-warn/40 bg-warn/10 px-3 py-1.5 text-xs text-warn sm:px-4"
      role="status"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 text-fg/90">
        <strong className="text-warn">Offline / feed error</strong>
        {" — "}
        showing last known data
        {age != null ? ` (~${age}m old)` : ""}. Live scales may be stale.
      </span>
      <button
        type="button"
        className="ww-btn min-h-8 px-2 text-[0.65rem]"
        disabled={loading}
        onClick={() => void refresh(true)}
      >
        <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        Retry
      </button>
    </div>
  );
}
