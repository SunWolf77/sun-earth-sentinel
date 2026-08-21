/**
 * Harmonic copy scorer — port of SunWolf77/harmonic-ai-supt (prompt lexicon).
 *
 * This is NOT the frozen event-gap probe (α = 0.01, seed 20250120).
 * That lives in probe.ts and scores inter-event seconds.
 * This scores WORDS: observational vs forecast/hype diction.
 *
 * Deterministic. No LLM. No random templates.
 * Source: https://github.com/SunWolf77/harmonic-ai-supt
 */

export const HARMONIC_AI_REPO = "https://github.com/SunWolf77/harmonic-ai-supt";

export const COPY_FIELDS = ["STF", "HFS", "PRX", "DDI", "DMP"] as const;
export type CopyField = (typeof COPY_FIELDS)[number];

export const COPY_FIELD_PLAIN: Record<CopyField, string> = {
  STF: "Still / observational",
  HFS: "Structure / pattern words",
  PRX: "Proxy / measure words",
  DDI: "Hype / forecast diction",
  DMP: "Release / undo words",
};

const KEYWORDS: Record<CopyField, string[]> = {
  STF: ["eternal", "truth", "stillness", "self", "wisdom", "transcend", "silence", "presence", "now", "emptiness", "pure", "unmoved", "observed", "catalog", "notice"],
  HFS: ["phi", "torus", "geometry", "ratio", "pentad", "logoi", "symmetry", "structure", "mirror", "pattern", "fold", "spacing", "clock", "shuffle"],
  PRX: ["proxy", "measure", "alignment", "source", "signal", "carrier", "origin", "essence", "coherence", "exploratory"],
  DDI: [
    "desire", "fear", "ego", "attachment", "scarcity", "seek", "need", "win", "prove", "more", "manifest", "achieve",
    // SES-specific scientism / civil-authority bleed
    "predict", "prediction", "imminent", "will strike", "warning", "alert", "guaranteed", "precursor", "forecast",
  ],
  DMP: ["liberation", "demodulation", "return", "rest", "release", "let go", "unmake", "cease", "undo", "null"],
};

const PHRASES: Partial<Record<CopyField, string[]>> = {
  STF: ["what remains", "in silence", "not a forecast", "catalog notice"],
  PRX: ["return to source", "same probe", "destroyed order"],
  DMP: ["let go", "null is valid", "too thin"],
  DDI: ["will occur", "about to hit", "must fire", "early warning"],
};

const REPAIR: [string, string][] = [
  ["will strike", "has a catalog origin"],
  ["early warning", "catalog notice"],
  ["imminent", "in this window"],
  ["predict", "read"],
  ["prediction", "reading"],
  ["forecast", "context"],
  ["alert", "notice"],
  ["warning", "notice"],
  ["precursor", "coincidence"],
  ["guaranteed", "measured"],
  ["want", "seek"],
  ["need", "investigate"],
  ["win", "resolve"],
  ["prove", "demonstrate"],
  ["achieve", "return to"],
  ["manifest", "reveal"],
  ["control", "discern"],
];

export type CopyFlag = {
  id: string;
  excerpt: string;
  note: string;
};

export type CopyScore = {
  scores: Record<CopyField, number>;
  repaired: string;
  flags: CopyFlag[];
  hint: string;
  lexicon: boolean;
};

function norm(s: string): string {
  return s.toLowerCase();
}

function countHits(hay: string, needles: string[]): number {
  let n = 0;
  for (const w of needles) {
    if (!w) continue;
    if (w.includes(" ")) {
      if (hay.includes(w)) n++;
    } else {
      const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(hay)) n++;
    }
  }
  return n;
}

function matchField(field: CopyField, hay: string): number {
  const words = KEYWORDS[field];
  const phrases = PHRASES[field] ?? [];
  const w = countHits(hay, words);
  const p = countHits(hay, phrases);
  let score = words.length ? w / words.length : 0;
  score += 0.15 * p;
  return Math.min(1, score);
}

export function repairCopy(prompt: string): string {
  let out = prompt;
  for (const [from, to] of REPAIR) {
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, to);
  }
  return out;
}

export function scoreCopy(prompt: string): CopyScore {
  const hay = norm(prompt);
  const scores = {} as Record<CopyField, number>;
  for (const f of COPY_FIELDS) {
    let s = matchField(f, hay);
    if (f === "DDI") s = Math.min(1, s); // keep raw hit rate — high DDI = more hype
    scores[f] = Number(s.toFixed(4));
  }
  const flags: CopyFlag[] = [];
  for (const [from] of REPAIR) {
    if (hay.includes(from)) {
      flags.push({
        id: from,
        excerpt: from,
        note: "Forecast / hype diction — this desk is a catalog.",
      });
    }
  }
  const repaired = repairCopy(prompt);
  let hint: string;
  if (flags.length || scores.DDI >= 0.12) {
    hint = "Copy leans forecast. SES is a reading, not a warning.";
  } else if (scores.STF >= 0.08 || hay.includes("not a forecast") || hay.includes("exploratory")) {
    hint = "Observational diction. Keep it.";
  } else {
    hint = "Ordinary copy. Lexicon only — not the gap probe.";
  }
  return { scores, repaired, flags, hint, lexicon: true };
}

const LOG_KEY = "wolfwatch_harmonic_log_v1";

export type CopyLogEntry = {
  t: number;
  prompt: string;
  ddi: number;
  flags: number;
  hint: string;
};

export function logCopyScore(prompt: string, score: CopyScore): CopyLogEntry[] {
  const entry: CopyLogEntry = {
    t: Date.now(),
    prompt: prompt.slice(0, 240),
    ddi: score.scores.DDI,
    flags: score.flags.length,
    hint: score.hint,
  };
  let prev: CopyLogEntry[] = [];
  try {
    prev = JSON.parse(localStorage.getItem(LOG_KEY) || "[]") as CopyLogEntry[];
  } catch {
    prev = [];
  }
  if (!Array.isArray(prev)) prev = [];
  const next = [entry, ...prev].slice(0, 40);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* */
  }
  return next;
}

export function readCopyLog(): CopyLogEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    return Array.isArray(raw) ? (raw as CopyLogEntry[]) : [];
  } catch {
    return [];
  }
}
