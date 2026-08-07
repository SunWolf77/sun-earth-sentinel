/**
 * Activity Story panel — ranked "what's unfolding" with one-tap shortcuts.
 * Lives in Live sidebar + compact chrome chip.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Focus,
  Newspaper,
  Zap,
} from "lucide-react";
import { useObservatory, filteredEq } from "@/store/observatory";
import {
  buildActivityStory,
  type ActivityStory,
  type StoryAction,
  type StoryUrgency,
} from "@/lib/ops/activityStory";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { MobileSheet, TabId } from "@/store/observatory";

const OPEN_KEY = "wolfwatch_activity_story_open_v1";

const URGENCY_TONE: Record<StoryUrgency, string> = {
  now: "border-danger/45 bg-danger/10 text-danger",
  watch: "border-warn/40 bg-warn/10 text-warn",
  elevated: "border-gold/40 bg-gold/10 text-gold",
  context: "border-primary/35 bg-primary/10 text-primary",
  quiet: "border-border/80 bg-panel/90 text-muted",
};

const URGENCY_BADGE: Record<StoryUrgency, string> = {
  now: "bg-danger/20 text-danger border-danger/40",
  watch: "bg-warn/20 text-warn border-warn/40",
  elevated: "bg-gold/20 text-gold border-gold/40",
  context: "bg-primary/15 text-primary border-primary/35",
  quiet: "bg-panel text-dim border-border",
};

const KIND_LABEL: Record<string, string> = {
  node: "Zone",
  global: "Global",
  volcano: "Volc",
  solar: "Solar",
  quiet: "Quiet",
};

function runAction(
  action: StoryAction,
  api: {
    setFocusNode: (id: string | null) => void;
    pickEvent: (ev: {
      id: string;
      lat: number;
      lon: number;
      mag: number;
      place: string;
      depth: number;
      time: number | null;
      url?: string;
    } | null) => void;
    setTab: (t: TabId) => void;
    setMobileSheet: (s: MobileSheet) => void;
  },
) {
  if (action.focusNodeId) {
    api.setFocusNode(action.focusNodeId);
  }
  if (
    action.lat != null &&
    action.lon != null &&
    Number.isFinite(action.lat) &&
    Number.isFinite(action.lon)
  ) {
    api.pickEvent({
      id: action.eventId || `${action.lat},${action.lon},${action.time ?? 0}`,
      lat: action.lat,
      lon: action.lon,
      mag: action.mag ?? 0,
      place: action.place || "Event",
      depth: action.depth ?? 0,
      time: action.time ?? null,
      url: action.url,
    });
    api.setTab("live");
    api.setMobileSheet("events");
  } else if (action.tab) {
    api.setTab(action.tab as TabId);
  }
  if (action.boardUrl) {
    window.open(action.boardUrl, "_blank", "noopener,noreferrer");
  }
}

function StoryCard({
  story,
  expanded,
  onToggle,
  onAction,
}: {
  story: ActivityStory;
  expanded: boolean;
  onToggle: () => void;
  onAction: (a: StoryAction) => void;
}) {
  return (
    <article
      className={`rounded-lg border px-2.5 py-2 ${URGENCY_TONE[story.urgency]}`}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span
          className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide ${URGENCY_BADGE[story.urgency]}`}
        >
          {KIND_LABEL[story.kind] ?? story.kind}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.72rem] font-semibold leading-snug text-fg">
            {story.headline}
          </span>
          {!expanded && (
            <span className="mt-0.5 block truncate text-[0.62rem] text-dim">
              {story.stats}
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
        ) : (
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-2 border-t border-border/40 pt-1.5">
          <p className="text-[0.68rem] leading-snug text-fg/90">{story.summary}</p>
          {story.stats && story.stats !== "—" && (
            <p className="text-[0.6rem] tabular-nums text-dim">{story.stats}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {story.actions.map((a) => {
              const isBoard = !!a.boardUrl;
              const isFocus = !!a.focusNodeId && !a.eventId && !a.boardUrl;
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`inline-flex min-h-7 items-center gap-1 rounded-md border px-2 text-[0.6rem] font-semibold ${
                    isBoard
                      ? "border-gold/45 bg-gold/15 text-gold hover:bg-gold/25"
                      : isFocus
                        ? "border-primary/45 bg-primary/15 text-primary hover:bg-primary/25"
                        : "border-border bg-bg/60 text-fg hover:border-primary/40"
                  }`}
                  onClick={() => onAction(a)}
                >
                  {isBoard ? (
                    <ExternalLink className="h-3 w-3" />
                  ) : isFocus ? (
                    <Focus className="h-3 w-3" />
                  ) : (
                    <Zap className="h-3 w-3 opacity-80" />
                  )}
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * Full panel for Live sidebar / events sheet.
 */
export function ActivityStoryPanel({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const volcWatchNodes = useObservatory((s) => s.volcWatchNodes);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const solar = useObservatory((s) => s.solarAssessment);
  const scales = useObservatory((s) => s.scales);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const pickEvent = useObservatory((s) => s.pickEvent);
  const setTab = useObservatory((s) => s.setTab);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);

  const [openId, setOpenId] = useState<string | null>(null);

  const bundle = useMemo(() => {
    const features = filteredEq(eq?.features, Math.min(minMag, 2.5), maxMag);
    const forStory =
      eq?.features?.length && features.length < eq.features.length * 0.3
        ? eq.features
        : features.length
          ? features
          : eq?.features;
    return buildActivityStory({
      features: forStory,
      extraNodes: volcWatchNodes,
      volcAlerts: usgsVolcAlerts,
      solar,
      scales,
    });
  }, [
    eq,
    minMag,
    maxMag,
    volcWatchNodes,
    usgsVolcAlerts,
    solar,
    scales,
    lastUpdate,
  ]);

  useEffect(() => {
    if (!openId && bundle.stories[0] && bundle.urgency !== "quiet") {
      setOpenId(bundle.stories[0].id);
    }
    // only re-seed when lead changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle.lead, bundle.urgency]);

  const onAction = (a: StoryAction) =>
    runAction(a, { setFocusNode, pickEvent, setTab, setMobileSheet });

  return (
    <section className={`space-y-2 ${className}`} aria-label="Activity story">
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-primary">
          <Newspaper className="h-3.5 w-3.5" />
          Now unfolding
        </h3>
        {bundle.hotZones > 0 && (
          <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[0.58rem] font-semibold text-warn">
            {bundle.hotZones} hot zone{bundle.hotZones > 1 ? "s" : ""}
          </span>
        )}
      </header>
      <p className="text-[0.62rem] leading-snug text-dim">
        Live ranking of elevated zones, strong events, and watches — tap for
        shortcuts. Observational only; not a forecast.
      </p>
      <div
        className={`space-y-1.5 ${compact ? "max-h-[40vh] overflow-y-auto pr-0.5" : ""}`}
      >
        {bundle.stories.map((s) => (
          <StoryCard
            key={s.id}
            story={s}
            expanded={openId === s.id}
            onToggle={() => setOpenId((id) => (id === s.id ? null : s.id))}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Compact chrome chip (pairs with Today SW brief).
 */
export function ActivityStoryChip({ className = "" }: { className?: string }) {
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const volcWatchNodes = useObservatory((s) => s.volcWatchNodes);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const solar = useObservatory((s) => s.solarAssessment);
  const scales = useObservatory((s) => s.scales);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const pickEvent = useObservatory((s) => s.pickEvent);
  const setTab = useObservatory((s) => s.setTab);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);
  const mobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (mobile) {
      setOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(OPEN_KEY) === "1") setOpen(true);
    } catch {
      /* */
    }
  }, [mobile]);

  const bundle = useMemo(() => {
    const features = filteredEq(eq?.features, Math.min(minMag, 2.5), maxMag);
    const forStory = features.length ? features : eq?.features;
    return buildActivityStory({
      features: forStory,
      extraNodes: volcWatchNodes,
      volcAlerts: usgsVolcAlerts,
      solar,
      scales,
    });
  }, [
    eq,
    minMag,
    maxMag,
    volcWatchNodes,
    usgsVolcAlerts,
    solar,
    scales,
    lastUpdate,
  ]);

  const top = bundle.stories[0];
  const tone = URGENCY_TONE[bundle.urgency];

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (!mobile) {
        try {
          localStorage.setItem(OPEN_KEY, next ? "1" : "0");
        } catch {
          /* */
        }
      }
      if (next && top) setDetailId(top.id);
      return next;
    });
  };

  const onAction = (a: StoryAction) =>
    runAction(a, { setFocusNode, pickEvent, setTab, setMobileSheet });

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={`flex w-full max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-left ${tone} ${
          mobile ? "text-[0.6rem]" : "text-[0.65rem]"
        } ${className}`}
        aria-expanded={false}
        aria-label="Show activity story"
        title={bundle.lead}
      >
        <Newspaper className="h-3 w-3 shrink-0 opacity-90" />
        <span className="shrink-0 font-semibold uppercase tracking-wide opacity-80">
          Now
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-fg">
          {bundle.lead}
        </span>
        {bundle.hotZones > 0 && (
          <span className="shrink-0 tabular-nums opacity-90">
            {bundle.hotZones}z
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    );
  }

  return (
    <div
      className={`rounded-md border px-2 py-1.5 ${tone} ${
        mobile ? "text-[0.6rem]" : "text-[0.68rem]"
      } ${className}`}
      role="region"
      aria-label="Activity story"
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="inline-flex min-w-0 flex-1 items-center gap-1 text-left font-semibold uppercase tracking-wide"
          onClick={toggle}
          aria-expanded
        >
          <Newspaper className="h-3 w-3 shrink-0" />
          <span className="shrink-0">Now</span>
          <span className="min-w-0 flex-1 truncate font-medium normal-case tracking-normal text-fg">
            {bundle.lead}
          </span>
          <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
      </div>

      <div className="mt-1.5 max-h-[min(42vh,22rem)] space-y-1.5 overflow-y-auto">
        {bundle.stories.slice(0, mobile ? 4 : 6).map((s) => (
          <StoryCard
            key={s.id}
            story={s}
            expanded={detailId === s.id}
            onToggle={() => setDetailId((id) => (id === s.id ? null : s.id))}
            onAction={onAction}
          />
        ))}
      </div>
      <p className="mt-1 text-[0.55rem] text-dim">
        Observational ranking · not a forecast
      </p>
    </div>
  );
}
