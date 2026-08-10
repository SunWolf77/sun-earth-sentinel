/// <reference lib="webworker" />
/**
 * SUPT compute worker — true process isolation for the frozen probe graph nodes.
 *
 * Imports the identical pure modules used on the main thread so results are
 * bit-identical (same α, same mulberry32 seed, same Omori control params).
 *
 * Never mutates caller data. Never touches the DOM or the Zustand store.
 * Structured clone only — no SharedArrayBuffer.
 */

import { probe, resonanceScore } from "./probe";
import { etasWhitenResiduals } from "./etasWhiten";
import type { SuptWorkerRequest, SuptWorkerResponse } from "./workerTypes";

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

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
      const result = resonanceScore(msg.gaps, msg.nShuffle ?? 80);
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
      const result = probe(msg.values);
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
      const result = etasWhitenResiduals(msg.events);
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
