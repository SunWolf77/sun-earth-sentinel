import { useMemo, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { buildDaySheet } from "@/lib/ops/daySheet";
import { copyText } from "@/lib/pwa/shareFocus";

export function DaySheetCard() {
  const features = useObservatory((s) => s.eq?.features);
  const kp = useObservatory((s) => s.kp);
  const xray = useObservatory((s) => s.xray);
  const wind = useObservatory((s) => s.solarWind);
  const scales = useObservatory((s) => s.scales);
  const volcanoes = useObservatory((s) => s.usgsVolcAlerts);
  const resonance = useObservatory((s) => s.resonance);
  const [state, setState] = useState<"idle" | "sent" | "copied">("idle");

  const sheet = useMemo(
    () =>
      buildDaySheet({
        features,
        kp,
        xray,
        wind,
        scales,
        volcanoes,
        resonance,
      }),
    [features, kp, xray, wind, scales, volcanoes, resonance],
  );

  const share = async () => {
    const text = `${sheet.shareText}\nwolfwatch.site`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Sun Earth Sentinel", text });
        setState("sent");
        window.setTimeout(() => setState("idle"), 1600);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    const ok = await copyText(text);
    if (ok) {
      setState("copied");
      window.setTimeout(() => setState("idle"), 1600);
    }
  };

  const label = state === "sent" ? "Sent" : state === "copied" ? "Copied" : "Share";

  return (
    <section className="ww-solar-now__sheet rounded-lg border border-border bg-panel/80 px-3 py-2.5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">Day and week</h2>
          <p className="text-[0.62rem] text-dim">{sheet.stamp} · not a forecast</p>
        </div>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 text-[0.68rem] font-semibold text-fg"
        >
          {state === "idle" ? <Share2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {label}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[sheet.daily, sheet.weekly].map((block) => (
          <div key={block.label} className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-primary">{block.label}</p>
            <ul className="mt-1 space-y-0.5 text-[0.72rem] leading-snug text-muted">
              {block.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
