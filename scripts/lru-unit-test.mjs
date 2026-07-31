#!/usr/bin/env node
/**
 * LRU + SWR + Cache-Control + eviction policy unit tests
 * Run: npm run test:lru
 */

class TrueLru {
  constructor(max) {
    if (max < 1) throw new Error("max must be >= 1");
    this.max = max;
    this.map = new Map();
  }
  get size() {
    return this.map.size;
  }
  order() {
    return [...this.map.keys()];
  }
  touch(key) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, true);
    const victims = [];
    while (this.map.size > this.max) {
      const victim = this.map.keys().next().value;
      this.map.delete(victim);
      victims.push(victim);
    }
    return victims;
  }
  load(order) {
    this.map.clear();
    for (const k of order) this.map.set(k, true);
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value);
  }
}

function classifyAssetUrl(pathname) {
  if (pathname.startsWith("/_server") || pathname.includes("DONKI")) return "bypass-live";
  if (/\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?)$/i.test(pathname))
    return "immutable-hash";
  if (pathname === "/" || pathname.endsWith(".html") || pathname.endsWith("manifest.webmanifest"))
    return "shell";
  return "mutable-static";
}

function parseCacheControl(header) {
  const out = {
    noStore: false,
    noCache: false,
    mustRevalidate: false,
    immutable: false,
    maxAge: null,
    staleWhileRevalidate: null,
  };
  if (!header) return out;
  for (const raw of header.split(",")) {
    const p = raw.trim().toLowerCase();
    if (p === "no-store") out.noStore = true;
    else if (p === "no-cache") out.noCache = true;
    else if (p === "must-revalidate") out.mustRevalidate = true;
    else if (p === "immutable") out.immutable = true;
    else if (p.startsWith("max-age=")) {
      const n = Number(p.slice(8));
      if (Number.isFinite(n)) out.maxAge = n;
    } else if (p.startsWith("stale-while-revalidate=")) {
      const n = Number(p.slice(23));
      if (Number.isFinite(n)) out.staleWhileRevalidate = n;
    }
  }
  return out;
}

function decideStore({ cacheControl, status, contentHashed }) {
  const cc = parseCacheControl(cacheControl);
  if (status !== 200) return { mayStore: false, reason: "non-OK" };
  if (cc.noStore) return { mayStore: false, reason: "no-store" };
  return {
    mayStore: true,
    reason: cc.immutable || contentHashed ? "immutable" : "default",
    revalidateBeforeServe: Boolean(cc.noCache || cc.mustRevalidate),
  };
}

function pickEvictionVictims({ orderOldestFirst, overBy, isImmutable, ageMs, mutableMaxAgeMs }) {
  if (overBy <= 0) return [];
  const mutableMax = mutableMaxAgeMs ?? 7 * 864e5;
  const scored = orderOldestFirst.map((url, idx) => {
    const imm = isImmutable?.(url) ?? false;
    const age = ageMs?.(url) ?? 0;
    const staleMutable = !imm && age > mutableMax;
    const score = idx + (staleMutable ? -0.5 : 0) + (imm ? 1000 : 0);
    return { url, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, overBy).map((s) => s.url);
}

let passed = 0;
let failed = 0;
function assert(cond, name) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`);
  }
}

console.log("TrueLru");
{
  const l = new TrueLru(3);
  assert(l.touch("a").length === 0, "touch a — no eviction");
  l.touch("b");
  l.touch("c");
  assert(l.order().join(",") === "a,b,c", "order a,b,c");
  assert(l.touch("d").join(",") === "a", "evict oldest a");
  l.touch("b");
  assert(l.order().join(",") === "c,d,b", "touch b → MRU");
}

console.log("SWR classify");
{
  assert(classifyAssetUrl("/assets/index-Ab12CdEf.js") === "immutable-hash", "hashed js");
  assert(classifyAssetUrl("/") === "shell", "root shell");
  assert(classifyAssetUrl("/favicon.svg") === "mutable-static", "favicon");
  assert(classifyAssetUrl("/_server/fn") === "bypass-live", "server fn");
}

console.log("HTTP Cache-Control");
{
  const a = parseCacheControl("max-age=3600, stale-while-revalidate=600");
  assert(a.maxAge === 3600, "max-age parse");
  assert(a.staleWhileRevalidate === 600, "swr parse");
  assert(parseCacheControl("no-store, no-cache").noStore, "no-store");
  assert(parseCacheControl("immutable").immutable, "immutable");
  assert(decideStore({ cacheControl: "no-store", status: 200 }).mayStore === false, "no-store blocks store");
  assert(decideStore({ cacheControl: "public, max-age=60", status: 200 }).mayStore === true, "public stores");
  assert(
    decideStore({ cacheControl: "no-cache", status: 200 }).revalidateBeforeServe === true,
    "no-cache revalidate",
  );
  assert(
    decideStore({ cacheControl: null, status: 200, contentHashed: true }).reason === "immutable",
    "content-hash treated immutable",
  );
  assert(decideStore({ cacheControl: "max-age=10", status: 404 }).mayStore === false, "404 not stored");
}

console.log("Cache Storage eviction policy");
{
  const order = ["old-mut", "mid-hash", "new-mut"];
  const victims = pickEvictionVictims({
    orderOldestFirst: order,
    overBy: 1,
    isImmutable: (u) => u.includes("hash"),
    ageMs: (u) => (u === "old-mut" ? 30 * 864e5 : 1000),
    mutableMaxAgeMs: 7 * 864e5,
  });
  assert(victims[0] === "old-mut", "prefer stale mutable over hash");
  const v2 = pickEvictionVictims({
    orderOldestFirst: ["h1", "h2", "m1"],
    overBy: 1,
    isImmutable: (u) => u.startsWith("h"),
    ageMs: () => 0,
  });
  assert(v2[0] === "m1", "when ages equal, still prefer non-immutable before pure LRU index+boost");
  // Wait - with score = idx + (imm?1000:0), m1 has idx 2 score 2, h1 has 0+1000=1000, so m1 wins. good.
  const v3 = pickEvictionVictims({ orderOldestFirst: ["a", "b", "c"], overBy: 2, isImmutable: () => false });
  assert(v3.join(",") === "a,b", "evict two oldest");
}

console.log("\n" + "=".repeat(40));
console.log(failed === 0 ? `All ${passed} tests passed` : `${failed} failed / ${passed} passed`);
process.exit(failed === 0 ? 0 : 1);
