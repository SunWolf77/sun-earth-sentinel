/**
 * "Today" ops brief — plain language, live store only.
 * Not a forecast product.
 */

import type { ResonanceScore } from "@/lib/supt/probe";
import type { SolarAssessment } from "@/lib/solar/suptInterpreter";
import { earthDirectedCmes, cmeImpactSummary } from "@/lib/feeds/donki";
import type { DonkiCme } from "@/lib/feeds/donki";
import type { NoaaScales, KpPoint } from "@/lib/feeds/swpc";

export type RecPriority = "now" | "watch" | "context" | "ok";

export type Recommendation = {
  id: string;
  priority: RecPriority;
  title: string;
  detail: string;
  tab?: "live" | "solar" | "resonance" | "analytics" | "about";
};

export type TodayBrief = {
  /** Compact chip line */
  line: string;
  /** One short headline */
  headline: string;
  solarAttn: number;
  scales: string;
  earthD: string;
  earthSep: boolean;
  cmeEta: string | null;
  level: "quiet" | "watch" | "elevated" | "storm";
  recommendations: Recommendation[];
  /** Live geomagnetic */
  kpLatest: number | null;
  kpPeak24h: number | null;
  /** Peak G from prior SWPC block when higher than now */
  gPeak: number | null;
  gNow: number;
};

function scaleNum(raw: string | undefined | null): number {
  if (raw == null || raw === "—" || raw === "") return 0;
  const m = String(raw).match(/(\d)/);
  return m ? Number(m[1]) : 0;
}

function scaleLine(scales: NoaaScales | null, kpLatest: number | null): string {
  if (!scales) return "R/S/G …";
  const gNow = scaleNum(scales.G);
  const gPrev = scaleNum(scales.GPrev);
  const peak = Math.max(gNow, gPrev);
  let gBit = `G${gNow}`;
  if (peak > gNow) gBit += ` (peak G${peak})`;
  const kpBit = kpLatest != null ? ` · Kp ${kpLatest.toFixed(1)}` : "";
  return `R${scales.R} S${scales.S} ${gBit}${kpBit}`;
}

function kpStats(kp: KpPoint[]): { latest: number | null; peak24h: number | null } {
  if (!kp?.length) return { latest: null, peak24h: null };
  const now = Date.now();
  const day = 24 * 3600_000;
  let latest: number | null = null;
  let peak: number | null = null;
  for (const p of kp) {
    const v = Number(p.Kp);
    if (!Number.isFinite(v)) continue;
    const t = p.time_tag ? Date.parse(p.time_tag) : NaN;
    if (Number.isFinite(t) && now - t > day) continue;
    if (latest == null) latest = v; // series usually oldest→newest; update always
    latest = v;
    if (peak == null || v > peak) peak = v;
  }
  // prefer last point as latest
  const last = kp[kp.length - 1];
  if (last && Number.isFinite(Number(last.Kp))) latest = Number(last.Kp);
  return { latest, peak24h: peak };
}

export function buildTodayBrief(opts: {
  solar: SolarAssessment | null;
  seismic: ResonanceScore | null;
  scales: NoaaScales | null;
  cmes: DonkiCme[];
  kp?: KpPoint[];
}): TodayBrief {
  const solar = opts.solar;
  const seismic = opts.seismic;
  const attn = solar?.attention ?? 0;
  const { latest: kpLatest, peak24h: kpPeak24h } = kpStats(opts.kp ?? []);

  const gNow = scaleNum(opts.scales?.G);
  const gPrev = scaleNum(opts.scales?.GPrev);
  const gPeak = Math.max(gNow, gPrev) || null;
  const g1 = scaleNum(opts.scales?.G1);

  // Level: prefer official G / Kp, not only SUPT attention
  let level: TodayBrief["level"] = "quiet";
  if (gNow >= 3 || (kpLatest != null && kpLatest >= 7) || attn >= 75) level = "storm";
  else if (gNow >= 2 || (gPeak != null && gPeak >= 2) || (kpLatest != null && kpLatest >= 5) || attn >= 50)
    level = "elevated";
  else if (gNow >= 1 || g1 >= 1 || (kpLatest != null && kpLatest >= 4) || attn >= 35) level = "watch";
  else level = solar?.impact.level ?? "quiet";

  const earthD =
    seismic?.d_ij != null ? `d=${seismic.d_ij.toFixed(2)}` : "quiet";
  const earthSep = !!(seismic?.separated && seismic.d_ij != null);

  const earth = earthDirectedCmes(opts.cmes);
  const next = earth
    .map((c) => cmeImpactSummary(c))
    .filter((x) => {
      if (!x.eta) return false;
      const t = new Date(x.eta).getTime();
      // drop stale ETAs more than 6h in the past
      return Number.isFinite(t) && t > Date.now() - 6 * 3600_000;
    })
    .sort((a, b) => (a.eta || "").localeCompare(b.eta || ""))[0];
  const cmeEta = next?.eta
    ? new Date(next.eta).toISOString().slice(0, 16).replace("T", " ") + "Z"
    : null;

  const scalesStr = scaleLine(opts.scales, kpLatest);

  // Plain headline
  let headline: string;
  if (gNow >= 1) {
    headline = `Geomagnetic now G${gNow}${opts.scales?.GText ? ` (${opts.scales.GText})` : ""}`;
  } else if (gPeak != null && gPeak >= 2) {
    headline = `G now 0 · recent peak G${gPeak}${opts.scales?.GPrevText ? ` (${opts.scales.GPrevText})` : ""}`;
  } else if (kpLatest != null && kpLatest >= 5) {
    headline = `Kp ${kpLatest.toFixed(1)} elevated · G scale now ${gNow}`;
  } else if (cmeEta) {
    headline = `Earth-directed CME · ETA ${cmeEta}`;
  } else {
    headline = `Space weather quiet · ${scalesStr}`;
  }

  const lineParts = [
    scalesStr,
    kpPeak24h != null && (kpLatest == null || kpPeak24h > (kpLatest ?? 0) + 0.5)
      ? `Kp24h max ${kpPeak24h.toFixed(1)}`
      : null,
    cmeEta ? `CME ${cmeEta}` : null,
    earthSep ? "EQ timing unusual" : null,
  ].filter(Boolean);

  const recs: Recommendation[] = [];

  const R = scaleNum(opts.scales?.R);
  const S = scaleNum(opts.scales?.S);

  if (S >= 1 || solar?.protons.sLike) {
    recs.push({
      id: "protons",
      priority: S >= 2 ? "now" : "watch",
      title: `Radiation S${S || "·"}`,
      detail: "Elevated protons — polar HF / aviation context. See Solar.",
      tab: "solar",
    });
  }
  if (R >= 1) {
    recs.push({
      id: "radio",
      priority: R >= 3 ? "now" : "watch",
      title: `Radio R${R}`,
      detail: "HF dayside can fade in flares. Check GOES X-ray on Solar.",
      tab: "solar",
    });
  }
  if (gNow >= 1 || (gPeak != null && gPeak >= 2) || (kpLatest != null && kpLatest >= 5)) {
    recs.push({
      id: "geo",
      priority: gNow >= 3 || (kpLatest != null && kpLatest >= 7) ? "now" : "watch",
      title:
        gNow >= 1
          ? `Geomagnetic G${gNow}`
          : gPeak != null && gPeak >= 2
            ? `Recent peak G${gPeak}`
            : `Kp ${kpLatest?.toFixed(1)}`,
      detail:
        gNow >= 1
          ? "Aurora / GNSS / grid context. Official: SWPC G-scale."
          : `Now G${gNow}; prior period reached G${gPeak ?? "—"}. Live Kp ${kpLatest?.toFixed(1) ?? "—"}.`,
      tab: "solar",
    });
  }
  if (cmeEta && next) {
    const hours = (new Date(next.eta!).getTime() - Date.now()) / 3_600_000;
    recs.push({
      id: "cme",
      priority: hours >= 0 && hours < 36 ? "now" : "watch",
      title: hours < 0 ? "CME window (recent)" : hours < 36 ? "CME arriving soon" : "CME inbound",
      detail: `Model ETA ${cmeEta}${
        next.kpHint != null ? ` · Kp~${next.kpHint}` : ""
      }. ±6–12 h typical. Solar → models.`,
      tab: "solar",
    });
  }
  if (earthSep) {
    recs.push({
      id: "earth-supt",
      priority: "context",
      title: "EQ timing unusual",
      detail: "Catalog spacing differs from random — Rhythm for detail. Not a forecast.",
      tab: "resonance",
    });
  }

  if (!recs.length) {
    recs.push({
      id: "quiet",
      priority: "ok",
      title: "Stack quiet",
      detail: "No elevated R/S/G now. Map + Solar on normal refresh.",
      tab: "live",
    });
  }

  const seen = new Set<string>();
  const recommendations = recs
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .slice(0, 5);
  const rank: Record<RecPriority, number> = { now: 0, watch: 1, context: 2, ok: 3 };
  recommendations.sort((a, b) => rank[a.priority] - rank[b.priority]);

  return {
    line: lineParts.join(" · "),
    headline,
    solarAttn: attn,
    scales: scalesStr,
    earthD,
    earthSep,
    cmeEta,
    level,
    recommendations,
    kpLatest,
    kpPeak24h,
    gPeak: gPeak && gPeak > 0 ? gPeak : null,
    gNow,
  };
}
