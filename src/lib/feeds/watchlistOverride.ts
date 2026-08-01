/**
 * Manual watchlist overrides for USGS volcano watches.
 * pin = stay on map even after NORMAL/GREEN
 * mute = hide even while elevated
 */

import {
  alertToWatchNode,
  type UsgsVolcanoAlert,
} from "@/lib/feeds/usgsVolcanoAlerts";
import type { DragonNode } from "@/lib/feeds/usgs";

const PIN_KEY = "wolfwatch_volc_pins";
const MUTE_KEY = "wolfwatch_volc_mutes";
const MEM_KEY = "wolfwatch_volc_memory";

export function loadIdSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveIdSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* */
  }
}

export function loadPins(): Set<string> {
  return loadIdSet(PIN_KEY);
}
export function loadMutes(): Set<string> {
  return loadIdSet(MUTE_KEY);
}
export function savePins(s: Set<string>) {
  saveIdSet(PIN_KEY, s);
}
export function saveMutes(s: Set<string>) {
  saveIdSet(MUTE_KEY, s);
}

export function alertKey(v: { vnum?: string | null; id: string }): string {
  return v.vnum || v.id;
}

export function nodeIdForAlert(v: { vnum?: string | null; id: string }): string {
  return `usgs-volc-${alertKey(v)}`;
}

export function loadAlertMemory(): Record<string, UsgsVolcanoAlert> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MEM_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, UsgsVolcanoAlert>;
  } catch {
    return {};
  }
}

export function rememberAlerts(alerts: UsgsVolcanoAlert[]) {
  try {
    const mem = loadAlertMemory();
    for (const a of alerts) {
      mem[alertKey(a)] = a;
    }
    // cap
    const keys = Object.keys(mem);
    if (keys.length > 40) {
      for (const k of keys.slice(0, keys.length - 40)) delete mem[k];
    }
    localStorage.setItem(MEM_KEY, JSON.stringify(mem));
  } catch {
    /* */
  }
}

/**
 * Build watch nodes: elevated (minus mutes) + pinned from memory.
 */
export function buildWatchNodes(
  elevated: UsgsVolcanoAlert[],
  pins: Set<string>,
  mutes: Set<string>,
): DragonNode[] {
  rememberAlerts(elevated);
  const mem = loadAlertMemory();
  const byKey = new Map<string, UsgsVolcanoAlert>();

  for (const a of elevated) {
    const k = alertKey(a);
    if (mutes.has(k)) continue;
    byKey.set(k, a);
  }
  for (const k of pins) {
    if (mutes.has(k)) continue;
    if (byKey.has(k)) continue;
    const snap = mem[k];
    if (snap) {
      // pinned past-baseline: show as green watch note
      byKey.set(k, {
        ...snap,
        alertLevel: snap.alertLevel || "NORMAL",
        colorCode: "GREEN",
      });
    }
  }

  const nodes: DragonNode[] = [];
  for (const a of byKey.values()) {
    const n = alertToWatchNode(a);
    if (!n) {
      // green pinned may fail alertToWatchNode green filter — force node
      if (a.lat != null && a.lon != null && pins.has(alertKey(a))) {
        nodes.push({
          id: nodeIdForAlert(a),
          name: a.name,
          role: `Pinned watch · baseline (was ${a.obsAbbr})`,
          kind: "volcano",
          bounds: [
            [a.lat - 0.75, a.lon - 0.75],
            [a.lat + 0.75, a.lon + 0.75],
          ],
          center: [a.lat, a.lon],
          aviationCode: "green",
          watchPriority: true,
          focusNote:
            "Manually pinned — stays on watchlist after return to NORMAL/GREEN. Unpin to release.",
          monitorUrl: a.volcanoUrl || a.noticeUrl || undefined,
          agencyUrl: a.noticeUrl || undefined,
          gvpUrl: a.vnum ? `https://volcano.si.edu/volcano.cfm?vn=${a.vnum}` : undefined,
        });
      }
      continue;
    }
    const k = alertKey(a);
    if (pins.has(k) && (a.colorCode === "GREEN" || a.alertLevel === "NORMAL")) {
      n.role = `Pinned · ${n.role}`;
      n.focusNote =
        (n.focusNote || "") + " Manually pinned through baseline.";
    }
    if (pins.has(k)) {
      n.watchPriority = true;
    }
    nodes.push(n);
  }
  return nodes;
}

// re-export keys for UI
export { PIN_KEY, MUTE_KEY };
