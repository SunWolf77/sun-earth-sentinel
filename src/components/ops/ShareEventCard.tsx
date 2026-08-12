/**
 * Compact share card for a focused earthquake — no wall of URL.
 * Native share sheet when available; else copy short deep link.
 */

import { useMemo, useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";
import {
  SHARE_FOCUS_UI_ENABLED,
  shareUrlForPickedEvent,
  payloadForPickedEvent,
  shareOrCopy,
  softReplaceShareUrl,
  canWebShare,
  type ShareResult,
} from "@/lib/pwa/shareFocus";
import { useObservatory, type PickedEvent } from "@/store/observatory";

type Props = {
  event: PickedEvent;
  className?: string;
  /** Start expanded (card open) */
  defaultOpen?: boolean;
  /** Inline chip only — expands to card on click */
  compact?: boolean;
};

export function ShareEventCard({
  event,
  className = "",
  defaultOpen = false,
  compact = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, setState] = useState<"idle" | ShareResult>("idle");
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const minMag = useObservatory((s) => s.minMag);
  const mapView = useObservatory((s) => s.mapView);
  const basemapStyle = useObservatory((s) => s.basemapStyle);
  const mode = useObservatory((s) => s.mode);
  const overlays = useObservatory((s) => s.overlays);

  const url = useMemo(
    () =>
      shareUrlForPickedEvent(event, {
        nodeId: focusNodeId,
        window: timeWindow,
        minMag,
        mapView,
        basemap: basemapStyle,
        mode,
        layers: overlays,
      }),
    [
      event,
      focusNodeId,
      timeWindow,
      minMag,
      mapView,
      basemapStyle,
      mode,
      overlays,
    ],
  );

  const payload = useMemo(() => payloadForPickedEvent(event, url), [event, url]);
  const web = typeof navigator !== "undefined" && canWebShare(url, payload.title);
  const magLabel =
    event.mag != null && Number.isFinite(event.mag) ? `M${event.mag.toFixed(1)}` : "M–";
  const place = event.place || "Event";

  if (!SHARE_FOCUS_UI_ENABLED) return null;

  const run = async (preferCopy?: boolean) => {
    softReplaceShareUrl(url);
    const r = await shareOrCopy(payload.url, payload.title, {
      text: payload.text,
      preferCopy,
    });
    setState(r);
    window.setTimeout(() => setState("idle"), 2000);
  };

  if (compact && !open) {
    return (
      <button
        type="button"
        className={`ww-btn ww-btn--compact inline-flex min-h-8 items-center gap-1 text-[0.62rem] ${className}`}
        onClick={() => setOpen(true)}
        title="Share this earthquake (deep link to map focus)"
      >
        <Share2 className="h-3 w-3" aria-hidden />
        Share
      </button>
    );
  }

  return (
    <div
      className={`rounded-lg border border-primary/35 bg-panel/95 p-2.5 shadow-lg backdrop-blur ${className}`}
      role="dialog"
      aria-label="Share earthquake"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.58rem] font-semibold uppercase tracking-wide text-dim">
            Share focus
          </p>
          <p className="truncate text-[0.78rem] font-semibold text-fg">
            <span className="text-primary">{magLabel}</span>
            <span className="text-muted"> · </span>
            {place.length > 36 ? `${place.slice(0, 34)}…` : place}
          </p>
          <p className="mt-0.5 text-[0.58rem] leading-snug text-dim">
            Opens live map on this event — free observation, not a warning.
          </p>
        </div>
        {compact && (
          <button
            type="button"
            className="ww-btn ww-btn--icon ww-btn--compact shrink-0"
            aria-label="Close share card"
            onClick={() => setOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {web && (
          <button
            type="button"
            className="ww-btn min-h-9 flex-1 gap-1 text-[0.65rem] font-semibold sm:min-h-8"
            onClick={() => void run(false)}
            disabled={state !== "idle"}
          >
            {state === "shared" ? (
              <Check className="h-3.5 w-3.5 text-ok" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            {state === "shared" ? "Shared" : "Share…"}
          </button>
        )}
        <button
          type="button"
          className={`ww-btn min-h-9 flex-1 gap-1 text-[0.65rem] font-semibold sm:min-h-8 ${
            !web ? "" : "ww-btn--ghost"
          }`}
          onClick={() => void run(true)}
          disabled={state !== "idle"}
          title="Copy deep link"
        >
          {state === "copied" ? (
            <Check className="h-3.5 w-3.5 text-ok" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {state === "copied" ? "Copied" : "Copy link"}
        </button>
      </div>

      {state === "failed" && (
        <p className="mt-1 text-[0.58rem] text-danger">Could not share — try Copy link.</p>
      )}
      {state === "cancelled" && (
        <p className="mt-1 text-[0.58rem] text-dim">Share cancelled.</p>
      )}
    </div>
  );
}
