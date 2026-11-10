import type { EqFeature } from "@/lib/feeds/usgs";
import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
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

export function buildPulseTape(input: {
  features: EqFeature[] | undefined;
  kp: KpPoint[];
  solarWind: SolarWind | null;
  scales: NoaaScales | null;
  xray: XrayPoint[];
  volcanoes: UsgsVolcanoAlert[];
  toggles: TapeToggles;
}): TapeItem[] {
  const out: TapeItem[] = [];
  const feats = [...(input.features ?? [])]
    .filter((f) => f.properties.time != null && f.properties.mag != null)
    .sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0))
    .slice(0, 8);

  for (const f of feats) {
    const mag = f.properties.mag ?? 0;
    const major = mag >= 6;
    if (!show("quake", major, input.toggles)) continue;
    const [lon, lat] = f.geometry.coordinates;
    const place = f.properties.place?.replace(/^.* of /, "") ?? "event";
    out.push({
      id: `q-${f.id ?? f.properties.time}`,
      kind: "quake",
      text: `M${mag.toFixed(1)} · ${place}`,
      major,
      lat,
      lon,
    });
  }

  const kp = input.kp.length ? Number(input.kp[input.kp.length - 1]!.Kp) : null;
  if (kp != null && Number.isFinite(kp)) {
    const major = kp >= 5;
    if (show("solar", major, input.toggles)) {
      out.push({ id: "kp", kind: "solar", text: `Kp ${kp.toFixed(1)}`, major });
    }
  }

  const wind = input.solarWind;
  if (wind && (wind.speed != null || wind.bz != null)) {
    const speed = wind.speed != null ? Math.round(wind.speed) : null;
    const bz = wind.bz;
    const major = (speed != null && speed >= 700) || (bz != null && bz <= -10);
    if (show("solar", major, input.toggles)) {
      const bits = [
        speed != null ? `${speed} km/s` : null,
        bz != null ? `Bz ${bz.toFixed(1)}` : null,
      ].filter(Boolean);
      out.push({ id: "wind", kind: "solar", text: bits.join(" · "), major });
    }
  }

  if (input.scales) {
    const r = scaleN(input.scales.R);
    const s = scaleN(input.scales.S);
    const g = scaleN(input.scales.G);
    const major = r >= 3 || s >= 3 || g >= 3;
    if (show("solar", major, input.toggles)) {
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
    if (show("solar", major, input.toggles)) {
      out.push({ id: "xray", kind: "solar", text: `X-ray ${klass}`, major });
    }
  }

  const vols = [...input.volcanoes]
    .filter((v) => v.alertLevel !== "NORMAL" && v.colorCode !== "GREEN")
    .slice(0, 4);
  for (const v of vols) {
    const major = v.alertLevel === "WARNING" || v.colorCode === "RED";
    if (!show("volcano", major, input.toggles)) continue;
    out.push({
      id: `v-${v.id}`,
      kind: "volcano",
      text: `${v.name} · ${v.alertLevel}`,
      major,
      lat: v.lat ?? undefined,
      lon: v.lon ?? undefined,
    });
  }

  return out;
}
