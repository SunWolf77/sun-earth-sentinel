import { useEffect, useMemo, useState } from "react";
import { useObservatory } from "@/store/observatory";
import { buildTodayBrief } from "@/lib/ops/todayBrief";
import { EclipseWatchChip } from "@/components/weather/EclipseWatch";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ChevronDown, ChevronUp, Sun } from "lucide-react";

const BRIEF_OPEN_KEY = "wolfwatch_today_brief_open_v3";

/**
 * Collapsible space-weather chip in page chrome.
 * Mobile: always starts collapsed; expanded body is one short block.
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
  const tab = useObservatory((s) => s.tab);
  const setTab = useObservatory((s) => s.setTab);
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Mobile never auto-expands (screen real estate)
    if (mobile) {
      setOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(BRIEF_OPEN_KEY) === "1") setOpen(true);
    } catch {
      /* */
    }
  }, [mobile]);

  // Collapse when switching tabs on phone
  useEffect(() => {
    if (mobile) setOpen(false);
  }, [tab, mobile]);

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
      if (!mobile) {
        try {
          localStorage.setItem(BRIEF_OPEN_KEY, next ? "1" : "0");
        } catch {
          /* */
        }
      }
      return next;
    });
  };

  // Collapsed chip — always on screen, one line
  if (!open) {
    return (
      <div className="flex w-full max-w-full flex-col gap-0.5">
        {/* Eclipse chip only off Solar — Solar tab owns the full watch */}
        {tab !== "solar" && <EclipseWatchChip />}
        <button
          type="button"
          onClick={toggle}
          className={`flex w-full max-w-full min-h-7 items-center gap-1 rounded-md border px-1.5 py-0.5 text-left sm:min-h-7 ${tone} ${
            dense || mobile ? "text-[0.55rem]" : "text-[0.6rem]"
          }`}
          aria-expanded={false}
          aria-label="Show space weather brief"
          title={brief.headline}
        >
          <Sun className="h-3 w-3 shrink-0 opacity-90" />
          <span className="shrink-0 font-semibold uppercase tracking-wide opacity-80">SW</span>
          <span className="min-w-0 flex-1 truncate font-medium text-fg">
            {mobile ? brief.scales : brief.headline}
          </span>
          {age != null && (
            <span className="shrink-0 tabular-nums text-dim">{age}m</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
      </div>
    );
  }

  // Expanded — mobile keeps it short (no multi-paragraph dump)
  if (mobile) {
    return (
      <div
        className={`rounded-md border px-2 py-1.5 text-[0.6rem] ${tone}`}
        role="status"
        aria-label="Space weather brief"
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex min-w-0 flex-1 items-center gap-1 text-left font-semibold uppercase tracking-wide"
            onClick={toggle}
            aria-expanded
            aria-label="Hide space weather brief"
          >
            <Sun className="h-3 w-3 shrink-0" />
            <span className="shrink-0">SW</span>
            <span className="min-w-0 flex-1 truncate font-medium normal-case tracking-normal text-fg">
              {brief.scales}
              {brief.cmeEta ? ` · CME ${brief.cmeEta.slice(5, 16)}` : ""}
            </span>
            <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </button>
        </div>
        {showRecLink && topRec && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-fg/90">
              <strong className="font-semibold">{topRec.title}</strong>
            </span>
            {topRec.tab && (
              <button
                type="button"
                className="ww-btn min-h-7 shrink-0 px-2 text-[0.55rem]"
                onClick={() => setTab(topRec.tab!)}
              >
                Go
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border px-2 py-1.5 ${tone} ${dense ? "text-[0.62rem]" : "text-[0.7rem]"}`}
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
