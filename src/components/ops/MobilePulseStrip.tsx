/**
 * Single Pulse strip — SW brief + story + visit + feeds behind one expand.
 * Used on live map for **mobile and desktop** so chrome never stacks five rows.
 */

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TodayBriefBar } from "@/components/ops/TodayBriefBar";
import { ActivityStoryChip } from "@/components/ops/ActivityStoryPanel";
import { SinceLastVisitStrip } from "@/components/ops/SinceLastVisitStrip";
import { FeedHealthStrip } from "@/components/ops/FeedHealthStrip";
import { CrossFeedChips } from "@/components/ops/CrossFeedChips";
import { FieldCouplingDesk } from "@/components/ops/FieldCouplingDesk";
import { WatchZoneStrip } from "@/components/ops/WatchZoneStrip";
import { useObservatory, filteredEq } from "@/store/observatory";
import { buildActivityStory } from "@/lib/ops/activityStory";
import { buildTodayBrief } from "@/lib/ops/todayBrief";
import { resonanceVerdict } from "@/lib/supt/probe";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { UI_FOLDERS_KEY, uiSeen } from "@/lib/ui/firstVisit";

export function MobilePulseStrip() {
  const [open, setOpen] = useState(false);
  const [foldersSeen, setFoldersSeen] = useState(() => uiSeen(UI_FOLDERS_KEY));
  const isMobile = useIsMobile();
  const resonance = useObservatory((s) => s.resonance);
  const scales = useObservatory((s) => s.scales);
  const donki = useObservatory((s) => s.donki);
  const kp = useObservatory((s) => s.kp);
  const solar = useObservatory((s) => s.solarAssessment);
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const volcWatchNodes = useObservatory((s) => s.volcWatchNodes);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const timeWindow = useObservatory((s) => s.timeWindow);

  useEffect(() => {
    const on = () => setFoldersSeen(true);
    window.addEventListener("ww-ui-seen", on);
    return () => window.removeEventListener("ww-ui-seen", on);
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

  const story = useMemo(() => {
    const features = filteredEq(eq?.features, Math.min(minMag, 2.5), maxMag);
    return buildActivityStory({
      features: features.length ? features : eq?.features,
      extraNodes: volcWatchNodes,
      volcAlerts: usgsVolcAlerts,
      solar,
      scales,
      timeWindow,
    });
  }, [eq, minMag, maxMag, volcWatchNodes, usgsVolcAlerts, solar, scales, timeWindow]);

  const timing =
    resonance?.separated && resonance.d_ij != null
      ? resonanceVerdict(resonance).title
      : null;

  const lead =
    story.urgency === "now" || story.urgency === "watch"
      ? story.lead
      : brief.headline || story.lead;
  const leadLine = timing ? `${lead} · ${timing}` : lead;

  const tone =
    story.urgency === "now" || brief.level === "storm"
      ? "border-danger/35 bg-danger/8 text-danger"
      : story.urgency === "watch" || brief.level === "elevated"
        ? "border-warn/30 bg-warn/8 text-warn"
        : "border-border/70 bg-panel/90 text-muted";

  if (!open) {
    const hint = isMobile && !foldersSeen;
    return (
      <div className="min-w-0 space-y-0.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex w-full min-h-8 items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[0.58rem] sm:min-h-8 sm:text-[0.62rem] ${tone}${
            hint ? " ww-pulse--hint" : ""
          }`}
          aria-expanded={false}
          aria-label="Expand pulse — space weather, story, feeds"
        >
          <span className="shrink-0 font-bold uppercase tracking-wide opacity-90">Pulse</span>
          <span className="min-w-0 flex-1 truncate font-medium">{leadLine}</span>
          <span className="shrink-0 tabular-nums text-dim">
            R{scales?.R ?? "0"} S{scales?.S ?? "0"} G{scales?.G ?? "0"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
        {/* WatchZone only when expanded — keeps collapsed pulse to one row */}
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-md border border-border/70 bg-bg/40 p-1.5">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="flex min-h-9 w-full items-center justify-between gap-1 px-1 py-0.5 text-left text-[0.62rem] font-semibold uppercase tracking-wider text-dim"
        aria-expanded
      >
        <span>Pulse · expanded</span>
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <WatchZoneStrip />
      <TodayBriefBar dense showRecLink={false} />
      <FieldCouplingDesk compact />
      <SinceLastVisitStrip dense />
      <ActivityStoryChip />
      {!isMobile && (
        <div className="min-w-0">
          <CrossFeedChips />
        </div>
      )}
      <FeedHealthStrip compact />
    </div>
  );
}
