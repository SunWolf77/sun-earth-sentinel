#!/usr/bin/env node
/**
 * Field identity contract tests — Colombia-class multi-agency twin + story unify.
 * Run: npm run test:field
 *
 * Self-contained (no bundler): re-implements the *contract* numbers that must
 * match src/lib/seismology/sameEvent.ts + geofon merge behaviour, and greps
 * the repo for wiring. If you change PROFILE_GLOBAL maxDistKm / mag slack,
 * update the constants below.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR;
  const dLon = (lon2 - lon1) * toR;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Must match PROFILE_GLOBAL in sameEvent.ts */
const PROFILE_GLOBAL = {
  maxDistKm: 80,
  distKmPerMagAbove5: 12,
  maxTimeMs: 20 * 60_000,
  requireTime: true,
  maxDepthDeltaKm: 80,
  minDepthForGate: 50,
};

function maxIdentityDistKm(mag, profile) {
  const m = Number.isFinite(mag) ? mag : 4;
  return profile.maxDistKm + Math.max(0, m - 5) * profile.distKmPerMagAbove5;
}

function identityMagSlack(mag, magType) {
  const t = (magType || "").toLowerCase();
  if (/^ml|md|mh/.test(t)) return mag >= 5 ? 1.0 : 1.3;
  if (/^mw|mww|mwc|mwb/.test(t)) return mag >= 6.5 ? 0.8 : 1.0;
  return 1.0;
}

function samePhysicalEvent(a, b, profile = PROFILE_GLOBAL) {
  const magRef = Math.max(a.mag || 0, b.mag || 0);
  const dist = haversineKm(a.lat, a.lon, b.lat, b.lon);
  if (dist > maxIdentityDistKm(magRef, profile)) return false;
  if (profile.requireTime && (typeof a.time !== "number" || typeof b.time !== "number"))
    return false;
  if (typeof a.time === "number" && typeof b.time === "number") {
    if (Math.abs(a.time - b.time) > profile.maxTimeMs) return false;
  }
  if (typeof a.mag === "number" && typeof b.mag === "number") {
    const slack = Math.max(
      identityMagSlack(a.mag, a.magType),
      identityMagSlack(b.mag, b.magType),
    );
    if (Math.abs(a.mag - b.mag) > slack) return false;
  }
  if (
    typeof a.depthKm === "number" &&
    typeof b.depthKm === "number" &&
    Math.max(a.depthKm, b.depthKm) >= profile.minDepthForGate
  ) {
    if (Math.abs(a.depthKm - b.depthKm) > profile.maxDepthDeltaKm) return false;
  }
  return true;
}

function parseFdsnUtcMs(raw) {
  const s = (raw || "").trim();
  if (!s) return NaN;
  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) return Date.parse(s);
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  return Date.parse(`${normalized}Z`);
}

// --- Colombia live pair (USGS + GEOFON) ---
const usgs = {
  lat: 4.844,
  lon: -76.242,
  time: 1786365268125,
  mag: 7.4,
  magType: "mww",
  depthKm: 110.285,
};
const gfz = {
  lat: 4.89,
  lon: -76.167,
  time: parseFdsnUtcMs("2026-08-10T12:34:28.43"),
  mag: 7.46,
  magType: "mw",
  depthKm: 103.5,
};

const km = haversineKm(usgs.lat, usgs.lon, gfz.lat, gfz.lon);
assert(km < 15 && km > 5, `Colombia USGS↔GFZ ~10 km (got ${km.toFixed(2)})`);

assert(
  Math.abs(gfz.time - usgs.time) < 2000,
  `GEOFON UTC origin aligns with USGS (|Δt|=${Math.abs(gfz.time - usgs.time)}ms)`,
);

assert(
  samePhysicalEvent(usgs, gfz),
  "samePhysicalEvent: USGS M7.4 + GEOFON Mw7.46 = one rupture",
);
assert(
  !samePhysicalEvent(usgs, { ...gfz, time: usgs.time + 3 * 3600_000 }),
  "3h later is not the same rupture",
);
assert(
  !samePhysicalEvent(usgs, { ...gfz, mag: 8.6 }),
  "Δmag 1.2 rejects identity",
);

// Catalog collapse simulation (prefer primary)
function collapseTwins(features) {
  const order = [...features].sort(
    (a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0),
  );
  const used = new Set();
  const out = [];
  for (let i = 0; i < order.length; i++) {
    if (used.has(i)) continue;
    let survivor = order[i];
    used.add(i);
    for (let j = i + 1; j < order.length; j++) {
      if (used.has(j)) continue;
      const pa = {
        lat: survivor.geometry.coordinates[1],
        lon: survivor.geometry.coordinates[0],
        time: survivor.properties.time,
        mag: survivor.properties.mag,
        depthKm: Math.abs(survivor.geometry.coordinates[2] || 0),
        magType: survivor.properties.magType,
      };
      const pb = {
        lat: order[j].geometry.coordinates[1],
        lon: order[j].geometry.coordinates[0],
        time: order[j].properties.time,
        mag: order[j].properties.mag,
        depthKm: Math.abs(order[j].geometry.coordinates[2] || 0),
        magType: order[j].properties.magType,
      };
      if (!samePhysicalEvent(pa, pb)) continue;
      used.add(j);
      const aSec = String(survivor.id || "").startsWith("geofon:");
      const bSec = String(order[j].id || "").startsWith("geofon:");
      if (aSec && !bSec) survivor = order[j];
    }
    out.push(survivor);
  }
  return out;
}

const twinFeats = [
  {
    id: "us6000tjl2",
    properties: { mag: 7.4, time: usgs.time, magType: "mww", net: "us" },
    geometry: { coordinates: [-76.242, 4.844, 110.285] },
  },
  {
    id: "geofon:gfz2026posv",
    properties: { mag: 7.46, time: gfz.time, magType: "mw", net: "geofon" },
    geometry: { coordinates: [-76.167, 4.89, 103.5] },
  },
];
const collapsed = collapseTwins(twinFeats);
assert(collapsed.length === 1, "collapse twins → 1 feature");
assert(collapsed[0].id === "us6000tjl2", "USGS primary preferred over GEOFON");

// Story unify: zone owns eventId → global dropped
function unifyFieldStories(stories) {
  const nodes = stories.filter((s) => s.kind === "node");
  const globals = stories.filter((s) => s.kind === "global");
  const claimed = new Set(nodes.map((n) => n.eventId).filter(Boolean));
  return [
    ...nodes,
    ...globals.filter((g) => !g.eventId || !claimed.has(g.eventId)),
  ];
}
const unified = unifyFieldStories([
  { kind: "node", eventId: "us6000tjl2", urgency: "now" },
  { kind: "global", eventId: "us6000tjl2", urgency: "now" },
]);
assert(
  unified.length === 1 && unified[0].kind === "node",
  "story: zone owns rupture, global dropped",
);

// Repo wiring — hard stop must remain
const obs = readFileSync(join(root, "src/store/observatory.ts"), "utf8");
assert(obs.includes("resolveFieldCatalog"), "observatory wires resolveFieldCatalog");
assert(
  (obs.match(/resolveFieldCatalog/g) || []).length >= 2,
  "resolveFieldCatalog on full refresh + pulse paths",
);

const sameSrc = readFileSync(join(root, "src/lib/seismology/sameEvent.ts"), "utf8");
assert(sameSrc.includes("maxDistKm: 80"), "PROFILE_GLOBAL maxDistKm still 80");
assert(sameSrc.includes("haversineKm"), "identity uses haversine km");

const storySrc = readFileSync(join(root, "src/lib/ops/activityStory.ts"), "utf8");
assert(storySrc.includes("unifyFieldStories"), "activity story field-unifies");

const indexSrc = readFileSync(join(root, "src/routes/index.tsx"), "utf8");
assert(
  indexSrc.includes('tab === "live"') && indexSrc.includes("MobilePulseStrip"),
  "live map uses single Pulse strip (mobile + desktop)",
);

const geofonSrc = readFileSync(join(root, "src/lib/feeds/geofon.ts"), "utf8");
assert(geofonSrc.includes("parseFdsnUtcMs"), "GEOFON UTC parse present");
assert(geofonSrc.includes("mergeGeofonIntoCollection"), "GEOFON spatial merge present");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll field-identity contracts passed.");
