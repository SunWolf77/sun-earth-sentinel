/// <reference lib="webworker" />
/**
 * SUPT compute worker — true process isolation for the frozen probe graph nodes.
 *
 * Inbound heavy payloads arrive as transferred Float64Arrays (zero-copy).
 * Batch op scores many zone gap series in one turn (avoids N message round-trips).
 * Unpack once per job → pure probe modules → bit-identical to main thread.
 */

import { probe, resonanceScore } from "./probe";
import { etasWhitenResiduals, type EtasEvent } from "./etasWhiten";
import type {
  ResonanceBatchResult,
  SuptWorkerRequest,
  SuptWorkerResponse,
} from "./workerTypes";

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

function toNumberArray(a: Float64Array): number[] {
  const n = a.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = a[i]!;
  return out;
}

function unpackEvents(packed: Float64Array): EtasEvent[] {
  const n = packed.length >> 1;
  const out = new Array<EtasEvent>(n);
  for (let i = 0; i < n; i++) {
    out[i] = { tMs: packed[i * 2]!, mag: packed[i * 2 + 1]! };
  }
  return out;
}

ctx.onmessage = (ev: MessageEvent<SuptWorkerRequest>) => {
  const msg = ev.data;
  if (!msg || typeof msg.id !== "string" || typeof msg.op !== "string") {
    ctx.postMessage({
      id: (msg as { id?: string } | null)?.id ?? "unknown",
      ok: false,
      error: "invalid worker request",
    } satisfies SuptWorkerResponse);
    return;
  }

  const reqId = msg.id;
  const op = msg.op;

  try {
    if (op === "resonanceScore") {
      if (!(msg.gaps instanceof Float64Array)) {
        ctx.postMessage({
          id: reqId,
          ok: false,
          error: "resonanceScore expects transferred Float64Array gaps",
        } satisfies SuptWorkerResponse);
        return;
      }
      const gaps = toNumberArray(msg.gaps);
      const result = resonanceScore(gaps, msg.nShuffle ?? 80);
      ctx.postMessage({
        id: reqId,
        ok: true,
        op: "resonanceScore",
        result,
      } satisfies SuptWorkerResponse);
      return;
    }

    if (op === "resonanceScoreBatch") {
      if (!Array.isArray(msg.jobs)) {
        ctx.postMessage({
          id: reqId,
          ok: false,
          error: "resonanceScoreBatch expects jobs array",
        } satisfies SuptWorkerResponse);
        return;
      }
      const result: ResonanceBatchResult[] = [];
      for (const job of msg.jobs) {
        if (!job || typeof job.jobId !== "string" || !(job.gaps instanceof Float64Array)) {
          ctx.postMessage({
            id: reqId,
            ok: false,
            error: "resonanceScoreBatch job missing jobId or Float64Array gaps",
          } satisfies SuptWorkerResponse);
          return;
        }
        const gaps = toNumberArray(job.gaps);
        const score = resonanceScore(gaps, job.nShuffle ?? 80);
        result.push({ jobId: job.jobId, score });
      }
      ctx.postMessage({
        id: reqId,
        ok: true,
        op: "resonanceScoreBatch",
        result,
      } satisfies SuptWorkerResponse);
      return;
    }

    if (op === "probe") {
      if (!(msg.values instanceof Float64Array)) {
        ctx.postMessage({
          id: reqId,
          ok: false,
          error: "probe expects transferred Float64Array values",
        } satisfies SuptWorkerResponse);
        return;
      }
      const values = toNumberArray(msg.values);
      const result = probe(values);
      ctx.postMessage({
        id: reqId,
        ok: true,
        op: "probe",
        result,
      } satisfies SuptWorkerResponse);
      return;
    }

    if (op === "etasWhiten") {
      if (!(msg.packed instanceof Float64Array) || msg.packed.length % 2 !== 0) {
        ctx.postMessage({
          id: reqId,
          ok: false,
          error: "etasWhiten expects transferred interleaved Float64Array packed",
        } satisfies SuptWorkerResponse);
        return;
      }
      const events = unpackEvents(msg.packed);
      const result = etasWhitenResiduals(events);
      ctx.postMessage({
        id: reqId,
        ok: true,
        op: "etasWhiten",
        result,
      } satisfies SuptWorkerResponse);
      return;
    }

    ctx.postMessage({
      id: reqId,
      ok: false,
      error: `unknown op: ${String(op)}`,
    } satisfies SuptWorkerResponse);
  } catch (e) {
    ctx.postMessage({
      id: reqId,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    } satisfies SuptWorkerResponse);
  }
};
