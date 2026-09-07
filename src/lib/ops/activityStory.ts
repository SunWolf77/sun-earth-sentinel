/**
 * Activity Story — rule-based "what's unfolding" for SES.
 * SUPT-aligned: catch real signals, do not invent smoke.
 * High-baseline Ring of Fire arcs are contextualized against ordinary pace.
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
import { isAgencyElevated } from "@/lib/feeds/globalVolcanoAlerts";
import { RAISED, isFresh } from "@/lib/ops/raisedTimeout";
import type { SolarAssessment } from "@/lib/solar/suptInterpreter";
import type { NoaaScales } from "@/lib/feeds/swpc";
import {
  collapseFieldTwins,
  PROFILE_STORY,
  samePhysicalFeature,
} from "@/lib/seismology/sameEvent";
import { formatMagField } from "@/lib/seismology/magResolution";

export type StoryKind = "node" | "global" | "volcano" | "solar" | "quiet";
/** now = standout signal; watch = worth a look; elevated = mild above baseline; context = ordinary */
export type StoryUrgency = "now" | "watch" | "elevated" | "context" | "quiet";

export type StoryAction = {
  id: string;
  label: string;
  focusNodeId?: string;
  eventId?: string;
  lat?: number;
  lon?: number;
  mag?: number;
  place?: string;
  depth?: number;
  time?: number | null;
  url?: string;
  boardUrl?: string;
  tab?: "live" | "solar" | "resonance" | "analytics" | "about";
};

export type ActivityStory = {
  id: string;
  kind: StoryKind;
  urgency: StoryUrgency;
  score: number;
  headline: string;
  summary: string;
  stats: string;
  where: string;
  status?: NodeStatus;
  nodeId?: string;
  eventId?: string;
  actions: StoryAction[];
};

export type ActivityStoryBundle = {
  lead: string;
  urgency: StoryUrgency;
  stories: ActivityStory[];
  /** Zones with true above-baseline signal (not ordinary RoF traffic) */
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

/** High-baseline arcs — ordinary week traffic is not an alarm. */
const HIGH_BASELINE_IDS = new Set([
  "japan",
  "kamchatka",
  "tonga",
  "alaska",
  "andes",
  "southsandwich",
  "cascadia",
]);

/** Soft expected M3.5+ counts per day for baseline comparison (order-of-magnitude). */
const BASELINE_PER_DAY: Record<string, number> = {
  japan: 8,
  kamchatka: 4,
  tonga: 3,
  alaska: 3,
  andes: 2,
  southsandwich: 1.5,
  cascadia: 0.4,
  mediterranean: 6, // CF microseismicity when authority feed present
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

function windowDays(win: string): number {
  switch (win) {
    case "hour":
      return 1 / 24;
    case "day":
      return 1;
    case "week":
      return 7;
    case "month":
      return 30;
    default:
      return 7;
  }
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
  m6_48h: number;
  m6AgeMs: number | null;
  strongestAgeMs: number | null;
  newestAgeMs: number | null;
  strongest: EqFeature | null;
  /** events/day vs soft baseline (>1 = busier than ordinary) */
  relativeRate: number;
  highBaseline: boolean;
};

function zonePulse(
  features: EqFeature[],
  node: DragonNode,
  now: number,
  timeWindow: string,
): ZonePulse {
  const minMag = node.publishedFocus || node.watchPriority ? 2.5 : 3.5;
  const all = featuresInNode(features, node, minMag);
  const h6 = 6 * 3_600_000;
  const h24 = 24 * 3_600_000;
  const h48 = 48 * 3_600_000;
  const recent6h = all.filter(
    (f) => typeof f.properties.time === "number" && now - f.properties.time! <= h6,
  );
  const recent24h = all.filter(
    (f) => typeof f.properties.time === "number" && now - f.properties.time! <= h24,
  );
  let maxMag = 0;
  let m5 = 0;
  let m6 = 0;
  let m6_48h = 0;
  let newest = 0;
  let strongest: EqFeature | null = null;
  let m6AgeMs: number | null = null;
  for (const f of all) {
    const mag = f.properties.mag ?? 0;
    const t = f.properties.time ?? 0;
    if (mag > maxMag) {
      maxMag = mag;
      strongest = f;
    }
    if (mag >= 5) m5++;
    if (mag >= 6) {
      m6++;
      if (t) {
        const age = now - t;
        if (m6AgeMs == null || age < m6AgeMs) m6AgeMs = age;
      }
    }
    if (mag >= 6 && t && now - t <= h48) m6_48h++;
    if (t > newest) newest = t;
  }

  const days = Math.max(windowDays(timeWindow), 0.04);
  const perDay = all.length / days;
  const base = BASELINE_PER_DAY[node.id] ?? (node.publishedFocus ? 2 : 1);
  const relativeRate = perDay / Math.max(0.25, base);
  const highBaseline = HIGH_BASELINE_IDS.has(node.id) || !!node.publishedFocus;

  return {
    node,
    status: nodeStatus(features, node, { timeWindow, now }),
    all,
    recent6h,
    recent24h,
    maxMag,
    m5,
    m6,
    m6_48h,
    m6AgeMs,
    strongestAgeMs:
      strongest && typeof strongest.properties.time === "number"
        ? now - strongest.properties.time
        : null,
    newestAgeMs: newest ? now - newest : null,
    strongest,
    relativeRate,
    highBaseline,
  };
}

/**
 * Map pulse → story urgency. Prefer relative anomaly + freshness over raw status.
 * Ordinary RoF week traffic → context / elevated, not red "now".
 */
function storyUrgency(p: ZonePulse): StoryUrgency {
  const ageH =
    p.newestAgeMs != null ? p.newestAgeMs / 3_600_000 : 999;
  const standoutH =
    p.strongestAgeMs != null ? p.strongestAgeMs / 3_600_000 : 999;
  const m6H = p.m6AgeMs != null ? p.m6AgeMs / 3_600_000 : 999;

  // True standouts — require freshness of the strong event, not any micro aftershock
  if (p.m6_48h >= 1 && m6H < 12) return "now";
  if (p.maxMag >= 7 && standoutH < 18) return "now";
  if (
    p.recent24h.filter((f) => (f.properties.mag ?? 0) >= 5.5).length >= 1 &&
    p.relativeRate >= 1.8 &&
    ageH < 24
  )
    return "now";

  // Clear short-window burst above baseline
  if (p.recent6h.length >= 5 && p.relativeRate >= 2) return "watch";
  if (p.recent24h.length >= 8 && p.relativeRate >= 2.2) return "watch";
  if (p.m6_48h >= 1) return "watch";
  if (p.maxMag >= 7 && standoutH < 72) return "watch"; // notable, not alarm

  // Mild above baseline
  if (p.relativeRate >= 1.6 || p.status === "active") return "elevated";
  if (p.status === "watch" && !p.highBaseline) return "elevated";

  // High-baseline arcs at ordinary pace → context only
  if (p.highBaseline && p.relativeRate < 1.5 && p.m6_48h === 0) return "context";
  if (p.status === "elevated") return "context";
  return "context";
}

function pacePhrase(p: ZonePulse): string {
  if (p.relativeRate >= 2.5) return "well above ordinary pace for this corridor";
  if (p.relativeRate >= 1.6) return "a bit busier than the usual baseline";
  if (p.relativeRate >= 0.7) return "within ordinary Ring-of-Fire / corridor pace";
  return "quieter than the usual baseline for this corridor";
}

function storyForZone(p: ZonePulse): ActivityStory | null {
  // Drop empty quiet zones
  if (p.all.length === 0 && p.status === "quiet") return null;
  // Volcano agency color is volcanoBeats' job — don't mint a fake EQ story at M0.
  if (p.node.kind === "volcano" && p.all.length === 0) return null;
  // Drop low-signal context clutter on high-baseline arcs (keep thin context only if noteworthy)
  if (
    p.highBaseline &&
    p.m6 === 0 &&
    p.relativeRate < 1.15 &&
    p.recent24h.length < 3 &&
    (p.maxMag < 5.5 || (p.newestAgeMs != null && p.newestAgeMs > 3 * 86_400_000))
  ) {
    // Still allow a single soft card if there is some activity — handled below with low score
    if (p.all.length < 5) return null;
  }

  const pub = getPublishedMonitor(p.node.id);
  const boardUrl = monitorHandoffUrl(p.node.id) || p.node.monitorUrl;
  const urgency = storyUrgency(p);

  // Score: reward standouts, not raw event volume on busy arcs
  let score = 0;
  score += p.m6_48h * 40;
  score += p.m6 * 12;
  score += Math.min(24, p.m5 * 3);
  score += Math.min(30, Math.max(0, p.relativeRate - 1) * 18);
  score += Math.min(20, p.recent6h.length * 2);
  if (p.newestAgeMs != null && p.newestAgeMs < 3_600_000) score += 12;
  if (p.newestAgeMs != null && p.newestAgeMs < 24 * 3_600_000) score += 4;
  if (p.node.publishedFocus) score += 4;
  // Demote pure volume on high-baseline without anomaly
  if (p.highBaseline && p.relativeRate < 1.4 && p.m6 === 0) score *= 0.45;
  if (urgency === "context") score = Math.min(score, 28);
  if (urgency === "quiet") score = 0;

  const stLabel =
    urgency === "now"
      ? "Standout"
      : urgency === "watch"
        ? "Notable"
        : urgency === "elevated"
          ? "Busy"
          : p.highBaseline
            ? "Ordinary pace"
            : "Quiet";

  let headline = `${p.node.name} · ${stLabel}`;
  if (p.m6_48h >= 1 && p.strongest)
    headline = `${p.node.name} · M${p.maxMag.toFixed(1)} (recent)`;
  else if (urgency === "watch" && p.relativeRate >= 2)
    headline = `${p.node.name} · above baseline`;

  const bits: string[] = [];
  if (p.m6 > 0) bits.push(`${p.m6}× M6+ in window`);
  else if (p.m5 > 0) bits.push(`${p.m5}× M5+`);
  if (p.maxMag > 0) bits.push(`max M${p.maxMag.toFixed(1)}`);
  bits.push(`${p.all.length} in zone`);
  if (p.recent6h.length > 0) bits.push(`${p.recent6h.length}/6h`);
  if (p.newestAgeMs != null) bits.push(`newest ${ageLabel(p.newestAgeMs)}`);

  let summary: string;
  if (p.m6_48h >= 1 && p.strongest) {
    const place = p.strongest.properties.place || "region";
    summary = `Recent strong event M${p.maxMag.toFixed(1)} near ${place}. ${pacePhrase(p)}. ${
      pub ? `Authority ${pub.authority}.` : ""
    }`;
  } else if (urgency === "watch" || urgency === "now") {
    summary = `${p.node.name}: ${bits.join(" · ")}. ${pacePhrase(p)}. Worth a look on the map or board — still observational, not an alert product.`;
  } else if (urgency === "elevated") {
    summary = `${p.node.name} a little busier than baseline — ${bits.join(" · ")}. ${pacePhrase(p)}.`;
  } else {
    summary = `${p.node.name}: ${bits.join(" · ")}. ${pacePhrase(p)}. Normal corridor traffic unless a stronger event stands out.`;
  }

  const stats = [
    p.all.length ? `${p.all.length} eq` : null,
    p.maxMag > 0 ? `M${p.maxMag.toFixed(1)}` : null,
    p.m5 > 0 ? `${p.m5}×M5+` : null,
    p.relativeRate >= 1.5 ? `~${p.relativeRate.toFixed(1)}× baseline` : "≈ baseline",
    p.newestAgeMs != null ? ageLabel(p.newestAgeMs) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const actions: StoryAction[] = [
    { id: `focus-${p.node.id}`, label: "Focus map", focusNodeId: p.node.id },
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
  // Prefer fresh strong events — old M6 in a month window is context, not a red siren.
  // Collapse multi-agency twins first (one rupture = one story).
  const strong = collapseFieldTwins(
    features
      .filter((f) => (f.properties.mag ?? 0) >= 6)
      .sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0)),
    PROFILE_STORY,
  );

  for (const f of strong.slice(0, 4)) {
    const mag = f.properties.mag ?? 0;
    const place = f.properties.place || "Unknown";
    const t = f.properties.time;
    const age = t != null ? now - t : null;
    const [lon, lat] = f.geometry.coordinates;
    const depth = f.geometry.coordinates[2];
    const ageH = age != null ? age / 3_600_000 : 999;
    // Soften hard: catalog M7 is not a siren after the first hours.
    // now = fresh standout; watch = still notable; older = elevated/context.
    let urgency: StoryUrgency = "context";
    let score = 20 + mag * 4;
    if ((ageH < 6 && mag >= 6.5) || (ageH < 12 && mag >= 7) || (ageH < 3 && mag >= 6)) {
      urgency = "now";
      score = 75 + mag * 8;
    } else if ((ageH < 36 && mag >= 6.5) || (ageH < 72 && mag >= 7) || (ageH < 24 && mag >= 6)) {
      urgency = "watch";
      score = 50 + mag * 5;
    } else if (ageH < 72 && mag >= 6) {
      urgency = "elevated";
      score = 35 + mag * 3;
    } else {
      continue; // old window M6 is catalog, not a stacked story
    }

    const secondaryMag =
      typeof f.properties.geofonMag === "number"
        ? (f.properties.geofonMag as number)
        : null;
    const magLabel = formatMagField(mag, secondaryMag);

    stories.push({
      id: `global-${f.id ?? `${lat}_${lon}_${t}`}`,
      kind: "global",
      urgency,
      score,
      headline: `${magLabel} · ${place.length > 42 ? `${place.slice(0, 40)}…` : place}`,
      summary: `Catalog ${magLabel} near ${place}${
        age != null ? ` · ${ageLabel(age)}` : ""
      }. Agency product on the event card — recorded signal, not a warning.`,
      stats: [
        magLabel,
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
          label: "Show on map",
          eventId: f.id != null ? String(f.id) : undefined,
          lat,
          lon,
          mag,
          place,
          depth: typeof depth === "number" ? depth : undefined,
          time: t,
          url: f.properties.url,
          tab: "live",
        },
        ...(f.properties.url
          ? [
              {
                id: `agency-${f.id}`,
                label: "Agency page",
                url: f.properties.url,
                boardUrl: f.properties.url,
              },
            ]
          : []),
      ],
    });
  }

  // Soft M5 burst — only if clearly clustered in time, not normal RoF drip
  const recentM5 = features.filter((f) => {
    const mag = f.properties.mag ?? 0;
    const t = f.properties.time;
    return mag >= 5 && mag < 6 && typeof t === "number" && now - t <= 6 * 3_600_000;
  });
  if (recentM5.length >= 4) {
    const max = recentM5.reduce((m, f) => Math.max(m, f.properties.mag ?? 0), 0);
    stories.push({
      id: "global-m5-burst",
      kind: "global",
      urgency: "elevated",
      score: 40 + recentM5.length * 2,
      headline: `${recentM5.length}× M5–6 in 6h (global)`,
      summary: `Several moderate-strong events worldwide in six hours (max M${max.toFixed(1)}). Often ordinary multi-arc traffic — check map clusters before reading it as a single story.`,
      stats: `${recentM5.length} events · max M${max.toFixed(1)}`,
      where: "Global",
      actions: [{ id: "live", label: "Live map", tab: "live" }],
    });
  }

  return stories;
}

/**
 * Field-unified narrative: one rupture speaks once.
 * - Prefer node/zone story when it claims the same event (id or physical twin)
 * - Drop global cards that restate a zone standout
 * - Keep solar/volcano/quiet untouched
 */
export function unifyFieldStories(
  stories: ActivityStory[],
  features: EqFeature[],
): ActivityStory[] {
  const byId = new Map<string, EqFeature>();
  for (const f of features) {
    if (f.id != null) byId.set(String(f.id), f);
  }

  const nodes = stories.filter((s) => s.kind === "node");
  const globals = stories.filter((s) => s.kind === "global");
  const other = stories.filter((s) => s.kind !== "node" && s.kind !== "global");

  const claimedIds = new Set<string>();
  const claimedFeats: EqFeature[] = [];
  for (const n of nodes) {
    if (!n.eventId) continue;
    claimedIds.add(n.eventId);
    const f = byId.get(n.eventId);
    if (f) claimedFeats.push(f);
  }

  const keptGlobals: ActivityStory[] = [];
  for (const g of globals) {
    if (g.eventId && claimedIds.has(g.eventId)) continue;
    const gf = g.eventId ? byId.get(g.eventId) : undefined;
    if (gf) {
      let owned = false;
      for (const cf of claimedFeats) {
        if (samePhysicalFeature(gf, cf, PROFILE_STORY)) {
          owned = true;
          break;
        }
      }
      // Zone owns standout if event sits in a now/watch node bounds
      if (!owned) {
        for (const n of nodes) {
          if (n.urgency !== "now" && n.urgency !== "watch") continue;
          if (!n.nodeId) continue;
          const node = DRAGON_NODES.find((d) => d.id === n.nodeId);
          if (!node?.bounds) continue;
          const [lon, lat] = gf.geometry.coordinates;
          if (
            Number.isFinite(lat) &&
            Number.isFinite(lon) &&
            pointInBounds(lat, lon, node.bounds, 0.15)
          ) {
            owned = true;
            break;
          }
        }
      }
      if (owned) continue;
    }
    keptGlobals.push(g);
  }

  return [...nodes, ...keptGlobals, ...other];
}

function vaacFl(a: UsgsVolcanoAlert): number {
  return Number(String(a.officialNative || "").replace(/\D/g, "") || 0);
}

function volcanoBeats(alerts: UsgsVolcanoAlert[], now: number): ActivityStory[] {
  const live = alerts.filter((a) => {
    if (a.source === "gvp") return false;
    if (a.source === "vaac") return isFresh(a.sentUnix, RAISED.volc.vaacH, now);
    return true;
  });
  const hot = live.filter((a) => {
    if (a.source !== "vaac" && !isAgencyElevated(a)) return false;
    return /ORANGE|RED|WATCH|WARNING/i.test(`${a.colorCode} ${a.alertLevel}`);
  });
  const stories: ActivityStory[] = [];

  const vaacPriority = hot.filter(
    (a) =>
      a.source === "vaac" &&
      (/RED|WARNING/i.test(`${a.colorCode} ${a.alertLevel}`) ||
        vaacFl(a) >= RAISED.volc.lookMinFl),
  );
  const vaacLead = [...vaacPriority].sort((a, b) => {
    const fa = vaacFl(a);
    const fb = vaacFl(b);
    if (fb !== fa) return fb - fa;
    return (b.sentUnix ?? 0) - (a.sentUnix ?? 0);
  })[0];

  if (vaacLead) {
    const fl = vaacLead.officialNative || vaacLead.colorCode;
    const darwinN = live.filter((a) => a.source === "vaac").length;
    stories.push({
      id: `volc-vaac-${vaacLead.vnum || vaacLead.id}`,
      kind: "volcano",
      urgency: /RED|WARNING/i.test(`${vaacLead.colorCode} ${vaacLead.alertLevel}`)
        ? "watch"
        : "elevated",
      score: 70 + Math.min(40, vaacFl(vaacLead) / 10),
      headline: `${vaacLead.name} · Darwin VAAC ${fl}`,
      summary:
        "Aviation ash advisory (Darwin VAAC). Not a civil-protection alert from this desk — PVMBG / MAGMA remain the authority. We do not track the cloud.",
      stats:
        darwinN > 1
          ? `${fl} · ${darwinN} Darwin VAA (priority only)`
          : `${fl} · ${vaacLead.obsName}`,
      where: vaacLead.name,
      actions: [
        {
          id: "volc-vaac-map",
          label: "Live map",
          tab: "live",
          lat: vaacLead.lat ?? undefined,
          lon: vaacLead.lon ?? undefined,
        },
      ],
    });
  }

  // HANS / INGV / IMO orange+ only — not every standing Darwin VAA.
  const otherHot = hot.filter((a) => a.source !== "vaac");
  if (otherHot.length) {
    const names = otherHot.slice(0, 4).map((a) => a.name || "Volcano").join(" · ");
    stories.push({
      id: "volc-elevated",
      kind: "volcano",
      urgency: "watch",
      score: 45 + Math.min(4, otherHot.length) * 8,
      headline: `${otherHot.length} volcano orange/watch+`,
      summary: `Agency codes elevated: ${names}. Official aviation/alert products — not a new alert from this desk.`,
      stats: `${otherHot.length} orange+ · list on Volcanoes`,
      where: "Volcanoes",
      actions: [{ id: "volc-live", label: "Live map", tab: "live" }],
    });
  }

  return stories.slice(0, 2);
}

function solarBeat(
  solar: SolarAssessment | null,
  scales: NoaaScales | null,
): ActivityStory | null {
  const g = scaleNum(scales?.G);
  const r = scaleNum(scales?.R);
  const s = scaleNum(scales?.S);
  const attn = solar?.attention ?? 0;
  // Ignore mild attention noise
  if (g < 1 && r < 2 && s < 1 && attn < 45) return null;

  const urgency: StoryUrgency =
    g >= 3 || s >= 2 || r >= 3
      ? "now"
      : g >= 2 || s >= 1 || r >= 2 || attn >= 60
        ? "watch"
        : "elevated";

  return {
    id: "solar-stack",
    kind: "solar",
    urgency,
    score: 25 + g * 14 + r * 8 + s * 12 + Math.min(20, Math.max(0, attn - 40) / 2),
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
      `Space weather: R${scales?.R ?? "—"} S${scales?.S ?? "—"} G${scales?.G ?? "—"}. SWPC scales on Solar tab.`,
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
  timeWindow?: string;
  now?: number;
}): ActivityStoryBundle {
  const now = opts.now ?? Date.now();
  const timeWindow = opts.timeWindow || "week";
  const features = opts.features ?? [];
  const nodeMap = new Map<string, DragonNode>();
  for (const n of DRAGON_NODES) nodeMap.set(n.id, n);
  for (const n of opts.extraNodes ?? []) {
    if (!nodeMap.has(n.id) || n.kind === "volcano") nodeMap.set(n.id, n);
  }

  const stories: ActivityStory[] = [];

  for (const node of nodeMap.values()) {
    const pulse = zonePulse(features, node, now, timeWindow);
    const s = storyForZone(pulse);
    if (s) stories.push(s);
  }

  stories.push(...globalBeats(features, now));
  stories.push(...volcanoBeats(opts.volcAlerts ?? [], now));
  const sol = solarBeat(opts.solar ?? null, opts.scales ?? null);
  if (sol) stories.push(sol);

  // One rupture → one narrative. Zone owns in-corridor standouts; global keeps
  // off-corridor only. Prevents Colombia-class double mouths (GLOBAL + zone).
  const unified = unifyFieldStories(stories, features);

  unified.sort((a, b) => {
    const ur = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (ur !== 0) return ur;
    return b.score - a.score;
  });

  // Cap red "now" stories so chrome never looks like a constant alarm board
  let nowCount = 0;
  const capped: ActivityStory[] = [];
  for (const s of unified) {
    if (s.urgency === "now") {
      nowCount++;
      if (nowCount > RAISED.story.nowCap) {
        capped.push({ ...s, urgency: "watch", score: Math.min(s.score, 55) });
        continue;
      }
    }
    capped.push(s);
  }

  const seenEvents = new Set<string>();
  const seenIds = new Set<string>();
  const deduped: ActivityStory[] = [];
  for (const s of capped) {
    if (seenIds.has(s.id)) continue;
    if (s.eventId && seenEvents.has(s.eventId) && s.kind === "global") continue;
    seenIds.add(s.id);
    if (s.eventId) seenEvents.add(s.eventId);
    deduped.push(s);
  }

  // Prefer standouts; still keep a few context cards for orientation
  const top = deduped.slice(0, RAISED.story.deskCap);
  const hotZones = top.filter(
    (s) =>
      s.kind === "node" && (s.urgency === "now" || s.urgency === "watch"),
  ).length;

  let lead: string;
  let urgency: StoryUrgency = "quiet";
  if (top.length === 0) {
    lead = "Ordinary pace — no standout zones or fresh strong events";
    urgency = "quiet";
    top.push({
      id: "quiet",
      kind: "quiet",
      urgency: "quiet",
      score: 0,
      headline: "Stack calm",
      summary:
        "No above-baseline SES corridors or fresh M6+ standouts in filters. Ring of Fire traffic can still look busy on the map — that is often ordinary. Observational only.",
      stats: "—",
      where: "Sentinel",
      actions: [{ id: "live", label: "Live map", tab: "live" }],
    });
  } else {
    urgency = top[0]!.urgency;
    const standouts = top.filter(
      (s) => s.urgency === "now" || s.urgency === "watch",
    );
    if (standouts.length === 0) {
      lead = `Ordinary pace · ${top[0]!.headline}`;
      urgency = top[0]!.urgency === "quiet" ? "quiet" : "context";
    } else if (hotZones >= 2) {
      lead = `${hotZones} notable zones · ${standouts[0]!.headline}`;
    } else {
      lead = standouts[0]!.headline;
    }
  }

  return {
    lead,
    urgency,
    stories: top,
    hotZones,
    generatedAt: now,
  };
}
