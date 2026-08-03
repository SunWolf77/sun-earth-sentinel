import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useObservatory } from "@/store/observatory";

const KEY = "wolfwatch_supt_onboard_v2";

/**
 * First open of Rhythm or Solar — plain language; method credit optional.
 */
export function SuptOnboarding() {
  const tab = useObservatory((s) => s.tab);
  const [open, setOpen] = useState(false);
  const [showMethod, setShowMethod] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tab !== "resonance" && tab !== "solar") return;
    try {
      if (localStorage.getItem(KEY) === "1") return;
      // migrate old dismiss
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end justify-center bg-black/55 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timing-onboard-title"
    >
      <div className="w-full max-w-md rounded-xl border border-primary/35 bg-bg p-4 shadow-2xl sm:p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 id="timing-onboard-title" className="text-base font-semibold text-fg">
            Timing patterns in 20 seconds
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
            <strong className="text-fg">What you see:</strong> how evenly events are spaced in time —
            clustered, mixed, even, or quiet — not how large they are.
          </li>
          <li>
            <strong className="text-fg">Quiet is OK:</strong> ordinary or empty spacing is a real
            status (the feed is fine). It is not “all clear.”
          </li>
          <li>
            <strong className="text-fg">Not a forecast:</strong> pattern view only. USGS, NOAA, and
            local agencies stay authoritative for alerts.
          </li>
          <li>
            <strong className="text-fg">Same idea</strong> on Rhythm (quakes) and Solar (flares /
            CMEs / X-ray peaks).
          </li>
        </ul>

        <button
          type="button"
          className="mt-3 text-left text-[0.68rem] font-medium text-primary hover:underline"
          onClick={() => setShowMethod((v) => !v)}
          aria-expanded={showMethod}
        >
          {showMethod ? "Hide method name" : "What’s the method called?"}
        </button>
        {showMethod && (
          <p className="mt-1.5 rounded-md border border-border bg-panel px-2.5 py-2 text-[0.72rem] leading-snug text-muted">
            Advanced name: <strong className="text-fg">SUPT</strong> (Sheppard’s Universal Proxy
            Theory) — a fixed spacing probe on inter-event gaps. Full symbols (d, z, bands) are under
            “Technical detail” when you want them.
          </p>
        )}

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
