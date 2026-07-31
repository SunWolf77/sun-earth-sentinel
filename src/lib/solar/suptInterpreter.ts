/**
 * SunWolf SUPT Solar Interpreter
 * -----------------------------
 * Deterministic multi-channel assessment agent.
 * Uses the same frozen SUPT probe (α=0.01) on ordered positive sequences
 * derived from solar catalogs, then fuses with SWPC scales / L1 / ENLIL context.
 *
 * This is NOT a free-form LLM and NOT an official forecast.
 * Null / non-separated outcomes are first-class results.
 */

import {
  interEventSeconds,
  resonanceScore,
  bandPlainLabel,
  type ResonanceScore,
} from "@/lib/supt/probe";
import type { DonkiCme, DonkiFlare } from "@/lib/feeds/donki";
import { bestCmeAnalysis, cmeImpactSummary, earthDirectedCmes } from "@/lib/feeds/donki";
import type {
  NoaaScales,
  ProtonPoint,
  SolarWind,
  XrayPoint,
} from "@/lib/feeds/swpc";
import { longChannelXrays } from "@/lib/feeds/swpc";
import { buildImpactBrief, type ImpactCard } from "@/lib/solar/impact";

export type ChannelProbe = {
  id: "flares" | "cmes" | "xray_peaks";
  label: string;
  score: ResonanceScore;
  plain: string;
  nEvents: number;
};

export type SolarAssessment = {
  generatedAt: number;
  impact: ImpactCard;
  channels: ChannelProbe[];
  /** Highest-priority channel finding for the hero line */
  headline: string;
  /** Structured agent sections */
  observations: string[];
  interpretation: string[];
  watchItems: string[];
  caveats: string[];
  /** 0–100 composite attention score (ops triage, not probability) */
  attention: number;
  protons: {
    p10: number | null;
    p50: number | null;
    p100: number | null;
    time: string | null;
    sLike: boolean;
  };
  enlilNote: string;
};

function parseIsoMs(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = Date.parse(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
  return Number.isFinite(t) ? t : null;
}

function flareTimes(flares: DonkiFlare[]): number[] {
  const times: number[] = [];
  for (const f of flares) {
    const t = parseIsoMs(f.peakTime || f.beginTime || null);
    if (t != null) times.push(t);
  }
  return times;
}

function cmeTimes(cmes: DonkiCme[]): number[] {
  const times: number[] = [];
  for (const c of cmes) {
    const t = parseIsoMs(c.startTime);
    if (t != null) times.push(t);
  }
  return times;
}

/** Local maxima in long-channel GOES X-ray (M+ candidates / peaks). */
function xrayPeakTimes(xray: XrayPoint[], minFlux = 5e-6): number[] {
  const series = longChannelXrays(xray)
    .map((d) => ({
      t: parseIsoMs(d.time_tag),
      f: d.flux || d.observed_flux || 0,
    }))
    .filter((d): d is { t: number; f: number } => d.t != null)
    .sort((a, b) => a.t - b.t);
  if (series.length < 5) return [];
  const peaks: number[] = [];
  for (let i = 2; i < series.length - 2; i++) {
    const a = series[i - 2]!.f;
    const b = series[i - 1]!.f;
    const c = series[i]!.f;
    const d = series[i + 1]!.f;
    const e = series[i + 2]!.f;
    if (c >= minFlux && c >= b && c >= d && c >= a && c >= e) {
      // de-dupe peaks within 20 min
      if (!peaks.length || series[i]!.t - peaks[peaks.length - 1]! > 20 * 60_000) {
        peaks.push(series[i]!.t);
      }
    }
  }
  return peaks;
}

function channelReading(score: ResonanceScore, kind: string): string {
  if (score.d_ij == null) {
    return score.n < 4
      ? `Not enough ${kind} events for a SUPT timing read (need ≥4 gaps).`
      : `No ${kind} probe score.`;
  }
  if (!score.separated) {
    return `${kind} spacing looks like normal scatter vs shuffle (null is valid). Not a forecast.`;
  }
  const band = bandPlainLabel(score.band);
  return `${kind} timing is ${band.toLowerCase()} vs chance (d=${score.d_ij.toFixed(3)}, z=${score.z}). Rhythm only — not arrival prediction.`;
}

function latestProton(protons: ProtonPoint[], energy: string): { flux: number; time: string } | null {
  const rows = protons.filter((p) => (p.energy || "").includes(energy));
  if (!rows.length) return null;
  const last = rows[rows.length - 1]!;
  return { flux: last.flux, time: last.time_tag };
}

/**
 * Full multi-input SUPT solar assessment.
 */
export function interpretSolar(opts: {
  scales: NoaaScales | null;
  wind: SolarWind | null;
  kp: number | null;
  xClass: string;
  xray: XrayPoint[];
  cmes: DonkiCme[];
  flares: DonkiFlare[];
  protons: ProtonPoint[];
  enlilTimeHint?: string | null;
  shuffleN?: number;
}): SolarAssessment {
  const shuffleN = opts.shuffleN ?? 60;
  const impact = buildImpactBrief({
    scales: opts.scales,
    wind: opts.wind,
    kp: opts.kp,
    xClass: opts.xClass,
    cmes: opts.cmes,
  });

  const fTimes = flareTimes(opts.flares);
  const cTimes = cmeTimes(opts.cmes);
  const xPeaks = xrayPeakTimes(opts.xray);

  const flareScore = resonanceScore(interEventSeconds(fTimes), shuffleN);
  const cmeScore = resonanceScore(interEventSeconds(cTimes), shuffleN);
  const xrayScore = resonanceScore(interEventSeconds(xPeaks), shuffleN);

  const channels: ChannelProbe[] = [
    {
      id: "flares",
      label: "Flare catalog rhythm",
      score: flareScore,
      plain: channelReading(flareScore, "Flare"),
      nEvents: fTimes.length,
    },
    {
      id: "cmes",
      label: "CME catalog rhythm",
      score: cmeScore,
      plain: channelReading(cmeScore, "CME"),
      nEvents: cTimes.length,
    },
    {
      id: "xray_peaks",
      label: "GOES X-ray peak rhythm",
      score: xrayScore,
      plain: channelReading(xrayScore, "X-ray peak"),
      nEvents: xPeaks.length,
    },
  ];

  const p10 = latestProton(opts.protons, ">=10 MeV");
  const p50 = latestProton(opts.protons, ">=50 MeV");
  const p100 = latestProton(opts.protons, ">=100 MeV");
  // S1 threshold is roughly 10 pfu at ≥10 MeV (order of magnitude)
  const sLike = p10 != null && p10.flux >= 10;

  const earth = earthDirectedCmes(opts.cmes);
  const arrivals = earth
    .map((c) => ({ c, imp: cmeImpactSummary(c) }))
    .filter((x) => x.imp.eta)
    .sort((a, b) => (a.imp.eta || "").localeCompare(b.imp.eta || ""));

  const observations: string[] = [];
  observations.push(
    `NOAA scales now: R${opts.scales?.R ?? "—"} · S${opts.scales?.S ?? "—"} · G${opts.scales?.G ?? "—"} · X-ray ${opts.xClass} · Kp ${
      opts.kp != null ? opts.kp.toFixed(1) : "—"
    }.`,
  );
  if (opts.wind?.speed != null || opts.wind?.bz != null) {
    observations.push(
      `L1 solar wind: ${opts.wind.speed != null ? Math.round(opts.wind.speed) + " km/s" : "speed —"}${
        opts.wind.bz != null ? ` · Bz ${opts.wind.bz.toFixed(1)} nT` : ""
      }${opts.wind.bt != null ? ` · Bt ${opts.wind.bt.toFixed(1)} nT` : ""}${
        opts.wind.density != null ? ` · n ${opts.wind.density.toFixed(1)} cm⁻³` : ""
      }.`,
    );
  }
  observations.push(
    `Catalog window: ${opts.flares.length} flares · ${opts.cmes.length} CMEs (${earth.length} Earth-flagged) · ${xPeaks.length} GOES peaks (≥C5 local max).`,
  );
  if (p10) {
    observations.push(
      `GOES protons ≥10 MeV: ${p10.flux.toFixed(2)} pfu${sLike ? " (S1-class territory)" : ""}${
        p50 ? ` · ≥50 MeV ${p50.flux.toFixed(3)}` : ""
      }${p100 ? ` · ≥100 MeV ${p100.flux.toFixed(3)}` : ""}.`,
    );
  }
  if (arrivals[0]) {
    const a = arrivals[0]!;
    observations.push(
      `Next modeled CME arrival ≈ ${new Date(a.imp.eta!).toUTCString().replace("GMT", "UTC")}${
        a.imp.speed != null ? ` · ${Math.round(a.imp.speed)} km/s` : ""
      }${a.imp.kpHint != null ? ` · model Kp~${a.imp.kpHint}` : ""}.`,
    );
  }

  const interpretation: string[] = [];
  interpretation.push(impact.summary);
  for (const ch of channels) {
    if (ch.score.n >= 4) interpretation.push(ch.plain);
  }
  // Fuse SUPT with coupling
  const anySeparated = channels.some((c) => c.score.separated && c.score.d_ij != null);
  const south = opts.wind?.bz != null && opts.wind.bz <= -5;
  const fast = opts.wind?.speed != null && opts.wind.speed >= 550;
  if (anySeparated && (south || fast || earth.length)) {
    interpretation.push(
      "SUPT sees non-random structure in at least one solar timing channel while L1/Earth context is also disturbed — treat as elevated attention, still not a magnitude/arrival forecast from SUPT alone.",
    );
  } else if (!anySeparated && impact.level === "quiet") {
    interpretation.push(
      "SUPT timing channels are consistent with shuffle null and NOAA scales are quiet — coherent “calm stack,” but null never means “nothing can fire next hour.”",
    );
  } else if (!anySeparated && impact.level !== "quiet") {
    interpretation.push(
      "Impact stack is elevated from scales/CME/L1 even though SUPT timing is null — the driver is amplitude / Earth-directed geometry, not catalog rhythm.",
    );
  }

  // ENLIL honesty
  let enlilNote =
    "WSA-ENLIL is a physics model of heliospheric density/velocity. Arrival times are typically good to ~±6–12 h for well-observed CMEs; speed and magnetic connectivity (Bz at Earth) remain the large uncertainty. Use ENLIL + DONKI together, not either alone.";
  if (opts.enlilTimeHint) {
    enlilNote += ` Latest ENLIL frame tag: ${opts.enlilTimeHint}.`;
  }
  if (arrivals.length) {
    const speeds = arrivals
      .map((a) => a.imp.speed)
      .filter((s): s is number => s != null);
    if (speeds.some((s) => s < 300 || s > 1500)) {
      enlilNote +=
        " At least one CME speed is outside the best-constrained band — widen your arrival window.";
    }
  }

  const watchItems: string[] = [];
  for (const b of impact.bullets.slice(0, 4)) watchItems.push(b);
  if (sLike) {
    watchItems.push(
      "Proton flux elevated — polar HF, aviation high-latitude routes, and single-event effects on spacecraft are the practical concerns.",
    );
  }
  if (south && arrivals.length) {
    watchItems.push(
      "Southward Bz now + incoming CME: if the ejecta arrives while Bz stays south, geomagnetic response can step up quickly.",
    );
  }
  // Strongest recent flare
  const strong = opts.flares.find((f) => /^[MX]/i.test(f.classType || ""));
  if (strong) {
    watchItems.push(
      `Strongest recent catalog flare ${strong.classType} at ${strong.sourceLocation || "—"} — check linked CME/SEP rows in DONKI.`,
    );
  }
  // Fast CMEs
  const fastCme = opts.cmes
    .map((c) => ({ c, a: bestCmeAnalysis(c) }))
    .filter((x) => (x.a?.speed ?? 0) >= 800)
    .slice(0, 2);
  for (const x of fastCme) {
    watchItems.push(
      `Fast CME ${x.c.startTime}: ~${Math.round(x.a!.speed!)} km/s — higher uncertainty if Earth-directed.`,
    );
  }

  const caveats = [
    "SUPT on solar catalogs measures ordered structure in event spacing only — not flare class, not CME hit/miss, not Kp.",
    "DONKI times are analyst-cataloged; GOES X-ray peaks are automatic — the two channels can disagree.",
    "Solar Orbiter / STEREO frames are contextual imagery; they do not enter the SUPT numeric probe.",
    "Not an official NOAA/ESA product. Cross-check SWPC watches/warnings for ops.",
  ];

  // Attention score 0-100
  let attention = 12;
  const R = parseInt(String(opts.scales?.R ?? 0), 10) || 0;
  const S = parseInt(String(opts.scales?.S ?? 0), 10) || 0;
  const G = parseInt(String(opts.scales?.G ?? 0), 10) || 0;
  attention += R * 12 + S * 14 + G * 16;
  if (opts.kp != null) attention += Math.max(0, (opts.kp - 3) * 6);
  if (south) attention += 8;
  if (fast) attention += 6;
  if (sLike) attention += 14;
  if (arrivals.length) attention += 10 + Math.min(12, arrivals.length * 4);
  if (anySeparated) attention += 8;
  if (/^X/.test(opts.xClass)) attention += 12;
  else if (/^M/.test(opts.xClass)) attention += 6;
  attention = Math.max(0, Math.min(100, Math.round(attention)));

  const headlineParts = [impact.title];
  if (anySeparated) {
    const best = channels
      .filter((c) => c.score.separated)
      .sort((a, b) => Math.abs(b.score.z ?? 0) - Math.abs(a.score.z ?? 0))[0];
    if (best) headlineParts.push(`SUPT: ${best.label.replace(" rhythm", "")} non-null`);
  } else {
    headlineParts.push("SUPT timing null");
  }
  if (arrivals[0]?.imp.eta) {
    headlineParts.push(
      `CME ETA ${new Date(arrivals[0].imp.eta).toISOString().slice(0, 16).replace("T", " ")}Z`,
    );
  }

  return {
    generatedAt: Date.now(),
    impact,
    channels,
    headline: headlineParts.join(" · "),
    observations,
    interpretation,
    watchItems: watchItems.slice(0, 8),
    caveats,
    attention,
    protons: {
      p10: p10?.flux ?? null,
      p50: p50?.flux ?? null,
      p100: p100?.flux ?? null,
      time: p10?.time ?? p50?.time ?? null,
      sLike,
    },
    enlilNote,
  };
}
