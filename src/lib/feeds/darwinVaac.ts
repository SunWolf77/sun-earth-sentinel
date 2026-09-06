/**
 * Darwin VAAC — live volcanic ash advisories (Indonesia / PNG / N. Australia).
 * Official aviation product (BoM). Not PVMBG / MAGMA civil protection.
 * We do not track the cloud; we surface the current VAA while it is in force.
 */

import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";
import { RAISED, isFresh } from "@/lib/ops/raisedTimeout";

export const DARWIN_VAAC_PAGE =
  "https://www.bom.gov.au/aviation/volcanic-ash/darwin-va-advisory.shtml";
export const DARWIN_VAAC_API = "https://www.bom.gov.au/aviation/php/process.php";

export type DarwinVaa = {
  name: string;
  vnum: string | null;
  lat: number;
  lon: number;
  area: string | null;
  dtgUtc: string;
  issuedMs: number;
  fl: number | null;
  details: string;
  advisoryNr: string | null;
  dissipated: boolean;
  text: string;
  graphic: string | null;
};

export type DarwinVaacApiRow = {
  name?: string;
  text?: string;
  graphic?: string | null;
  isBackup?: boolean;
};

export type DarwinVaacApi = {
  total?: number;
  advisories?: Record<string, DarwinVaacApiRow> | DarwinVaacApiRow[];
};

const DISPLAY: Record<string, string> = {
  "262000": "Anak Krakatau",
  KRAKATAU: "Anak Krakatau",
};

export function displayVaacName(volcano: string, vnum: string | null): string {
  const vn = (vnum || "").trim();
  if (vn && DISPLAY[vn]) return DISPLAY[vn]!;
  const key = volcano.trim().toUpperCase();
  if (DISPLAY[key]) return DISPLAY[key]!;
  return volcano
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function stripVaacHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** DTG: 20260905/2230Z → epoch ms */
export function parseVaacDtg(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.trim().match(/(\d{8})\/(\d{4})Z?/i);
  if (!m) return null;
  const d = m[1]!;
  const t = m[2]!;
  const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:00Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** PSN: S0606 E10525 → decimal degrees */
export function parseVaacPsn(raw: string | null | undefined): { lat: number; lon: number } | null {
  if (!raw) return null;
  const m = raw
    .trim()
    .match(/([NS])\s*(\d{2})(\d{2})(?:\.\d+)?\s+([EW])\s*(\d{3})(\d{2})(?:\.\d+)?/i);
  if (!m) return null;
  const lat = (Number(m[2]) + Number(m[3]) / 60) * (m[1]!.toUpperCase() === "S" ? -1 : 1);
  const lon = (Number(m[5]) + Number(m[6]) / 60) * (m[4]!.toUpperCase() === "W" ? -1 : 1);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** Highest observed / reported FL — not the forecast polygons. */
export function maxObservedFl(text: string): number | null {
  const eruption = text.match(
    /ERUPTION DETAILS:\s*([\s\S]*?)(?=\n\s*(?:OBS VA|EST VA|FCST VA|RMK:|NXT ADVISORY)|$)/i,
  );
  const obs = text.match(
    /(?:OBS VA CLD|EST VA CLD):\s*([\s\S]*?)(?=\n\s*FCST VA CLD|\n\s*RMK:|\n\s*NXT ADVISORY|$)/i,
  );
  const zone = `${eruption?.[1] ?? ""}\n${obs?.[1] ?? ""}`;
  let max = 0;
  for (const m of zone.matchAll(/FL(\d{3})/g)) {
    const n = Number(m[1]);
    if (n > max) max = n;
  }
  return max > 0 ? max : null;
}

export function isDissipatedVaa(text: string): boolean {
  const ident = /VA NOT IDENTIFIABLE/i.test(text);
  const noExp = (text.match(/NO VA EXP/gi) ?? []).length >= 2;
  return ident && noExp;
}

export function flToColor(fl: number | null): {
  colorCode: UsgsVolcanoAlert["colorCode"];
  alertLevel: UsgsVolcanoAlert["alertLevel"];
} {
  const n = fl ?? 0;
  if (n >= 350) return { colorCode: "RED", alertLevel: "WARNING" };
  if (n >= 150) return { colorCode: "ORANGE", alertLevel: "WATCH" };
  if (n >= 50) return { colorCode: "YELLOW", alertLevel: "ADVISORY" };
  return { colorCode: "YELLOW", alertLevel: "ADVISORY" };
}

export function parseDarwinVaaText(
  raw: string,
  meta?: { name?: string; graphic?: string | null },
): DarwinVaa | null {
  const text = stripVaacHtml(raw);
  if (!/VA ADVISORY/i.test(text)) return null;
  const volLine = text.match(/VOLCANO:\s*([A-Z][A-Z0-9 \-']+?)(?:\s+(\d{5,6}))?\s*$/im);
  const nameRaw = (volLine?.[1] || meta?.name || "").replace(/\s+\d{5,6}\s*$/, "").trim();
  const vnum = (volLine?.[2] || meta?.name?.match(/(\d{5,6})/)?.[1] || null) as string | null;
  if (!nameRaw) return null;
  const psn = parseVaacPsn(text.match(/PSN:\s*([^\n]+)/i)?.[1]);
  if (!psn) return null;
  const dtgRaw = text.match(/DTG:\s*([0-9]{8}\/[0-9]{4}Z?)/i)?.[1] ?? "";
  const issuedMs = parseVaacDtg(dtgRaw);
  if (issuedMs == null) return null;
  const details = (text.match(/ERUPTION DETAILS:\s*([^\n]+)/i)?.[1] ?? "").trim();
  const area = (text.match(/AREA:\s*([^\n]+)/i)?.[1] ?? "").trim() || null;
  const advisoryNr = (text.match(/ADVISORY NR:\s*([^\n]+)/i)?.[1] ?? "").trim() || null;
  const dissipated = isDissipatedVaa(text);
  const fl = dissipated ? null : maxObservedFl(text);
  return {
    name: displayVaacName(nameRaw, vnum),
    vnum,
    lat: psn.lat,
    lon: psn.lon,
    area,
    dtgUtc: dtgRaw.toUpperCase().endsWith("Z") ? dtgRaw.toUpperCase() : `${dtgRaw}Z`,
    issuedMs,
    fl,
    details,
    advisoryNr,
    dissipated,
    text,
    graphic: meta?.graphic ?? null,
  };
}

export function darwinVaaToAlert(v: DarwinVaa): UsgsVolcanoAlert | null {
  if (v.dissipated || v.fl == null) return null;
  const { colorCode, alertLevel } = flToColor(v.fl);
  const flLabel = `FL${String(v.fl).padStart(3, "0")}`;
  const graphicUrl = v.graphic
    ? v.graphic.startsWith("http")
      ? v.graphic
      : `https://www.bom.gov.au/fwo/${v.graphic.replace(/^\/fwo\//, "")}`
    : null;
  return {
    id: `darwin-vaac-${v.vnum || v.name.replace(/\s+/g, "-").toLowerCase()}`,
    name: v.name,
    vnum: v.vnum,
    alertLevel,
    colorCode,
    obsAbbr: "VAAC",
    obsName: "Darwin VAAC",
    sentUtc: v.dtgUtc,
    sentUnix: v.issuedMs,
    noticeUrl: graphicUrl || DARWIN_VAAC_PAGE,
    noticeId: v.advisoryNr,
    lat: v.lat,
    lon: v.lon,
    elevationM: null,
    region: v.area,
    volcanoUrl: v.vnum ? `https://volcano.si.edu/volcano.cfm?vn=${v.vnum}` : DARWIN_VAAC_PAGE,
    source: "vaac",
    officialNative: flLabel,
  };
}

export function parseDarwinVaacJson(
  json: DarwinVaacApi | null | undefined,
  now = Date.now(),
): UsgsVolcanoAlert[] {
  if (!json) return [];
  const raw = json.advisories;
  const rows: DarwinVaacApiRow[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw)
      : [];
  const out: UsgsVolcanoAlert[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row?.isBackup) continue;
    if (!row?.text) continue;
    const vaa = parseDarwinVaaText(row.text, { name: row.name, graphic: row.graphic });
    if (!vaa) continue;
    if (!isFresh(vaa.issuedMs, RAISED.volc.vaacH, now)) continue;
    const alert = darwinVaaToAlert(vaa);
    if (!alert) continue;
    const key = alert.vnum || alert.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(alert);
  }
  return out.sort((a, b) => {
    const fa = Number(String(a.officialNative || "").replace(/\D/g, "") || 0);
    const fb = Number(String(b.officialNative || "").replace(/\D/g, "") || 0);
    if (fb !== fa) return fb - fa;
    return (b.sentUnix ?? 0) - (a.sentUnix ?? 0);
  });
}
