import { useEffect, useMemo, useState } from "react";
import { useObservatory } from "@/store/observatory";
import { buildTodayBrief } from "@/lib/ops/todayBrief";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { Activity, ChevronDown, ChevronUp, Sun } from "lucide-react";

const BRIEF_OPEN_KEY = "wolfwatch_today_brief_open";

/** One-line “Today” orientation — uses store-cached solar assessment. */
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
  const solar = useObservatory((s) => s.solarAssessment);
  const setTab = useObservatory((s) => s.setTab);
  const mobile = useIsMobile();
  const [open, setOpen] = useState(!mobile);

  useEffect(() => {
    if (!mobile) {
      setOpen(true);
      return;
    }
    try {
      // Default collapsed on mobile to free map space
      setOpen(localStorage.getItem(BRIEF_OPEN_KEY) === "1");
    } catch {
      setOpen(false);
    }
  }, [mobile]);

  const brief = useMemo(
    () =>
      buildTodayBrief({
        solar,
        seismic: resonance,
        scales,
        cmes: donki?.cmes ?? [],
      }),
    [solar, resonance, scales, donki],
  );

  const tone =
    brief.level === "storm"
      ? "border-danger/40 bg-danger/10 text-danger"
      : brief.level === "elevated"
        ? "border-warn/35 bg-warn/10 text-warn"
        : brief.level === "watch"
          ? "border-gold/35 bg-gold/10 text-gold"
          : "border-border bg-panel text-muted";

  const topRec = brief.recommendations[0];
  const showRec = showRecLink && topRec && !mobile;

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (mobile) {
        try {
          localStorage.setItem(BRIEF_OPEN_KEY, next ? "1" : "0");
        } catch {
          /* */
        }
      }
      return next;
    });
  };

  // Mobile collapsed: single compact chip row
  if (mobile && !open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1 text-left ${tone}`}
        aria-expanded={false}
        aria-label="Expand today brief"
      >
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[0.62rem] font-semibold">
          <Sun className="h-3 w-3 shrink-0" />
          <span className="uppercase tracking-wide">Today</span>
          <span className="truncate font-medium text-fg">
            Attn {brief.solarAttn} · {brief.scales}
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    );
  }

  return (
    <div
      className={`rounded-lg border px-2.5 py-1.5 sm:py-2 ${tone} ${dense || mobile ? "text-[0.65rem]" : "text-xs"}`}
      role="status"
      aria-label="Today brief"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <button
          type="button"
          className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide"
          onClick={mobile ? toggle : undefined}
          aria-expanded={open}
        >
          <Sun className="h-3 w-3" />
          Today
          {mobile && <ChevronUp className="h-3 w-3 opacity-70" />}
        </button>
        <span className="min-w-0 font-medium leading-snug text-fg">
          {mobile
            ? `Attn ${brief.solarAttn} · ${brief.scales} · Earth ${brief.earthD}${brief.earthSep ? "·sep" : ""}`
            : brief.line}
        </span>
        {mobile && topRec?.tab && (
          <button
            type="button"
            className="ww-btn min-h-8 px-2 text-[0.6rem]"
            onClick={() => setTab(topRec.tab!)}
          >
            {topRec.priority === "now" || topRec.priority === "watch" ? "Watch" : "Solar"}
          </button>
        )}
      </div>
      {showRec && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.68rem] text-fg/90">
          <Activity className="h-3 w-3 shrink-0 opacity-70" />
          <span className="min-w-0">
            <strong className="font-semibold">{topRec.title}</strong>
            <span className="text-dim">
              {" "}
              — {topRec.detail.slice(0, 120)}
              {topRec.detail.length > 120 ? "…" : ""}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
