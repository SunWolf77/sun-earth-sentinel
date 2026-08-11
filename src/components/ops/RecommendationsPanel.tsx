import { useMemo, useState } from "react";
import { useObservatory } from "@/store/observatory";
import { buildTodayBrief, type RecPriority } from "@/lib/ops/todayBrief";
import { runFullBacktest } from "@/lib/supt/backtest";
import { focusForRecommendation, requestFocus } from "@/lib/ops/focusNav";
import { ListChecks, FlaskConical, ChevronDown, ChevronRight } from "lucide-react";

const PRI_STYLE: Record<RecPriority, string> = {
  now: "border-danger/40 bg-danger/10 text-danger",
  watch: "border-warn/35 bg-warn/10 text-warn",
  context: "border-primary/30 bg-primary/5 text-primary",
  ok: "border-border bg-panel text-muted",
};

const GO_LABEL: Record<string, string> = {
  cme: "CME catalog",
  radio: "X-ray",
  protons: "Protons",
  geo: "Kp / G",
  "earth-supt": "Rhythm",
  quiet: "Live map",
};

export function RecommendationsPanel({ showBacktest = true }: { showBacktest?: boolean }) {
  const resonance = useObservatory((s) => s.resonance);
  const scales = useObservatory((s) => s.scales);
  const donki = useObservatory((s) => s.donki);
  const solar = useObservatory((s) => s.solarAssessment);
  const kp = useObservatory((s) => s.kp);
  const mode = useObservatory((s) => s.mode);
  const tab = useObservatory((s) => s.tab);
  const setTab = useObservatory((s) => s.setTab);
  const [openBt, setOpenBt] = useState(false);

  const brief = useMemo(
    () =>
      buildTodayBrief({
        solar,
        seismic: resonance,
        scales,
        cmes: donki?.cmes ?? [],
        kp,
      }),
    [solar, resonance, scales, donki, kp],
  );

  const bt = useMemo(() => (openBt ? runFullBacktest(36) : null), [openBt, mode]);

  const go = (id: string, recTab?: typeof tab) => {
    const target = focusForRecommendation(id, recTab);
    // Always set tab (even if same — panel may remount) then focus scroll
    setTab(target.tab);
    requestFocus(target);
  };

  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
        <ListChecks className="h-4 w-4" />
        Recommendations
      </h3>
      <p className="mb-3 text-[0.68rem] text-dim">
        Deterministic triage from scales · L1 · DONKI · SUPT — not official SWPC watches.
      </p>
      <ul className="space-y-2">
        {brief.recommendations.map((r) => (
          <li
            key={r.id}
            className={`rounded-lg border px-2.5 py-2 text-xs ${PRI_STYLE[r.priority]}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-fg">
                <span className="mr-1.5 text-[0.58rem] uppercase tracking-wide opacity-80">
                  {r.priority}
                </span>
                {r.title}
              </span>
              {r.tab && (
                <button
                  type="button"
                  className="ww-btn min-h-9 px-2.5 text-[0.62rem] font-semibold sm:min-h-8"
                  onClick={() => go(r.id, r.tab)}
                  title={
                    tab === r.tab
                      ? `Scroll to ${GO_LABEL[r.id] ?? r.tab}`
                      : `Open ${r.tab} · ${GO_LABEL[r.id] ?? ""}`
                  }
                >
                  {tab === r.tab ? GO_LABEL[r.id] ?? "Show" : "Go"}
                </button>
              )}
            </div>
            <p className="mt-1 text-[0.72rem] leading-snug text-muted">{r.detail}</p>
          </li>
        ))}
      </ul>

      {showBacktest && (
        <div className="mt-3 border-t border-border/70 pt-2">
          <button
            type="button"
            onClick={() => setOpenBt((v) => !v)}
            className="flex min-h-9 w-full items-center gap-1.5 text-left text-[0.72rem] font-medium text-primary"
            aria-expanded={openBt}
          >
            {openBt ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <FlaskConical className="h-3.5 w-3.5" />
            SUPT probe backtest
          </button>
          {bt && (
            <div className="mt-2 space-y-1.5">
              <p className={`text-xs font-medium ${bt.ok ? "text-ok" : "text-warn"}`}>
                {bt.summary}
              </p>
              <div className="scroll-thin max-h-48 space-y-1 overflow-y-auto text-[0.65rem]">
                {bt.results.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded border px-2 py-1.5 ${
                      r.pass ? "border-border/80 bg-bg/40" : "border-warn/40 bg-warn/10"
                    }`}
                  >
                    <div className="flex justify-between gap-2 font-medium text-fg">
                      <span>
                        {r.pass ? "PASS" : "FAIL"} · {r.name}
                      </span>
                      <span className="font-mono text-dim">
                        d={r.d_ij?.toFixed(3) ?? "—"} z={r.z ?? "—"}
                      </span>
                    </div>
                    <p className="text-dim">{r.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
