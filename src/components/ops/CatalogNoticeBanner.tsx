/**
 * In-app catalog notice — sourced relay, not a civil alert.
 */

import { useEffect } from "react";
import { Bell, X } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { formatRelayLine, formatRelaySub } from "@/lib/ops/catalogNotice";

export function CatalogNoticeBanner() {
  const notice = useObservatory((s) => s.lastCatalogNotice);
  const dismiss = useObservatory((s) => s.dismissCatalogNotice);
  const pickEvent = useObservatory((s) => s.pickEvent);
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const setTab = useObservatory((s) => s.setTab);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => dismiss(), 18_000);
    return () => window.clearTimeout(t);
  }, [notice, dismiss]);

  if (!notice) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-14 z-[810] flex justify-center px-3 sm:top-[4.5rem]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-[min(96vw,32rem)] items-start gap-2 rounded-lg border border-primary/35 bg-bg/95 px-2.5 py-1.5 text-[0.68rem] leading-snug text-fg shadow-lg backdrop-blur">
        <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => {
            setTab("live");
            pickEvent({
              id: notice.id,
              lat: notice.lat,
              lon: notice.lon,
              mag: notice.mag,
              place: notice.place,
              depth: notice.depth,
              time: notice.time,
              url: notice.url,
            });
            flyMapTo(notice.lat, notice.lon, 6, notice.id);
            dismiss();
          }}
        >
          <span className="block font-medium text-fg">{formatRelayLine(notice)}</span>
          <span className="block text-[0.58rem] text-dim">{formatRelaySub(notice)}</span>
        </button>
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-dim hover:text-fg"
          onClick={dismiss}
          aria-label="Dismiss catalog notice"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
