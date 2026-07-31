import { ExternalLink, Layers2, X } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { formatMmi } from "@/lib/seismology/shakemap";

/** Chip over the map when focused-node MMI contours are loaded / loading / failed. */
export function MmiFocusBanner() {
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const mmi = useObservatory((s) => s.focusMmi);
  const dismissFocusMmi = useObservatory((s) => s.dismissFocusMmi);
  const overlays = useObservatory((s) => s.overlays);

  if (!focusNodeId || !overlays.mmiContours) return null;
  if (!mmi.status || mmi.status === "idle") return null;

  if (mmi.status === "loading") {
    return (
      <div className="pointer-events-none absolute bottom-16 left-1/2 z-[460] w-[min(96%,22rem)] -translate-x-1/2 sm:bottom-20">
        <div className="rounded-lg border border-primary/30 bg-bg/95 px-3 py-2 text-center text-[0.7rem] text-primary shadow-lg backdrop-blur">
          Loading USGS MMI contours for focused node…
        </div>
      </div>
    );
  }

  if (mmi.status === "empty") {
    return (
      <div className="pointer-events-auto absolute bottom-16 left-1/2 z-[460] w-[min(96%,24rem)] -translate-x-1/2 sm:bottom-20">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-bg/95 px-3 py-2 text-[0.7rem] text-dim shadow-lg backdrop-blur">
          <Layers2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dim" />
          <span className="flex-1">
            No USGS ShakeMap MMI contours for a strong event in this focus box yet.
          </span>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 hover:bg-elevated"
            onClick={() => dismissFocusMmi()}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (mmi.status === "error") {
    return (
      <div className="pointer-events-auto absolute bottom-16 left-1/2 z-[460] w-[min(96%,24rem)] -translate-x-1/2 sm:bottom-20">
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[0.7rem] text-danger/90 shadow-lg backdrop-blur">
          <span className="flex-1">MMI overlay failed: {mmi.error ?? "unknown"}</span>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 hover:bg-elevated"
            onClick={() => dismissFocusMmi()}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ready
  const mag =
    mmi.mag != null ? `M${mmi.mag.toFixed(1)}` : "Event";
  const place = mmi.place ?? "focused event";

  return (
    <div className="pointer-events-auto absolute bottom-16 left-1/2 z-[460] w-[min(96%,26rem)] -translate-x-1/2 sm:bottom-20">
      <div className="flex items-start gap-2 rounded-lg border border-warn/40 bg-bg/95 px-3 py-2 shadow-lg backdrop-blur">
        <Layers2 className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
        <div className="min-w-0 flex-1 text-[0.7rem] leading-snug">
          <div className="font-semibold text-fg">
            MMI contours · {mag}
            {mmi.mmi != null ? (
              <span className="font-normal text-warn"> · max ~{formatMmi(mmi.mmi)}</span>
            ) : null}
          </div>
          <div className="truncate text-dim">{place}</div>
          <div className="mt-0.5 text-[0.62rem] text-dim">
            Official USGS cont_mmi.json · single focused event only
          </div>
          {mmi.shakeMapUrl && (
            <a
              href={mmi.shakeMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              Full USGS ShakeMap
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-dim hover:bg-elevated hover:text-fg"
          onClick={() => dismissFocusMmi()}
          aria-label="Hide MMI contours"
          title="Hide MMI contours"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
