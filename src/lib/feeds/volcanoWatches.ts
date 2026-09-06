/**
 * Active volcano watch targets — operational focus boxes, not forecasts.
 * Spelling: Shiveluch (also Sheveluch / Shivelyuch) — Kamchatka stratovolcano.
 * GVP VNUM 300270 · ~56.65°N, 161.36°E
 */

import { RAISED, isFresh } from "@/lib/ops/raisedTimeout";

export type AviationColor = "green" | "yellow" | "orange" | "red";

export type VolcanoWatch = {
  id: string;
  name: string;
  /** Alternate romanizations */
  aliases: string[];
  role: string;
  kind: "volcano";
  /** Focus box for seismic + volcanic events */
  bounds: [[number, number], [number, number]];
  /** Summit / vent */
  center: [number, number];
  elevationM?: number;
  region: string;
  /** Latest known aviation color (manual ops note — not a live KVERT feed) */
  aviationCode: AviationColor;
  aviationNote: string;
  /** Smithsonian GVP */
  gvpUrl: string;
  /** KVERT or other agency */
  agencyUrl?: string;
  monitorUrl?: string;
  focusNote: string;
  /** Pin high in node list */
  watchPriority: boolean;
  publishedFocus?: boolean;
  /**
   * ISO date the aviationCode was last confirmed from an agency note.
   * Past RAISED.volc.curatedH this is not a live LOOK — GVP/VAAC/HANS must confirm.
   */
  asOf?: string;
};

/**
 * Shiveluch — northernmost active Kamchatka volcano.
 * Aviation orange here was a mid-July / GVP week 6–12 Aug 2026 ops note.
 * Live LOOK requires a fresh GVP/KVERT/VAAC confirmation — this asOf expires.
 */
export const SHIVELUCH_WATCH: VolcanoWatch = {
  id: "shiveluch",
  name: "Shiveluch (Kamchatka)",
  aliases: ["Sheveluch", "Shivelyuch", "Шивелуч"],
  role: "Active volcano watch · Explosive–extrusive dome",
  kind: "volcano",
  // ~1° box around vent — tight regional focus
  bounds: [
    [55.4, 160.0],
    [57.9, 162.8],
  ],
  center: [56.653, 161.36],
  elevationM: 3283,
  region: "Kamchatka Peninsula, Russia",
  aviationCode: "orange",
  asOf: "2026-08-12",
  aviationNote:
    "KVERT Aviation Color Code Orange (GVP week 6–12 Aug 2026). Stale unless a live feed reconfirms. Not a forecast — operational look only.",
  gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=300270",
  agencyUrl: "http://www.kscnet.ru/ivs/kvert/index_eng.php",
  monitorUrl: "https://volcano.si.edu/volcano.cfm?vn=300270",
  focusNote:
    "Priority volcano box: Shiveluch (Sheveluch). Sentinel focuses map + local seismicity; KVERT/GVP remain authoritative for aviation & ash.",
  watchPriority: true,
  publishedFocus: false,
};

export const VOLCANO_WATCHES: VolcanoWatch[] = [SHIVELUCH_WATCH];

export const AVIATION_LABEL: Record<AviationColor, string> = {
  green: "Green",
  yellow: "Yellow",
  orange: "Orange",
  red: "Red",
};

export const AVIATION_COLOR: Record<AviationColor, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  orange: "#fb923c",
  red: "#f43f5e",
};

/** Map aviation code → node status for shared UI chrome */
export function aviationToNodeStatus(
  code: AviationColor,
): "quiet" | "elevated" | "active" | "watch" {
  switch (code) {
    case "red":
      return "watch";
    case "orange":
      return "watch";
    case "yellow":
      return "elevated";
    case "green":
      return "quiet";
  }
}

export function curatedWatchAsOfMs(w: Pick<VolcanoWatch, "asOf">): number | null {
  if (!w.asOf) return null;
  const t = Date.parse(`${w.asOf}T00:00:00Z`);
  return Number.isFinite(t) ? t : null;
}

/** Manual aviation note is live only within RAISED.volc.curatedH of asOf. */
export function isCuratedWatchLive(
  w: Pick<VolcanoWatch, "asOf" | "aviationCode">,
  now = Date.now(),
): boolean {
  if (!w.aviationCode || w.aviationCode === "green") return false;
  const t = curatedWatchAsOfMs(w);
  if (t == null) return false;
  return isFresh(t, RAISED.volc.curatedH, now);
}

export function liveAviationCode(
  w: Pick<VolcanoWatch, "asOf" | "aviationCode">,
  now = Date.now(),
): AviationColor {
  return isCuratedWatchLive(w, now) ? w.aviationCode : "green";
}
