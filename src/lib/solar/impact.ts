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
    .filter((x) => x.eta)
    .sort((a, b) => (a.eta || "").localeCompare(b.eta || ""))[0];

  const southBz = wind?.bz != null && wind.bz <= -5;
  const fastWind = wind?.speed != null && wind.speed >= 550;
  const highKp = kp != null && kp >= 5;
  const strongFlare = /^[MX]/i.test(xClass);

  const bullets: string[] = [];

  // Radio (R)
  if (R >= 3) {
    bullets.push(
      `Radio blackout R${R}: HF radio & some GNSS on dayside Earth can degrade during the flare.`,
    );
  } else if (R >= 1) {
    bullets.push(`Radio blackout R${R}: brief HF fade possible on the sunlit side.`);
  } else if (strongFlare) {
    bullets.push(`Flare class ${xClass}: watch for shortwave radio effects if it peaks higher.`);
  }

  // Radiation (S)
  if (S >= 2) {
    bullets.push(
      `Solar radiation S${S}: elevated energetic protons — aviation polar routes & satellite ops may see elevated risk.`,
    );
  } else if (S >= 1) {
    bullets.push(`Solar radiation S${S}: minor proton event — polar HF & some spacecraft sensors may notice.`);
  }

  // Geomagnetic (G)
  if (G >= 3) {
    bullets.push(
      `Geomagnetic G${G}: power-grid operators on alert; aurora possible at mid-latitudes; GNSS/HF disruption more likely.`,
    );
  } else if (G >= 1) {
    bullets.push(
      `Geomagnetic G${G}: weak–moderate storming — high-latitude aurora more active; minor satellite drag/GNSS effects possible.`,
    );
  } else if (highKp) {
    bullets.push(`Kp ${kp?.toFixed(1)}: elevated geomagnetic activity even if G-scale is still 0.`);
  }

  if (southBz) {
    bullets.push(
      `Bz ${wind!.bz!.toFixed(1)} nT (south): IMF coupling is favorable for geomagnetic response if it holds.`,
    );
  }
  if (fastWind) {
    bullets.push(`Solar wind ~${Math.round(wind!.speed!)} km/s: fast stream — can drive activity at Earth.`);
  }

  if (nextEta?.eta) {
    const when = new Date(nextEta.eta).toUTCString().replace("GMT", "UTC");
    bullets.push(
      `Modeled CME arrival window ≈ ${when}${
        nextEta.kpHint != null ? ` · model Kp up to ~${nextEta.kpHint}` : ""
      }.`,
    );
  } else if (earthCmes.length) {
    bullets.push(
      `${earthCmes.length} recent CME(s) flagged Earth-directed in DONKI/ENLIL — check arrival estimates below.`,
    );
  } else if (cmes.length) {
    bullets.push(`${cmes.length} CME(s) cataloged in the last week; none currently flagged as strong Earth hits.`);
  }

  if (!bullets.length) {
    bullets.push("No major R/S/G storm levels right now. Keep watching flares, LASCO CMEs, and L1 wind.");
  }

  bullets.push(
    "Impacts vary by longitude, technology, and latitude — always cross-check NOAA SWPC for official watches/warnings.",
  );

  let level: ImpactLevel = "quiet";
  let title = "Quiet to unsettled";
  let color: ImpactCard["color"] = "ok";
  let summary = "Earth environment looks relatively calm on official NOAA scales.";

  if (maxScale >= 3 || (highKp && southBz && fastWind)) {
    level = "storm";
    title = "Storm conditions";
    color = "danger";
    summary = "Elevated storm scales — prioritize official SWPC alerts for ops & safety-critical systems.";
  } else if (maxScale >= 1 || nextEta || highKp || (strongFlare && southBz)) {
    level = "elevated";
    title = "Elevated watch";
    color = "warn";
    summary = "Something is cooking — flare, wind, and/or CME context warrants closer monitoring.";
  } else if (strongFlare || fastWind || southBz || cmes.length > 2) {
    level = "watch";
    title = "Watchful quiet";
    color = "gold";
    summary = "Scales are low, but the Sun is active enough to watch for evolution.";
  }

  if (scales?.RMinorProb) {
    bullets.splice(
      -1,
      0,
      `SWPC day-1 probabilities: R (minor) ~${scales.RMinorProb}% · S ~${scales.SProb ?? "—"}% · G forecast ${scales.G1 ?? "—"}.`,
    );
  }

  return { level, title, summary, bullets: bullets.slice(0, 7), color };
}
