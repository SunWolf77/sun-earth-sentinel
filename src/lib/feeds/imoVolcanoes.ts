/**
 * Icelandic Meteorological Office volcano status (VALS + VONA).
 * Official API: https://api.vedur.is/volcanoes/ — CC BY 4.0
 */

import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
import type { GlobalVolcAlert } from "@/lib/feeds/globalVolcanoAlerts";

const VOLC_BASE = "https://api.vedur.is/volcanoes";

type ImoVolcano = {
  code: string;
  name: string;
  si_code?: string;
  country?: { iso_code?: string; name_en?: string };
  zone?: { name_en?: string } | null;
  height?: number;
  geom_point?: { coordinates?: number[] };
  vona?: {
    current?: {
      id?: number;
      aviation_color?: { code?: string; description_en?: string };
      published_at?: string;
    } | null;
  };
  vals?: {
    current?: {
      id?: number;
      alert_level_info?: {
        level?: number;
        code_en?: string;
        description_en?: string;
      };
      published_at?: string;
    } | null;
  };
};

function mapColor(code: string | undefined): string {
  const c = (code || "").toUpperCase();
  if (c === "RED" || c === "RAUTT") return "RED";
  if (c === "ORANGE" || c === "APPELSÍNUGULT") return "ORANGE";
  if (c === "YELLOW" || c === "GULT") return "YELLOW";
  if (c === "GREEN" || c === "GRÆNT") return "GREEN";
  return "UNASSIGNED";
}

function valsLevelToColor(level: number | undefined): string {
  if (level == null) return "UNASSIGNED";
  if (level >= 3) return "RED";
  if (level === 2) return "ORANGE";
  if (level === 1) return "YELLOW";
  return "GREEN";
}

function colorToAlert(color: string): string {
  switch (color) {
    case "RED":
      return "WARNING";
    case "ORANGE":
      return "WATCH";
    case "YELLOW":
      return "ADVISORY";
    default:
      return "NORMAL";
  }
}

/**
 * Elevated Icelandic volcanoes from IMO VALS and/or VONA (aviation).
 * Prefers higher of VALS vs VONA color for pin severity.
 */
export async function fetchImoElevatedVolcanoes(): Promise<GlobalVolcAlert[]> {
  try {
    const res = await fetch(`${VOLC_BASE}/volcanoes`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`IMO volc ${res.status}`);
    const list = (await res.json()) as ImoVolcano[];
    const out: GlobalVolcAlert[] = [];

    for (const v of list) {
      if (v.country?.iso_code && v.country.iso_code !== "IS") continue;
      const coords = v.geom_point?.coordinates;
      if (!coords || coords.length < 2) continue;
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      const vonaColor = mapColor(v.vona?.current?.aviation_color?.code);
      const valsColor = valsLevelToColor(v.vals?.current?.alert_level_info?.level);
      const rank = (c: string) =>
        c === "RED" ? 4 : c === "ORANGE" ? 3 : c === "YELLOW" ? 2 : c === "GREEN" ? 1 : 0;
      const color = rank(vonaColor) >= rank(valsColor) ? vonaColor : valsColor;
      if (color === "GREEN" || color === "UNASSIGNED") continue;

      const published =
        v.vona?.current?.published_at || v.vals?.current?.published_at || null;
      const sentUnix = published ? Date.parse(published) : null;
      const native =
        v.vals?.current?.alert_level_info?.code_en ||
        v.vona?.current?.aviation_color?.code ||
        color;
      const desc =
        v.vals?.current?.alert_level_info?.description_en ||
        v.vona?.current?.aviation_color?.description_en ||
        "";

      const alert: GlobalVolcAlert = {
        id: `imo-volc-${v.code}`,
        name: v.name,
        vnum: v.si_code ? String(v.si_code) : null,
        alertLevel: colorToAlert(color),
        colorCode: color,
        obsAbbr: "IMO",
        obsName: "Icelandic Meteorological Office",
        sentUtc: published,
        sentUnix: Number.isFinite(sentUnix) ? sentUnix : null,
        noticeUrl: "https://en.vedur.is/earthquakes-and-volcanism/volcanic-eruptions/",
        noticeId: v.code,
        lat,
        lon,
        elevationM: v.height ?? null,
        region: v.zone?.name_en || "Iceland",
        volcanoUrl: `https://en.vedur.is/earthquakes-and-volcanism/volcanic-eruptions/`,
        source: "imo",
        officialNative: `${native}${desc ? ` — ${desc}` : ""}`,
        restless: true,
      };
      out.push(alert);
    }

    return out;
  } catch {
    return [];
  }
}

export function asUsgsStyle(list: GlobalVolcAlert[]): UsgsVolcanoAlert[] {
  return list.map((v) => ({ ...v }));
}
