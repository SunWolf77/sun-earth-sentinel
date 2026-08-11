/**
 * Main-thread facade for deterministic SUPT Web Worker isolation.
 *
 * Efficiency:
 * - Transferable Float64Array for heavy inbound payloads (zero-copy).
 * - resonanceScoreBatchAsync — one message for N zone scores (queue-depth win).
 * - MAX_PENDING depth cap — excess work falls back to sync instead of flooding.
 * - Size thresholds — small inputs stay on pure sync path.
 * - Per-request timeout + crash recovery + sync fallback on any failure.
 *
 * Isolation:
 * - Sync pure functions remain the source of truth and the fallback.
 * - Single reusable worker; recreate on crash.
 * - Request-id matching so concurrent calls never cross.
 */

import type { ResonanceScore } from "./probe";
import {
  resonanceScore as resonanceScoreSync,
  probe as probeSync,
} from "./probe";
import type { EtasEvent, EtasWhitenResult } from "./etasWhiten";
import { etasWhitenResiduals as etasWhitenSync } from "./etasWhiten";
import type {
  ResonanceBatchJob,
  ResonanceBatchResult,
  SuptWorkerRequest,
  SuptWorkerRequestBody,
  SuptWorkerResponse,
} from "./workerTypes";

/** Offload thresholds — below these pack+transfer cost usually exceeds compute. */
const OFFLOAD_GAPS = 40;
const OFFLOAD_SHUFFLE = 40;
const OFFLOAD_EVENTS = 30;

/** Hard ceiling so a hung worker cannot stall the observatory. */
const WORKER_TIMEOUT_MS = 8_000;

/**
 * Max in-flight worker requests. Beyond this, new work runs sync on main
 * (keeps queue depth bounded on multi-zone desks + concurrent panels).
 */
const MAX_PENDING = 4;

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

function toF64(values: number[]): Float64Array {
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = values[i]!;
  return out;
}

function packEvents(events: EtasEvent[]): Float64Array {
  const out = new Float64Array(events.length * 2);
  for (let i = 0; i < events.length; i++) {
    out[i * 2] = events[i]!.tMs;
    out[i * 2 + 1] = events[i]!.mag;
  }
  return out;
}

function callWorkerTransfer<T>(
  req: SuptWorkerRequestBody,
  transfer: Transferable[],
): Promise<T> {
  if (pending.size >= MAX_PENDING) {
    return Promise.reject(new Error("worker queue full"));
  }

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

    try {
      w.postMessage({ ...req, id } as SuptWorkerRequest, transfer);
    } catch (e) {
      clearPending(id);
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

/**
 * Async resonanceScore with transfer isolation when beneficial.
 * Falls back to pure sync for small inputs, full queue, or any worker failure.
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

/**
 * Batch many resonance scores into one worker message.
 * One pack + one transfer list + one reply — preferred for multi-zone desks.
 * Returns a Map keyed by jobId. Any failure falls back to per-job sync.
 */
export async function resonanceScoreBatchAsync(
  jobs: { jobId: string; gaps: number[]; nShuffle?: number }[],
): Promise<Map<string, ResonanceScore>> {
  const out = new Map<string, ResonanceScore>();
  if (jobs.length === 0) return out;

  // Single light job → individual path (or sync via thresholds inside).
  if (jobs.length === 1) {
    const j = jobs[0]!;
    out.set(j.jobId, await resonanceScoreAsync(j.gaps, j.nShuffle ?? 80));
    return out;
  }

  try {
    const packed: ResonanceBatchJob[] = [];
    const transfer: Transferable[] = [];
    for (const j of jobs) {
      const buf = toF64(j.gaps);
      packed.push({
        jobId: j.jobId,
        gaps: buf,
        nShuffle: j.nShuffle ?? 80,
      });
      transfer.push(buf.buffer);
    }

    const results = await callWorkerTransfer<ResonanceBatchResult[]>(
      { op: "resonanceScoreBatch", jobs: packed },
      transfer,
    );

    for (const r of results) out.set(r.jobId, r.score);

    // Any job missing from the reply → sync fill
    for (const j of jobs) {
      if (!out.has(j.jobId)) {
        out.set(j.jobId, resonanceScoreSync(j.gaps, j.nShuffle ?? 80));
      }
    }
    return out;
  } catch {
    for (const j of jobs) {
      out.set(j.jobId, resonanceScoreSync(j.gaps, j.nShuffle ?? 80));
    }
    return out;
  }
}

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

/** In-flight worker request count (diagnostics). */
export function workerPendingCount(): number {
  return pending.size;
}

export function terminateSuptWorker() {
  rejectAll("worker terminated");
  try {
    worker?.terminate();
  } catch {
    /* ignore */
  }
  worker = null;
}
