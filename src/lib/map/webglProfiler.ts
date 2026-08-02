/**
 * Lightweight WebGL / rAF performance profiler for the 3D globe.
 * Tracks FPS, frame time, Three.js renderer.info, optional GL timer.
 * No extra deps — safe on mobile (sampled, not every-microsecond).
 */

export type WebGlPerfSample = {
  /** Instantaneous FPS from last completed frame interval */
  fps: number;
  /** Smoothed FPS (EMA) */
  fpsSmooth: number;
  /** Last frame cost ms (JS + GPU submit side) */
  frameMs: number;
  /** EMA of frame cost */
  frameMsSmooth: number;
  /** 1% low FPS over rolling window */
  fps1pctLow: number;
  /** drawCalls from last render */
  drawCalls: number;
  /** triangles from last render */
  triangles: number;
  /** points from last render */
  points: number;
  /** lines from last render */
  lines: number;
  /** geometries in memory (Three cache) */
  geometries: number;
  /** textures in memory */
  textures: number;
  /** programs in memory */
  programs: number;
  /** JS heap MB if performance.memory available */
  jsHeapMb: number | null;
  /** Quality / health label */
  health: "good" | "ok" | "poor" | "critical";
  /** Short tip for UI */
  tip: string;
  /** Samples collected */
  n: number;
  /** Timestamp */
  t: number;
};

export type WebGlRendererInfoLike = {
  render: { calls: number; triangles: number; points: number; lines: number; frame?: number };
  memory: { geometries: number; textures: number };
  programs?: unknown[] | null;
};

type PerfMem = { usedJSHeapSize?: number };

const WINDOW = 90; // ~1.5–3s at 30–60fps

function pctLow(sortedAsc: number[], pct = 0.01): number {
  if (!sortedAsc.length) return 0;
  const i = Math.max(0, Math.floor(sortedAsc.length * pct));
  return sortedAsc[i] ?? sortedAsc[0]!;
}

function healthFrom(fpsSmooth: number, frameMsSmooth: number, targetFps: number): {
  health: WebGlPerfSample["health"];
  tip: string;
} {
  const ratio = fpsSmooth / Math.max(1, targetFps);
  if (frameMsSmooth > 48 || ratio < 0.45) {
    return {
      health: "critical",
      tip: "GPU saturated — lower markers / leave immersive / use 2D",
    };
  }
  if (frameMsSmooth > 28 || ratio < 0.65) {
    return {
      health: "poor",
      tip: "Frame budget tight — spin/tilt ok, avoid heavy clusters",
    };
  }
  if (frameMsSmooth > 18 || ratio < 0.85) {
    return {
      health: "ok",
      tip: "Stable enough — desktop quality preferred when free",
    };
  }
  return {
    health: "good",
    tip: "Headroom available",
  };
}

/**
 * Create a profiler instance. Call `beginFrame` at start of rAF work,
 * `endFrame(renderer)` after render. `snapshot()` for UI.
 */
export function createWebGlProfiler(opts?: { targetFps?: number; enabled?: boolean }) {
  let targetFps = opts?.targetFps ?? 60;
  let enabled = opts?.enabled !== false;
  let lastT = 0;
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
    /** Mark start of a rendered frame (after FPS throttle skip). */
    beginFrame(now: number) {
      if (!enabled) return;
      lastT = now;
    },
    /** After renderer.render — records metrics. */
    endFrame(renderer?: { info?: WebGlRendererInfoLike } | null) {
      if (!enabled || !lastT) return;
      const now = performance.now();
      const frameMs = Math.max(0.01, now - lastT);
      const fps = 1000 / frameMs;
      n += 1;
      // EMA — slightly faster track on first samples
      const a = n < 12 ? 0.28 : 0.12;
      fpsSmooth = fpsSmooth ? fpsSmooth * (1 - a) + fps * a : fps;
      frameMsSmooth = frameMsSmooth ? frameMsSmooth * (1 - a) + frameMs * a : frameMs;

      frameMsHist.push(frameMs);
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

      lastSample = {
        fps: Math.round(fps * 10) / 10,
        fpsSmooth: Math.round(fpsSmooth * 10) / 10,
        frameMs: Math.round(frameMs * 10) / 10,
        frameMsSmooth: Math.round(frameMsSmooth * 10) / 10,
        fps1pctLow: Math.round(fps1pctLow * 10) / 10,
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

      // UI ~4 Hz
      emitAccum += frameMs;
      if (emitAccum >= 250 && lastSample) {
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

      // Reset three.js render counters for next frame accuracy
      if (info?.render && typeof info.render.calls === "number") {
        try {
          // three.js r152+: info.autoReset; older: manual
          const anyInfo = info as WebGlRendererInfoLike & { autoReset?: boolean; reset?: () => void };
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
    /** One-line console summary */
    logSummary(prefix = "[globe-perf]") {
      const s = lastSample;
      if (!s) return;
      // eslint-disable-next-line no-console
      console.info(
        `${prefix} fps=${s.fpsSmooth} (1%low ${s.fps1pctLow}) frame=${s.frameMsSmooth}ms draws=${s.drawCalls} tris=${s.triangles} ${s.health}`,
      );
    },
    reset() {
      lastT = 0;
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

/** Format sample for HUD chip */
export function formatPerfChip(s: WebGlPerfSample | null, qualityId?: string): string {
  if (!s) return qualityId ? `${qualityId} · …` : "perf …";
  const q = qualityId ? `${qualityId} · ` : "";
  return `${q}${s.fpsSmooth.toFixed(0)}fps · ${s.frameMsSmooth.toFixed(0)}ms`;
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
