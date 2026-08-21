import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useObservatory } from "@/store/observatory";

const KEY = "wolfwatch_supt_onboard_v2";

/**
 * First open of Rhythm or Solar — one quiet strip. Not a modal over the map.
 */
export function SuptOnboarding() {
  const tab = useObservatory((s) => s.tab);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tab !== "resonance" && tab !== "solar") return;
    try {
      if (localStorage.getItem(KEY) === "1") return;
      if (localStorage.getItem("wolfwatch_supt_onboard_v1") === "1") {
        localStorage.setItem(KEY, "1");
        return;
      }
    } catch {
      /* */
    }
    setOpen(true);
  }, [tab]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* */
    }
  };

  if (!open || (tab !== "resonance" && tab !== "solar")) return null;

  return (
    <div
      className="flex shrink-0 items-start gap-2 border-b border-border/80 bg-panel/80 px-3 py-1.5 text-[0.68rem] leading-snug text-muted sm:px-4"
      role="status"
    >
      <p className="min-w-0 flex-1">
        <strong className="text-fg">Timing</strong> = how evenly events are spaced — not size.
        Quiet is a real status. Not a forecast.
      </p>
      <button
        type="button"
        className="ww-btn ww-btn--icon ww-btn--compact shrink-0"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
