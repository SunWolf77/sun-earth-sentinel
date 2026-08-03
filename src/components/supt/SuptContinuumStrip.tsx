import { useMemo, useState } from "react";
import { useObservatory } from "@/store/observatory";
import { buildContinuum, TONE_CLASS } from "@/lib/supt/continuum";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { AttentionSparkline } from "@/components/ops/AttentionSparkline";
import { Activity, ChevronDown, ChevronRight, Sparkles } from "lucide-react";

/**
 * Shared Earth + solar timing strip — plain language; method under disclosure.
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
  const [showMethod, setShowMethod] = useState(false);

  const snap = useMemo(
    () => buildContinuum({ seismic: resonance, solar }),
    [resonance, solar],
  );

  if (compact || mobile) {
    return (
      <div className="rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-2">
        <div className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
          <Activity className="h-3 w-3" />
          Timing overview
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
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Activity className="h-4 w-4" />
            Timing overview
          </h3>
          <p className="mt-0.5 text-[0.68rem] text-dim">
            Event spacing · Earth + solar · not size · not a forecast
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

      <button
        type="button"
        className="mt-2 inline-flex min-h-8 items-center gap-1 text-[0.62rem] font-medium text-dim hover:text-primary"
        onClick={() => setShowMethod((v) => !v)}
        aria-expanded={showMethod}
      >
        {showMethod ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        Method & credit
      </button>
      {showMethod && (
        <p className="mt-1 rounded-md border border-border/70 bg-bg/50 px-2.5 py-2 text-[0.65rem] leading-relaxed text-muted">
          <Sparkles className="mb-0.5 mr-1 inline h-3 w-3 text-accent" />
          Technical method: <strong className="text-fg">SUPT continuum</strong> (Sheppard) — the
          same fixed spacing probe on ordered gaps for quakes and solar channels. Open Rhythm or
          Solar → “Technical detail” for symbols (d, z, bands).
        </p>
      )}
    </section>
  );
}
