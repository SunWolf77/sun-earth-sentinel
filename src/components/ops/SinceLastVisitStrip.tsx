/**
 * Since-last-visit strip — calm pulse of what changed vs last open.
 * Advances baseline on dismiss / "Got it" so the next visit is clean.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  History,
  MapPin,
  Sun,
  X,
} from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  buildCurrentSnapshot,
  buildVisitDiff,
  isVisitSessionHandled,
  loadVisitSnapshot,
  markVisitSessionHandled,
  saveVisitSnapshot,
  type VisitDiff,
  type VisitDiffItem,
  type VisitUrgency,
} from "@/lib/ops/sinceLastVisit";
import type { MobileSheet, TabId } from "@/store/observatory";

const TONE: Record<VisitUrgency, string> = {
  now: "border-danger/40 bg-danger/10 text-danger",
  watch: "border-warn/35 bg-warn/10 text-warn",
  elevated: "border-gold/35 bg-gold/10 text-gold",
  context: "border-primary/30 bg-primary/8 text-primary",
  quiet: "border-border/80 bg-panel/90 text-muted",
};

const BADGE: Record<VisitUrgency, string> = {
  now: "bg-danger/20 text-danger border-danger/40",
  watch: "bg-warn/20 text-warn border-warn/40",
  elevated: "bg-gold/20 text-gold border-gold/40",
  context: "bg-primary/15 text-primary border-primary/35",
  quiet: "bg-panel text-dim border-border",
};

function runItem(
  item: VisitDiffItem,
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
  if (item.tab === "solar") {
    api.setTab("solar");
    return;
  }
  if (item.focusNodeId) api.setFocusNode(item.focusNodeId);
  if (
    item.lat != null &&
    item.lon != null &&
    Number.isFinite(item.lat) &&
    Number.isFinite(item.lon)
  ) {
    api.pickEvent({
      id: item.eventId || `${item.lat},${item.lon},${item.time ?? 0}`,
      lat: item.lat,
      lon: item.lon,
      mag: item.mag ?? 0,
      place: item.place || "Event",
      depth: item.depth ?? 0,
      time: item.time ?? null,
      url: item.url,
    });
    api.setTab("live");
    api.setMobileSheet("events");
  } else if (item.focusNodeId) {
    api.setTab("live");
  }
}

export function SinceLastVisitStrip({
  className = "",
  dense = false,
}: {
  className?: string;
  dense?: boolean;
}) {
  const eq = useObservatory((s) => s.eq);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const scales = useObservatory((s) => s.scales);
  const kp = useObservatory((s) => s.kp);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const pickEvent = useObservatory((s) => s.pickEvent);
  const setTab = useObservatory((s) => s.setTab);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);

  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [diff, setDiff] = useState<VisitDiff | null>(null);
  const [ready, setReady] = useState(false);

  const kpNow = useMemo(() => {
    if (!kp?.length) return null;
    const last = kp[kp.length - 1];
    const v = Number(last?.Kp);
    return Number.isFinite(v) ? v : null;
  }, [kp]);

  // Build once when catalog/solar has something; once per session after handle
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isVisitSessionHandled()) {
      setHidden(true);
      setReady(true);
      return;
    }
    // Wait until we have at least eq or scales so baseline isn't empty
    const hasEq = Boolean(eq?.features?.length);
    const hasSolar = Boolean(scales);
    if (!hasEq && !hasSolar && lastUpdate == null) return;

    const previous = loadVisitSnapshot();
    const current = buildCurrentSnapshot({
      features: eq?.features,
      volcAlerts: usgsVolcAlerts,
      scales,
      kp: kpNow,
    });
    const d = buildVisitDiff(previous, current);
    setDiff(d);
    setReady(true);
    // Auto-expand when there is something non-quiet or first visit
    if (d.isFirstVisit || !d.quiet) setOpen(true);
    // First visit: advance baseline immediately so next refresh is a real diff
    if (d.isFirstVisit) {
      saveVisitSnapshot(current);
    }
  }, [eq?.features, usgsVolcAlerts, scales, kpNow, lastUpdate]);

  const advanceBaseline = () => {
    if (!diff) return;
    saveVisitSnapshot(diff.current);
    markVisitSessionHandled();
    setHidden(true);
  };

  if (!ready || hidden || !diff) return null;

  const tone = TONE[diff.urgency];
  const textSize = dense ? "text-[0.6rem]" : "text-[0.65rem]";

  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`rounded-md border ${tone}`}>
        <div className="flex items-stretch gap-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left ${textSize}`}
            aria-expanded={open}
            aria-label="Since last visit"
          >
            <History className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="min-w-0 flex-1 truncate font-medium">{diff.lead}</span>
            {!diff.quiet && !diff.isFirstVisit && (
              <span
                className={`shrink-0 rounded border px-1 py-0.5 text-[0.5rem] font-bold uppercase tracking-wide ${BADGE[diff.urgency]}`}
              >
                {diff.items.filter((i) => i.kind !== "quiet" && i.kind !== "meta").length ||
                  diff.items.length}
              </span>
            )}
            {open ? (
              <ChevronUp className="h-3 w-3 shrink-0 opacity-70" />
            ) : (
              <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
            )}
          </button>
          <button
            type="button"
            className="shrink-0 border-l border-current/15 px-1.5 text-current/70 hover:bg-bg/20 hover:text-fg"
            title="Got it — update baseline"
            aria-label="Dismiss and update visit baseline"
            onClick={advanceBaseline}
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {open && (
          <div className="space-y-1 border-t border-current/10 px-2 py-1.5">
            {diff.items.map((item) => {
              const clickable =
                item.focusNodeId ||
                (item.lat != null && item.lon != null) ||
                item.tab === "solar";
              const Inner = (
                <>
                  <span
                    className={`mt-0.5 shrink-0 rounded border px-1 py-0.5 text-[0.5rem] font-bold uppercase ${BADGE[item.urgency]}`}
                  >
                    {item.kind}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug text-fg">
                      {item.label}
                    </span>
                    {item.detail && (
                      <span className="mt-0.5 block text-[0.55rem] leading-snug text-dim">
                        {item.detail}
                      </span>
                    )}
                  </span>
                  {item.tab === "solar" ? (
                    <Sun className="h-3 w-3 shrink-0 text-dim" />
                  ) : clickable ? (
                    <MapPin className="h-3 w-3 shrink-0 text-dim" />
                  ) : null}
                </>
              );
              return clickable ? (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-start gap-1.5 rounded-md border border-border/60 bg-bg/30 px-1.5 py-1 text-left hover:border-primary/35 hover:bg-bg/50"
                  onClick={() =>
                    runItem(item, {
                      setFocusNode,
                      pickEvent,
                      setTab,
                      setMobileSheet,
                    })
                  }
                >
                  {Inner}
                </button>
              ) : (
                <div
                  key={item.id}
                  className="flex items-start gap-1.5 rounded-md border border-border/50 bg-bg/20 px-1.5 py-1"
                >
                  {Inner}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
              <p className="text-[0.52rem] leading-snug text-dim">
                Observational · not a forecast · baseline advances when you dismiss
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[0.58rem] font-medium text-fg hover:border-primary/40 hover:text-primary"
                onClick={advanceBaseline}
              >
                <Check className="h-3 w-3" />
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
