import type { EqFeature } from "@/lib/feeds/usgs";
import { DRAGON_NODES } from "@/lib/feeds/usgs";
import { pointInBounds } from "@/lib/geo/bounds";
import type { UsgsVolcanoAlert, VolcWatchTransition } from "@/lib/feeds/usgsVolcanoAlerts";
import type { KpPoint, NoaaScales, SolarWind, XrayPoint } from "@/lib/feeds/swpc";
import { fluxToClass } from "@/lib/feeds/swpc";

export type TapeKind = "quake" | "solar" | "volcano";

export type TapeItem = {
  id: string;
  kind: TapeKind;
  text: string;
  major: boolean;
  lat?: number;
  lon?: number;
};

export type TapeToggles = Record<TapeKind, boolean>;

export const TAPE_DEFAULTS: TapeToggles = {
  quake: true,
  solar: true,
  volcano: true,
};

const TAPE_KEY = "ww_pulse_tape";

export function loadTapeToggles(): TapeToggles {
  if (typeof window === "undefined") return { ...TAPE_DEFAULTS };
  try {
    const raw = localStorage.getItem(TAPE_KEY);
    if (!raw) return { ...TAPE_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<TapeToggles>;
    return {
      quake: parsed.quake !== false,
      solar: parsed.solar !== false,
      volcano: parsed.volcano !== false,
    };
  } catch {
    return { ...TAPE_DEFAULTS };
  }
}

export function saveTapeToggles(next: TapeToggles) {
  try {
    localStorage.setItem(TAPE_KEY, JSON.stringify(next));
  } catch {
    /* */
  }
}

function scaleN(raw: string | undefined | null): number {
  const m = String(raw ?? "").match(/(\d)/);
  return m ? Number(m[1]) : 0;
}

function show(kind: TapeKind, major: boolean, toggles: TapeToggles): boolean {
  return toggles[kind] || major;
}

/** Map min-mag is too low for a ticker. Tape uses its own floor. */
const QUAKE_ANYWHERE = 5;
const QUAKE_ON_NODE = 4;
const QUAKE_MAJOR = 6;

const MONITORED = DRAGON_NODES.filter((n) => n.publishedFocus || n.watchPriority);

function monitoredNode(lat: number, lon: number): string | null {
  for (const n of MONITORED) {
    if (pointInBounds(lat, lon, n.bounds)) return n.name;
  }
  return null;
}

export function buildPulseTape(input: {
  features: EqFeature[] | undefined;
  kp: KpPoint[];
  solarWind: SolarWind | null;
  scales: NoaaScales | null;
  xray: XrayPoint[];
  volcanoes: UsgsVolcanoAlert[];
  transitions?: VolcWatchTransition[];
  toggles: TapeToggles;
  now?: number;
}): TapeItem[] {
  const out: TapeItem[] = [];
  const feats = [...(input.features ?? [])]
    .filter((f) => f.properties.time != null && f.properties.mag != null)
    .sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));

  let quakes = 0;
  for (const f of feats) {
    if (quakes >= 4) break;
    const mag = f.properties.mag ?? 0;
    const [lon, lat] = f.geometry.coordinates;
    const node = monitoredNode(lat, lon);
    const onNode = node != null && mag >= QUAKE_ON_NODE;
    const significant = mag >= QUAKE_ANYWHERE;
    if (!onNode && !significant) continue;
    const major = mag >= QUAKE_MAJOR;
    if (!show("quake", major, input.toggles)) continue;
    const place = f.properties.place?.replace(/^.* of /, "") ?? "event";
    out.push({
      id: `q-${f.id ?? f.properties.time}`,
      kind: "quake",
      text: `${node ? `${node} · ` : ""}M${mag.toFixed(1)} · ${place}`,
      major,
      lat,
      lon,
    });
    quakes += 1;
  }

  const kp = input.kp.length ? Number(input.kp[input.kp.length - 1]!.Kp) : null;
  if (kp != null && Number.isFinite(kp)) {
    const major = kp >= 5;
    if (kp < 4 && !major) {
      /* quiet Kp stays off the tape */
    } else if (show("solar", major, input.toggles)) {
      out.push({ id: "kp", kind: "solar", text: `Kp ${kp.toFixed(1)}`, major });
    }
  }

  const wind = input.solarWind;
  if (wind && (wind.speed != null || wind.bz != null)) {
    const speed = wind.speed != null ? Math.round(wind.speed) : null;
    const bz = wind.bz;
    const major = (speed != null && speed >= 700) || (bz != null && bz <= -10);
    const notable = (speed != null && speed >= 550) || (bz != null && Math.abs(bz) >= 5);
    if ((notable || major) && show("solar", major, input.toggles)) {
      const bzBit = bz != null ? `Bz ${bz > 0 ? "+" : ""}${bz.toFixed(1)}` : null;
      const bits = [
        wind.rtsw ? "RTSW" : "Solar wind",
        wind.source,
        speed != null ? `${speed} km/s` : null,
        bzBit,
      ].filter(Boolean);
      out.push({ id: "wind", kind: "solar", text: bits.join(" · "), major });
    }
  }

  if (input.scales) {
    const r = scaleN(input.scales.R);
    const s = scaleN(input.scales.S);
    const g = scaleN(input.scales.G);
    const major = r >= 3 || s >= 3 || g >= 3;
    if ((r >= 1 || s >= 1 || g >= 1 || major) && show("solar", major, input.toggles)) {
      out.push({
        id: "scales",
        kind: "solar",
        text: `R${input.scales.R} S${input.scales.S} G${input.scales.G}`,
        major,
      });
    }
  }

  const xr = input.xray.length ? input.xray[input.xray.length - 1] : null;
  if (xr && Number.isFinite(xr.flux)) {
    const klass = fluxToClass(xr.flux);
    const major = klass.startsWith("X");
    const notable = klass.startsWith("M") || major;
    if (notable && show("solar", major, input.toggles)) {
      out.push({ id: "xray", kind: "solar", text: `X-ray ${klass}`, major });
    }
  }

  const vols = freshVolcanoLines(input.volcanoes, input.transitions ?? [], input.now ?? Date.now());
  for (const v of vols) {
    if (!show("volcano", v.major, input.toggles)) continue;
    out.push(v.item);
  }

  return out;
}

const VOLC_FRESH_MS = 7 * 24 * 3600_000;

function noticeMs(v: UsgsVolcanoAlert): number | null {
  if (v.sentUnix != null && Number.isFinite(v.sentUnix) && v.sentUnix > 0) {
    return v.sentUnix > 1e12 ? v.sentUnix : v.sentUnix * 1000;
  }
  if (v.sentUtc) {
    const t = Date.parse(v.sentUtc);
    if (Number.isFinite(t)) return t;
  }
  return null;
}

function ageLabel(ms: number, now: number): string {
  const h = Math.max(0, (now - ms) / 3600_000);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

function freshVolcanoLines(
  volcanoes: UsgsVolcanoAlert[],
  transitions: VolcWatchTransition[],
  now: number,
): { item: TapeItem; major: boolean }[] {
  const lines: { item: TapeItem; major: boolean; at: number }[] = [];
  const seen = new Set<string>();

  for (const tr of [...transitions].sort((a, b) => b.at - a.at)) {
    if (now - tr.at > VOLC_FRESH_MS) continue;
    const key = tr.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = volcanoes.find((v) => v.name === tr.name);
    const major = tr.alertLevel === "WARNING" || tr.colorCode === "RED";
    const verb = tr.kind === "baseline" ? "eased" : tr.alertLevel;
    lines.push({
      at: tr.at,
      major,
      item: {
        id: `vt-${tr.id}`,
        kind: "volcano",
        text: `${tr.name} · ${verb} · ${ageLabel(tr.at, now)}`,
        major,
        lat: hit?.lat ?? undefined,
        lon: hit?.lon ?? undefined,
      },
    });
  }

  const dated = volcanoes
    .map((v) => ({ v, t: noticeMs(v) }))
    .filter((x): x is { v: UsgsVolcanoAlert; t: number } => x.t != null && now - x.t <= VOLC_FRESH_MS)
    .sort((a, b) => b.t - a.t);

  for (const { v, t } of dated) {
    if (seen.has(v.name.toLowerCase())) continue;
    seen.add(v.name.toLowerCase());
    const major = v.alertLevel === "WARNING" || v.colorCode === "RED";
    lines.push({
      at: t,
      major,
      item: {
        id: `v-${v.id}-${t}`,
        kind: "volcano",
        text: `${v.name} · ${v.alertLevel} · ${ageLabel(t, now)}`,
        major,
        lat: v.lat ?? undefined,
        lon: v.lon ?? undefined,
      },
    });
  }

  return lines
    .sort((a, b) => b.at - a.at)
    .slice(0, 3)
    .map(({ item, major }) => ({ item, major }));
}
