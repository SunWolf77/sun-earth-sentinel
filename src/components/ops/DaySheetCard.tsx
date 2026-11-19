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
  const flares = useObservatory((s) => s.donki?.flares);
  const cmes = useObservatory((s) => s.donki?.cmes);
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
        flares,
        cmes,
        resonance,
      }),
    [features, kp, xray, wind, scales, volcanoes, flares, cmes, resonance],
  );

  const brief = sheet.shareText;

  const share = async () => {
    const text = brief;
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
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">Day and week</h2>
          <p className="text-[0.62rem] text-dim">Not a forecast</p>
        </div>
        <div className="grid grid-cols-4 gap-1 sm:flex sm:shrink-0">
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(brief)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Post the brief to X"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-bg px-2 text-[0.68rem] font-semibold text-fg"
          >
            X
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(brief)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Send the brief on WhatsApp"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-bg px-2 text-[0.68rem] font-semibold text-fg"
          >
            WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?text=${encodeURIComponent(brief)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Send the brief on Telegram"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-bg px-2 text-[0.68rem] font-semibold text-fg"
          >
            Telegram
          </a>
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border bg-bg px-2 text-[0.68rem] font-semibold text-fg"
          >
            {state === "idle" ? <Share2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {label}
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[sheet.daily, sheet.weekly].map((block) => (
          <div key={block.label} className="min-w-0 border-t border-border/70 pt-2 first:border-t-0 first:pt-0 sm:border-t-0 sm:pt-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-primary">{block.label}</p>
            <p className="text-[0.62rem] text-dim">{block.window}</p>
            <dl className="mt-1.5 space-y-1">
              {block.rows.map((row) => (
                <div key={row.key} className="grid grid-cols-[4.4rem_minmax(0,1fr)] gap-x-2 text-[0.72rem] leading-snug">
                  <dt className="text-dim">{row.key}</dt>
                  <dd className="min-w-0 break-words text-muted">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
