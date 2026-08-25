import { useMemo, useState, type ReactNode } from "react";
import { useObservatory, filteredEq } from "@/store/observatory";
import {
  bandPlainLabel,
  resonanceScore,
  resonanceVerdict,
  readingSummaryTech,
} from "@/lib/supt/probe";
import {
  etasWhitenResiduals,
  interpretEtasControl,
  OMORI_CONTROL,
} from "@/lib/supt/etasWhiten";
import { ChevronDown, ChevronRight, RefreshCw, Sun, Map as MapIcon } from "lucide-react";
import { XHandle } from "@/components/ui/XProfileLink";
import { SuptContinuumStrip } from "@/components/supt/SuptContinuumStrip";
import { SuptMathSection } from "@/components/supt/SuptMathSection";
import { LunarSkyCard } from "@/components/resonance/LunarSkyCard";
import { WaveformHarmonicDesk } from "@/components/resonance/WaveformHarmonicDesk";
import { WatchZoneStrip } from "@/components/ops/WatchZoneStrip";

const TONE_CLASS = {
  none: "border-border bg-panel",
  chance: "border-primary/30 bg-primary/5",
  ordered: "border-gold/40 bg-gold/10",
  mixed: "border-warn/35 bg-warn/10",
  sparse: "border-border bg-elevated/40",
  null: "border-border bg-panel",
} as const;

function Folder({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 w-full items-center gap-2 text-left"
        aria-expanded={open}
        aria-controls={id}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-dim" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-dim" />
        )}
        <div className="min-w-0">
          <h3 className="text-xs font-medium uppercase tracking-wider text-primary">{title}</h3>
          <p className="text-[0.65rem] text-dim">{hint}</p>
        </div>
      </button>
      {open && (
        <div id={id} className="mt-3 space-y-3 border-t border-border/60 pt-3">
          {children}
        </div>
      )}
    </section>
  );
}

export function ResonancePanel() {
  const resonance = useObservatory((s) => s.resonance);
  const reading = useObservatory((s) => s.reading);
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const refresh = useObservatory((s) => s.refresh);
  const loading = useObservatory((s) => s.loading);
  const setTab = useObservatory((s) => s.setTab);
  const mode = useObservatory((s) => s.mode);
  const [how, setHow] = useState(false);

  const verdict = resonanceVerdict(resonance);
  const techLine = resonance ? readingSummaryTech(resonance) : "";

  const etasControl = useMemo(() => {
    const feats = filteredEq(eq?.features, minMag, maxMag);
    const events = feats
      .map((f) => ({
        tMs: f.properties.time ?? 0,
        mag: f.properties.mag ?? minMag,
      }))
      .filter((e) => e.tMs > 0);
    const wh = etasWhitenResiduals(events);
    const raw = {
      d_ij: resonance?.d_ij ?? null,
      separated: resonance?.separated ?? false,
    };
    if (!wh.ok) {
      return {
        ...interpretEtasControl(raw, { d_ij: null, separated: false }, {
          forceInsufficient: true,
          reason: wh.reason,
          note: wh.note,
        }),
        n: wh.nEvents,
        reason: wh.reason,
      };
    }
    const whiteScore = resonanceScore(wh.residualGaps, mode === "full" ? 80 : 60);
    const white = {
      d_ij: whiteScore.d_ij,
      separated: whiteScore.separated,
    };
    if (whiteScore.d_ij == null) {
      return {
        ...interpretEtasControl(raw, white, {
          forceInsufficient: true,
          reason: "probe-null",
          note: "Insufficient — whitened probe null after residual transform.",
        }),
        n: wh.nEvents,
        reason: "probe-null" as const,
        whiteScore,
      };
    }
    const readingEtas = interpretEtasControl(raw, white);
    return { ...readingEtas, n: wh.nEvents, reason: readingEtas.reason, whiteScore };
  }, [eq?.features, minMag, maxMag, resonance, mode]);

  const windowLabel =
    timeWindow === "hour"
      ? "past hour"
      : timeWindow === "day"
        ? "past day"
        : timeWindow === "week"
          ? "past week"
          : "past month";

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-6">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-accent sm:text-xl">Timing</h2>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Gaps between quakes · {windowLabel} · not size · not a forecast
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setTab("solar")}
            className="ww-btn min-h-10 px-2.5 text-[0.7rem]"
          >
            <Sun className="h-3.5 w-3.5" />
            Solar
          </button>
          <button
            type="button"
            onClick={() => setTab("live")}
            className="ww-btn ww-btn--ghost min-h-10 px-2.5 text-[0.7rem]"
          >
            <MapIcon className="h-3.5 w-3.5" />
            Map
          </button>
        </div>
      </header>

      <div className={`rounded-xl border p-4 text-center sm:p-5 ${TONE_CLASS[verdict.tone]}`}>
        <p className="text-lg font-semibold leading-snug text-fg sm:text-2xl">{verdict.title}</p>
        {resonance?.band && resonance.band !== "N/A" && (
          <p className="mt-1 text-xs text-muted sm:text-sm">
            {resonance.separated
              ? bandPlainLabel(resonance.band)
              : "Looks like random spacing"}
          </p>
        )}
        <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted sm:text-sm">
          {reading || "Load live data to get a reading."}
        </p>

        <dl className="mx-auto mt-3 grid max-w-md grid-cols-3 gap-1.5 text-center text-[0.65rem] sm:text-xs">
          <div className="rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5">
            <dt className="text-dim">Intervals</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-fg">
              {resonance?.n ?? "—"}
            </dd>
          </div>
          <div className="rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5">
            <dt className="text-dim">Vs random</dt>
            <dd className="mt-0.5 text-sm font-semibold text-fg">
              {resonance == null ? "—" : resonance.separated ? "Unusual" : "Typical"}
            </dd>
          </div>
          <div className="rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5">
            <dt className="text-dim">Sample</dt>
            <dd className="mt-0.5 text-sm font-semibold text-fg">
              {resonance?.short_window ? "Short" : "OK"}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void refresh(true)}
            className="ww-btn min-h-10 text-[0.7rem]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setTab("solar")}
            className="ww-btn min-h-10 text-[0.7rem]"
          >
            <Sun className="h-3.5 w-3.5" />
            Back to Solar
          </button>
        </div>

        {techLine && (
          <div className="mx-auto mt-2 max-w-lg text-left">
            <button
              type="button"
              onClick={() => setHow((v) => !v)}
              className="inline-flex min-h-8 items-center gap-1 text-[0.62rem] font-medium text-dim hover:text-primary"
              aria-expanded={how}
            >
              {how ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              How we got this
            </button>
            {how && (
              <p className="mt-1 font-mono text-[0.62rem] leading-relaxed text-dim">
                {techLine} · frozen probe · <XHandle profile="sheppard" /> · shuffle |z|≥3 unusual
              </p>
            )}
          </div>
        )}
      </div>

      <SuptContinuumStrip compact />
      <WatchZoneStrip />

      <Folder id="rhythm-sky" title="Sky" hint="Moon phase · eclipse watch — not in the quake score">
        <LunarSkyCard />
      </Folder>

      <Folder
        id="rhythm-wave"
        title="Waveform"
        hint="Pick an event on the map, then fingerprint one BHZ trace"
      >
        <WaveformHarmonicDesk />
      </Folder>

      <Folder
        id="rhythm-method"
        title="Method"
        hint="Aftershock control · frozen probe · math"
      >
        <p className="text-xs text-muted">
          Aftershock check:{" "}
          <strong className="text-fg">
            {etasControl.verdict ?? etasControl.reason ?? "—"}
          </strong>
          {etasControl.n != null ? ` · n=${etasControl.n}` : ""}
        </p>
        <p className="text-[0.7rem] leading-relaxed text-muted">
          {etasControl.plain ||
            `Omori p≈${OMORI_CONTROL.p} residual is a control, not a second forecast.`}
        </p>
        <SuptMathSection compact defaultOpen={false} />
      </Folder>
    </div>
  );
}
