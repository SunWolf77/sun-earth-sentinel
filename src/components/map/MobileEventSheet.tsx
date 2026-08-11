/**
 * Mobile event detail — bottom sheet above the tool dock.
 * Replaces fighting the floating map controls for attention.
 */

import { ExternalLink, List, X } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { magColor } from "@/lib/feeds/usgs";
import { ShareEventCard } from "@/components/ops/ShareEventCard";

function formatUtc(t: number | null | undefined): string {
  if (t == null || !Number.isFinite(t)) return "—";
  try {
    return new Date(t).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return "—";
  }
}

export function MobileEventSheet() {
  const pickedEvent = useObservatory((s) => s.pickedEvent);
  const pickEvent = useObservatory((s) => s.pickEvent);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);
  const mobileSheet = useObservatory((s) => s.mobileSheet);

  if (!pickedEvent || mobileSheet !== "event") return null;

  const mag = pickedEvent.mag ?? 0;
  const color = magColor(mag);

  const close = () => {
    setMobileSheet("closed");
    pickEvent(null);
  };

  return (
    <div
      className="ww-mobile-event-sheet pointer-events-auto absolute inset-x-0 bottom-[3.6rem] z-[580] mx-auto w-full max-w-lg px-1.5 pb-[max(0.15rem,env(safe-area-inset-bottom))] sm:hidden"
      role="dialog"
      aria-label="Selected earthquake"
    >
      <div className="overflow-hidden rounded-xl border border-border bg-bg/96 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-2 border-b border-border/70 px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-lg font-bold tabular-nums" style={{ color }}>
                M{mag.toFixed(1)}
              </span>
              <span className="line-clamp-2 text-[0.8rem] font-semibold text-fg">
                {pickedEvent.place}
              </span>
            </div>
            <p className="mt-0.5 text-[0.62rem] text-muted">
              {pickedEvent.depth.toFixed(0)} km · {pickedEvent.lat.toFixed(2)}°,{" "}
              {pickedEvent.lon.toFixed(2)}°
            </p>
            <p className="text-[0.58rem] text-dim">{formatUtc(pickedEvent.time)}</p>
          </div>
          <button
            type="button"
            className="ww-btn ww-btn--icon ww-btn--compact shrink-0"
            onClick={close}
            aria-label="Close event"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
          {pickedEvent.url && (
            <a
              href={pickedEvent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/35 bg-primary/10 px-2.5 text-[0.68rem] font-semibold text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Agency page
            </a>
          )}
          <ShareEventCard event={pickedEvent} compact className="min-h-9" />
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-[0.68rem] font-semibold text-muted"
            onClick={() => setMobileSheet("events")}
          >
            <List className="h-3.5 w-3.5" />
            Event list
          </button>
        </div>
      </div>
    </div>
  );
}
