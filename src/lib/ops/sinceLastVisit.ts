/**
 * Since-last-visit pulse — observational diff, not an alarm feed.
 * Snapshot lives in localStorage; baseline advances when user acknowledges
 * or when a new browser session commits after a successful load.
 */

import type { EqFeature } from "@/lib/feeds/usgs";
import { DRAGON_NODES } from "@/lib/feeds/usgs";
import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
import type { NoaaScales } from "@/lib/feeds/swpc";
import { pointInBounds } from "@/lib/geo/bounds";

const SNAP_KEY = "wolfwatch_visit_snapshot_v1";
const SESSION_KEY = "wolfwatch_visit_session_v1";

/** Notable catalog floor for "new event" tracking */
const NOTE_MAG = 4.5;
const STRONG_MAG = 6.0;
/** Cap stored ids */
const MAX_EQ_IDS = 80;
const MAX_ITEMS = 6;

export type VisitUrgency = "now" | "watch" | "elevated" | "context" | "quiet";

export type VisitEqSnap = {
  id: string;
  mag: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depth: number;
  url?: string;
};

export type VisitVolcSnap = {
  id: string;
  name: string;
  color: string;
};

export type VisitSnapshot = {
  v: 1;
  savedAt: number;
  /** Notable EQ ids present at save (M≥4.5 or top recent) */
  eqIds: string[];
  notable: VisitEqSnap[];
  maxMag: number;
  countM45: number;
  countM60: number;
  total: number;
  volc: VisitVolcSnap[];
  G: string;
  S: string;
  R: string;
  kp: number | null;
  /** Per published-ish node event counts (all mags in window) */
  nodeCounts: Record<string, number>;
};

export type VisitDiffItem = {
  id: string;
  kind: "eq" | "volcano" | "solar" | "seismic" | "meta" | "quiet";
  urgency: VisitUrgency;
  label: string;
  detail?: string;
  focusNodeId?: string;
  eventId?: string;
  lat?: number;
  lon?: number;
  mag?: number;
  place?: string;
  depth?: number;
  time?: number | null;
  url?: string;
  tab?: "live" | "solar";
};

export type VisitDiff = {
  isFirstVisit: boolean;
  elapsedMs: number;
  elapsedLabel: string;
  lead: string;
  urgency: VisitUrgency;
  items: VisitDiffItem[];
  previous: VisitSnapshot | null;
  current: VisitSnapshot;
  /** True when nothing material changed */
  quiet: boolean;
};

function scaleRank(s: string | undefined | null): number {
  const n = Number(String(s ?? "0").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function colorRank(c: string | undefined | null): number {
  switch ((c || "").toUpperCase()) {
    case "RED":
      return 4;
    case "ORANGE":
      return 3;
    case "YELLOW":
      return 2;
    case "GREEN":
      return 1;
    default:
      return 0;
  }
}

function featureId(f: EqFeature): string {
  return String(f.id ?? f.properties?.url ?? `${f.geometry.coordinates[0]},${f.geometry.coordinates[1]},${f.properties.time}`);
}

function elapsedLabel(ms: number): string {
  if (ms < 60_000) return "just now";
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function loadVisitSnapshot(): VisitSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as VisitSnapshot;
    if (!j || j.v !== 1 || !j.savedAt) return null;
    return j;
  } catch {
    return null;
  }
}

export function saveVisitSnapshot(snap: VisitSnapshot): void {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
  } catch {
    /* quota */
  }
}

export function markVisitSessionHandled(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* */
  }
}

export function isVisitSessionHandled(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearVisitSessionHandled(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* */
  }
}

function nodeCounts(features: EqFeature[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of DRAGON_NODES) {
    if (!n.publishedFocus && !n.watchPriority) continue;
    let c = 0;
    for (const f of features) {
      const [lon, lat] = f.geometry.coordinates;
      if (pointInBounds(lat, lon, n.bounds)) c++;
    }
    if (c > 0) out[n.id] = c;
  }
  return out;
}

function nearestNode(lat: number, lon: number): string | undefined {
  for (const n of DRAGON_NODES) {
    if (!n.publishedFocus && !n.watchPriority) continue;
    if (pointInBounds(lat, lon, n.bounds)) return n.id;
  }
  return undefined;
}

export function buildCurrentSnapshot(opts: {
  features: EqFeature[] | undefined;
  volcAlerts?: UsgsVolcanoAlert[] | null;
  scales?: NoaaScales | null;
  kp?: number | null;
  now?: number;
}): VisitSnapshot {
  const now = opts.now ?? Date.now();
  const features = opts.features ?? [];
  let maxMag = 0;
  let countM45 = 0;
  let countM60 = 0;
  const notable: VisitEqSnap[] = [];

  for (const f of features) {
    const mag = f.properties.mag ?? 0;
    if (mag > maxMag) maxMag = mag;
    if (mag >= NOTE_MAG) countM45++;
    if (mag >= STRONG_MAG) countM60++;
    if (mag >= NOTE_MAG) {
      const [lon, lat] = f.geometry.coordinates;
      const depth = f.geometry.coordinates[2] ?? 0;
      notable.push({
        id: featureId(f),
        mag,
        place: f.properties.place || "Event",
        time: f.properties.time ?? 0,
        lat,
        lon,
        depth,
        url: f.properties.url,
      });
    }
  }
  notable.sort((a, b) => b.time - a.time || b.mag - a.mag);
  const trimmed = notable.slice(0, MAX_EQ_IDS);

  const volc: VisitVolcSnap[] = (opts.volcAlerts ?? [])
    .filter((v) => colorRank(v.colorCode) >= 2)
    .map((v) => ({
      id: String(v.id || v.name),
      name: v.name,
      color: (v.colorCode || "").toUpperCase(),
    }))
    .slice(0, 40);

  return {
    v: 1,
    savedAt: now,
    eqIds: trimmed.map((e) => e.id),
    notable: trimmed,
    maxMag,
    countM45,
    countM60,
    total: features.length,
    volc,
    G: opts.scales?.G ?? "0",
    S: opts.scales?.S ?? "0",
    R: opts.scales?.R ?? "0",
    kp: opts.kp ?? null,
    nodeCounts: nodeCounts(features),
  };
}

/**
 * Diff current live state against the stored previous visit.
 * Does not write storage — caller decides when to advance baseline.
 */
export function buildVisitDiff(
  previous: VisitSnapshot | null,
  current: VisitSnapshot,
  now = Date.now(),
): VisitDiff {
  if (!previous) {
    return {
      isFirstVisit: true,
      elapsedMs: 0,
      elapsedLabel: "first visit",
      lead: "Baseline set — next open shows what changed",
      urgency: "quiet",
      items: [
        {
          id: "baseline",
          kind: "meta",
          urgency: "quiet",
          label: "Visit baseline recorded",
          detail: "Quiet is a real status. We’ll compare the next session against this snapshot.",
        },
      ],
      previous: null,
      current,
      quiet: true,
    };
  }

  const elapsedMs = Math.max(0, now - previous.savedAt);
  const items: VisitDiffItem[] = [];
  const prevIds = new Set(previous.eqIds);

  // New strong / notable quakes
  const newEqs = current.notable
    .filter((e) => !prevIds.has(e.id) && e.time >= previous.savedAt - 60_000)
    .sort((a, b) => b.mag - a.mag || b.time - a.time);

  for (const e of newEqs.slice(0, 4)) {
    const urgency: VisitUrgency =
      e.mag >= 7 ? "now" : e.mag >= STRONG_MAG ? "watch" : "elevated";
    items.push({
      id: `eq-${e.id}`,
      kind: "eq",
      urgency,
      label: `New M${e.mag.toFixed(1)} · ${e.place.split(" of ").pop() || e.place}`,
      detail: "Catalog event since last visit · not a forecast",
      eventId: e.id,
      lat: e.lat,
      lon: e.lon,
      mag: e.mag,
      place: e.place,
      depth: e.depth,
      time: e.time,
      url: e.url,
      focusNodeId: nearestNode(e.lat, e.lon),
      tab: "live",
    });
  }

  // Count deltas (context, only if no new strong events or as supplement)
  const dM45 = current.countM45 - previous.countM45;
  const dM60 = current.countM60 - previous.countM60;
  if (dM60 > 0 && !newEqs.some((e) => e.mag >= STRONG_MAG)) {
    items.push({
      id: "dm60",
      kind: "seismic",
      urgency: "watch",
      label: `+${dM60} M≥6 in catalog window`,
      detail: "Window count vs last visit · may include events already known",
      tab: "live",
    });
  } else if (dM45 >= 3 && newEqs.length === 0) {
    items.push({
      id: "dm45",
      kind: "seismic",
      urgency: "context",
      label: `+${dM45} M≥4.5 in catalog window`,
      detail: "Ordinary densify possible — check source desks",
      tab: "live",
    });
  }

  // Volcano color increases / new elevated
  const prevVolc = new Map(previous.volc.map((v) => [v.id, v]));
  for (const v of current.volc) {
    const p = prevVolc.get(v.id);
    if (!p && colorRank(v.color) >= 2) {
      items.push({
        id: `volc-new-${v.id}`,
        kind: "volcano",
        urgency: colorRank(v.color) >= 3 ? "watch" : "elevated",
        label: `${v.name} · ${v.color}`,
        detail: "Newly in elevated watchlist · authority status",
        tab: "live",
      });
    } else if (p && colorRank(v.color) > colorRank(p.color)) {
      items.push({
        id: `volc-up-${v.id}`,
        kind: "volcano",
        urgency: colorRank(v.color) >= 3 ? "watch" : "elevated",
        label: `${v.name} · ${p.color}→${v.color}`,
        detail: "Aviation / official color step-up · not our score",
        tab: "live",
      });
    }
  }

  // Solar scale steps (only if increased)
  for (const key of ["G", "S", "R"] as const) {
    const a = scaleRank(previous[key]);
    const b = scaleRank(current[key]);
    if (b > a && b >= 1) {
      items.push({
        id: `scale-${key}`,
        kind: "solar",
        urgency: b >= 3 ? "watch" : b >= 2 ? "elevated" : "context",
        label: `NOAA ${key}${b} (was ${key}${a})`,
        detail: "SWPC scale · open Solar for context",
        tab: "solar",
      });
    }
  }

  // Kp jump ≥2
  if (
    previous.kp != null &&
    current.kp != null &&
    current.kp - previous.kp >= 2 &&
    current.kp >= 5
  ) {
    items.push({
      id: "kp",
      kind: "solar",
      urgency: current.kp >= 7 ? "watch" : "elevated",
      label: `Kp ${current.kp.toFixed(0)} (was ${previous.kp.toFixed(0)})`,
      detail: "Geomagnetic index rise · not a forecast",
      tab: "solar",
    });
  }

  // Corridor rate jump (×3 and ≥8 events) — context only
  for (const [id, c] of Object.entries(current.nodeCounts)) {
    const p = previous.nodeCounts[id] ?? 0;
    if (p >= 3 && c >= Math.max(8, p * 3)) {
      const node = DRAGON_NODES.find((n) => n.id === id);
      items.push({
        id: `node-${id}`,
        kind: "seismic",
        urgency: "context",
        label: `${node?.name ?? id} denser vs last visit`,
        detail: `${p}→${c} events in window · check authority desk`,
        focusNodeId: id,
        tab: "live",
      });
    }
  }

  // Rank + cap
  const rank: Record<VisitUrgency, number> = {
    now: 0,
    watch: 1,
    elevated: 2,
    context: 3,
    quiet: 4,
  };
  items.sort((a, b) => rank[a.urgency] - rank[b.urgency]);
  // Cap "now" to 2
  let nowN = 0;
  const capped: VisitDiffItem[] = [];
  for (const it of items) {
    if (it.urgency === "now") {
      nowN++;
      if (nowN > 2) capped.push({ ...it, urgency: "watch" });
      else capped.push(it);
    } else capped.push(it);
  }
  const top = capped.slice(0, MAX_ITEMS);

  const quiet = top.length === 0;
  if (quiet) {
    top.push({
      id: "quiet",
      kind: "quiet",
      urgency: "quiet",
      label: "No material change since last visit",
      detail: "Catalog and scales look ordinary vs your baseline · quiet is a real status",
    });
  }

  const urgency = top[0]!.urgency;
  let lead: string;
  if (quiet) {
    lead = `Since ${elapsedLabel(elapsedMs)} · ordinary pace`;
  } else if (urgency === "now" || urgency === "watch") {
    lead = `Since ${elapsedLabel(elapsedMs)} · ${top.length} change${top.length === 1 ? "" : "s"} to review`;
  } else {
    lead = `Since ${elapsedLabel(elapsedMs)} · mild updates`;
  }

  return {
    isFirstVisit: false,
    elapsedMs,
    elapsedLabel: elapsedLabel(elapsedMs),
    lead,
    urgency,
    items: top,
    previous,
    current,
    quiet,
  };
}
