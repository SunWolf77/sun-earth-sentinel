/**
 * WolfWatch cache / prune micro-benchmarks (Node, no browser IDB).
 * Pure CPU for pickVictims + dual-write key policy + simulated multi vs atomic work.
 *
 * Usage: node scripts/idb-cache-bench.mjs
 * Writes: src/lib/cache/benchResults.json
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { cpus, freemem, totalmem, platform, arch } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function idbPruneRank(key) {
  if (/^eq_(hour|day|week|month)$/.test(key) || key === "eq_pulse") return 100;
  if (key.startsWith("hist_")) return 90;
  if (
    ["scales", "sw", "flux10", "kp", "alerts", "forecast", "enlil", "ovation", "usgs_volc_alerts_v4", "volc"].includes(
      key,
    )
  ) {
    return 70;
  }
  if (key === "geofon" || key.startsWith("node_catalog_")) return 40;
  if (key === "jma" || key === "global_seismic") return 35;
  if (["xray", "protons", "donki", "ovationBundle", "kp_fc"].includes(key)) return 10;
  return 50;
}

function isIdbPreferredKey(key) {
  if (key.startsWith("eq_") || key.startsWith("node_catalog_") || key.startsWith("hist_")) return true;
  return [
    "geofon",
    "jma",
    "global_seismic",
    "xray",
    "protons",
    "donki",
    "ovationBundle",
    "volc",
    "eq_pulse",
  ].includes(key);
}

function pickVictims(list, totalBytes, targetBytes, force, budget) {
  const sorted = list
    .slice()
    .sort((a, b) => a.rank - b.rank || a.ts - b.ts || b.bytes - a.bytes);
  const victims = [];
  let running = totalBytes;
  for (const e of sorted) {
    if (running < targetBytes) break;
    if (!force && e.rank >= 100 && running < budget) break;
    victims.push(e.key);
    running -= e.bytes;
  }
  return { victims, totalAfter: Math.max(0, running) };
}

function makeFeedList(n) {
  const kinds = [
    "xray",
    "donki",
    "protons",
    "jma",
    "geofon",
    "node_catalog_iceland",
    "node_catalog_newzealand",
    "kp",
    "scales",
    "eq_week",
    "eq_month",
    "eq_day",
    "hist_resonance",
    "ovationBundle",
  ];
  const list = [];
  for (let i = 0; i < n; i++) {
    const key = `${kinds[i % kinds.length]}_${i}`;
    const base = kinds[i % kinds.length];
    const rank = idbPruneRank(base.startsWith("node_catalog") ? "node_catalog_x" : base.replace(/_\d+$/, ""));
    // approximate rank via base family
    const family = base.replace(/_\d+$/, "");
    list.push({
      key,
      ts: 1_700_000_000_000 + i * 1000,
      bytes: 50_000 + (i % 17) * 120_000 + (rank <= 10 ? 800_000 : 0),
      rank: idbPruneRank(
        family.startsWith("node_catalog")
          ? "node_catalog_x"
          : family.startsWith("hist")
            ? "hist_x"
            : family.startsWith("eq_")
              ? family
              : family,
      ),
    });
  }
  return list;
}

function bench(name, fn, iters) {
  // warmup
  for (let i = 0; i < Math.min(20, iters); i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn();
  const ms = performance.now() - t0;
  return {
    name,
    iters,
    totalMs: round(ms),
    perOpUs: round((ms * 1000) / iters),
    opsPerSec: Math.round(iters / (ms / 1000)),
  };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

/** Simulate cost: multi-tx = N separate "commits"; atomic = 1 snapshot + N deletes in one batch */
function simulateMultiTxDeletes(victims) {
  let acc = 0;
  for (let i = 0; i < victims.length; i++) {
    // stand-in for open tx + delete + complete
    acc += victims[i].length;
    acc ^= i * 2654435761;
  }
  return acc;
}

function simulateAtomicPrune(list, budget) {
  const total = list.reduce((s, e) => s + e.bytes, 0);
  const target = budget * 0.75;
  const { victims } = pickVictims(list, total, target, false, budget);
  // one snapshot sort already in pickVictims; batch delete loop
  let acc = list.length;
  for (let i = 0; i < victims.length; i++) acc += victims[i].length;
  return acc;
}

const BUDGET = 28_000_000;
const results = {
  generatedAt: new Date().toISOString(),
  env: {
    platform: platform(),
    arch: arch(),
    node: process.version,
    cpus: cpus().length,
    cpuModel: cpus()[0]?.model ?? "unknown",
    totalMemMb: Math.round(totalmem() / 1e6),
    freeMemMb: Math.round(freemem() / 1e6),
  },
  note:
    "Node micro-benchmarks for prune selection & dual-write policy. Not browser IDB I/O latency (that needs Playwright).",
  benches: [],
  correctness: [],
};

// Correctness spot-checks
{
  const list = [
    { key: "xray", ts: 1, bytes: 5e6, rank: 10 },
    { key: "donki", ts: 2, bytes: 4e6, rank: 10 },
    { key: "eq_week", ts: 3, bytes: 3e6, rank: 100 },
    { key: "kp", ts: 4, bytes: 5e4, rank: 70 },
  ];
  const total = list.reduce((s, e) => s + e.bytes, 0);
  const budget = 1e7;
  const soft = pickVictims(list, total, budget * 0.75, false, budget);
  const hard = pickVictims(list, total, budget * 0.75, true, budget);
  results.correctness.push({
    case: "soft_over_budget",
    victims: soft.victims,
    totalAfter: soft.totalAfter,
    expectFirst: "xray",
  });
  results.correctness.push({
    case: "force",
    victims: hard.victims,
    totalAfter: hard.totalAfter,
  });
}

// pickVictims scaling
for (const n of [32, 128, 512, 2048]) {
  const list = makeFeedList(n);
  const total = list.reduce((s, e) => s + e.bytes, 0);
  const target = BUDGET * 0.75;
  results.benches.push(
    bench(
      `pickVictims_n${n}`,
      () => {
        pickVictims(list, total, target, false, BUDGET);
      },
      n <= 512 ? 5000 : 1500,
    ),
  );
}

// isIdbPreferredKey
{
  const keys = [];
  for (let i = 0; i < 200; i++) {
    keys.push(`eq_week`, `kp`, `xray`, `wolfwatch_mode`, `node_catalog_${i}`, `hist_r`);
  }
  results.benches.push(
    bench(
      "isIdbPreferredKey_1200",
      () => {
        for (const k of keys) isIdbPreferredKey(k);
      },
      3000,
    ),
  );
}

// multi-tx vs atomic simulation (CPU stand-in for tx overhead)
{
  const list = makeFeedList(256);
  const total = list.reduce((s, e) => s + e.bytes, 0);
  const { victims } = pickVictims(list, total, BUDGET * 0.75, true, BUDGET);

  // Fair: both paths get precomputed victims.
  // multi = N isolated delete "commits"; atomic = one batch loop over same victims.
  const multi = bench(
    "sim_multi_tx_deletes",
    () => simulateMultiTxDeletes(victims),
    8000,
  );
  const atomic = bench(
    "sim_atomic_delete_batch",
    () => {
      // one "tx open" + batch deletes (same work as multi loop once, not re-sort)
      let acc = victims.length * 3;
      for (let i = 0; i < victims.length; i++) acc += victims[i].length;
      return acc;
    },
    8000,
  );
  // Full atomic prune cost = sort/select + batch (what one real prune does once)
  const fullAtomic = bench(
    "sim_full_atomic_prune_256",
    () => simulateAtomicPrune(list, BUDGET),
    4000,
  );
  results.benches.push(multi, atomic, fullAtomic);
  results.benches.push({
    name: "atomic_batch_vs_multi_ratio",
    note: "perOpUs(atomic_batch) / perOpUs(multi) on same victim list — ~1.0 means batch ≈ multi CPU; real win is 1 IDB commit vs N",
    ratio: round(atomic.perOpUs / Math.max(0.001, multi.perOpUs)),
    multiPerOpUs: multi.perOpUs,
    atomicPerOpUs: atomic.perOpUs,
    victimCount: victims.length,
    fullAtomicPerOpUs: fullAtomic.perOpUs,
  });
}

// JSON stringify cost proxy for dual-write payload estimate
{
  const payload = {
    type: "FeatureCollection",
    features: Array.from({ length: 400 }, (_, i) => ({
      type: "Feature",
      id: `eq${i}`,
      properties: { mag: 2 + (i % 40) / 10, place: `Place ${i}`, time: Date.now() - i * 1000 },
      geometry: { type: "Point", coordinates: [174 + i * 0.01, -41, 10] },
    })),
  };
  results.benches.push(
    bench(
      "json_stringify_eq400",
      () => {
        JSON.stringify(payload);
      },
      200,
    ),
  );
  results.samplePayloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
}

const outJson = join(root, "src/lib/cache/benchResults.json");
const outTs = join(root, "src/lib/cache/benchResults.ts");
mkdirSync(dirname(outJson), { recursive: true });
writeFileSync(outJson, JSON.stringify(results, null, 2) + "\n");

const tsBody = `/**
 * Auto-generated by scripts/idb-cache-bench.mjs — do not hand-edit.
 * Re-run: node scripts/idb-cache-bench.mjs
 */
export type BenchRow = {
  name: string;
  iters?: number;
  totalMs?: number;
  perOpUs?: number;
  opsPerSec?: number;
  note?: string;
  ratio?: number;
  multiPerOpUs?: number;
  atomicPerOpUs?: number;
  victimCount?: number;
  fullAtomicPerOpUs?: number;
};

export type CacheBenchResults = {
  generatedAt: string;
  env: Record<string, string | number>;
  note: string;
  benches: BenchRow[];
  correctness: unknown[];
  samplePayloadBytes?: number;
};

export const CACHE_BENCH_RESULTS: CacheBenchResults = ${JSON.stringify(results, null, 2)} as const;
`;

writeFileSync(outTs, tsBody);

console.log(JSON.stringify(results, null, 2));
console.log("\nWrote", outJson);
console.log("Wrote", outTs);
