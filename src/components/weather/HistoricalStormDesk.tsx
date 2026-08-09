import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  History,
  Orbit,
  Shield,
  Zap,
} from "lucide-react";
import {
  HISTORICAL_STORMS,
  STORM_KIND_LABEL,
  compareLiveToHistory,
  getStorm,
  parseStormParam,
  type HistoricalStorm,
} from "@/lib/solar/historicalStorms";
import { useObservatory } from "@/store/observatory";
import { PRODUCTION_ORIGIN } from "@/lib/site";
import { ModelAccuracyDisclaimer } from "@/components/ops/ModelAccuracyDisclaimer";

function scaleNum(s: string | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseInt(String(s), 10);
  return Number.isFinite(n) ? n : null;
}

function kindTone(kind: HistoricalStorm["kind"]): string {
  switch (kind) {
    case "extreme":
      return "border-danger/40 bg-danger/10 text-danger";
    case "near-miss":
      return "border-gold/40 bg-gold/10 text-gold";
    case "modern-benchmark":
      return "border-primary/40 bg-primary/10 text-primary";
    default:
      return "border-warn/40 bg-warn/10 text-warn";
  }
}

/**
 * Historical Storm Desk — memory + live compare for the Solar tab.
 * Observational only; deep-link: ?tab=solar&storm=carrington
 */
export function HistoricalStormDesk({ compact = false }: { compact?: boolean }) {
  const scales = useObservatory((s) => s.scales);
  const kp = useObservatory((s) => s.kp);
  const latestKp = kp.length ? Number(kp[kp.length - 1]?.Kp) : null;

  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return !compact;
    try {
      const q = new URLSearchParams(window.location.search);
      if (parseStormParam(q.get("storm"))) return true;
      const raw = localStorage.getItem("ww_storm_desk_open");
      if (raw != null) return raw === "1";
    } catch {
      /* */
    }
    return !compact;
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return "may2024";
    try {
      const q = new URLSearchParams(window.location.search);
      return parseStormParam(q.get("storm")) ?? "may2024";
    } catch {
      return "may2024";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ww_storm_desk_open", open ? "1" : "0");
    } catch {
      /* */
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      if (activeId && open) url.searchParams.set("storm", activeId);
      else url.searchParams.delete("storm");
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* */
    }
  }, [activeId, open]);

  const live = useMemo(
    () =>
      compareLiveToHistory({
        g: scaleNum(scales?.G),
        r: scaleNum(scales?.R),
        s: scaleNum(scales?.S),
        kp: latestKp != null && Number.isFinite(latestKp) ? latestKp : null,
      }),
    [scales?.G, scales?.R, scales?.S, latestKp],
  );

  const active = getStorm(activeId) ?? HISTORICAL_STORMS[0]!;

  const shareUrl = `${PRODUCTION_ORIGIN}/?tab=solar&storm=${active.id}`;

  const compareBorder =
    live.level === "severe"
      ? "border-danger/40 bg-danger/10"
      : live.level === "storm"
        ? "border-warn/35 bg-warn/10"
        : live.level === "elevated"
          ? "border-gold/35 bg-gold/10"
          : "border-border bg-panel";

  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <History className="h-4 w-4 shrink-0" />
            Historical Storm Desk
          </h3>
          <p className="mt-0.5 text-[0.68rem] text-dim">
            Memory for live scales · Carrington → 1989 → 2003 → 2012 miss → 2024 G5 · observational
            only
          </p>
        </div>
        <button
          type="button"
          className="ww-btn min-h-8 text-[0.62rem]"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {/* Live compare chip — always visible */}
      <div className={`mt-3 rounded-lg border px-3 py-2 ${compareBorder}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-[0.7rem] font-semibold text-fg">{live.headline}</span>
          <span className="rounded-full border border-border bg-bg/50 px-2 py-0.5 text-[0.58rem] uppercase tracking-wide text-dim">
            vs history
          </span>
          {scales?.G != null && (
            <span className="font-mono text-[0.65rem] text-muted">G{scales.G}</span>
          )}
          {latestKp != null && Number.isFinite(latestKp) && (
            <span className="font-mono text-[0.65rem] text-muted">
              Kp {latestKp.toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-1 text-[0.72rem] leading-relaxed text-muted">{live.detail}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg/80">
          <div
            className="h-full rounded-full bg-primary/80 transition-all"
            style={{ width: `${Math.round(live.modernScale * 100)}%` }}
            title="Rough modern-scale intensity (not a physics model)"
          />
        </div>
        <p className="mt-1 text-[0.58rem] text-dim">
          Intensity bar is a rough modern G-scale ladder only — not a Carrington probability.
        </p>
      </div>

      {open && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {HISTORICAL_STORMS.map((st) => {
              const on = st.id === active.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setActiveId(st.id)}
                  className={`rounded-full border px-2.5 py-1 text-[0.65rem] transition ${
                    on
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-bg/40 text-muted hover:border-border-strong hover:text-fg"
                  }`}
                >
                  {st.shortName}
                </button>
              );
            })}
          </div>

          <article className="mt-3 space-y-2 rounded-lg border border-border/80 bg-bg/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-fg">{active.name}</h4>
              <span
                className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-medium ${kindTone(active.kind)}`}
              >
                {STORM_KIND_LABEL[active.kind]}
              </span>
              <span className="text-[0.65rem] text-dim">{active.when}</span>
            </div>

            <div className="flex flex-wrap gap-2 text-[0.65rem] font-mono text-muted">
              {active.gPeak != null && (
                <span className="rounded border border-border px-1.5 py-0.5">G≈{active.gPeak}</span>
              )}
              {active.kpPeak != null && (
                <span className="rounded border border-border px-1.5 py-0.5">
                  Kp≈{active.kpPeak}
                </span>
              )}
              {active.dstNt != null && (
                <span className="rounded border border-border px-1.5 py-0.5">
                  Dst≈{active.dstNt} nT
                </span>
              )}
              {active.kind === "near-miss" && (
                <span className="inline-flex items-center gap-1 rounded border border-gold/40 px-1.5 py-0.5 text-gold">
                  <Orbit className="h-3 w-3" />
                  Missed Earth
                </span>
              )}
            </div>

            <p className="text-[0.78rem] leading-relaxed text-muted">{active.blurb}</p>

            <ul className="space-y-1 text-[0.72rem] text-muted">
              {active.impacts.map((line) => (
                <li key={line} className="flex gap-2">
                  <Zap className="mt-0.5 h-3 w-3 shrink-0 text-dim" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-md border border-primary/25 bg-primary/5 px-2.5 py-2">
              <p className="flex items-start gap-1.5 text-[0.72rem] text-fg">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <strong className="text-primary">Takeaway · </strong>
                  {active.lesson}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={shareUrl}
                className="ww-btn min-h-8 text-[0.62rem]"
                onClick={(e) => {
                  e.preventDefault();
                  void navigator.clipboard?.writeText(shareUrl);
                }}
              >
                Copy share link
              </a>
              {active.refs?.map((r) => (
                <a
                  key={r.href}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
                >
                  {r.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </article>

          {active.id === "jul2012" && (
            <div className="mt-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-[0.72rem] text-muted">
              <strong className="text-gold">Near-miss capsule · </strong>
              STEREO-A sampled a Carrington-class CME on 23 Jul 2012. Earth was not in the path.
              Geometry lesson: big ejecta still leave the Sun; hit vs miss is longitude and timing.
              SES does not invent smoke when the miss is the story.
            </div>
          )}

          <div className="mt-2">
            <ModelAccuracyDisclaimer compact />
          </div>
        </>
      )}
    </section>
  );
}
