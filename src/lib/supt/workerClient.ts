/**
 * Main-thread facade for deterministic SUPT Web Worker isolation.
 *
 * Design rules:
 * - Sync pure functions remain the source of truth and the fallback.
 * - Offload only when input size makes the null battery / ETAS integral worth
 *   the structured-clone + message cost.
 * - Single reusable worker; recreate on crash.
 * - Request-id matching so concurrent calls never cross.
 * - Hard timeout so a stuck worker never blocks a refresh forever.
 * - SSR / restricted contexts fall back cleanly (typeof Worker === "undefined").
 *
 * Graph node isolation: each call is an independent node with immutable input
 * and a fully determined output. No shared mutable state across the boundary.
 */

import type { ResonanceScore } from "./probe";
import {
  resonanceScore as resonanceScoreSync,
  probe as probeSync,
} from "./probe";
import type { EtasEvent, EtasWhitenResult } from "./etasWhiten";
import { etasWhitenResiduals as etasWhitenSync } from "./etasWhiten";
import type { SuptWorkerRequest, SuptWorkerResponse } from "./workerTypes";

/** Offload thresholds — below these the clone cost usually exceeds the compute. */
const OFFLOAD_GAPS = 40;
const OFFLOAD_SHUFFLE = 40;
const OFFLOAD_EVENTS = 30;

/** Hard ceiling so a hung worker cannot stall the observatory. */
const WORKER_TIMEOUT_MS = 8_000;

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<string, Pending>();

function clearPending(id: string) {
  const p = pending.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(id);
}

function rejectAll(reason: string) {
  for (const [id, p] of pending) {
    clearTimeout(p.timer);
    p.reject(new Error(reason));
    pending.delete(id);
  }
}

function getWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  if (worker) return worker;

  try {
    // Vite module worker — same pure modules as main thread → identical results.
    worker = new Worker(new URL("./supt.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (ev: MessageEvent<SuptWorkerResponse>) => {
      const msg = ev.data;
      if (!msg || typeof msg.id !== "string") return;
      const p = pending.get(msg.id);
      if (!p) return;
      clearPending(msg.id);
      if (msg.ok) {
        p.resolve(msg.result);
      } else {
        p.reject(new Error(msg.error || "worker error"));
      }
    };

    worker.onerror = (err) => {
      rejectAll(err.message || "worker crashed");
      try {
        worker?.terminate();
      } catch {
        /* ignore */
      }
      worker = null;
    };

    worker.onmessageerror = () => {
      rejectAll("worker message deserialization failed");
      try {
        worker?.terminate();
      } catch {
        /* ignore */
      }
      worker = null;
    };

    return worker;
  } catch {
    worker = null;
    return null;
  }
}

function callWorker<T>(req: Omit<SuptWorkerRequest, "id">): Promise<T> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error("no worker"));

  const id = `s${++seq}`;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!pending.has(id)) return;
      clearPending(id);
      reject(new Error("worker timeout"));
    }, WORKER_TIMEOUT_MS);

    pending.set(id, {
      resolve: resolve as (v: unknown) => void,
      reject,
      timer,
    });

    // Structured clone of number[] / plain objects only — main thread keeps its copy.
    w.postMessage({ ...req, id } as SuptWorkerRequest);
  });
}

/**
 * Async resonanceScore with true process isolation when beneficial.
 * Falls back to the pure sync path for small inputs or worker failure.
 */
export async function resonanceScoreAsync(
  gaps: number[],
  nShuffle = 80,
): Promise<ResonanceScore> {
  const useWorker =
    gaps.length >= OFFLOAD_GAPS || nShuffle >= OFFLOAD_SHUFFLE;
  if (!useWorker) return resonanceScoreSync(gaps, nShuffle);

  try {
    return await callWorker<ResonanceScore>({
      op: "resonanceScore",
      gaps,
      nShuffle,
    });
  } catch {
    return resonanceScoreSync(gaps, nShuffle);
  }
}

/** Async probe — usually not worth offloading; kept for symmetry / large series. */
export async function probeAsync(values: number[]): Promise<number | null> {
  if (values.length < OFFLOAD_GAPS) return probeSync(values);
  try {
    return await callWorker<number | null>({ op: "probe", values });
  } catch {
    return probeSync(values);
  }
}

/**
 * Async ETAS residual whitening. Offloads the nested lambda + trapezoid integrate
 * when the event list is large enough to matter on mobile main threads.
 */
export async function etasWhitenResidualsAsync(
  events: EtasEvent[],
): Promise<EtasWhitenResult> {
  if (events.length < OFFLOAD_EVENTS) return etasWhitenSync(events);
  try {
    return await callWorker<EtasWhitenResult>({ op: "etasWhiten", events });
  } catch {
    return etasWhitenSync(events);
  }
}

/**
 * Smoke / determinism check — prove worker path matches sync pure path.
 * Useful in About / diagnostic panels or unit-style runtime checks.
 */
export async function workerSmoke(
  gaps: number[],
  nShuffle = 40,
): Promise<{ sync: ResonanceScore; async: ResonanceScore; match: boolean }> {
  const sync = resonanceScoreSync(gaps, nShuffle);
  const async = await resonanceScoreAsync(gaps, nShuffle);
  const match =
    sync.d_ij === async.d_ij &&
    sync.band === async.band &&
    sync.separated === async.separated &&
    sync.n === async.n &&
    sync.z === async.z;
  return { sync, async, match };
}

/** Terminate the worker (e.g. on low-memory mobile or explicit cleanup). */
export function terminateSuptWorker() {
  rejectAll("worker terminated");
  try {
    worker?.terminate();
  } catch {
    /* ignore */
  }
  worker = null;
}
