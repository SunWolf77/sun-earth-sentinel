/**
 * INGV / Protezione Civile — Italian volcano official alert levels.
 * Authority for Campi Flegrei, Vesuvius, Etna, Stromboli (not USGS HANS).
 *
 * Parses public “stato attuale” pages when available; maps GIALLO→YELLOW etc.
 * Observational only — not a forecast product.
 */

import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";

type ItalyVolc = {
  id: string;
  name: string;
  vnum: string;
  lat: number;
  lon: number;
  elevationM: number;
  region: string;
  /** Official status page */
  statusUrl: string;
  /** SES / app node to attach (avoids double pin) */
  preferNodeId?: string;
  /** Fallback if fetch fails (last known official) */
  fallbackLevel: "VERDE" | "GIALLO" | "ARANCIONE" | "ROSSO";
};

/** Core Italian volcanoes with public status pages / known official levels. */
export const ITALY_VOLCANOES: ItalyVolc[] = [
  {
    id: "campi-flegrei",
    name: "Campi Flegrei",
    vnum: "211010",
    lat: 40.827,
    lon: 14.139,
    elevationM: 458,
    region: "Campania, Italy",
    statusUrl: "https://www.ov.ingv.it/index.php/flegrei-stato-attuale",
    preferNodeId: "mediterranean",
    // Official PC/INGV: allerta gialla (fase 2) through 2026 reporting
    fallbackLevel: "GIALLO",
  },
  {
    id: "vesuvio",
    name: "Vesuvius",
    vnum: "211020",
    lat: 40.821,
    lon: 14.426,
    elevationM: 1281,
    region: "Campania, Italy",
    statusUrl: "https://www.ov.ingv.it/index.php/vesuvio-stato-attuale",
    fallbackLevel: "VERDE",
  },
  {
    id: "etna",
    name: "Etna",
    vnum: "211060",
    lat: 37.748,
    lon: 14.999,
    elevationM: 3329,
    region: "Sicily, Italy",
    statusUrl: "https://www.ct.ingv.it/",
    fallbackLevel: "GIALLO",
  },
  {
    id: "stromboli",
    name: "Stromboli",
    vnum: "211040",
    lat: 38.789,
    lon: 15.213,
    elevationM: 924,
    region: "Aeolian Islands, Italy",
    statusUrl: "https://www.ct.ingv.it/",
    fallbackLevel: "GIALLO",
  },
];

export type ItalyAlertLevel = "VERDE" | "GIALLO" | "ARANCIONE" | "ROSSO";

export function parseItalyAlertLevel(html: string): ItalyAlertLevel | null {
  const t = html.replace(/\s+/g, " ");
  // Prefer explicit riquadro / livello phrases
  const m =
    t.match(/LIVELLO DI ALLERTA\s+(VERDE|GIALLO|ARANCIONE|ROSSO)/i) ||
    t.match(/ov-riquadro-stato-(verde|giallo|arancione|rosso)/i) ||
    t.match(/livello di allerta[:\s]+(verde|giallo|arancione|rosso)/i) ||
    t.match(/\b(allerta\s+)?(verde|giallo|arancione|rosso)\b/i);
  if (!m) return null;
  const raw = (m[1] || m[2] || "").toUpperCase();
  if (raw.includes("ROSSO")) return "ROSSO";
  if (raw.includes("ARANCIONE")) return "ARANCIONE";
  if (raw.includes("GIALLO")) return "GIALLO";
  if (raw.includes("VERDE")) return "VERDE";
  return null;
}

/** Map Italian PC colors → USGS-style aviation + alert vocabulary for shared UI. */
export function italyToUsgsStyle(level: ItalyAlertLevel): {
  alertLevel: string;
  colorCode: string;
  restless: boolean;
} {
  switch (level) {
    case "ROSSO":
      return { alertLevel: "WARNING", colorCode: "RED", restless: true };
    case "ARANCIONE":
      return { alertLevel: "WATCH", colorCode: "ORANGE", restless: true };
    case "GIALLO":
      return { alertLevel: "ADVISORY", colorCode: "YELLOW", restless: true };
    default:
      return { alertLevel: "NORMAL", colorCode: "GREEN", restless: false };
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; SunEarthSentinel/1.0; observational volcano status)",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Live INGV/PC status for Italian volcanoes.
 * Only returns elevated (≠ VERDE) so baseline vents don’t clutter the map.
 * Campi Flegrei prefers SES node id `mediterranean` (no second pin).
 */
export async function fetchIngvItalyElevated(): Promise<UsgsVolcanoAlert[]> {
  const out: UsgsVolcanoAlert[] = [];

  // Unique status URLs — fetch once
  const urls = [...new Set(ITALY_VOLCANOES.map((v) => v.statusUrl))];
  const htmlByUrl = new Map<string, string | null>();
  await Promise.all(
    urls.map(async (u) => {
      htmlByUrl.set(u, await fetchHtml(u));
    }),
  );

  for (const v of ITALY_VOLCANOES) {
    const html = htmlByUrl.get(v.statusUrl);
    let level: ItalyAlertLevel = v.fallbackLevel;
    let parsed = false;
    if (html) {
      // Etna/Stromboli share CT homepage — only accept parse if name appears
      const nameHit =
        v.id === "campi-flegrei" ||
        v.id === "vesuvio" ||
        html.toLowerCase().includes(v.name.toLowerCase()) ||
        html.toLowerCase().includes(v.id.replace("-", " "));
      const p = nameHit ? parseItalyAlertLevel(html) : null;
      if (p) {
        // For shared CT page, parsing is weak — trust fallback unless Campi/Vesuvius OV
        if (v.statusUrl.includes("ov.ingv.it") || p !== "VERDE") {
          // OV pages are authoritative per volcano
          if (v.statusUrl.includes("flegrei") || v.statusUrl.includes("vesuvio")) {
            level = p;
            parsed = true;
          } else if (v.fallbackLevel !== "VERDE") {
            level = v.fallbackLevel;
            parsed = false;
          }
        }
      }
    }

    const style = italyToUsgsStyle(level);
    if (style.colorCode === "GREEN" && style.alertLevel === "NORMAL") continue;

    const notice =
      v.id === "campi-flegrei"
        ? "https://www.ov.ingv.it/index.php/flegrei-stato-attuale"
        : v.statusUrl;

    out.push({
      id: `ingv-${v.id}`,
      name: v.name,
      vnum: v.vnum,
      alertLevel: style.alertLevel,
      colorCode: style.colorCode,
      obsAbbr: "INGV",
      obsName: "INGV · Protezione Civile",
      sentUtc: new Date().toISOString(),
      sentUnix: Math.floor(Date.now() / 1000),
      noticeUrl: notice,
      noticeId: parsed ? `ingv-live-${v.id}` : `ingv-fallback-${v.id}`,
      lat: v.lat,
      lon: v.lon,
      elevationM: v.elevationM,
      region: v.region,
      volcanoUrl: notice,
      // extended fields consumed by merge/dedupe
      source: "ingv",
      officialNative: level,
      preferNodeId: v.preferNodeId,
      restless: style.restless,
    } as UsgsVolcanoAlert);
  }

  return out;
}
