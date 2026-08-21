/**
 * Tab + in-panel anchor focus. Fixes Recommendations "Go" when already on
 * the target tab (setTab alone is a no-op).
 */

import type { TabId } from "@/store/observatory";

export type SolarDeepKey = "farside" | "models" | "alerts" | "catalogs" | "magneto";

export type FocusTarget = {
  tab: TabId;
  /** document.getElementById */
  anchor?: string;
  /** Expand a collapsed Solar ladder section before scroll */
  solarDeep?: SolarDeepKey;
};

let pending: FocusTarget | null = null;
const listeners = new Set<(t: FocusTarget) => void>();

export function requestFocus(target: FocusTarget): void {
  pending = target;
  for (const fn of listeners) {
    try {
      fn(target);
    } catch {
      /* ignore */
    }
  }
  // Scroll after React paints the target panel
  window.requestAnimationFrame(() => {
    window.setTimeout(() => applyFocusScroll(target), 60);
    window.setTimeout(() => applyFocusScroll(target), 280);
  });
}

export function takePendingFocus(): FocusTarget | null {
  const t = pending;
  pending = null;
  return t;
}

export function peekPendingFocus(): FocusTarget | null {
  return pending;
}

export function subscribeFocus(fn: (t: FocusTarget) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyFocusScroll(target: FocusTarget): void {
  if (!target.anchor) return;
  const el = document.getElementById(target.anchor);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Brief highlight
  el.classList.add("ses-focus-ring");
  window.setTimeout(() => el.classList.remove("ses-focus-ring"), 1600);
}

/** Map recommendation id → focus target */
export function focusForRecommendation(
  id: string,
  tab?: TabId,
): FocusTarget {
  const t = tab ?? "solar";
  switch (id) {
    case "cme":
      return { tab: "solar", anchor: "ses-solar-cme", solarDeep: "catalogs" };
    case "radio":
      return { tab: "solar", anchor: "ses-solar-geo" };
    case "protons":
      return { tab: "solar", anchor: "ses-solar-protons" };
    case "geo":
      return { tab: "solar", anchor: "ses-solar-geo" };
    case "earth-supt":
      return { tab: "resonance", anchor: "panel-resonance" };
    case "quiet":
      return { tab: "live", anchor: "panel-live" };
    default:
      return { tab: t, anchor: t === "solar" ? "panel-solar" : `panel-${t}` };
  }
}
