import type { EqFeature } from "@/lib/feeds/usgs";
import { DRAGON_NODES } from "@/lib/feeds/usgs";
import { pointInBounds } from "@/lib/geo/bounds";
import type { UsgsVolcanoAlert, VolcWatchTransition } from "@/lib/feeds/usgsVolcanoAlerts";
import type { KpPoint, NoaaScales, SolarWind, XrayPoint } from "@/lib/feeds/swpc";
import { fluxToClass, longChannelXrays } from "@/lib/feeds/swpc";
import type { ActiveRegion, XraFlare } from "@/lib/feeds/solarRegions";
import { haleRank } from "@/lib/feeds/solarRegions";
import { clusterWatch, type FluxDay } from "@/lib/solar/clusterWatch";
import { diskLaunches } from "@/lib/feeds/launchWatch";
import { readLiveFlare } from "@/lib/solar/liveFlare";

export type TapeKind = "quake" | "solar" | "volcano";

export type TapeItem = {
  id: string;
  kind: TapeKind;
  text: string;
  /** Leading chip, e.g. EQ-M4.6. The line itself stays the place. */
  mark?: string;
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
  regions?: ActiveRegion[];
  xra?: XraFlare[];
  /** M-flare chance over the next 6 hours, 0–1. Tape and notify from 0.5. */
  flareChance?: number | null;
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
      text: `${node ? `${node} · ` : ""}${place}`,
      mark: `EQ-M${mag.toFixed(1)}`,
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

  const live = readLiveFlare(input.xray, input.regions ?? []);
  if (live && show("solar", true, input.toggles)) {
    out.push({ id: live.id, kind: "solar", text: live.line, major: true });
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

  if (wind?.sheet && show("solar", true, input.toggles)) {
    out.push({ id: "l1-sheet", kind: "solar", text: wind.sheet, major: true });
  }
  if (wind?.electrons && show("solar", true, input.toggles)) {
    out.push({ id: "l1-electrons", kind: "solar", text: wind.electrons, major: true });
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
  if (!live && xr && Number.isFinite(xr.flux)) {
    const klass = fluxToClass(xr.flux);
    const major = klass.startsWith("X");
    const notable = klass.startsWith("M") || major;
    if (notable && show("solar", major, input.toggles)) {
      out.push({ id: "xray", kind: "solar", text: `X-ray ${klass}`, major });
    }
  }

  const leadRegion = (input.regions ?? [])
    .filter((r) => haleRank(r.hale) >= 3 && r.phase !== "off" && r.phase !== "departing")
    .sort((a, b) => haleRank(b.hale) - haleRank(a.hale) || Math.abs(a.lon) - Math.abs(b.lon))[0];
  if (leadRegion) {
    const major = haleRank(leadRegion.hale) >= 4 && (leadRegion.phase === "direct" || leadRegion.phase === "entering" || leadRegion.phase === "leaving");
    if (show("solar", major, input.toggles)) {
      out.push({
        id: `ar-${leadRegion.region}-${leadRegion.hale}-${leadRegion.phase}`,
        kind: "solar",
        text: `AR${leadRegion.region} ${leadRegion.haleLabel} · ${leadRegion.phaseLabel}`,
        major,
      });
    }
  }

  const launch = diskLaunches(input.xra, input.regions, input.now)[0];
  if (launch && (launch.facing || launch.region == null) && show("solar", launch.facing, input.toggles)) {
    const when = launch.at.slice(5, 16).replace("T", " ");
    out.push({
      id: `disk-${launch.at.slice(0, 16)}`,
      kind: "solar",
      text: `Disk launch ${launch.klass}${launch.region ? ` · AR${launch.region}` : ""} · ${launch.where} · ${when} UTC`,
      major: launch.facing,
    });
  }

  if (input.flareChance != null && input.flareChance >= 0.5 && show("solar", true, input.toggles)) {
    out.push({
      id: "flare-chance",
      kind: "solar",
      text: `Flare chance ${Math.round(input.flareChance * 100)}%`,
      major: true,
    });
  }

  const vols = freshVolcanoLines(input.volcanoes, input.transitions ?? [], input.now ?? Date.now());
  for (const v of vols) {
    if (!show("volcano", v.major, input.toggles)) continue;
    out.push(v.item);
  }

  return out;
}

/** Solar desk ticker. Quiet X-ray and wind stay on, because this tape is only solar. */
export function buildSolarPulse(input: {
  kp: KpPoint[];
  solarWind: SolarWind | null;
  scales: NoaaScales | null;
  xray: XrayPoint[];
  regions?: ActiveRegion[];
  xra?: XraFlare[];
  fluxDays?: FluxDay[];
  flareChance?: number | null;
  now?: number;
}): TapeItem[] {
  const now = input.now ?? Date.now();
  const out: TapeItem[] = [];
  const live = readLiveFlare(input.xray, input.regions ?? [], now);
  if (live) out.push({ id: live.id, kind: "solar", text: live.line, major: live.phase !== "subsided" });

  const cluster = clusterWatch({
    xra: input.xra,
    regions: input.regions,
    fluxDays: input.fluxDays,
    now,
  });
  if (cluster.level === "cluster") {
    out.push({ id: "cluster", kind: "solar", text: cluster.tape, mark: "Cluster", major: true });
  }

  const launch = diskLaunches(input.xra, input.regions, now)[0];
  if (launch) {
    const when = launch.at.slice(5, 16).replace("T", " ");
    out.push({
      id: `disk-${launch.at.slice(0, 16)}`,
      kind: "solar",
      text: `${launch.klass}${launch.region ? ` · AR${launch.region}` : ""} · ${launch.where} · ${when} UTC`,
      mark: "Launch",
      major: launch.facing,
    });
  }

  const series = longChannelXrays(input.xray);
  let xr = series[0];
  for (const p of series) {
    if ((p.time_tag ?? "") > (xr?.time_tag ?? "")) xr = p;
  }
  const flux = xr ? xr.flux || xr.observed_flux || 0 : 0;
  if (xr && flux > 0) {
    const klass = fluxToClass(flux);
    out.push({
      id: "xray-now",
      kind: "solar",
      text: "long channel",
      mark: klass,
      major: klass.startsWith("M") || klass.startsWith("X"),
    });
  }

  const weekAgo = now - 7 * 86400000;
  for (const f of (input.xra ?? []).slice(0, 12)) {
    if (out.filter((i) => i.id.startsWith("xra-")).length >= 4) break;
    const t = Date.parse(f.at);
    if (!Number.isFinite(t) || t < weekAgo || t > now + 120_000) continue;
    const when = f.at.slice(5, 16).replace("T", " ");
    out.push({
      id: `xra-${f.at.slice(0, 16)}-${f.klass}`,
      kind: "solar",
      text: `${f.region ? `AR${f.region} · ` : ""}${when} UTC`,
      mark: f.klass,
      major: /^[MX]/i.test(f.klass),
    });
  }

  const regions = [...(input.regions ?? [])]
    .filter((r) => r.phase === "direct" || r.phase === "entering" || r.phase === "leaving" || r.phase === "east")
    .filter((r) => r.cLife + r.mLife + r.xLife > 0 || haleRank(r.hale) >= 3)
    .sort((a, b) => b.xLife - a.xLife || b.mLife - a.mLife || b.cLife - a.cLife || haleRank(b.hale) - haleRank(a.hale))
    .slice(0, 3);
  for (const r of regions) {
    out.push({
      id: `sol-ar-${r.region}`,
      kind: "solar",
      text: `${r.haleLabel} · ${r.phaseLabel}`,
      mark: `AR${r.region} C${r.cLife} M${r.mLife} X${r.xLife}`,
      major: r.mLife > 0 || r.xLife > 0,
    });
  }

  const wind = input.solarWind;
  if (wind && (wind.speed != null || wind.bz != null)) {
    const speed = wind.speed != null ? Math.round(wind.speed) : null;
    const bz = wind.bz;
    const major = (speed != null && speed >= 600) || (bz != null && bz <= -8);
    const bits = [
      wind.rtsw ? "RTSW" : "Wind",
      wind.source,
      speed != null ? `${speed} km/s` : null,
      bz != null ? `Bz ${bz > 0 ? "+" : ""}${bz.toFixed(1)}` : null,
    ].filter(Boolean);
    out.push({ id: "wind", kind: "solar", text: bits.join(" · "), major });
  }
  if (wind?.sheet) out.push({ id: "l1-sheet", kind: "solar", text: wind.sheet, major: true });
  if (wind?.electrons) out.push({ id: "l1-electrons", kind: "solar", text: wind.electrons, major: true });

  const kp = input.kp.length ? Number(input.kp[input.kp.length - 1]!.Kp) : null;
  if (kp != null && Number.isFinite(kp)) {
    out.push({ id: "kp", kind: "solar", text: "planetary", mark: `Kp ${kp.toFixed(1)}`, major: kp >= 5 });
  }

  if (input.scales) {
    out.push({
      id: "scales",
      kind: "solar",
      text: "NOAA scales",
      mark: `R${input.scales.R} S${input.scales.S} G${input.scales.G}`,
      major: scaleN(input.scales.R) >= 2 || scaleN(input.scales.S) >= 2 || scaleN(input.scales.G) >= 2,
    });
  }

  if (input.flareChance != null && Number.isFinite(input.flareChance)) {
    const pct = Math.round(input.flareChance * 100);
    out.push({
      id: "flare-chance",
      kind: "solar",
      text: "chance of M in 6 h",
      mark: `${pct}%`,
      major: input.flareChance >= 0.5,
    });
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
