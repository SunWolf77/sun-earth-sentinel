import { useMemo } from "react";
import { useObservatory } from "@/store/observatory";
import { buildContinuum, TONE_CLASS } from "@/lib/supt/continuum";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { AttentionSparkline } from "@/components/ops/AttentionSparkline";
import { Sparkles } from "lucide-react";

/**
 * Shared SUPT continuum — uses store-cached solar assessment (no re-probe).
 */
export function SuptContinuumStrip({
  compact = false,
  showNav = true,
}: {
  compact?: boolean;
  showNav?: boolean;
}) {
  const resonance = useObservatory((s) => s.resonance);
  const solar = useObservatory((s) => s.solarAssessment);
  const setTab = useObservatory((s) => s.setTab);
  const mobile = useIsMobile();

  const snap = useMemo(
    () => buildContinuum({ seismic: resonance, solar }),
    [resonance, solar],
  );

  if (compact || mobile) {
    return (
      <div className="rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-2">
        <div className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
          <Sparkles className="h-3 w-3" />
          SUPT continuum
        </div>
        <p className="text-[0.72rem] font-medium leading-snug text-fg">{snap.headline}</p>
        <AttentionSparkline height={22} className="mt-1.5" />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {snap.domains.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setTab(d.id === "solar" ? "solar" : "resonance")}
              className={`rounded-md border px-1.5 py-0.5 text-[0.62rem] ${TONE_CLASS[d.tone]}`}
            >
              {d.label}: {d.metric}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-accent/30 bg-gradient-to-b from-accent/10 to-panel p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Sparkles className="h-4 w-4" />
            SUPT continuum
          </h3>
          <p className="mt-0.5 text-[0.68rem] text-dim">
            Same probe · solar + seismic · null is valid · not a forecast
          </p>
        </div>
        {showNav && (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className="ww-btn min-h-9 text-[0.68rem]"
              onClick={() => setTab("solar")}
            >
              Solar
            </button>
            <button
              type="button"
              className="ww-btn min-h-9 text-[0.68rem]"
              onClick={() => setTab("resonance")}
            >
              Rhythm
            </button>
          </div>
        )}
      </div>

      <p className="text-sm font-medium leading-snug text-fg">{snap.headline}</p>
      <p className="mt-1 text-[0.72rem] leading-relaxed text-muted">{snap.plain}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {snap.domains.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setTab(d.id === "solar" ? "solar" : "resonance")}
            className={`rounded-lg border px-3 py-2.5 text-left transition hover:brightness-110 ${TONE_CLASS[d.tone]}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide opacity-90">
                {d.label}
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-fg">
                {d.metric}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-fg">{d.status}</p>
            <p className="mt-0.5 text-[0.65rem] text-dim">{d.detail}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
