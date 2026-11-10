/**
 * In-app eruption relay — agency RED / WARNING, not a civil alert.
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import { useObservatory } from "@/store/observatory";

export function EruptionNoticeBanner() {
  const notice = useObservatory((s) => s.lastEruptionNotice);
  const dismiss = useObservatory((s) => s.dismissEruptionNotice);
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const setTab = useObservatory((s) => s.setTab);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => dismiss(), 20_000);
    return () => window.clearTimeout(t);
  }, [notice, dismiss]);

  if (!notice) return null;

  const level = [notice.color, notice.level].filter(Boolean).join(" / ");

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-14 z-[820] flex justify-center px-3 sm:top-[4.5rem]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-[min(96vw,32rem)] items-start gap-2 rounded-lg border border-warn/40 bg-bg/95 px-2.5 py-1.5 text-[0.68rem] leading-snug text-fg shadow-lg backdrop-blur">
        <span className="mt-0.5 text-[0.9rem] leading-none" aria-hidden>
          🌋
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => {
            setTab("live");
            flyMapTo(notice.lat, notice.lon, 6, notice.id);
            dismiss();
          }}
        >
          <span className="block font-medium text-fg">
            Eruption · {notice.name}
          </span>
          <span className="block text-[0.58rem] text-dim">
            {notice.agency} {level} · relay, not a civil alert
          </span>
        </button>
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-dim hover:text-fg"
          onClick={dismiss}
          aria-label="Dismiss eruption notice"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
