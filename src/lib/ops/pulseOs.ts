/**
 * OS notices for whatever the Pulse tape considers worth showing.
 * First refresh only records the current lines. Later changes notify
 * if that kind's switch is on.
 */

import { buildPulseTape, type TapeItem, type TapeKind, type TapeToggles } from "@/lib/ops/pulseTape";
import type { EqFeature } from "@/lib/feeds/usgs";
import type { UsgsVolcanoAlert, VolcWatchTransition } from "@/lib/feeds/usgsVolcanoAlerts";
import type { KpPoint, NoaaScales, SolarWind, XrayPoint } from "@/lib/feeds/swpc";
import { buildShareFocusUrl } from "@/lib/pwa/shareFocus";

export type PulseOsInput = {
  features: EqFeature[] | undefined;
  kp: KpPoint[];
  solarWind: SolarWind | null;
  scales: NoaaScales | null;
  xray: XrayPoint[];
  volcanoes: UsgsVolcanoAlert[];
  transitions?: VolcWatchTransition[];
  notify: TapeToggles;
  /** Last call of this refresh. Locks the seed so the next change can notify. */
  finishing: boolean;
};

let bootstrapped = false;
const seen = new Set<string>();

function stepKey(item: TapeItem): string {
  if (item.kind !== "solar") return item.id;
  if (item.id === "kp") {
    const n = Number(item.text.replace(/.*?(\d+(?:\.\d+)?)/, "$1"));
    return `kp-${Number.isFinite(n) ? Math.floor(n) : 0}`;
  }
  if (item.id === "xray") {
    const m = item.text.match(/([ABCMX])(\d+(?:\.\d+)?)/i);
    if (!m) return item.text;
    return `xray-${m[1]!.toUpperCase()}${Math.floor(Number(m[2]))}`;
  }
  if (item.id === "scales") return `scales-${item.text}`;
  if (item.id === "wind") {
    const sp = item.text.match(/(\d+)\s*km\/s/);
    const bz = item.text.match(/Bz\s*([+-]?\d+(?:\.\d+)?)/);
    const speed = sp ? Number(sp[1]) : 0;
    const b = bz ? Number(bz[1]) : 0;
    const sb = speed >= 800 ? 800 : speed >= 700 ? 700 : speed >= 600 ? 600 : speed >= 550 ? 550 : 0;
    const bb = b <= -15 ? -15 : b <= -10 ? -10 : b <= -5 ? -5 : 0;
    return `wind-${sb}-${bb}`;
  }
  return `${item.id}-${item.text}`;
}

function focusUrl(item: TapeItem): string {
  if (item.lat != null && item.lon != null) {
    return buildShareFocusUrl({
      origin: typeof window !== "undefined" ? window.location.origin : undefined,
      tab: "live",
      lat: item.lat,
      lon: item.lon,
      zoom: item.kind === "quake" ? 5 : 6,
      place: item.text,
    });
  }
  return buildShareFocusUrl({
    origin: typeof window !== "undefined" ? window.location.origin : undefined,
    tab: "solar",
  });
}

const KIND_LABEL: Record<TapeKind, string> = {
  quake: "Quake",
  solar: "Solar",
  volcano: "Volcano",
};

function showOs(item: TapeItem, key: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const url = focusUrl(item);
  try {
    const note = new Notification(`${KIND_LABEL[item.kind]} · ${item.text}`, {
      body: "SES pulse · not a civil alert",
      tag: `ses-pulse-${key}`,
      silent: false,
      data: { url },
    });
    note.onclick = () => {
      try {
        window.focus();
        window.location.assign(url);
      } catch {
        /* ignore */
      }
      note.close();
    };
  } catch {
    /* permission revoked */
  }
}

export function relayPulseOs(input: PulseOsInput): void {
  const items = buildPulseTape({
    features: input.features,
    kp: input.kp,
    solarWind: input.solarWind,
    scales: input.scales,
    xray: input.xray,
    volcanoes: input.volcanoes,
    transitions: input.transitions,
    toggles: { quake: true, solar: true, volcano: true },
  });
  if (!bootstrapped) {
    for (const item of items) seen.add(stepKey(item));
    if (input.finishing) bootstrapped = true;
    return;
  }
  for (const item of items) {
    if (item.kind === "volcano" && item.major) continue;
    const key = stepKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!input.notify[item.kind]) continue;
    showOs(item, key);
  }
}
