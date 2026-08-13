/**
 * Local fingerprint log — same role as SUPT_Comparison_Results.csv, in-browser.
 */

import type { WaveFingerprint } from "@/lib/seismology/harmonicSpectrum";

const KEY = "ses_wave_prints_v1";
const MAX = 16;

export function loadPrints(): WaveFingerprint[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as WaveFingerprint[];
    return Array.isArray(j) ? j.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function savePrint(p: WaveFingerprint): WaveFingerprint[] {
  const prev = loadPrints().filter((x) => x.eventId !== p.eventId);
  const next = [p, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}
