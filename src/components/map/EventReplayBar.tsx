import { useEffect, useMemo, useRef } from "react";
import { Pause, Play, SkipBack, SkipForward, X, History } from "lucide-react";
import { useObservatory, filteredEq } from "@/store/observatory";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ShareFocusButton } from "@/components/ops/ShareFocusButton";

function fmtUtc(ms: number): string {
  try {
    return new Date(ms).toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  } catch {
    return "—";
  }
}

/**
 * Educational event replay — scrub quakes in the current window.
 * Opt-in; pauses auto-refresh while active. Sits above map chrome (legend z~500).
 */
export function EventReplayBar({ hideIdleOnMobile = false }: { hideIdleOnMobile?: boolean }) {
  const mobile = useIsMobile();
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const replayActive = useObservatory((s) => s.replayActive);
  const replayCursorMs = useObservatory((s) => s.replayCursorMs);
  const replayPlaying = useObservatory((s) => s.replayPlaying);
  const setReplayActive = useObservatory((s) => s.setReplayActive);
  const setReplayCursorMs = useObservatory((s) => s.setReplayCursorMs);
  const setReplayPlaying = useObservatory((s) => s.setReplayPlaying);
  const exitReplay = useObservatory((s) => s.exitReplay);
  const setAutoRefresh = useObservatory((s) => s.setAutoRefresh);

  const times = useMemo(() => {
    const feats = filteredEq(eq?.features, minMag, maxMag);
    return feats
      .map((f) => f.properties.time)
      .filter((t): t is number => typeof t === "number")
      .sort((a, b) => a - b);
  }, [eq, minMag, maxMag]);

  const minT = times[0] ?? null;
  const maxT = times.length ? times[times.length - 1]! : null;

  const shown = useMemo(() => {
    if (!replayActive || replayCursorMs == null) return times.length;
    return times.filter((t) => t <= replayCursorMs).length;
  }, [times, replayActive, replayCursorMs]);

  const playRef = useRef(replayPlaying);
  playRef.current = replayPlaying;

  useEffect(() => {
    if (!replayActive || !replayPlaying || minT == null || maxT == null) return;
    setAutoRefresh(false);
    const span = Math.max(1, maxT - minT);
    // ~45s full sweep, step every 250ms
    const step = Math.max(span / 180, 30_000);
    const id = window.setInterval(() => {
      if (!playRef.current) return;
      const cur = useObservatory.getState().replayCursorMs ?? minT;
      const next = cur + step;
      if (next >= maxT) {
        setReplayCursorMs(maxT);
        setReplayPlaying(false);
      } else {
        setReplayCursorMs(next);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [
    replayActive,
    replayPlaying,
    minT,
    maxT,
    setReplayCursorMs,
    setReplayPlaying,
    setAutoRefresh,
  ]);

  if (!times.length) return null;

  if (!replayActive) {
    if (hideIdleOnMobile && mobile) return null;
    return (
      <div className="pointer-events-none absolute bottom-[5.5rem] left-2 z-[560] sm:bottom-24 sm:left-3">
        <button
          type="button"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-bg/90 px-2.5 py-1 text-[0.62rem] font-medium text-muted shadow-md backdrop-blur hover:border-primary/40 hover:text-primary"
          onClick={() => setReplayActive(true)}
          title="Replay events in the current time window (pauses live refresh)"
        >
          <History className="h-3 w-3" />
          Replay
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-[560] px-2 sm:bottom-20 sm:px-3">
      <div className="pointer-events-auto mx-auto max-w-xl rounded-xl border border-primary/30 bg-bg/95 px-2.5 py-2 shadow-lg backdrop-blur">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[0.62rem] font-semibold uppercase tracking-wider text-primary">
            <History className="h-3 w-3" />
            Event replay
            <span className="font-mono font-normal normal-case text-dim">
              {shown}/{times.length}
            </span>
          </span>
          <ShareFocusButton
            target="custom"
            compact
            label="Share replay"
            input={{
              kind: "replay",
              replay: true,
              replayMs: replayCursorMs,
              tab: "live",
            }}
          />
          <button
            type="button"
            className="ww-btn ww-btn--icon ww-btn--compact"
            onClick={() => exitReplay()}
            aria-label="Exit replay"
            title="Exit replay (resume live view)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <input
          type="range"
          className="w-full accent-cyan-400"
          min={minT ?? 0}
          max={maxT ?? 1}
          step={Math.max(1, Math.round(((maxT ?? 1) - (minT ?? 0)) / 400))}
          value={replayCursorMs ?? minT ?? 0}
          onChange={(e) => {
            setReplayPlaying(false);
            setReplayCursorMs(Number(e.target.value));
          }}
          aria-label="Replay time cursor"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[0.58rem] text-dim">
            {replayCursorMs != null ? fmtUtc(replayCursorMs) : "—"}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              className="ww-btn ww-btn--icon ww-btn--compact"
              title="Start of window"
              onClick={() => {
                setReplayPlaying(false);
                if (minT != null) setReplayCursorMs(minT);
              }}
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={`ww-btn ww-btn--icon ww-btn--compact ${replayPlaying ? "ww-btn--active" : ""}`}
              title={replayPlaying ? "Pause" : "Play"}
              onClick={() => setReplayPlaying(!replayPlaying)}
            >
              {replayPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              className="ww-btn ww-btn--icon ww-btn--compact"
              title="End of window"
              onClick={() => {
                setReplayPlaying(false);
                if (maxT != null) setReplayCursorMs(maxT);
              }}
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="mt-1 text-[0.55rem] leading-snug text-dim">
          Educational only — filters map markers to events at or before the cursor. Live refresh
          pauses while replaying.
        </p>
      </div>
    </div>
  );
}
