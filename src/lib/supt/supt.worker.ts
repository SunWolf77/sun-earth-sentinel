/// <reference lib="webworker" />
/**
 * SUPT compute worker — true process isolation for the frozen probe graph nodes.
 *
 * Inbound heavy payloads arrive as transferred Float64Arrays (zero-copy).
 * We unpack once into plain number[] / EtasEvent[] for the pure modules, then
 * run the identical probe / ETAS logic used on the main thread.
 *
 * Never mutates caller-owned data (main thread kept its originals).
 * Never touches the DOM or the Zustand store.
 * Results are small structured-clone objects only.
 */

import { probe, resonanceScore } from "./probe";
import { etasWhitenResiduals, type EtasEvent } from "./etasWhiten";
import type { SuptWorkerRequest, SuptWorkerResponse } from "./workerTypes";

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

/** Fast Float64Array → number[] (one pass; pure functions expect number[]). */
function toNumberArray(a: Float64Array): number[] {
  const n = a.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = a[i]!;
  return out;
}

/** Interleaved [tMs, mag, …] → EtasEvent[]. */
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
      id: (msg as { id?: string })?.id ?? "unknown",
      ok: false,
      error: "invalid worker request",
    } satisfies SuptWorkerResponse);
    return;
  }

  try {
    if (msg.op === "resonanceScore") {
      if (!(msg.gaps instanceof Float64Array)) {
        ctx.postMessage({
          id: msg.id,
          ok: false,
          error: "resonanceScore expects transferred Float64Array gaps",
        } satisfies SuptWorkerResponse);
        return;
      }
      const gaps = toNumberArray(msg.gaps);
      const result = resonanceScore(gaps, msg.nShuffle ?? 80);
      const res: SuptWorkerResponse = {
        id: msg.id,
        ok: true,
        op: "resonanceScore",
        result,
      };
      ctx.postMessage(res);
      return;
    }

    if (msg.op === "probe") {
      if (!(msg.values instanceof Float64Array)) {
        ctx.postMessage({
          id: msg.id,
          ok: false,
          error: "probe expects transferred Float64Array values",
        } satisfies SuptWorkerResponse);
        return;
      }
      const values = toNumberArray(msg.values);
      const result = probe(values);
      const res: SuptWorkerResponse = {
        id: msg.id,
        ok: true,
        op: "probe",
        result,
      };
      ctx.postMessage(res);
      return;
    }

    if (msg.op === "etasWhiten") {
      if (!(msg.packed instanceof Float64Array) || msg.packed.length % 2 !== 0) {
        ctx.postMessage({
          id: msg.id,
          ok: false,
          error: "etasWhiten expects transferred interleaved Float64Array packed",
        } satisfies SuptWorkerResponse);
        return;
      }
      const events = unpackEvents(msg.packed);
      const result = etasWhitenResiduals(events);
      const res: SuptWorkerResponse = {
        id: msg.id,
        ok: true,
        op: "etasWhiten",
        result,
      };
      ctx.postMessage(res);
      return;
    }

    ctx.postMessage({
      id: msg.id,
      ok: false,
      error: `unknown op: ${(msg as { op: string }).op}`,
    } satisfies SuptWorkerResponse);
  } catch (e) {
    ctx.postMessage({
      id: msg.id,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    } satisfies SuptWorkerResponse);
  }
};
