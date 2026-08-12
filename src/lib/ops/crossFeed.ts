/**
 * Rule-based cross-feed chips — honest multi-domain pulse (no LLM).
 */

import type { ResonanceScore } from "@/lib/supt/probe";
import type { NoaaScales } from "@/lib/feeds/swpc";
import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
import type { IssPosition } from "@/lib/feeds/iss";
import type { LunarPhaseSnapshot } from "@/lib/astro/lunar";
import type { WildfireEvent } from "@/lib/feeds/wildfires";
import type { NeoItem } from "@/lib/feeds/neows";

export type CrossFeedChip = {
  id: string;
  tone: "quiet" | "info" | "watch" | "alert";
  label: string;
  detail: string;
};

function scaleNum(raw: string | undefined | null): number {
  if (raw == null) return 0;
  const m = String(raw).match(/(\d)/);
  return m ? Number(m[1]) : 0;
}

export function buildCrossFeed(opts: {
  scales: NoaaScales | null;
  kp: number;
  seismic: ResonanceScore | null;
  eqCount: number;
  maxMag: number | null;
  volcAlerts: UsgsVolcanoAlert[];
  iss: IssPosition | null;
  lunar: LunarPhaseSnapshot | null;
  wildfires: WildfireEvent[];
  neos: NeoItem[];
}): CrossFeedChip[] {
  const chips: CrossFeedChip[] = [];
  const g = scaleNum(opts.scales?.G);
  const r = scaleNum(opts.scales?.R);
  const s = scaleNum(opts.scales?.S);

  if (g >= 3 || opts.kp >= 6) {
    chips.push({
      id: "geo-storm",
      tone: "alert",
      label: "Geomagnetic elevated",
      detail: `G${g} · Kp ${opts.kp.toFixed(1)} — aurora oval likely expanded (SWPC).`,
    });
  } else if (g >= 1 || opts.kp >= 4) {
    chips.push({
      id: "geo-watch",
      tone: "watch",
      label: "Geomagnetic watch",
      detail: `G${g} · Kp ${opts.kp.toFixed(1)} — mid/high-latitude aurora possible.`,
    });
  }

  if (r >= 2) {
    chips.push({
      id: "radio",
      tone: r >= 3 ? "alert" : "watch",
      label: `Radio blackout R${r}`,
      detail: "SWPC R-scale — HF radio / flare context on Solar tab.",
    });
  }
  if (s >= 1) {
    chips.push({
      id: "radiation",
      tone: s >= 2 ? "alert" : "watch",
      label: `Solar radiation S${s}`,
      detail: "SWPC S-scale — proton event context.",
    });
  }

  if (opts.maxMag != null && opts.maxMag >= 6) {
    chips.push({
      id: "eq-strong",
      tone: "alert",
      label: `Strong quake M${opts.maxMag.toFixed(1)}`,
      detail: `${opts.eqCount} events in window — open Map for agency detail.`,
    });
  } else if (opts.eqCount >= 40) {
    chips.push({
      id: "eq-busy",
      tone: "info",
      label: `Busy catalog (${opts.eqCount})`,
      detail: "Many events in window — check clusters / nodes on Map.",
    });
  }

  if (opts.seismic?.separated) {
    chips.push({
      id: "timing",
      tone: "watch",
      label: "Quake timing unusual",
      detail: "Rhythm spacing differs from random shuffle.",
    });
  }

  const elevated = opts.volcAlerts.filter((a) => {
    const lvl = `${a.colorCode || ""} ${a.alertLevel || ""}`.toUpperCase();
    return lvl && !lvl.includes("GREEN") && !lvl.includes("NORMAL");
  });
  if (elevated.length) {
    chips.push({
      id: "volc",
      tone: elevated.some((a) =>
        /ORANGE|RED|WATCH|WARNING/i.test(`${a.colorCode} ${a.alertLevel}`),
      )
        ? "alert"
        : "watch",
      label: `${elevated.length} volcano alert${elevated.length > 1 ? "s" : ""}`,
      detail: elevated
        .slice(0, 3)
        .map((a) => a.name || "Volcano")
        .join(" · "),
    });
  }

  if (
    opts.lunar &&
    (opts.lunar.aspectTag === "syzygy_full" || opts.lunar.aspectTag === "syzygy_new")
  ) {
    chips.push({
      id: "lunar",
      tone: "info",
      label: opts.lunar.phaseLabel,
      detail: "Sky context on Rhythm — observational geometry only.",
    });
  }

  if (opts.iss) {
    chips.push({
      id: "iss",
      tone: "info",
      label: "ISS live",
      detail: `${opts.iss.lat.toFixed(1)}°, ${opts.iss.lon.toFixed(1)}° · ${opts.iss.altitudeKm.toFixed(0)} km`,
    });
  }

  if (opts.wildfires.length >= 15) {
    chips.push({
      id: "fire",
      tone: "watch",
      label: `${opts.wildfires.length} open wildfires`,
      detail: "NASA EONET open events — toggle Fires layer on Map.",
    });
  }

  const haz = opts.neos.filter((n) => n.hazardous);
  if (haz.length) {
    chips.push({
      id: "neo",
      tone: "info",
      label: `${haz.length} PHA approach${haz.length > 1 ? "es" : ""} today`,
      detail: "Potentially hazardous (size/orbit class) — Solar → Near-Earth objects.",
    });
  }

  if (!chips.length) {
    chips.push({
      id: "quiet",
      tone: "quiet",
      label: "Cross-feed quiet",
      detail: "No elevated multi-domain signals in the current cache.",
    });
  }

  return chips.slice(0, 6);
}
