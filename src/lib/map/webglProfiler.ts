/**
 * Lightweight WebGL / rAF performance profiler for the 3D globe.
 * FPS = delivered frame rate (interval between rendered frames).
 * frameMs = CPU work for that frame (begin → end).
 */

export type WebGlPerfSample = {
  /** Instantaneous delivered FPS (1 / inter-frame interval) */
  fps: number;
  /** Smoothed delivered FPS (EMA) */
  fpsSmooth: number;
  /** Last frame CPU work ms (begin→end) */
  frameMs: number;
  /** EMA of work ms */
  frameMsSmooth: number;
  /** 1% low delivered FPS over rolling window */
  fps1pctLow: number;
  /** Cap / target FPS for this quality profile */
  targetFps: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  programs: number;
  jsHeapMb: number | null;
  health: "good" | "ok" | "poor" | "critical";
  tip: string;
  n: number;
  t: number;
};

export type WebGlRendererInfoLike = {
  render: { calls: number; triangles: number; points: number; lines: number; frame?: number };
  memory: { geometries: number; textures: number };
  programs?: unknown[] | null;
};

type PerfMem = { usedJSHeapSize?: number };

const WINDOW = 90;

function pctLow(sortedAsc: number[], pct = 0.01): number {
  if (!sortedAsc.length) return 0;
  const i = Math.max(0, Math.floor(sortedAsc.length * pct));
  return sortedAsc[i] ?? sortedAsc[0]!;
}

function healthFrom(
  fpsSmooth: number,
  frameMsSmooth: number,
  targetFps: number,
): { health: WebGlPerfSample["health"]; tip: string } {
  const ratio = fpsSmooth / Math.max(1, targetFps);
  // Work budget: ~80% of frame slot
  const budget = 1000 / Math.max(15, targetFps);
  if (frameMsSmooth > budget * 1.35 || ratio < 0.5) {
    return {
      health: "critical",
      tip: "GPU saturated — fewer markers, exit full, or use 2D",
    };
  }
  if (frameMsSmooth > budget * 0.9 || ratio < 0.7) {
    return {
      health: "poor",
      tip: "Frame budget tight — reduce spin / dense clusters",
    };
  }
  if (frameMsSmooth > budget * 0.55 || ratio < 0.88) {
    return {
      health: "ok",
      tip: "Stable — headroom limited",
    };
  }
  return {
    health: "good",
    tip: "Headroom available",
  };
}

export function createWebGlProfiler(opts?: { targetFps?: number; enabled?: boolean }) {
  let targetFps = opts?.targetFps ?? 60;
  let enabled = opts?.enabled !== false;
  let beginT = 0;
  let lastEndT = 0;
  let fpsSmooth = 0;
  let frameMsSmooth = 0;
  let n = 0;
  const frameMsHist: number[] = [];
  const fpsHist: number[] = [];
  let lastSample: WebGlPerfSample | null = null;
  let listeners: Array<(s: WebGlPerfSample) => void> = [];
  let emitAccum = 0;

  const jsHeapMb = (): number | null => {
    try {
      const mem = (performance as Performance & { memory?: PerfMem }).memory;
      if (mem?.usedJSHeapSize != null) return mem.usedJSHeapSize / (1024 * 1024);
    } catch {
      /* ignore */
    }
    return null;
  };

  return {
    setEnabled(v: boolean) {
      enabled = v;
    },
    isEnabled() {
      return enabled;
    },
    setTargetFps(fps: number) {
      targetFps = Math.max(15, Math.min(120, fps));
    },
    subscribe(fn: (s: WebGlPerfSample) => void) {
      listeners.push(fn);
      return () => {
        listeners = listeners.filter((x) => x !== fn);
      };
    },
    /** Start of a frame that will actually render (after FPS throttle). */
    beginFrame(now: number) {
      if (!enabled) return;
      beginT = now;
    },
    /** After renderer.render — records work + delivered FPS. */
    endFrame(renderer?: { info?: WebGlRendererInfoLike } | null) {
      if (!enabled || !beginT) return;
      const now = performance.now();
      const workMs = Math.max(0.01, now - beginT);
      // Delivered FPS from full inter-frame interval (includes throttle wait)
      const intervalMs =
        lastEndT > 0 ? Math.max(workMs, now - lastEndT) : Math.max(workMs, 1000 / targetFps);
      lastEndT = now;
      beginT = 0;

      const fps = 1000 / intervalMs;
      n += 1;
      const a = n < 12 ? 0.28 : 0.12;
      fpsSmooth = fpsSmooth ? fpsSmooth * (1 - a) + fps * a : fps;
      frameMsSmooth = frameMsSmooth ? frameMsSmooth * (1 - a) + workMs * a : workMs;

      frameMsHist.push(workMs);
      fpsHist.push(fps);
      if (frameMsHist.length > WINDOW) frameMsHist.shift();
      if (fpsHist.length > WINDOW) fpsHist.shift();

      const info = renderer?.info;
      const calls = info?.render?.calls ?? 0;
      const triangles = info?.render?.triangles ?? 0;
      const points = info?.render?.points ?? 0;
      const lines = info?.render?.lines ?? 0;
      const geometries = info?.memory?.geometries ?? 0;
      const textures = info?.memory?.textures ?? 0;
      const programs = Array.isArray(info?.programs) ? info!.programs!.length : 0;

      const fpsSorted = [...fpsHist].sort((x, y) => x - y);
      const fps1pctLow = pctLow(fpsSorted, 0.01);
      const { health, tip } = healthFrom(fpsSmooth, frameMsSmooth, targetFps);

      // Cap displayed FPS near target (throttle intent) so UI doesn't show 300+
      const fpsShow = Math.min(fps, targetFps * 1.15);
      const fpsSmoothShow = Math.min(fpsSmooth, targetFps * 1.1);

      lastSample = {
        fps: Math.round(fpsShow * 10) / 10,
        fpsSmooth: Math.round(fpsSmoothShow * 10) / 10,
        frameMs: Math.round(workMs * 10) / 10,
        frameMsSmooth: Math.round(frameMsSmooth * 10) / 10,
        fps1pctLow: Math.round(Math.min(fps1pctLow, targetFps * 1.1) * 10) / 10,
        targetFps,
        drawCalls: calls,
        triangles,
        points,
        lines,
        geometries,
        textures,
        programs,
        jsHeapMb: jsHeapMb() != null ? Math.round(jsHeapMb()! * 10) / 10 : null,
        health,
        tip,
        n,
        t: now,
      };

      emitAccum += intervalMs;
      if (emitAccum >= 280 && lastSample) {
        emitAccum = 0;
        const s = lastSample;
        for (const fn of listeners) {
          try {
            fn(s);
          } catch {
            /* ignore */
          }
        }
      }

      if (info?.render && typeof info.render.calls === "number") {
        try {
          const anyInfo = info as WebGlRendererInfoLike & { reset?: () => void };
          if (typeof anyInfo.reset === "function") anyInfo.reset();
          else {
            info.render.calls = 0;
            info.render.triangles = 0;
            info.render.points = 0;
            info.render.lines = 0;
          }
        } catch {
          /* ignore */
        }
      }
    },
    snapshot(): WebGlPerfSample | null {
      return lastSample;
    },
    logSummary(prefix = "[globe-perf]") {
      const s = lastSample;
      if (!s) return;
      // eslint-disable-next-line no-console
      console.info(
        `${prefix} fps=${s.fpsSmooth}/${s.targetFps} (1%low ${s.fps1pctLow}) work=${s.frameMsSmooth}ms draws=${s.drawCalls} tris=${s.triangles} ${s.health}`,
      );
    },
    reset() {
      beginT = 0;
      lastEndT = 0;
      fpsSmooth = 0;
      frameMsSmooth = 0;
      n = 0;
      frameMsHist.length = 0;
      fpsHist.length = 0;
      lastSample = null;
      emitAccum = 0;
    },
  };
}

export type WebGlProfiler = ReturnType<typeof createWebGlProfiler>;

export function formatPerfChip(s: WebGlPerfSample | null, qualityId?: string): string {
  if (!s) return qualityId ? `${qualityId} · …` : "perf …";
  const q = qualityId ? `${qualityId} · ` : "";
  return `${q}${s.fpsSmooth.toFixed(0)}/${s.targetFps} · ${s.frameMsSmooth.toFixed(0)}ms`;
}

export function healthColor(h: WebGlPerfSample["health"]): string {
  switch (h) {
    case "good":
      return "#34d399";
    case "ok":
      return "#22d3ee";
    case "poor":
      return "#fb923c";
    case "critical":
      return "#f43f5e";
  }
}
