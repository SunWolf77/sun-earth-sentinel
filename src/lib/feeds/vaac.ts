/**
 * Volcanic ash — VAAC is the authority. We route to the right centre
 * and (Washington only) draw their published KML. We do not track clouds.
 *
 * Nine ICAO VAACs. Aviation color on SES nodes is USGS/INGV/KVERT —
 * a different product from VAA/VAG geometry.
 */

export type VaacId =
  | "anchorage"
  | "washington"
  | "montreal"
  | "buenosaires"
  | "toulouse"
  | "london"
  | "tokyo"
  | "darwin"
  | "wellington";

export type VaacCenter = {
  id: VaacId;
  name: string;
  href: string;
  aor: string;
};

export const VAAC_CENTERS: VaacCenter[] = [
  {
    id: "wellington",
    name: "Wellington VAAC",
    href: "https://vaac.metservice.com/",
    aor: "NZ · Tonga · Fiji · S. Pacific",
  },
  {
    id: "darwin",
    name: "Darwin VAAC",
    href: "https://www.bom.gov.au/aviation/warnings/volcanic-ash/",
    aor: "Indonesia · Philippines · N. Australia · PNG",
  },
  {
    id: "tokyo",
    name: "Tokyo VAAC",
    href: "https://ds.data.jma.go.jp/svd/vaac/data/index.html",
    aor: "Japan · Korea · NW Pacific · Kamchatka (shared)",
  },
  {
    id: "anchorage",
    name: "Anchorage VAAC",
    href: "https://www.weather.gov/vaac/",
    aor: "Alaska · Aleutians · Kamchatka (shared)",
  },
  {
    id: "washington",
    name: "Washington VAAC",
    href: "https://www.ospo.noaa.gov/products/atmosphere/vaac/messages.html",
    aor: "CONUS · Hawaii · Caribbean · C. America · N. Andes",
  },
  {
    id: "buenosaires",
    name: "Buenos Aires VAAC",
    href: "https://www.smn.gob.ar/vaac",
    aor: "S. America south of ~10°S",
  },
  {
    id: "montreal",
    name: "Montreal VAAC",
    href: "https://weather.gc.ca/eer/vaac/index_e.html",
    aor: "Canada",
  },
  {
    id: "london",
    name: "London VAAC",
    href: "https://www.metoffice.gov.uk/services/transport/aviation/regulated/vaac",
    aor: "UK · Iceland · NE Atlantic",
  },
  {
    id: "toulouse",
    name: "Toulouse VAAC",
    href: "https://vaac.meteo.fr/",
    aor: "Europe · Africa · Mediterranean",
  },
];

export const VAAC_LINKS = {
  volcat: "https://volcano.ssec.wisc.edu/",
  hysplit: "https://www.ready.noaa.gov/READYVolcAsh.php",
  icao: "https://www.icao.int/safety/meteorology/VAAC/Pages/default.aspx",
  washingtonMessages: "https://www.ospo.noaa.gov/products/atmosphere/vaac/messages.html",
} as const;

function wrapLon(lon: number): number {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

/** Coarse AOR. Shared Kamchatka → Tokyo if lon ≥ 155. */
export function vaacFor(lat: number, lon: number): VaacCenter {
  const φ = lat;
  const λ = wrapLon(lon);

  if (φ >= 50 && φ <= 72 && λ >= -25 && λ <= 10) return byId("london");
  if (φ >= 62 && φ <= 68 && λ >= -25 && λ <= -12) return byId("london");
  if (φ >= -52 && φ <= -8 && ((λ >= 155 && λ <= 180) || (λ >= -180 && λ <= -150))) {
    return byId("wellington");
  }
  if (φ >= -20 && φ <= 28 && λ >= 90 && λ <= 160) return byId("darwin");
  if (φ >= 20 && φ <= 55 && λ >= 118 && λ <= 155) return byId("tokyo");
  if (φ >= 48 && φ <= 70 && λ >= 155 && λ <= 175) return byId("tokyo");
  if (φ >= 50 && φ <= 75 && ((λ >= 170 && λ <= 180) || (λ >= -180 && λ <= -130))) {
    return byId("anchorage");
  }
  if (φ >= 45 && φ <= 85 && λ >= -141 && λ <= -50) return byId("montreal");
  if (φ >= -60 && φ < -8 && λ >= -80 && λ <= -30) return byId("buenosaires");
  if (φ >= -12 && φ <= 32 && λ >= -105 && λ <= -58) return byId("washington");
  if (φ >= 15 && φ <= 50 && λ >= -170 && λ <= -60) return byId("washington");
  if (φ >= 12 && φ <= 22 && λ >= 144 && λ <= 147) return byId("washington");
  if (φ >= 28 && φ <= 72 && λ >= -15 && λ <= 45) return byId("toulouse");
  if (φ >= -40 && φ <= 40 && λ >= -20 && λ <= 55) return byId("toulouse");
  return byId("washington");
}

function byId(id: VaacId): VaacCenter {
  return VAAC_CENTERS.find((c) => c.id === id)!;
}

export type AshRing = {
  volcano: string;
  folder: string;
  forecast: boolean;
  fl: string | null;
  latlngs: [number, number][];
};

export type VaacAdvisory = {
  volcano: string;
  issuedUtc: string;
  htmlUrl: string | null;
  kmlUrl: string | null;
  jpegUrl: string | null;
  xmlUrl: string | null;
  rings: AshRing[];
};

export type VaacBundle = {
  source: "washington-vaac";
  fetchedAt: number;
  updatedNote: string | null;
  advisories: VaacAdvisory[];
  plain: string;
};

const OSPO = "https://www.ospo.noaa.gov";

export function absOspo(href: string): string {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `${OSPO}${href}`;
  return `${OSPO}/products/atmosphere/vaac/${href}`;
}

/** Parse Washington VAAC 24h messages HTML. Newest KML kept per volcano. */
export function parseWashingtonMessages(html: string): Omit<VaacAdvisory, "rings">[] {
  const section = html.split(/Advisories from the past 15 days/i)[0] ?? html;
  const hits: Omit<VaacAdvisory, "rings">[] = [];
  const re =
    /<a href="([^"]+)"[^>]*>\s*(\d{3,4}\s*UTC)\s*<\/a>[\s\S]{0,800}?kml_files\/([^"'<>]+\.kml)/gi;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(section))) {
    const htmlUrl = absOspo(m[1]!);
    const issuedUtc = m[2]!.replace(/\s+/g, " ");
    const kmlFile = m[3]!;
    const volcano = kmlFile.replace(/_ASH_.*$/i, "").replace(/_/g, " ");
    const key = volcano.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const slice = section.slice(Math.max(0, m.index - 80), m.index + (m[0]?.length ?? 0) + 200);
    const jpeg = slice.match(/\/VAAC\/[^"'<>]+\.jpe?g/i);
    const xml = slice.match(/xml_files\/[^"'<>]+\.xml/i);
    hits.push({
      volcano,
      issuedUtc,
      htmlUrl,
      kmlUrl: absOspo(`/products/atmosphere/vaac/volcanoes/kml_files/${kmlFile}`),
      jpegUrl: jpeg ? absOspo(jpeg[0]) : null,
      xmlUrl: xml ? absOspo(`/products/atmosphere/vaac/volcanoes/${xml[0]}`) : null,
    });
  }
  return hits.slice(0, 8);
}

export function parseVaacKml(xml: string, volcano: string): AshRing[] {
  const rings: AshRing[] = [];
  const folders = xml.split(/<Folder>/i).slice(1);
  const chunks = folders.length ? folders : [xml];
  for (const chunk of chunks) {
    const fname = chunk.match(/<name>\s*([^<]+)\s*<\/name>/i)?.[1]?.trim() ?? "";
    const forecast = /forecast/i.test(fname);
    const coordBlocks = [...chunk.matchAll(/<coordinates>\s*([^<]+)\s*<\/coordinates>/gi)];
    const fl = chunk.match(/VA to (FL\d+)/i)?.[1] ?? null;
    for (const c of coordBlocks) {
      const latlngs: [number, number][] = [];
      for (const pt of c[1]!.trim().split(/\s+/)) {
        const [lonS, latS] = pt.split(",");
        const lon = Number(lonS);
        const lat = Number(latS);
        if (Number.isFinite(lat) && Number.isFinite(lon)) latlngs.push([lat, lon]);
      }
      if (latlngs.length >= 3) {
        rings.push({ volcano, folder: fname || (forecast ? "Forecast" : "Observed"), forecast, fl, latlngs });
      }
    }
  }
  return rings;
}
