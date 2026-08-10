/**
 * Main-thread facade for deterministic SUPT Web Worker isolation.
 *
 * Performance:
 * - Heavy numeric payloads are packed into a fresh Float64Array and *transferred*
 *   (zero-copy inbound). The caller’s original number[] / EtasEvent[] are never
 *   neutered — only the temporary transfer buffer is.
 * - Results stay structured-clone (tiny score objects).
 * - Offload only when input size makes compute worth the pack + message cost.
 *
 * Isolation rules (unchanged):
 * - Sync pure functions remain the source of truth and the fallback.
 * - Single reusable worker; recreate on crash.
 * - Request-id matching so concurrent calls never cross.
 * - Hard timeout so a stuck worker never blocks a refresh forever.
 * - SSR / restricted contexts fall back cleanly.
 */

import type { ResonanceScore } from "./probe";
import {
  resonanceScore as resonanceScoreSync,
  probe as probeSync,
} from "./probe";
import type { EtasEvent, EtasWhitenResult } from "./etasWhiten";
import { etasWhitenResiduals as etasWhitenSync } from "./etasWhiten";
import type { SuptWorkerRequest, SuptWorkerResponse } from "./workerTypes";

/** Offload thresholds — below these pack+transfer cost usually exceeds compute. */
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

/** Copy number[] into a contiguous Float64Array (caller array stays intact). */
function toF64(values: number[]): Float64Array {
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = values[i]!;
  return out;
}

/** Pack EtasEvent[] as interleaved [tMs, mag, …] for a single transfer. */
function packEvents(events: EtasEvent[]): Float64Array {
  const out = new Float64Array(events.length * 2);
  for (let i = 0; i < events.length; i++) {
    out[i * 2] = events[i]!.tMs;
    out[i * 2 + 1] = events[i]!.mag;
  }
  return out;
}

/**
 * Post a request and transfer the listed ArrayBuffers (zero-copy inbound).
 * After transfer the buffers are neutered on this side — only pass *fresh*
 * buffers allocated for the message, never caller-owned storage.
 */
function callWorkerTransfer<T>(
  req: Omit<SuptWorkerRequest, "id">,
  transfer: Transferable[],
): Promise<T> {
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

    w.postMessage({ ...req, id } as SuptWorkerRequest, transfer);
  });
}

/**
 * Async resonanceScore with true process isolation when beneficial.
 * Packs gaps into a transferable Float64Array; original number[] is untouched.
 */
export async function resonanceScoreAsync(
  gaps: number[],
  nShuffle = 80,
): Promise<ResonanceScore> {
  const useWorker =
    gaps.length >= OFFLOAD_GAPS || nShuffle >= OFFLOAD_SHUFFLE;
  if (!useWorker) return resonanceScoreSync(gaps, nShuffle);

  try {
    const buf = toF64(gaps);
    return await callWorkerTransfer<ResonanceScore>(
      { op: "resonanceScore", gaps: buf, nShuffle },
      [buf.buffer],
    );
  } catch {
    return resonanceScoreSync(gaps, nShuffle);
  }
}

/** Async probe — transfer path for large series only. */
export async function probeAsync(values: number[]): Promise<number | null> {
  if (values.length < OFFLOAD_GAPS) return probeSync(values);
  try {
    const buf = toF64(values);
    return await callWorkerTransfer<number | null>(
      { op: "probe", values: buf },
      [buf.buffer],
    );
  } catch {
    return probeSync(values);
  }
}

/**
 * Async ETAS residual whitening. Packs events into one interleaved Float64Array
 * and transfers it — one allocation, zero-copy inbound.
 */
export async function etasWhitenResidualsAsync(
  events: EtasEvent[],
): Promise<EtasWhitenResult> {
  if (events.length < OFFLOAD_EVENTS) return etasWhitenSync(events);
  try {
    const packed = packEvents(events);
    return await callWorkerTransfer<EtasWhitenResult>(
      { op: "etasWhiten", packed },
      [packed.buffer],
    );
  } catch {
    return etasWhitenSync(events);
  }
}

/**
 * Smoke / determinism check — prove worker transfer path matches sync pure path.
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
