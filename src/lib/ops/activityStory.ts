/**
 * Activity Story — rule-based "what's unfolding" for SES.
 * No LLM. Scores zones + global beats from live catalog only.
 * Not a forecast product.
 */

import { pointInBounds } from "@/lib/geo/bounds";
import {
  DRAGON_NODES,
  formatAge,
  nodeStatus,
  type DragonNode,
  type EqFeature,
  type NodeStatus,
} from "@/lib/feeds/usgs";
import {
  getPublishedMonitor,
  monitorHandoffUrl,
} from "@/lib/feeds/publishedMonitors";
import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
import type { SolarAssessment } from "@/lib/solar/suptInterpreter";
import type { NoaaScales } from "@/lib/feeds/swpc";

export type StoryKind = "node" | "global" | "volcano" | "solar" | "quiet";
export type StoryUrgency = "now" | "watch" | "elevated" | "context" | "quiet";

export type StoryAction = {
  id: string;
  label: string;
  /** focus node on map */
  focusNodeId?: string;
  /** pick a catalog event */
  eventId?: string;
  lat?: number;
  lon?: number;
  mag?: number;
  place?: string;
  depth?: number;
  time?: number | null;
  url?: string;
  /** open external board */
  boardUrl?: string;
  tab?: "live" | "solar" | "resonance" | "analytics" | "about";
};

export type ActivityStory = {
  id: string;
  kind: StoryKind;
  urgency: StoryUrgency;
  /** Sort score (higher = more urgent / interesting) */
  score: number;
  /** One-line chip */
  headline: string;
  /** 1–2 sentence plain story */
  summary: string;
  /** Compact stats strip */
  stats: string;
  /** Zone / source label */
  where: string;
  status?: NodeStatus;
  nodeId?: string;
  eventId?: string;
  actions: StoryAction[];
};

export type ActivityStoryBundle = {
  /** Top line for chrome */
  lead: string;
  urgency: StoryUrgency;
  /** Ranked stories (hot first) */
  stories: ActivityStory[];
  /** How many zones are elevated+ */
  hotZones: number;
  generatedAt: number;
};

const URGENCY_RANK: Record<StoryUrgency, number> = {
  now: 0,
  watch: 1,
  elevated: 2,
  context: 3,
  quiet: 4,
};

const STATUS_SCORE: Record<NodeStatus, number> = {
  quiet: 0,
  elevated: 25,
  active: 50,
  watch: 80,
};

function scaleNum(raw: string | undefined | null): number {
  if (raw == null || raw === "—" || raw === "") return 0;
  const m = String(raw).match(/(\d)/);
  return m ? Number(m[1]) : 0;
}

function ageLabel(ms: number | null): string {
  if (ms == null) return "—";
  return formatAge(ms);
}

function featuresInNode(
  features: EqFeature[],
  node: DragonNode,
  minMag = 0,
): EqFeature[] {
  const out: EqFeature[] = [];
  for (const f of features) {
    const mag = f.properties.mag ?? 0;
    if (mag < minMag) continue;
    const [lon, lat] = f.geometry.coordinates;
    if (pointInBounds(lat, lon, node.bounds)) out.push(f);
  }
  return out;
}

type ZonePulse = {
  node: DragonNode;
  status: NodeStatus;
  all: EqFeature[];
  recent6h: EqFeature[];
  recent24h: EqFeature[];
  maxMag: number;
  m5: number;
  m6: number;
  newestAgeMs: number | null;
  strongest: EqFeature | null;
  rateBoost: number;
};

function zonePulse(
  features: EqFeature[],
  node: DragonNode,
  now: number,
): ZonePulse {
  // Published nodes keep lower floor so CF / JP density can surface
  const minMag = node.publishedFocus || node.watchPriority ? 2.5 : 3.5;
  const all = featuresInNode(features, node, minMag);
  const h6 = 6 * 3_600_000;
  const h24 = 24 * 3_600_000;
  const recent6h = all.filter(
    (f) => typeof f.properties.time === "number" && now - f.properties.time! <= h6,
  );
  const recent24h = all.filter(
    (f) => typeof f.properties.time === "number" && now - f.properties.time! <= h24,
  );
  let maxMag = 0;
  let m5 = 0;
  let m6 = 0;
  let newest = 0;
  let strongest: EqFeature | null = null;
  for (const f of all) {
    const mag = f.properties.mag ?? 0;
    if (mag > maxMag) {
      maxMag = mag;
      strongest = f;
    }
    if (mag >= 5) m5++;
    if (mag >= 6) m6++;
    const t = f.properties.time ?? 0;
    if (t > newest) newest = t;
  }
  const rateBoost =
    recent6h.length >= 3
      ? recent6h.length / Math.max(1, recent24h.length / 4)
      : recent6h.length >= 1 && maxMag >= 5
        ? 1.5
        : 0;

  return {
    node,
    status: nodeStatus(features, node),
    all,
    recent6h,
    recent24h,
    maxMag,
    m5,
    m6,
    newestAgeMs: newest ? now - newest : null,
    strongest,
    rateBoost,
  };
}

function urgencyFromStatus(
  st: NodeStatus,
  maxMag: number,
  rateBoost: number,
): StoryUrgency {
  if (st === "watch" || maxMag >= 6 || rateBoost >= 2.5) return "now";
  if (st === "active" || maxMag >= 5 || rateBoost >= 1.5) return "watch";
  if (st === "elevated" || rateBoost >= 1) return "elevated";
  return "context";
}

function storyForZone(p: ZonePulse): ActivityStory | null {
  if (p.all.length === 0 && p.status === "quiet") return null;
  if (p.status === "quiet" && p.all.length < 2 && p.maxMag < 4.5) return null;

  const pub = getPublishedMonitor(p.node.id);
  const boardUrl = monitorHandoffUrl(p.node.id) || p.node.monitorUrl;
  const urgency = urgencyFromStatus(p.status, p.maxMag, p.rateBoost);

  let score =
    STATUS_SCORE[p.status] +
    p.maxMag * 8 +
    p.m5 * 6 +
    p.m6 * 20 +
    Math.min(40, p.recent6h.length * 5) +
    p.rateBoost * 12;
  if (p.node.publishedFocus) score += 8;
  if (p.newestAgeMs != null && p.newestAgeMs < 3_600_000) score += 10;
  if (p.newestAgeMs != null && p.newestAgeMs < 6 * 3_600_000) score += 5;

  const stLabel =
    p.status === "watch"
      ? "Watch"
      : p.status === "active"
        ? "Active"
        : p.status === "elevated"
          ? "Elevated"
          : "Quiet";

  let headline = `${p.node.name} · ${stLabel}`;
  if (p.maxMag >= 6) headline = `${p.node.name} · M${p.maxMag.toFixed(1)}`;
  else if (p.rateBoost >= 1.5 && p.recent6h.length >= 3)
    headline = `${p.node.name} · swarm pulse`;

  const bits: string[] = [];
  if (p.m6 > 0) bits.push(`${p.m6}× M6+ in window`);
  else if (p.m5 > 0) bits.push(`${p.m5}× M5+`);
  if (p.maxMag > 0) bits.push(`max M${p.maxMag.toFixed(1)}`);
  bits.push(`${p.all.length} events in zone`);
  if (p.recent6h.length > 0) bits.push(`${p.recent6h.length} in last 6h`);
  if (p.newestAgeMs != null) bits.push(`newest ${ageLabel(p.newestAgeMs)}`);

  let summary: string;
  if (p.rateBoost >= 1.5 && p.recent6h.length >= 3) {
    summary = `${p.node.name} is running hot — ${p.recent6h.length} events in 6h (${p.all.length} in view, max M${p.maxMag.toFixed(1)}). ${
      pub ? `Authority ${pub.authority}. ` : ""
    }Not a forecast — open focus or full board for catalog detail.`;
  } else if (p.maxMag >= 6 && p.strongest) {
    const place = p.strongest.properties.place || "region";
    summary = `Strong event M${p.maxMag.toFixed(1)} near ${place} · zone status ${stLabel.toLowerCase()}. ${bits.slice(0, 3).join(" · ")}.`;
  } else if (p.status === "watch" || p.status === "active") {
    const focusLead = p.node.focusNote
      ? `${p.node.focusNote.split(".")[0]}.`
      : "Watch the map cluster.";
    summary = `${p.node.name} ${stLabel.toLowerCase()}: ${bits.join(" · ")}. ${focusLead}`;
  } else if (p.status === "elevated") {
    summary = `${p.node.name} elevated activity — ${bits.join(" · ")}.`;
  } else {
    summary = `${p.node.name}: ${bits.join(" · ") || "quiet in filters"}.`;
  }

  const stats = [
    p.all.length ? `${p.all.length} eq` : null,
    p.maxMag > 0 ? `M${p.maxMag.toFixed(1)}` : null,
    p.m5 > 0 ? `${p.m5}×M5+` : null,
    p.recent6h.length ? `${p.recent6h.length}/6h` : null,
    p.newestAgeMs != null ? ageLabel(p.newestAgeMs) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const actions: StoryAction[] = [
    {
      id: `focus-${p.node.id}`,
      label: "Focus map",
      focusNodeId: p.node.id,
    },
  ];
  if (p.strongest) {
    const [lon, lat] = p.strongest.geometry.coordinates;
    const depth = p.strongest.geometry.coordinates[2];
    actions.push({
      id: `ev-${p.strongest.id ?? "strong"}`,
      label: p.maxMag >= 5 ? `M${p.maxMag.toFixed(1)} detail` : "Strongest",
      eventId: p.strongest.id != null ? String(p.strongest.id) : undefined,
      lat,
      lon,
      mag: p.strongest.properties.mag ?? undefined,
      place: p.strongest.properties.place ?? undefined,
      depth: typeof depth === "number" ? depth : undefined,
      time: p.strongest.properties.time,
      url: p.strongest.properties.url,
      focusNodeId: p.node.id,
    });
  }
  if (boardUrl) {
    actions.push({
      id: `board-${p.node.id}`,
      label: pub ? "Full board" : "Monitor",
      boardUrl,
      focusNodeId: p.node.id,
    });
  }

  return {
    id: `node-${p.node.id}`,
    kind: "node",
    urgency,
    score,
    headline,
    summary,
    stats,
    where: p.node.name,
    status: p.status,
    nodeId: p.node.id,
    eventId: p.strongest?.id != null ? String(p.strongest.id) : undefined,
    actions,
  };
}

function globalBeats(features: EqFeature[], now: number): ActivityStory[] {
  const stories: ActivityStory[] = [];
  const strong = features
    .filter((f) => (f.properties.mag ?? 0) >= 6)
    .sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));

  for (const f of strong.slice(0, 3)) {
    const mag = f.properties.mag ?? 0;
    const place = f.properties.place || "Unknown";
    const t = f.properties.time;
    const age = t != null ? now - t : null;
    const [lon, lat] = f.geometry.coordinates;
    const depth = f.geometry.coordinates[2];
    const fresh = age != null && age < 24 * 3_600_000;
    stories.push({
      id: `global-${f.id ?? `${lat}_${lon}_${t}`}`,
      kind: "global",
      urgency: mag >= 7 || (fresh && age! < 6 * 3_600_000) ? "now" : "watch",
      score:
        70 + mag * 10 + (fresh ? 15 : 0) + (age != null && age < 3_600_000 ? 20 : 0),
      headline: `M${mag.toFixed(1)} · ${place.length > 42 ? `${place.slice(0, 40)}…` : place}`,
      summary: `Strong global event M${mag.toFixed(1)} near ${place}${
        age != null ? ` · ${ageLabel(age)}` : ""
      }. Agency links on the event card — not a forecast.`,
      stats: [
        `M${mag.toFixed(1)}`,
        age != null ? ageLabel(age) : null,
        typeof depth === "number" ? `${Math.abs(depth).toFixed(0)} km` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      where: place,
      eventId: f.id != null ? String(f.id) : undefined,
      actions: [
        {
          id: `pick-${f.id}`,
          label: "Event detail",
          eventId: f.id != null ? String(f.id) : undefined,
          lat,
          lon,
          mag,
          place,
          depth: typeof depth === "number" ? depth : undefined,
          time: t,
          url: f.properties.url,
        },
        { id: "map-global", label: "Live map", tab: "live" },
      ],
    });
  }

  const recentM5 = features.filter((f) => {
    const mag = f.properties.mag ?? 0;
    const t = f.properties.time;
    return mag >= 5 && mag < 6 && typeof t === "number" && now - t <= 6 * 3_600_000;
  });
  if (recentM5.length >= 3) {
    const max = recentM5.reduce((m, f) => Math.max(m, f.properties.mag ?? 0), 0);
    stories.push({
      id: "global-m5-burst",
      kind: "global",
      urgency: "elevated",
      score: 45 + recentM5.length * 3 + max * 4,
      headline: `${recentM5.length}× M5+ in 6h (global)`,
      summary: `Catalog shows ${recentM5.length} moderate-strong (M5–6) events in the last six hours, max M${max.toFixed(1)}. Scan the map for clusters — not a forecast.`,
      stats: `${recentM5.length} events · max M${max.toFixed(1)}`,
      where: "Global",
      actions: [{ id: "live", label: "Live map", tab: "live" }],
    });
  }

  return stories;
}

function volcanoBeats(alerts: UsgsVolcanoAlert[]): ActivityStory[] {
  const elevated = alerts.filter((a) => {
    const lvl = `${a.colorCode || ""} ${a.alertLevel || ""}`.toUpperCase();
    return lvl && !lvl.includes("GREEN") && !lvl.includes("NORMAL");
  });
  if (!elevated.length) return [];

  const hot = elevated.filter((a) =>
    /ORANGE|RED|WATCH|WARNING/i.test(`${a.colorCode} ${a.alertLevel}`),
  );
  const top = (hot.length ? hot : elevated).slice(0, 4);
  const names = top.map((a) => a.name || "Volcano").join(" · ");

  return [
    {
      id: "volc-elevated",
      kind: "volcano",
      urgency: hot.length ? "watch" : "elevated",
      score: 40 + hot.length * 12 + elevated.length * 3,
      headline:
        hot.length > 0
          ? `${hot.length} volcano watch/orange+`
          : `${elevated.length} elevated volcanoes`,
      summary: `Elevated aviation/alert codes: ${names}. Open Volc list or focus a node — agency notices are authoritative.`,
      stats: `${elevated.length} elevated · ${hot.length} watch+`,
      where: "Volcanoes",
      actions: [{ id: "volc-live", label: "Live map", tab: "live" }],
    },
  ];
}

function solarBeat(
  solar: SolarAssessment | null,
  scales: NoaaScales | null,
): ActivityStory | null {
  const g = scaleNum(scales?.G);
  const r = scaleNum(scales?.R);
  const s = scaleNum(scales?.S);
  const attn = solar?.attention ?? 0;
  if (g < 1 && r < 1 && s < 1 && attn < 35) return null;

  const urgency: StoryUrgency =
    g >= 3 || s >= 2 || r >= 3 || attn >= 70
      ? "now"
      : g >= 1 || s >= 1 || r >= 2 || attn >= 45
        ? "watch"
        : "elevated";

  return {
    id: "solar-stack",
    kind: "solar",
    urgency,
    score: 30 + g * 15 + r * 10 + s * 12 + Math.min(25, attn / 3),
    headline:
      g >= 1
        ? `Geomagnetic G${g}`
        : s >= 1
          ? `Radiation S${s}`
          : r >= 1
            ? `Radio R${r}`
            : `Solar attention ${Math.round(attn)}`,
    summary:
      solar?.impact?.summary ||
      `Space weather stack: R${scales?.R ?? "—"} S${scales?.S ?? "—"} G${scales?.G ?? "—"}. See Solar tab for SWPC detail.`,
    stats: `R${scales?.R ?? "—"} · S${scales?.S ?? "—"} · G${scales?.G ?? "—"}`,
    where: "Space weather",
    actions: [{ id: "solar", label: "Solar", tab: "solar" }],
  };
}

/**
 * Build ranked activity stories from live store slices.
 */
export function buildActivityStory(opts: {
  features: EqFeature[] | undefined;
  extraNodes?: DragonNode[];
  volcAlerts?: UsgsVolcanoAlert[];
  solar?: SolarAssessment | null;
  scales?: NoaaScales | null;
  now?: number;
}): ActivityStoryBundle {
  const now = opts.now ?? Date.now();
  const features = opts.features ?? [];
  const nodeMap = new Map<string, DragonNode>();
  for (const n of DRAGON_NODES) nodeMap.set(n.id, n);
  for (const n of opts.extraNodes ?? []) {
    if (!nodeMap.has(n.id) || n.kind === "volcano") nodeMap.set(n.id, n);
  }

  const stories: ActivityStory[] = [];

  for (const node of nodeMap.values()) {
    const pulse = zonePulse(features, node, now);
    const s = storyForZone(pulse);
    if (s) stories.push(s);
  }

  stories.push(...globalBeats(features, now));
  stories.push(...volcanoBeats(opts.volcAlerts ?? []));
  const sol = solarBeat(opts.solar ?? null, opts.scales ?? null);
  if (sol) stories.push(sol);

  stories.sort((a, b) => {
    const ur = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (ur !== 0) return ur;
    return b.score - a.score;
  });

  // Prefer node stories; keep one global entry per event id
  const seenEvents = new Set<string>();
  const seenIds = new Set<string>();
  const deduped: ActivityStory[] = [];
  for (const s of stories) {
    if (seenIds.has(s.id)) continue;
    if (s.eventId && seenEvents.has(s.eventId) && s.kind === "global") continue;
    seenIds.add(s.id);
    if (s.eventId) seenEvents.add(s.eventId);
    deduped.push(s);
  }

  const top = deduped.slice(0, 8);
  const hotZones = top.filter(
    (s) =>
      s.kind === "node" &&
      (s.urgency === "now" || s.urgency === "watch" || s.urgency === "elevated"),
  ).length;

  let lead: string;
  let urgency: StoryUrgency = "quiet";
  if (top.length === 0) {
    lead = "All quiet in view — no elevated zones or strong events";
    urgency = "quiet";
    top.push({
      id: "quiet",
      kind: "quiet",
      urgency: "quiet",
      score: 0,
      headline: "Stack quiet",
      summary:
        "No elevated SES nodes, M6+ events, or volcano watches in the current filters. Keep auto-refresh on — observational only, not a forecast.",
      stats: "—",
      where: "Sentinel",
      actions: [{ id: "live", label: "Live map", tab: "live" }],
    });
  } else {
    urgency = top[0]!.urgency;
    const zoneBits = top
      .filter((s) => s.kind === "node")
      .slice(0, 2)
      .map((s) => s.headline);
    lead = zoneBits.length
      ? hotZones >= 2
        ? `${hotZones} zones active · ${zoneBits[0]}`
        : zoneBits.join(" · ")
      : top[0]!.headline;
  }

  return {
    lead,
    urgency,
    stories: top,
    hotZones,
    generatedAt: now,
  };
}
