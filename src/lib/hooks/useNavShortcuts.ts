/**
 * Global keyboard navigation for SES ↔ published nodes and main tabs.
 * Skips when focus is in form fields / contenteditable.
 */

import { useEffect } from "react";
import { useObservatory, type TabId } from "@/store/observatory";
import { PUBLISHED_MONITORS, resolveNodeId } from "@/lib/feeds/publishedMonitors";

const TAB_BY_DIGIT: Record<string, TabId> = {
  "1": "live",
  "2": "solar",
  "3": "resonance",
  "4": "analytics",
  "5": "about",
};

/** letter → sesNodeId (first match among published) */
const NODE_BY_KEY: Record<string, string> = {
  t: "tonga",
  c: "mediterranean",
  j: "japan",
  k: "kamchatka",
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (el.closest("[contenteditable='true']")) return true;
  if (el.closest("[role='textbox']")) return true;
  return false;
}

export type NavShortcutsOptions = {
  /** Open help dialog */
  onHelp?: () => void;
  enabled?: boolean;
};

/**
 * Installs document-level shortcuts. Call once from shell.
 *
 * | Key | Action |
 * |-----|--------|
 * | 1–5 | Live · Solar · Rhythm · Charts · About |
 * | H / 0 / Home | SES world (clear focus) |
 * | T · C · J · K | Tonga · Campi · Japan · Kamchatka |
 * | Esc | Exit immersive, else clear node focus |
 * | ? | Help (if onHelp provided) |
 */
export function useNavShortcuts(opts: NavShortcutsOptions = {}) {
  const { onHelp, enabled = true } = opts;

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const store = useObservatory.getState();
      const key = e.key;
      const lower = key.length === 1 ? key.toLowerCase() : key;

      // Immersive map: Esc only exits full map (existing contract)
      if (key === "Escape") {
        if (store.mapImmersive) {
          e.preventDefault();
          store.setMapImmersive(false);
          return;
        }
        if (store.focusNodeId || store.mobileSheet !== "closed") {
          e.preventDefault();
          store.exitToHomeView();
          store.setMobileSheet("closed");
        }
        return;
      }

      if (key === "?" || (e.shiftKey && key === "/")) {
        if (onHelp) {
          e.preventDefault();
          onHelp();
        }
        return;
      }

      // Digit tabs
      if (TAB_BY_DIGIT[key]) {
        e.preventDefault();
        store.setTab(TAB_BY_DIGIT[key]!);
        return;
      }

      // Home / SES world
      if (lower === "h" || key === "0" || key === "Home") {
        e.preventDefault();
        store.exitToHomeView();
        store.setTab("live");
        store.setMobileSheet("closed");
        return;
      }

      // Published nodes
      const nodeId = NODE_BY_KEY[lower];
      if (nodeId && PUBLISHED_MONITORS.some((m) => m.sesNodeId === nodeId)) {
        e.preventDefault();
        store.setTab("live");
        const focused = store.focusNodeId
          ? resolveNodeId(store.focusNodeId) ?? store.focusNodeId
          : null;
        if (focused === nodeId) {
          store.exitToHomeView();
        } else {
          store.setFocusNode(nodeId);
        }
        store.setMobileSheet("closed");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onHelp]);
}

/** Human-readable cheat sheet for Help / About */
export const NAV_SHORTCUTS_HELP: { keys: string; action: string }[] = [
  { keys: "1 – 5", action: "Views: Live · Solar · Rhythm · Charts · About" },
  { keys: "H · 0 · Home", action: "SES world — clear node focus" },
  { keys: "T · C · J · K", action: "Nodes: Tonga · Campi · Japan · Kamchatka" },
  { keys: "Esc", action: "Exit full map, or clear focus / sheet" },
  { keys: "?", action: "Open how-to" },
];
