/**
 * Historical severe space-weather catalog + live compare helpers.
 * Educational / observational only — not a forecast product.
 */

export type StormKind =
  | "extreme"
  | "severe"
  | "near-miss"
  | "modern-benchmark";

export type HistoricalStorm = {
  id: string;
  name: string;
  shortName: string;
  when: string;
  /** Approximate peak Kp if known (0–9) */
  kpPeak: number | null;
  /** Peak G-scale equivalent if known */
  gPeak: number | null;
  /** Reconstructed or measured Dst (nT); more negative = stronger */
  dstNt: number | null;
  kind: StormKind;
  blurb: string;
  impacts: string[];
  /** What a modern SES user should take away */
  lesson: string;
  /** Optional external reference */
  refs?: { label: string; href: string }[];
};

/** Curated set — keep small and accurate. */
export const HISTORICAL_STORMS: HistoricalStorm[] = [
  {
    id: "carrington",
    name: "Carrington Event",
    shortName: "Carrington 1859",
    when: "1–2 Sep 1859",
    kpPeak: 9,
    gPeak: 5,
    dstNt: -900,
    kind: "extreme",
    blurb:
      "White-light flare observed by Carrington; extreme geomagnetic storm ~17–18 h later. Telegraph systems failed and in places ran on induced current alone. Aurora reached the tropics.",
    impacts: [
      "Telegraph outages / operator shocks across Europe & North America",
      "Low-latitude aurora (Hawaii, Caribbean, Chile)",
      "Modern benchmark for “worst case” extreme space weather",
    ],
    lesson:
      "Rare extreme tail. Today the risk channel is infrastructure (grid GICs, GNSS, HF, LEO drag) — not people being “shocked by the Sun.”",
    refs: [
      {
        label: "NOAA SWPC scales",
        href: "https://www.swpc.noaa.gov/noaa-scales-explanation",
      },
    ],
  },
  {
    id: "feb1872",
    name: "Great storm of February 1872",
    shortName: "Feb 1872",
    when: "4–6 Feb 1872",
    kpPeak: 9,
    gPeak: 5,
    dstNt: -830,
    kind: "extreme",
    blurb:
      "Among the most equatorward auroral ovals on record. Extreme geomagnetic disturbance reconstructed from magnetometer and aurora reports.",
    impacts: [
      "Very low-latitude aurora reports",
      "Telegraph disruption era infrastructure",
    ],
    lesson:
      "Reminds us that “Carrington-class” is a family of extremes, not a single named night.",
  },
  {
    id: "may1921",
    name: "New York Railroad Storm",
    shortName: "May 1921",
    when: "13–16 May 1921",
    kpPeak: 9,
    gPeak: 5,
    dstNt: -900,
    kind: "extreme",
    blurb:
      "Severe multi-day storm with telegraph/telephone fires and railway signaling disruption across several continents. Often used in modern grid-risk studies.",
    impacts: [
      "Telecom fires / outages (US, Europe, Australia, NZ, Japan)",
      "Railway signaling disruption",
      "Strong candidate for modern GIC stress tests",
    ],
    lesson:
      "Pre-grid extremes still inform today’s transformer and long-line GIC planning.",
  },
  {
    id: "mar1989",
    name: "Québec blackout storm",
    shortName: "Mar 1989",
    when: "13–14 Mar 1989",
    kpPeak: 9,
    gPeak: 5,
    dstNt: -589,
    kind: "modern-benchmark",
    blurb:
      "Strongest official Dst-era storm by several measures. Hydro-Québec collapsed in ~90 seconds; ~6 million without power for hours. Transformer damage reported elsewhere.",
    impacts: [
      "Province-wide blackout (~9 h)",
      "US/UK transformer stress",
      "Design benchmark for GMD standards",
    ],
    lesson:
      "This is the modern proof that GICs can take a grid down — still far below reconstructed Carrington intensity.",
  },
  {
    id: "halloween2003",
    name: "Halloween storms",
    shortName: "Halloween 2003",
    when: "28 Oct – 4 Nov 2003",
    kpPeak: 9,
    gPeak: 5,
    dstNt: -383,
    kind: "severe",
    blurb:
      "Multi-day compound event with extreme flares (one later estimated ~X28). Aviation polar reroutes, GPS issues, ISS shelter, satellite loss, Malmö regional outage.",
    impacts: [
      "Polar aviation HF / radiation management",
      "Satellite anomalies & one total loss",
      "Regional power outage (Malmö)",
      "GNSS degradation episodes",
    ],
    lesson:
      "Compound multi-CME weeks matter as much as a single peak Kp number.",
  },
  {
    id: "jul2012",
    name: "July 2012 Carrington-class near miss",
    shortName: "2012 near-miss",
    when: "23 Jul 2012",
    kpPeak: null,
    gPeak: null,
    dstNt: null,
    kind: "near-miss",
    blurb:
      "A Carrington-class CME left the Sun and was sampled by STEREO-A. Earth missed the path by roughly nine days of solar longitude — geometry, not “no big CMEs anymore.”",
    impacts: [
      "No major Earth storm (missed us)",
      "In-situ measurements confirm extreme class",
      "Widely cited in risk literature",
    ],
    lesson:
      "Extreme CMEs still occur. Hit vs miss is often about direction and timing, not whether the Sun can still fire them.",
  },
  {
    id: "may2024",
    name: "May 2024 G5 superstorm",
    shortName: "May 2024 G5",
    when: "10–13 May 2024",
    kpPeak: 9,
    gPeak: 5,
    dstNt: -412,
    kind: "modern-benchmark",
    blurb:
      "First G5 since 2003. Multi-CME pileup from AR 13664. Widespread mid-latitude aurora, HF/GNSS degradation, LEO drag manoeuvres — limited grid damage vs 1989 thanks to warning + hardening.",
    impacts: [
      "G5 (Kp 9) multi-day interval",
      "GNSS / HF disruption",
      "Thousands of satellite drag alerts",
      "Spectacular mid-latitude aurora",
    ],
    lesson:
      "G5 is real and disruptive; it is not automatically a multi-week continental blackout. Context + procedures matter.",
  },
];

export function getStorm(id: string | null | undefined): HistoricalStorm | undefined {
  if (!id) return undefined;
  return HISTORICAL_STORMS.find((s) => s.id === id || s.shortName.toLowerCase() === id.toLowerCase());
}

export function parseStormParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const hit = HISTORICAL_STORMS.find(
    (st) =>
      st.id === s ||
      st.shortName.toLowerCase() === s ||
      st.name.toLowerCase().includes(s),
  );
  return hit?.id ?? null;
}

export type LiveStormSnapshot = {
  g: number | null;
  kp: number | null;
  r: number | null;
  s: number | null;
};

export type StormCompare = {
  level: "quiet" | "elevated" | "storm" | "severe";
  headline: string;
  detail: string;
  nearest: HistoricalStorm | null;
  /** 0–1 rough intensity vs modern G5/1989 class — not physics */
  modernScale: number;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Place live NOAA G/Kp against the historical ladder.
 * Calm language by design — SUPT / SES non-alarmist principles.
 */
export function compareLiveToHistory(live: LiveStormSnapshot): StormCompare {
  const g = live.g ?? 0;
  const kp = live.kp ?? 0;
  const peak = Math.max(g, kp >= 5 ? Math.min(5, Math.floor(kp) - 4) : 0);

  if (g >= 5 || kp >= 9) {
    return {
      level: "severe",
      headline: "G5-class intensity in live scales",
      detail:
        "Live conditions are in the same NOAA G5 band as May 2024 / Halloween peaks. Still compare duration, CME pileup, and official SWPC watches — not every G5 is 1989 Québec.",
      nearest: getStorm("may2024") ?? null,
      modernScale: 1,
    };
  }
  if (g >= 4 || kp >= 8) {
    return {
      level: "severe",
      headline: "Severe (G4) geomagnetic activity",
      detail:
        "Strong storming — aurora expands, GNSS/HF stress rises. Infrastructure operators use this band for elevated procedures. Not Carrington-class by itself.",
      nearest: getStorm("halloween2003") ?? null,
      modernScale: 0.75,
    };
  }
  if (g >= 2 || kp >= 6) {
    return {
      level: "storm",
      headline: "Moderate storming (G2–G3 band)",
      detail:
        "Elevated Kp / G-scale — high-latitude systems notice first; mid-latitude aurora possible under dark skies. Ordinary Ring-of-Fire / solar-cycle background can coexist. No automatic crisis framing.",
      nearest: getStorm("may2024") ?? null,
      modernScale: clamp01(0.35 + g * 0.08),
    };
  }
  if (g >= 1 || kp >= 5) {
    return {
      level: "elevated",
      headline: "Minor storm / elevated Kp",
      detail:
        "G1 or Kp≥5 — watchful, not alarm. Power / GNSS effects usually mild and high-latitude. Historical extremes sit far above this band.",
      nearest: getStorm("may2024") ?? null,
      modernScale: 0.2,
    };
  }
  return {
    level: "quiet",
    headline: "Below storm scales",
    detail:
      "Live R/S/G and Kp are calm relative to historical severe events. Open the Storm Desk for memory of Carrington, 1989, 2003, 2012 near-miss, and May 2024.",
    nearest: getStorm("jul2012") ?? null,
    modernScale: clamp01((kp || 0) / 20),
  };
}

export const STORM_KIND_LABEL: Record<StormKind, string> = {
  extreme: "Extreme (historical)",
  severe: "Severe multi-day",
  "near-miss": "Near miss",
  "modern-benchmark": "Modern benchmark",
};
