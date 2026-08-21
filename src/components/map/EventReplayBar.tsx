import { useEffect, useMemo, useRef } from "react";
import { Pause, Play, SkipBack, SkipForward, X, History } from "lucide-react";
import { useObservatory, filteredEq } from "@/store/observatory";

function fmtUtc(ms: number): string {
  try {
    return new Date(ms).toISOString().slice(11, 19) + "Z";
  } catch {
    return "—";
  }
}

/**
 * Educational event replay — slim strip, not a modal.
 * Opt-in; pauses auto-refresh while active.
 */
export function EventReplayBar() {
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const replayActive = useObservatory((s) => s.replayActive);
  const replayCursorMs = useObservatory((s) => s.replayCursorMs);
  const replayPlaying = useObservatory((s) => s.replayPlaying);
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
  if (!replayActive) return null;

  return (
    <div
      className="flex w-full max-w-3xl items-center gap-1.5 rounded-full border border-primary/35 bg-bg/90 py-0.5 pl-2.5 pr-1 shadow-md sm:gap-2"
      title="Educational — markers at or before this time. Live refresh paused."
    >
        <History className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="hidden shrink-0 font-mono text-[0.62rem] text-dim sm:inline">
          {shown}/{times.length}
        </span>
        <input
          type="range"
          className="min-w-0 flex-1 accent-cyan-400"
          min={minT ?? 0}
          max={maxT ?? 1}
          step={Math.max(1, Math.round(((maxT ?? 1) - (minT ?? 0)) / 400))}
          value={replayCursorMs ?? minT ?? 0}
          onChange={(e) => {
            setReplayPlaying(false);
            setReplayCursorMs(Number(e.target.value));
          }}
          aria-label="Replay time"
        />
        <span className="hidden shrink-0 font-mono text-[0.58rem] text-dim tabular-nums md:inline">
          {replayCursorMs != null ? fmtUtc(replayCursorMs) : "—"}
        </span>
        <button
          type="button"
          className="ww-btn ww-btn--icon ww-btn--compact"
          title="Start"
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
          {replayPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          className="ww-btn ww-btn--icon ww-btn--compact"
          title="End"
          onClick={() => {
            setReplayPlaying(false);
            if (maxT != null) setReplayCursorMs(maxT);
          }}
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="ww-btn ww-btn--icon ww-btn--compact"
          onClick={() => exitReplay()}
          aria-label="Exit replay"
          title="Exit replay · live view"
        >
          <X className="h-3.5 w-3.5" />
        </button>
    </div>
  );
}
