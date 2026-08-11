/**
 * Shared message protocol for the SUPT compute worker.
 *
 * Deterministic graph node isolation + transfer performance:
 * - Heavy numeric payloads cross as Float64Array with a transferable ArrayBuffer
 *   (zero-copy inbound). Main thread allocates a fresh buffer so its original
 *   number[] / EtasEvent[] stay intact.
 * - Batch op collapses N zone scores into one message (queue-depth win).
 * - Results stay structured-clone (ResonanceScore / EtasWhitenResult are tiny).
 * - Worker imports the same pure modules as the main thread → bit-identical
 *   results (same α, seed, Omori constants).
 * - No SharedArrayBuffer (transfer, not share).
 */

import type { ResonanceScore } from "./probe";
import type { EtasWhitenResult } from "./etasWhiten";

export type SuptWorkerOp =
  | "resonanceScore"
  | "resonanceScoreBatch"
  | "probe"
  | "etasWhiten";

/** One job inside a batch — gaps already packed as Float64Array. */
export type ResonanceBatchJob = {
  jobId: string;
  gaps: Float64Array;
  nShuffle?: number;
};

export type ResonanceBatchResult = {
  jobId: string;
  score: ResonanceScore;
};

/**
 * Request body without id — used by the main-thread facade before seq assign.
 * Kept as an explicit union (not Omit<Request,"id">) so TS distributes
 * discriminant fields correctly.
 */
export type SuptWorkerRequestBody =
  | { op: "resonanceScore"; gaps: Float64Array; nShuffle?: number }
  | { op: "resonanceScoreBatch"; jobs: ResonanceBatchJob[] }
  | { op: "probe"; values: Float64Array }
  | { op: "etasWhiten"; packed: Float64Array };

/**
 * Inbound requests use Float64Array for bulk numeric data.
 * - resonanceScore / probe: one value per element
 * - resonanceScoreBatch: N jobs, each with its own transferred gaps buffer
 * - etasWhiten: interleaved [tMs0, mag0, tMs1, mag1, …] (length = 2 × events)
 */
export type SuptWorkerRequest = SuptWorkerRequestBody & { id: string };

export type SuptWorkerResponse =
  | { id: string; ok: true; op: "resonanceScore"; result: ResonanceScore }
  | {
      id: string;
      ok: true;
      op: "resonanceScoreBatch";
      result: ResonanceBatchResult[];
    }
  | { id: string; ok: true; op: "probe"; result: number | null }
  | { id: string; ok: true; op: "etasWhiten"; result: EtasWhitenResult }
  | { id: string; ok: false; error: string };
