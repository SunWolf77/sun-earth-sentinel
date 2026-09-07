#!/usr/bin/env node
/**
 * Raised-status timeout contract — stacking must decay.
 * Run: node --experimental-strip-types scripts/raised-timeout-unit.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  RAISED,
  isFresh,
  parseIssuedMs,
  pruneRaisedSwpc,
  pruneVolcTransitions,
  swpcMaxAgeH,
} from "../src/lib/ops/raisedTimeout.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
}

const now = Date.parse("2026-08-30T00:00:00Z");

assert(RAISED.swpc.summaryH === 18, "summary TTL 18h");
assert(RAISED.swpc.watchH === 36, "watch TTL 36h");
assert(RAISED.swpc.alertH === 48, "alert TTL 48h");
assert(RAISED.swpc.warningH === 72, "warning TTL 72h");
assert(RAISED.swpc.cap === 6, "SWPC desk cap 6");
assert(RAISED.node.m6WatchH === 48, "node M6 watch 48h");
assert(RAISED.node.m7WatchH === 72, "node M7 watch 72h");
assert(RAISED.look.cap === 4, "look cap 4");
assert(RAISED.look.sunLedH === 48, "sun-led 48h");
assert(RAISED.crossFeed.m6ChipH === 36, "M6 chip 36h");
assert(RAISED.crossFeed.cap === 4, "cross-feed cap 4");
assert(RAISED.volcToast.ttlH === 4, "volc toast 4h");
assert(RAISED.volcToast.cap === 8, "volc toast cap 8");
assert(RAISED.volc.curatedH === 14, "curated aviation LOOK 14h");
assert(RAISED.volc.vaacH === 30, "Darwin VAA LOOK 30h");
assert(RAISED.volc.gvpWeeklyH === 10, "GVP weekly not Pulse-hot after 10h");
assert(RAISED.volc.lookCap === 2, "max 2 agency volcanoes on LOOK");
assert(RAISED.volc.lookMinFl === 200, "Darwin LOOK only FL200+ or red");
assert(RAISED.story.nowCap === 2, "Pulse now-cap 2");
assert(RAISED.story.deskCap === 8, "Pulse desk cap 8");

assert(swpcMaxAgeH("summary") === 18, "summary max age");
assert(isFresh(now - 47 * 3600_000, 48, now), "fresh under TTL");
assert(!isFresh(now - 49 * 3600_000, 48, now), "stale over TTL");

const issued = parseIssuedMs("2026-08-29 12:00:00.000");
assert(issued === Date.parse("2026-08-29T12:00:00.000Z"), "SWPC issue_datetime as UTC");

const rows = pruneRaisedSwpc(
  [
    { tier: "summary", title: "SUMMARY: Geomagnetic", issued: "2026-08-28 00:00:00.000" }, // 48h — drop
    { tier: "watch", title: "WATCH: G1", issued: "2026-08-29 00:00:00.000" }, // 24h — keep
    { tier: "watch", title: "WATCH: G1", issued: "2026-08-29 06:00:00.000" }, // newer dup
    { tier: "warning", title: "WARNING: G3", issued: "2026-08-27 12:00:00.000" }, // 60h — keep
    { tier: "alert", title: "ALERT: R2", issued: "2026-08-27 00:00:00.000" }, // 72h — drop (alert 48h)
    { tier: "other", title: "NOTICE", issued: "2026-08-29 20:00:00.000" },
  ],
  now,
);
assert(rows.length === 3, `pruned SWPC count ${rows.length}`);
assert(rows[0].tier === "warning", "warning ranks first");
assert(rows.some((r) => r.title === "WATCH: G1" && r.issued?.startsWith("2026-08-29 06")), "dedupe keeps newest watch");
assert(!rows.some((r) => r.tier === "summary"), "stale summary dropped");
assert(!rows.some((r) => r.tier === "alert"), "stale alert dropped");

const toasts = pruneVolcTransitions(
  [
    { at: now - 1 * 3600_000 },
    { at: now - 5 * 3600_000 },
    { at: now - 2 * 3600_000 },
  ],
  now,
);
assert(toasts.length === 2, `volc toast prune ${toasts.length}`);

const src = {
  usgs: readFileSync(join(root, "src/lib/feeds/usgs.ts"), "utf8"),
  swpc: readFileSync(join(root, "src/lib/feeds/swpcAlerts.ts"), "utf8"),
  look: readFileSync(join(root, "src/lib/ops/watchZones.ts"), "utf8"),
  feed: readFileSync(join(root, "src/lib/ops/crossFeed.ts"), "utf8"),
  brief: readFileSync(join(root, "src/lib/ops/todayBrief.ts"), "utf8"),
  store: readFileSync(join(root, "src/store/observatory.ts"), "utf8"),
  audio: readFileSync(join(root, "src/lib/audio/alerts.ts"), "utf8"),
  av: readFileSync(join(root, "src/lib/feeds/volcanoWatches.ts"), "utf8"),
  darwin: readFileSync(join(root, "src/lib/feeds/darwinVaac.ts"), "utf8"),
  gvolc: readFileSync(join(root, "src/lib/feeds/globalVolcanoAlerts.ts"), "utf8"),
  story: readFileSync(join(root, "src/lib/ops/activityStory.ts"), "utf8"),
};
assert(src.usgs.includes("m6_48h >= 1 || m7_72h >= 1"), "node watch recency floor");
assert(!src.usgs.includes("m6_48h >= 1 || maxMag >= 7"), "old whole-window M7 watch gone");
assert(src.swpc.includes("pruneRaisedSwpc"), "SWPC parser prunes");
assert(src.look.includes("RAISED.look.cap"), "look-zone cap wired");
assert(src.look.includes("RAISED.look.sunLedH"), "sun-led recency wired");
assert(src.feed.includes("RAISED.crossFeed.m6ChipH"), "M6 chip recency wired");
assert(src.brief.includes("Prior-period G peak is context"), "today brief demotes GPrev");
assert(src.store.includes("pruneVolcTransitions"), "volc toast prune wired");
assert(src.audio.includes("fresh[0]"), "sound/OS only strongest");
assert(/case "green":\s*return "quiet"/.test(src.av), "green aviation is quiet");
assert(RAISED.volc.curatedH === 14, "curated volc 14h");
assert(RAISED.volc.vaacH === 30, "VAAC TTL 30h");
assert(src.look.includes("extraNodes"), "look zones take live volcano nodes");
assert(src.av.includes("isCuratedWatchLive"), "curated aviation expires");
assert(src.av.includes('asOf: "2026-08-12"'), "Shiveluch asOf is Aug 12 note");
assert(src.gvolc.includes("loadDarwinVaac"), "Darwin VAAC merged into alerts");
assert(src.story.includes("Darwin VAAC"), "Pulse names Darwin VAAC");
assert(src.darwin.includes("Anak Krakatau"), "Krakatau display name");
assert(src.look.includes('node.aviationCode === "red"'), "LOOK agency is orange/red only");
assert(!src.look.includes('aviationCode === "yellow"'), "yellow aviation is not LOOK");
assert(src.look.includes("RAISED.volc.lookCap"), "LOOK agency slot cap wired");
assert(src.look.includes("lookMinFl"), "Darwin FL floor on LOOK");
assert(src.look.includes("M0.0 must never"), "LOOK refuses M0.0 as a reason");
assert(src.story.includes('a.source !== "vaac"'), "lumped orange is not every Darwin VAA");
assert(src.usgs.includes("liveAviationCode"), "curated dragon nodes decay aviation");
assert(src.story.includes("Volcano agency color is volcanoBeats"), "no fake EQ story for vent-only");

const sept6 = Date.parse("2026-09-06T00:11:00Z");
assert(
  !isFresh(Date.parse("2026-08-12T00:00:00Z"), RAISED.volc.curatedH, sept6),
  "Shiveluch asOf expired by 6 Sep",
);
assert(
  isFresh(Date.parse("2026-09-05T22:30:00Z"), RAISED.volc.vaacH, sept6),
  "Krakatau VAA DTG still fresh",
);

function parseVaacDtg(raw) {
  const m = String(raw).trim().match(/(\d{8})\/(\d{4})Z?/i);
  if (!m) return null;
  const d = m[1];
  const t = m[2];
  return Date.parse(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:00Z`);
}
function parseVaacPsn(raw) {
  const m = String(raw).trim().match(/([NS])\s*(\d{2})(\d{2})(?:\.\d+)?\s+([EW])\s*(\d{3})(\d{2})(?:\.\d+)?/i);
  if (!m) return null;
  const lat = (Number(m[2]) + Number(m[3]) / 60) * (m[1].toUpperCase() === "S" ? -1 : 1);
  const lon = (Number(m[5]) + Number(m[6]) / 60) * (m[4].toUpperCase() === "W" ? -1 : 1);
  return { lat, lon };
}
const psn = parseVaacPsn("S0606 E10525");
assert(psn && Math.abs(psn.lat - -6.1) < 0.02 && Math.abs(psn.lon - 105.4167) < 0.02, "Krakatau PSN");
assert(parseVaacDtg("20260905/2230Z") === Date.parse("2026-09-05T22:30:00Z"), "VAA DTG");
assert(src.darwin.includes("FL(\\d{3})"), "FL parse in Darwin module");

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nraised-timeout contract ok");
