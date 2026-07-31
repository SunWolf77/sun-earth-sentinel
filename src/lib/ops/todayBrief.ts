/**
 * "Today" ops brief + recommendations — grounded in live store data only.
 * Not a forecast product; triage + watch items.
 */

import type { ResonanceScore } from "@/lib/supt/probe";
import type { SolarAssessment } from "@/lib/solar/suptInterpreter";
import { earthDirectedCmes, cmeImpactSummary } from "@/lib/feeds/donki";
import type { DonkiCme } from "@/lib/feeds/donki";
import type { NoaaScales } from "@/lib/feeds/swpc";

export type RecPriority = "now" | "watch" | "context" | "ok";

export type Recommendation = {
  id: string;
  priority: RecPriority;
  title: string;
  detail: string;
  tab?: "live" | "solar" | "resonance" | "analytics" | "about";
};

export type TodayBrief = {
  line: string;
  solarAttn: number;
  scales: string;
  earthD: string;
  earthSep: boolean;
  cmeEta: string | null;
  level: "quiet" | "watch" | "elevated" | "storm";
  recommendations: Recommendation[];
};

function scaleLine(scales: NoaaScales | null): string {
  if (!scales) return "R/S/G pending";
  return `R${scales.R} · S${scales.S} · G${scales.G}`;
}

export function buildTodayBrief(opts: {
  solar: SolarAssessment | null;
  seismic: ResonanceScore | null;
  scales: NoaaScales | null;
  cmes: DonkiCme[];
}): TodayBrief {
  const solar = opts.solar;
  const seismic = opts.seismic;
  const attn = solar?.attention ?? 0;
  const level = solar?.impact.level ?? "quiet";
  const earthD =
    seismic?.d_ij != null ? `d=${seismic.d_ij.toFixed(3)}` : "d=null (quiet ok)";
  const earthSep = !!(seismic?.separated && seismic.d_ij != null);

  const earth = earthDirectedCmes(opts.cmes);
  const next = earth
    .map((c) => cmeImpactSummary(c))
    .filter((x) => x.eta)
    .sort((a, b) => (a.eta || "").localeCompare(b.eta || ""))[0];
  const cmeEta = next?.eta
    ? new Date(next.eta).toISOString().slice(0, 16).replace("T", " ") + "Z"
    : null;

  const parts = [
    `Solar attn ${attn}`,
    scaleLine(opts.scales),
    cmeEta ? `CME ETA ${cmeEta}` : "No Earth CME ETA",
    `Earth ${earthD}${earthSep ? " sep" : " null"}`,
  ];

  const recs: Recommendation[] = [];

  // Priority from scales / protons / CME
  const R = parseInt(String(opts.scales?.R ?? "0"), 10) || 0;
  const S = parseInt(String(opts.scales?.S ?? "0"), 10) || 0;
  const G = parseInt(String(opts.scales?.G ?? "0"), 10) || 0;

  if (S >= 1 || solar?.protons.sLike) {
    recs.push({
      id: "protons",
      priority: S >= 2 ? "now" : "watch",
      title: "Radiation (S-scale / protons)",
      detail:
        "Elevated energetic protons — polar HF and high-latitude aviation risk context. Check Solar proton gauges + SWPC S scale.",
      tab: "solar",
    });
  }
  if (R >= 1) {
    recs.push({
      id: "radio",
      priority: R >= 3 ? "now" : "watch",
      title: "Radio blackout context",
      detail: `R${R} — HF on the dayside can fade during flares. Watch GOES X-ray class on Solar.`,
      tab: "solar",
    });
  }
  if (G >= 1) {
    recs.push({
      id: "geo",
      priority: G >= 3 ? "now" : "watch",
      title: "Geomagnetic activity",
      detail: `G${G} — aurora / GNSS / grid context at higher latitudes. Cross-check Kp and Bz on Solar.`,
      tab: "solar",
    });
  }
  if (cmeEta) {
    const hours =
      (new Date(next!.eta!).getTime() - Date.now()) / 3_600_000;
    recs.push({
      id: "cme",
      priority: hours >= 0 && hours < 36 ? "now" : "watch",
      title: hours >= 0 && hours < 36 ? "CME arrival window open" : "Earth-directed CME on board",
      detail: `Modeled ETA ~${cmeEta}${
        next?.kpHint != null ? ` · model Kp~${next.kpHint}` : ""
      }. ENLIL ±6–12 h typical. Open Solar → Arrival models.`,
      tab: "solar",
    });
  }
  if (solar?.channels.some((c) => c.score.separated)) {
    recs.push({
      id: "solar-supt",
      priority: "context",
      title: "Solar SUPT non-null channel",
      detail:
        "At least one solar timing channel (flares/CMEs/X-ray peaks) is separated from shuffle — rhythm, not arrival. See SUPT Interpreter.",
      tab: "solar",
    });
  } else if (solar) {
    recs.push({
      id: "solar-null",
      priority: "ok",
      title: "Solar SUPT timing null",
      detail:
        "Catalog gap structure looks like shuffle. Any elevated impact is from amplitude/geometry (scales, L1, Earth CMEs), not timing order.",
      tab: "solar",
    });
  }

  if (earthSep) {
    recs.push({
      id: "earth-supt",
      priority: "context",
      title: "Earth catalog timing non-null",
      detail:
        "Seismic inter-event spacing shows structure vs chance for this window — not a mag forecast. Open Rhythm for the read.",
      tab: "resonance",
    });
  } else if (seismic?.d_ij != null) {
    recs.push({
      id: "earth-null",
      priority: "ok",
      title: "Earth catalog timing null",
      detail: "Quake gaps look like normal scatter for this filter window. Valid null.",
      tab: "resonance",
    });
  }

  if (attn >= 45 && !recs.some((r) => r.priority === "now" || r.priority === "watch")) {
    recs.unshift({
      id: "attn",
      priority: "watch",
      title: "Elevated solar attention",
      detail: `Composite attention ${attn}/100 — skim Solar gauges, DONKI, and SWPC alerts.`,
      tab: "solar",
    });
  }

  if (!recs.length) {
    recs.push({
      id: "quiet",
      priority: "ok",
      title: "Quiet stack",
      detail: "No elevated scales, Earth CME ETA, or SUPT separations. Keep map + Solar on a long refresh.",
      tab: "live",
    });
  }

  // Deduplicate by id, cap
  const seen = new Set<string>();
  const recommendations = recs
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .slice(0, 6);

  // Order: now > watch > context > ok
  const rank: Record<RecPriority, number> = { now: 0, watch: 1, context: 2, ok: 3 };
  recommendations.sort((a, b) => rank[a.priority] - rank[b.priority]);

  return {
    line: parts.join(" · "),
    solarAttn: attn,
    scales: scaleLine(opts.scales),
    earthD,
    earthSep,
    cmeEta,
    level,
    recommendations,
  };
}
