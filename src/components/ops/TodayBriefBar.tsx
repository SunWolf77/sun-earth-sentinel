import { useEffect, useMemo, useState } from "react";
import { useObservatory } from "@/store/observatory";
import { buildTodayBrief } from "@/lib/ops/todayBrief";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ChevronDown, ChevronUp, Sun } from "lucide-react";

const BRIEF_OPEN_KEY = "wolfwatch_today_brief_open_v2";

/**
 * Collapsible “Today” space-weather chip — lives in page chrome (not over map).
 * Always available; user can hide body but chip stays.
 */
export function TodayBriefBar({
  dense = false,
  showRecLink = true,
}: {
  dense?: boolean;
  showRecLink?: boolean;
}) {
  const resonance = useObservatory((s) => s.resonance);
  const scales = useObservatory((s) => s.scales);
  const donki = useObservatory((s) => s.donki);
  const kp = useObservatory((s) => s.kp);
  const solar = useObservatory((s) => s.solarAssessment);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const setTab = useObservatory((s) => s.setTab);
  const mobile = useIsMobile();
  // Default collapsed on all viewports — less chrome; expand for detail
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(BRIEF_OPEN_KEY);
      if (v === "1") setOpen(true);
      if (v === "0") setOpen(false);
    } catch {
      /* */
    }
  }, []);

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

  const tone =
    brief.level === "storm"
      ? "border-danger/40 bg-danger/10 text-danger"
      : brief.level === "elevated"
        ? "border-warn/35 bg-warn/10 text-warn"
        : brief.level === "watch"
          ? "border-gold/35 bg-gold/10 text-gold"
          : "border-border/80 bg-panel/90 text-muted";

  const topRec = brief.recommendations[0];
  const age =
    lastUpdate != null
      ? Math.max(0, Math.round((Date.now() - lastUpdate) / 60_000))
      : null;

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(BRIEF_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* */
      }
      return next;
    });
  };

  // Collapsed: one compact always-visible row (not dismissible)
  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`flex w-full max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-left ${tone} ${
          dense || mobile ? "text-[0.6rem]" : "text-[0.65rem]"
        }`}
        aria-expanded={false}
        aria-label="Show today brief"
        title={brief.headline}
      >
        <Sun className="h-3 w-3 shrink-0 opacity-90" />
        <span className="shrink-0 font-semibold uppercase tracking-wide opacity-80">SW</span>
        <span className="min-w-0 flex-1 truncate font-medium text-fg">{brief.headline}</span>
        <span className="shrink-0 tabular-nums text-dim">
          {brief.scales}
          {age != null ? ` · ${age}m` : ""}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    );
  }

  return (
    <div
      className={`rounded-md border px-2 py-1.5 ${tone} ${dense || mobile ? "text-[0.62rem]" : "text-[0.7rem]"}`}
      role="status"
      aria-label="Today brief"
    >
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
        <button
          type="button"
          className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide"
          onClick={toggle}
          aria-expanded
          aria-label="Hide today brief details"
        >
          <Sun className="h-3 w-3" />
          Space weather
          <ChevronUp className="h-3 w-3 opacity-70" />
        </button>
        <span className="min-w-0 flex-1 font-medium leading-snug text-fg">{brief.headline}</span>
        {age != null && (
          <span className="shrink-0 tabular-nums text-dim" title="Minutes since last refresh">
            {age}m ago
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-dim">
        <span className="text-fg/90">{brief.scales}</span>
        {brief.kpPeak24h != null && (
          <span>Kp 24h max {brief.kpPeak24h.toFixed(1)}</span>
        )}
        {brief.cmeEta && <span>Next CME {brief.cmeEta}</span>}
        {brief.earthSep && <span>EQ timing unusual</span>}
      </div>

      {showRecLink && topRec && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="min-w-0 text-fg/90">
            <strong className="font-semibold">{topRec.title}</strong>
            <span className="text-dim"> — {topRec.detail}</span>
          </span>
          {topRec.tab && (
            <button
              type="button"
              className="ww-btn min-h-7 shrink-0 px-2 text-[0.58rem]"
              onClick={() => setTab(topRec.tab!)}
            >
              Open
            </button>
          )}
        </div>
      )}
    </div>
  );
}
