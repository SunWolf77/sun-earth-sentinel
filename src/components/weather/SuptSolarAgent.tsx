import { useMemo, useState } from "react";
import type { SolarAssessment } from "@/lib/solar/suptInterpreter";
import { Bot, ChevronDown, ChevronRight, Sparkles } from "lucide-react";

export function SuptSolarAgent({ assessment }: { assessment: SolarAssessment }) {
  const [openTech, setOpenTech] = useState(false);
  const a = assessment;
  const attnColor =
    a.attention >= 70
      ? "text-danger"
      : a.attention >= 45
        ? "text-warn"
        : a.attention >= 25
          ? "text-gold"
          : "text-ok";

  const channelRows = useMemo(() => a.channels, [a.channels]);

  return (
    <section className="rounded-xl border border-accent/35 bg-gradient-to-b from-accent/10 to-panel p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Bot className="h-4 w-4" />
            Timing read
          </h3>
          <p className="mt-0.5 text-[0.68rem] text-dim">
            Deterministic flare/CME spacing · not an LLM
          </p>
        </div>
        <div className="text-right">
          <div className="text-[0.62rem] uppercase tracking-wider text-dim">Attention</div>
          <div className={`font-mono text-2xl font-bold tabular-nums ${attnColor}`}>
            {a.attention}
            <span className="text-sm text-dim">/100</span>
          </div>
        </div>
      </div>

      <p className="rounded-lg border border-border/80 bg-bg/50 px-3 py-2 text-sm font-medium leading-snug text-fg">
        <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-accent" />
        {a.headline}
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <AgentCol title="Observes" items={a.observations} />
        <AgentCol title="Interprets" items={a.interpretation} />
        <AgentCol title="Watch" items={a.watchItems} accent />
      </div>

      {/* Channel probes */}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {channelRows.map((ch) => (
          <div
            key={ch.id}
            className="rounded-lg border border-border bg-bg/40 px-2.5 py-2 text-xs"
          >
            <div className="text-[0.65rem] font-medium text-primary">{ch.label}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2 font-mono text-fg">
              <span>
                d=
                {ch.score.d_ij != null ? ch.score.d_ij.toFixed(3) : "—"}
              </span>
              <span className="text-dim">
                {ch.score.band}
                {ch.score.separated ? " · sep" : " · null"}
              </span>
            </div>
            <p className="mt-1 text-[0.65rem] leading-snug text-muted">{ch.plain}</p>
            <p className="mt-0.5 text-[0.6rem] text-dim">
              n={ch.score.n} gaps · {ch.nEvents} events
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[0.68rem] leading-relaxed text-dim">{a.enlilNote}</p>

      <button
        type="button"
        onClick={() => setOpenTech((v) => !v)}
        className="mt-2 flex min-h-9 w-full items-center gap-1 text-left text-[0.68rem] font-medium text-primary"
        aria-expanded={openTech}
      >
        {openTech ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Method & caveats
      </button>
      {openTech && (
        <ul className="mt-1 space-y-1 border-t border-border/60 pt-2 text-[0.65rem] leading-relaxed text-dim">
          <li>
            Inputs: NOAA R/S/G + L1 wind + GOES X-ray + protons + DONKI flares/CMEs + ENLIL frame
            tag. Timing score uses gaps between flares, CMEs, and X-ray peaks — not X-ray class size.
          </li>
          {a.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
          <li className="text-dim">
            Generated {new Date(a.generatedAt).toLocaleTimeString()} local · re-runs on each data
            refresh.
          </li>
        </ul>
      )}
    </section>
  );
}

function AgentCol({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        accent ? "border-gold/30 bg-gold/5" : "border-border/80 bg-bg/30"
      }`}
    >
      <h4 className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
        {title}
      </h4>
      <ul className="space-y-1.5 text-[0.72rem] leading-snug text-muted">
        {items.map((t, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/80" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
