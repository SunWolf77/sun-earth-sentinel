/**
 * Shared message protocol for the SUPT compute worker.
 *
 * Deterministic graph node isolation + transfer performance:
 * - Heavy numeric payloads cross as Float64Array with a transferable ArrayBuffer
 *   (zero-copy inbound). Main thread allocates a fresh buffer so its original
 *   number[] / EtasEvent[] stay intact.
 * - Results stay structured-clone (ResonanceScore / EtasWhitenResult are tiny).
 * - Worker imports the same pure modules as the main thread → bit-identical
 *   results (same α, seed, Omori constants).
 * - No SharedArrayBuffer (transfer, not share).
 */

import type { ResonanceScore } from "./probe";
import type { EtasWhitenResult } from "./etasWhiten";

export type SuptWorkerOp = "resonanceScore" | "probe" | "etasWhiten";

/**
 * Inbound requests use Float64Array for bulk numeric data.
 * - resonanceScore / probe: one value per element
 * - etasWhiten: interleaved [tMs0, mag0, tMs1, mag1, …] (length = 2 × events)
 */
export type SuptWorkerRequest =
  | { id: string; op: "resonanceScore"; gaps: Float64Array; nShuffle?: number }
  | { id: string; op: "probe"; values: Float64Array }
  | { id: string; op: "etasWhiten"; packed: Float64Array };

export type SuptWorkerResponse =
  | { id: string; ok: true; op: "resonanceScore"; result: ResonanceScore }
  | { id: string; ok: true; op: "probe"; result: number | null }
  | { id: string; ok: true; op: "etasWhiten"; result: EtasWhitenResult }
  | { id: string; ok: false; error: string };
