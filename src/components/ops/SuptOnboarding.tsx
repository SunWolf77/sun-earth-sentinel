import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useObservatory } from "@/store/observatory";

const KEY = "wolfwatch_supt_onboard_v1";

/**
 * One-shot SUPT explainer — first open of Rhythm or Solar.
 * Gaps ≠ amplitude; null is valid quiet.
 */
export function SuptOnboarding() {
  const tab = useObservatory((s) => s.tab);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tab !== "resonance" && tab !== "solar") return;
    try {
      if (localStorage.getItem(KEY) === "1") return;
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end justify-center bg-black/55 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supt-onboard-title"
    >
      <div className="w-full max-w-md rounded-xl border border-primary/35 bg-bg p-4 shadow-2xl sm:p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 id="supt-onboard-title" className="text-base font-semibold text-gold">
            SUPT in 30 seconds
          </h2>
          <button
            type="button"
            className="ww-btn ww-btn--icon ww-btn--compact"
            onClick={dismiss}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-2 text-sm text-muted">
          <li>
            <strong className="text-fg">What it measures:</strong> spacing (gaps) between events
            over time — not how big they are.
          </li>
          <li>
            <strong className="text-fg">Null is valid:</strong> quiet / no separation is a real
            reading, not a broken feed.
          </li>
          <li>
            <strong className="text-fg">Not a forecast:</strong> educational timing structure only.
            Official R/S/G and USGS remain the authority.
          </li>
          <li>
            <strong className="text-fg">Same language</strong> on Rhythm (quakes) and Solar
            (flares / CMEs / X-ray peaks).
          </li>
        </ul>
        <button
          type="button"
          className="ww-btn mt-4 w-full justify-center border-primary/40 bg-primary/15 text-primary"
          onClick={dismiss}
        >
          Got it — continue
        </button>
      </div>
    </div>
  );
}
