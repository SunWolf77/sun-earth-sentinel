import type { NoaaScales, SolarWind } from "@/lib/feeds/swpc";
import type { DonkiCme } from "@/lib/feeds/donki";
import { cmeImpactSummary, earthDirectedCmes } from "@/lib/feeds/donki";

export type ImpactLevel = "quiet" | "watch" | "elevated" | "storm";

export type ImpactCard = {
  level: ImpactLevel;
  title: string;
  summary: string;
  bullets: string[];
  color: "ok" | "primary" | "gold" | "warn" | "danger";
};

function scaleNum(s: string | undefined): number {
  const n = parseInt(String(s ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Plain-language Earth-impact briefing from NOAA scales + L1 wind + DONKI CMEs.
 * Not an official forecast — synthesizes free public products.
 * Tone: calm when quiet; escalate only on official scales / clear drivers.
 */
export function buildImpactBrief(opts: {
  scales: NoaaScales | null;
  wind: SolarWind | null;
  kp: number | null;
  xClass: string;
  cmes: DonkiCme[];
}): ImpactCard {
  const { scales, wind, kp, xClass, cmes } = opts;
  const R = scaleNum(scales?.R);
  const S = scaleNum(scales?.S);
  const G = scaleNum(scales?.G);
  const maxScale = Math.max(R, S, G);
  const earthCmes = earthDirectedCmes(cmes);
  const nextEta = earthCmes
    .map((c) => cmeImpactSummary(c))
    .filter((x) => {
      if (!x.eta) return false;
      const t = Date.parse(x.eta);
      return Number.isFinite(t) && t > Date.now() - 6 * 3600_000;
    })
    .sort((a, b) => (a.eta || "").localeCompare(b.eta || ""))[0];

  const southBz = wind?.bz != null && wind.bz <= -5;
  const fastWind = wind?.speed != null && wind.speed >= 550;
  const highKp = kp != null && kp >= 5;
  const strongFlare = /^[MX]/i.test(xClass);

  const bullets: string[] = [];

  if (R >= 3) {
    bullets.push(
      `Radio blackout R${R}: HF radio & some GNSS on dayside Earth can degrade during the flare.`,
    );
  } else if (R >= 1) {
    bullets.push(`Radio blackout R${R}: brief HF fade possible on the sunlit side.`);
  } else if (strongFlare) {
    bullets.push(`24 h flare peak ${xClass}: scales still low — flare already occurred or effects limited.`);
  }

  if (S >= 2) {
    bullets.push(
      `Solar radiation S${S}: elevated energetic protons — polar HF & satellite context.`,
    );
  } else if (S >= 1) {
    bullets.push(`Solar radiation S${S}: minor proton event.`);
  }

  if (G >= 3) {
    bullets.push(
      `Geomagnetic G${G}: grid / mid-latitude aurora / GNSS-HF disruption more likely — use SWPC alerts for ops.`,
    );
  } else if (G >= 1) {
    bullets.push(
      `Geomagnetic G${G}: high-latitude activity up; minor satellite/GNSS effects possible.`,
    );
  } else if (highKp) {
    bullets.push(`Kp ${kp?.toFixed(1)}: elevated activity while G-scale is still 0.`);
  }

  if (southBz) {
    bullets.push(
      `Bz ${wind!.bz!.toFixed(1)} nT (south): coupling favorable if it holds.`,
    );
  }
  if (fastWind) {
    bullets.push(`Solar wind ~${Math.round(wind!.speed!)} km/s: fast stream.`);
  }

  if (nextEta?.eta) {
    const when = new Date(nextEta.eta).toUTCString().replace("GMT", "UTC");
    bullets.push(
      `Earth-directed CME · modeled arrival ≈ ${when}${
        nextEta.kpHint != null ? ` · model Kp ~${nextEta.kpHint}` : ""
      }.`,
    );
  } else if (earthCmes.length) {
    bullets.push(
      `${earthCmes.length} Earth-directed CME(s) in DONKI — check Catalogs for ETA detail.`,
    );
  }

  if (!bullets.length) {
    bullets.push("R/S/G at baseline. No urgent scale-driven impacts.");
  }

  bullets.push("Observation only — SWPC is authority for watches/warnings.");

  // Escalate only on real drivers — not "lots of catalog CMEs"
  let level: ImpactLevel = "quiet";
  let title = "Quiet";
  let color: ImpactCard["color"] = "ok";
  let summary = "Official scales look calm.";

  if (maxScale >= 3 || (highKp && G >= 2)) {
    level = "storm";
    title = "Storm scales";
    color = "danger";
    summary = "Elevated NOAA R/S/G — prioritize official SWPC products for safety-critical systems.";
  } else if (maxScale >= 2 || (highKp && southBz) || (nextEta && maxScale >= 1)) {
    level = "elevated";
    title = "Elevated";
    color = "warn";
    summary = "Clear drivers on scales and/or wind — monitor, not alarm.";
  } else if (maxScale >= 1 || highKp || nextEta || (strongFlare && southBz)) {
    level = "watch";
    title = "Watch";
    color = "gold";
    summary = "Minor activity or a CME window — worth a glance, not a red alert.";
  } else if (strongFlare || (fastWind && southBz)) {
    level = "watch";
    title = "Watch";
    color = "gold";
    summary = "Secondary drivers present; official scales still low.";
  }

  if (scales?.RMinorProb && maxScale >= 1) {
    bullets.splice(
      -1,
      0,
      `SWPC day-1 probs: R minor ~${scales.RMinorProb}% · S ~${scales.SProb ?? "—"}% · G ${scales.G1 ?? "—"}.`,
    );
  }

  return { level, title, summary, bullets: bullets.slice(0, 6), color };
}
