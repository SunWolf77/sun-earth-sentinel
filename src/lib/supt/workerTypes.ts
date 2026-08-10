/**
 * Shared message protocol for the SUPT compute worker.
 *
 * Deterministic graph node isolation:
 * - Worker imports the same pure modules as the main thread (probe, etasWhiten).
 * - Only structured-cloneable payloads cross the boundary (number[], plain objects).
 * - Same α, seed, Omori constants → bit-identical results to the sync path.
 * - No SharedArrayBuffer, no transferable mutation of caller-owned arrays.
 */

import type { ResonanceScore } from "./probe";
import type { EtasEvent, EtasWhitenResult } from "./etasWhiten";

export type SuptWorkerOp = "resonanceScore" | "probe" | "etasWhiten";

export type SuptWorkerRequest =
  | { id: string; op: "resonanceScore"; gaps: number[]; nShuffle?: number }
  | { id: string; op: "probe"; values: number[] }
  | { id: string; op: "etasWhiten"; events: EtasEvent[] };

export type SuptWorkerResponse =
  | { id: string; ok: true; op: "resonanceScore"; result: ResonanceScore }
  | { id: string; ok: true; op: "probe"; result: number | null }
  | { id: string; ok: true; op: "etasWhiten"; result: EtasWhitenResult }
  | { id: string; ok: false; error: string };
