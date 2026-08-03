import { useMemo, useState } from "react";
import { useObservatory, filteredEq } from "@/store/observatory";
import {
  DRAGON_NODES,
  nodeEventStats,
  nodeStatus,
  type NodeStatus,
} from "@/lib/feeds/usgs";
import {
  SUPT_ANCHORS,
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
import {
  ChevronDown,
  ChevronRight,
  Crosshair,
  ExternalLink,
  Info,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { XHandle, XPerson } from "@/components/ui/XProfileLink";
import { SuptContinuumStrip } from "@/components/supt/SuptContinuumStrip";
import { SuptMathSection } from "@/components/supt/SuptMathSection";

const STATUS_STYLE: Record<NodeStatus, string> = {
  quiet: "bg-primary/30 border-primary",
  elevated: "bg-gold/40 border-gold",
  active: "bg-warn/50 border-warn",
  watch: "bg-danger/60 border-danger animate-pulse-soft",
};

const STATUS_PLAIN: Record<NodeStatus, string> = {
  quiet: "Quiet",
  elevated: "Elevated",
  active: "Active",
  watch: "Watch",
};

const TONE_CLASS = {
  none: "border-border bg-panel",
  chance: "border-primary/30 bg-primary/5",
  ordered: "border-gold/40 bg-gold/10",
  mixed: "border-warn/35 bg-warn/10",
  sparse: "border-border bg-elevated/40",
  null: "border-border bg-panel",
} as const;

export function ResonancePanel() {
  const resonance = useObservatory((s) => s.resonance);
  const reading = useObservatory((s) => s.reading);
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const refresh = useObservatory((s) => s.refresh);
  const loading = useObservatory((s) => s.loading);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const setTab = useObservatory((s) => s.setTab);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const mode = useObservatory((s) => s.mode);
  const [showTech, setShowTech] = useState(false);
  const [showEtas, setShowEtas] = useState(false);
  const [showSupTDetail, setShowSupTDetail] = useState(false);

  const features = filteredEq(eq?.features, minMag, maxMag);
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
    const whiteScore = resonanceScore(wh.residualGaps, mode === "lite" ? 40 : 60);
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
      <SuptContinuumStrip compact />
      <header>
        <h2 className="text-lg font-semibold text-accent sm:text-xl">Catalog timing</h2>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          How evenly recent quakes are spaced in time — not how big they are, not a forecast.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted">
          <p className="mb-0.5 font-semibold text-fg">What this does</p>
          <p>
            Looks at gaps between quakes ({windowLabel}) and asks: does that spacing look ordinary,
            or more ordered / mixed than a random shuffle of the same times?
          </p>
        </div>
        <div className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-muted">
          <p className="mb-0.5 flex items-center gap-1 font-semibold text-danger">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            Not a prediction
          </p>
          <p>
            Not magnitude, location, ShakeMap, or early warning. Use USGS and local agencies for
            alerts.
          </p>
        </div>
      </div>

      <div className={`rounded-xl border p-4 text-center sm:p-6 ${TONE_CLASS[verdict.tone]}`}>
        <div className="text-[0.65rem] uppercase tracking-widest text-dim sm:text-[0.7rem]">
          Current window · {windowLabel}
        </div>
        <p className="mt-2 text-lg font-semibold leading-snug text-fg sm:text-2xl">
          {verdict.title}
        </p>
        {resonance?.band && resonance.band !== "N/A" && (
          <p className="mt-1 text-xs text-muted sm:text-sm">
            {resonance.separated
              ? bandPlainLabel(resonance.band)
              : "Consistent with random spacing"}
            {resonance.separated ? (
              <span className="text-dim"> · stronger than random</span>
            ) : (
              <span className="text-dim"> · within chance</span>
            )}
          </p>
        )}

        <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted sm:mt-3 sm:text-sm">
          {reading || "Load live data to get a reading."}
        </p>

        {techLine && (
          <div className="mx-auto mt-2 max-w-lg">
            <button
              type="button"
              onClick={() => setShowSupTDetail((v) => !v)}
              className="inline-flex min-h-9 items-center gap-1 text-[0.65rem] font-medium text-dim hover:text-primary"
              aria-expanded={showSupTDetail}
            >
              {showSupTDetail ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Technical detail
            </button>
            {showSupTDetail && (
              <div className="mt-1 space-y-1.5 rounded-md border border-border/70 bg-bg/40 px-2 py-1.5 text-left">
                <p className="font-mono text-[0.62rem] leading-relaxed text-dim">{techLine}</p>
                <p className="text-[0.62rem] leading-snug text-muted">
                  Method: SUPT frozen probe (Sheppard) · α=0.01 · shuffle null |z|≥3 = “unusual.”{" "}
                  <XHandle profile="sheppard" /> · full math in About.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-4">
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
            onClick={() => setTab("live")}
            className="ww-btn ww-btn--ghost min-h-10 text-[0.7rem]"
          >
            Live map
          </button>
        </div>

        <dl className="mx-auto mt-4 grid max-w-md grid-cols-3 gap-1.5 text-center text-[0.65rem] sm:mt-5 sm:gap-2 sm:text-xs">
          <div className="rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5 sm:px-2 sm:py-2">
            <dt className="text-dim">Intervals</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-fg">
              {resonance?.n ?? "—"}
            </dd>
          </div>
          <div className="rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5 sm:px-2 sm:py-2">
            <dt className="text-dim">Vs random</dt>
            <dd className="mt-0.5 text-sm font-semibold text-fg">
              {resonance == null ? "—" : resonance.separated ? "Unusual" : "Typical"}
            </dd>
          </div>
          <div className="rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5 sm:px-2 sm:py-2">
            <dt className="text-dim">Sample</dt>
            <dd className="mt-0.5 text-sm font-semibold text-fg">
              {resonance?.short_window ? "Short" : "OK"}
            </dd>
          </div>
        </dl>
      </div>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
          Watch zones
        </h3>
        <p className="mb-2 text-[0.65rem] text-dim sm:mb-3 sm:text-xs">
          Focus a zone to zoom the map. Independent of the rhythm score.
        </p>
        <ul className="space-y-2 text-sm">
          {DRAGON_NODES.map((node) => {
            const st = nodeStatus(features, node);
            const stats = nodeEventStats(features, node);
            const active = focusNodeId === node.id;
            return (
              <li
                key={node.id}
                className="flex items-start gap-2 rounded-md border border-border/60 bg-bg/40 px-2 py-2 sm:px-2.5"
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border ${STATUS_STYLE[st]}`}
                  title={STATUS_PLAIN[st]}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[0.85rem] font-medium text-fg sm:text-sm">
                      {node.name}
                    </span>
                    <span className="text-[0.65rem] text-dim">{STATUS_PLAIN[st]}</span>
                  </div>
                  {stats.count > 0 && (
                    <div className="mt-0.5 text-[0.65rem] text-muted">
                      {stats.count} eq · max M{stats.maxMag.toFixed(1)}
                    </div>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusNode(active ? null : node.id);
                        setTab("live");
                      }}
                      className={`inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-2 text-[0.72rem] font-medium ${
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "text-muted hover:text-fg"
                      }`}
                    >
                      <Crosshair className="h-3 w-3" />
                      {active ? "Clear focus" : "Focus on map"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setShowEtas((v) => !v)}
          className="flex min-h-10 w-full items-center gap-2 text-left"
          aria-expanded={showEtas}
        >
          {showEtas ? (
            <ChevronDown className="h-4 w-4 text-dim" />
          ) : (
            <ChevronRight className="h-4 w-4 text-dim" />
          )}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-primary">
              Aftershock control (ETAS residual)
            </h3>
            <p className="text-[0.65rem] text-dim">
              Optional check — does order survive after a simple aftershock whitening?
            </p>
          </div>
        </button>
        {showEtas && (
          <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-xs text-muted">
            <p>
              Status:{" "}
              <strong className="text-fg">
                {etasControl.verdict ?? etasControl.reason ?? "—"}
              </strong>
              {etasControl.n != null ? ` · n=${etasControl.n}` : ""}
            </p>
            <p className="text-[0.7rem] leading-relaxed">
              {etasControl.plain ||
                `Omori p≈${OMORI_CONTROL.p} residual whitening is a control, not a second forecast.`}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setShowTech((v) => !v)}
          className="flex min-h-10 w-full items-center gap-2 text-left"
          aria-expanded={showTech}
        >
          {showTech ? (
            <ChevronDown className="h-4 w-4 text-dim" />
          ) : (
            <ChevronRight className="h-4 w-4 text-dim" />
          )}
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-dim" />
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              Operator notes
            </span>
          </div>
        </button>
        {showTech && (
          <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-[0.72rem] leading-relaxed text-muted">
            <p>
              Corpus axis bands (study language): COHERENCE {"(<1)"} · CLUTCH (1–2) · SUB-FLOOR (2–
              {SUPT_ANCHORS.zetaFloor}) · VACUUM {"(≥ζ)"}. Cusp ~1.88–1.96 can appear under heavy
              tails (~12%).
            </p>
            <p>
              Probe by <XPerson profile="sheppard" />. Null is a permitted outcome — not a broken
              meter.
            </p>
            <a
              href="https://earthquake.usgs.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              USGS Earthquake Hazards
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </section>

      <SuptMathSection compact defaultOpen={false} />
    </div>
  );
}
