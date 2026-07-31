/** Public solar imagery / movie URLs — stills first, movies opt-in. */

export const SDO_BASE = "https://sdo.gsfc.nasa.gov/assets/img/latest";
export const SDO_MPEG = "https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg";
export const SOHO_RT = "https://soho.nascom.nasa.gov/data/realtime";
export const SOHO_LATEST = "https://soho.nascom.nasa.gov/data/LATEST";
export const STEREO_BEACON = "https://stereo-ssc.nascom.nasa.gov/beacon";
export const HELIOVIEWER = "https://api.helioviewer.org/v2";
export const SWPC_IMG = "https://services.swpc.noaa.gov/images";

/** Primary disk picker (always available when imagery on). */
export const SDO_CHANNELS = [
  { id: "0193", label: "AIA 193", hint: "Corona · active regions", storm: true },
  { id: "0171", label: "AIA 171", hint: "Quiet corona / loops", storm: false },
  { id: "0304", label: "AIA 304", hint: "Chromosphere · filaments", storm: true },
  { id: "0211", label: "AIA 211", hint: "Active corona", storm: true },
  { id: "0094", label: "AIA 94", hint: "Hot flares", storm: true },
  { id: "0131", label: "AIA 131", hint: "Hot flares / flaring loops", storm: true },
  { id: "HMIB", label: "HMI B", hint: "Magnetogram", storm: false },
  { id: "HMII", label: "HMI I", hint: "Intensitygram", storm: false },
  { id: "HMIIC", label: "HMI IC", hint: "Continuum · spots", storm: false },
] as const;

export type SdoChannelId = (typeof SDO_CHANNELS)[number]["id"];

export function sdoStill(channel: string, size: 256 | 512 | 1024 = 512, bust = 0) {
  // Composite is a special product name
  if (channel === "211193171") {
    return `${SDO_BASE}/latest_${size}_211193171.jpg?t=${bust}`;
  }
  return `${SDO_BASE}/latest_${size}_${channel}.jpg?t=${bust}`;
}

export function sdoMovie(channel: string, size: 512 | 1024 = 512, bust = 0) {
  if (channel === "211193171" || channel.startsWith("HMI")) {
    // movies not always available for all products — still URL only
    return sdoStill(channel, size === 1024 ? 1024 : 512, bust);
  }
  return `${SDO_MPEG}/latest_${size}_${channel}.mp4?t=${bust}`;
}

export function lascoStill(cam: "c2" | "c3", size: 512 | 1024 = 512, bust = 0) {
  return `${SOHO_RT}/${cam}/${size}/latest.jpg?t=${bust}`;
}

export function lascoMovie(cam: "c2" | "c3", small = true, bust = 0) {
  const name = small ? `current_${cam}small.mp4` : `current_${cam}.mp4`;
  return `${SOHO_LATEST}/${name}?t=${bust}`;
}

/** STEREO-A beacon — off-Earth / limb / far-longitude EUV + coronagraph. */
export function stereoEuvi(wave: "195" | "304" | "171" = "195", size: 256 | 512 = 512, bust = 0) {
  return `${STEREO_BEACON}/latest_${size}/ahead_euvi_${wave}_latest.jpg?t=${bust}`;
}

export function stereoCor2(size: 256 | 512 = 512, bust = 0) {
  return `${STEREO_BEACON}/latest_${size}/ahead_cor2_latest.jpg?t=${bust}`;
}

/** Heliographic STEREO map (shows longitude coverage vs Earth). */
export function stereoHeliographic(bust = 0) {
  return `${STEREO_BEACON}/euvi_195_heliographic.gif?t=${bust}`;
}

/** Solar Orbiter EUI FSI source IDs on Helioviewer. */
export const SOLO_EUI = {
  fsi174: 84,
  fsi304: 85,
} as const;

export async function soloClosestDate(sourceId: number): Promise<{ date: string; name: string } | null> {
  try {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const res = await fetch(
      `${HELIOVIEWER}/getClosestImage/?date=${encodeURIComponent(now)}&sourceId=${sourceId}`,
    );
    if (!res.ok) return null;
    const d = (await res.json()) as { date?: string; name?: string };
    if (!d.date) return null;
    const iso = d.date.includes("T") ? d.date : d.date.replace(" ", "T") + "Z";
    return { date: iso, name: d.name || "Solar Orbiter EUI" };
  } catch {
    return null;
  }
}

/** Direct PNG screenshot of Solar Orbiter EUI (Helioviewer). */
export function soloScreenshotUrl(dateIso: string, layer: "174" | "304" = "174") {
  const layers =
    layer === "174" ? "[SOLO,EUI,FSI,174,1,100]" : "[SOLO,EUI,FSI,304,1,100]";
  const q = new URLSearchParams({
    imageScale: "4.8",
    layers,
    events: "",
    eventLabels: "false",
    scale: "false",
    date: dateIso,
    x1: "-1400",
    x2: "1400",
    y1: "-1400",
    y2: "1400",
    display: "true",
    watermark: "true",
  });
  return `${HELIOVIEWER}/takeScreenshot/?${q.toString()}`;
}

export type ImageryWallItem = {
  id: string;
  group: "sdo" | "maps" | "corona" | "swpc" | "models";
  title: string;
  /** Image URL factory — only called when wall is open */
  src: (bust: number, size: 512 | 1024) => string | null;
  href: string;
  caption?: string;
  /** Heavier tiles — only in Full mode */
  fullOnly?: boolean;
};

/**
 * Dense enthusiast wall (parity with free SDO/SWPC still walls).
 * Mount only when user expands wall — no auto-fetch on Solar open.
 */
export const IMAGERY_WALL: ImageryWallItem[] = [
  {
    id: "aia171",
    group: "sdo",
    title: "AIA 171",
    src: (b, s) => sdoStill("0171", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "aia193",
    group: "sdo",
    title: "AIA 193",
    src: (b, s) => sdoStill("0193", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "aia211",
    group: "sdo",
    title: "AIA 211",
    src: (b, s) => sdoStill("0211", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "aia304",
    group: "sdo",
    title: "AIA 304",
    src: (b, s) => sdoStill("0304", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "aia094",
    group: "sdo",
    title: "AIA 094",
    src: (b, s) => sdoStill("0094", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "aia131",
    group: "sdo",
    title: "AIA 131",
    src: (b, s) => sdoStill("0131", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "comp",
    group: "sdo",
    title: "211/193/171",
    src: (b, s) => sdoStill("211193171", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
    caption: "Composite",
  },
  {
    id: "hmib",
    group: "sdo",
    title: "HMI B",
    src: (b, s) => sdoStill("HMIB", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "hmii",
    group: "sdo",
    title: "HMI I",
    src: (b, s) => sdoStill("HMII", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "hmiic",
    group: "sdo",
    title: "HMI IC",
    src: (b, s) => sdoStill("HMIIC", s, b),
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "charmap",
    group: "maps",
    title: "Solar charmap",
    src: (b) => `https://solen.info/solar/images/charmap.jpg?t=${b}`,
    href: "https://solen.info/solar/",
    caption: "solen.info",
  },
  {
    id: "armap",
    group: "maps",
    title: "SDO AR map",
    src: (b) => `${SDO_BASE}/latest_ar_map.png?t=${b}`,
    href: "https://sdo.gsfc.nasa.gov/data/",
  },
  {
    id: "c2",
    group: "corona",
    title: "LASCO C2",
    src: (b, s) => lascoStill("c2", s, b),
    href: "https://soho.nascom.nasa.gov/data/realtime-images.html",
  },
  {
    id: "c3",
    group: "corona",
    title: "LASCO C3",
    src: (b, s) => lascoStill("c3", s, b),
    href: "https://soho.nascom.nasa.gov/data/realtime-images.html",
  },
  {
    id: "cor2",
    group: "corona",
    title: "STEREO COR2",
    src: (b, s) => stereoCor2(s === 1024 ? 512 : s, b),
    href: "https://stereo-ssc.nascom.nasa.gov/beacon/beacon_secchi.shtml",
  },
  {
    id: "kp-png",
    group: "swpc",
    title: "Station K index",
    src: (b) => `${SWPC_IMG}/station-k-index.png?t=${b}`,
    href: "https://www.swpc.noaa.gov/products/planetary-k-index",
    fullOnly: true,
  },
  {
    id: "aurora-n",
    group: "swpc",
    title: "Aurora forecast N",
    src: (b) => `${SWPC_IMG}/aurora-forecast-northern-hemisphere.jpg?t=${b}`,
    href: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
    fullOnly: true,
  },
  {
    id: "aurora-s",
    group: "swpc",
    title: "Aurora forecast S",
    src: (b) => `${SWPC_IMG}/aurora-forecast-southern-hemisphere.jpg?t=${b}`,
    href: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
    fullOnly: true,
  },
];

export type OfficialLink = {
  id: string;
  title: string;
  href: string;
  blurb: string;
};

/** Outbound only — no extra image load. */
export const OFFICIAL_MODEL_LINKS: OfficialLink[] = [
  {
    id: "ccor",
    title: "GOES CCOR-1",
    href: "https://www.swpc.noaa.gov/products/coronagraph",
    blurb: "Compact coronagraph (SWPC product page)",
  },
  {
    id: "xray-plot",
    title: "GOES X-ray flux",
    href: "https://www.swpc.noaa.gov/products/goes-x-ray-flux",
    blurb: "Official 1–8 Å plot",
  },
  {
    id: "proton-plot",
    title: "GOES proton flux",
    href: "https://www.swpc.noaa.gov/products/goes-proton-flux",
    blurb: "Integral proton channels",
  },
  {
    id: "rtsw",
    title: "Real-time solar wind",
    href: "https://www.swpc.noaa.gov/products/real-time-solar-wind",
    blurb: "DSCOVR / ACE plasma & B",
  },
  {
    id: "enlil",
    title: "WSA-ENLIL (SWPC)",
    href: "https://www.swpc.noaa.gov/products/wsa-enlil-solar-wind-prediction",
    blurb: "Heliospheric CME / wind model",
  },
  {
    id: "enthusiasts",
    title: "SWPC Enthusiasts Dashboard",
    href: "https://www.spaceweather.gov/communities/space-weather-enthusiasts-dashboard",
    blurb: "Official multi-product wall",
  },
  {
    id: "ccmc",
    title: "NASA CCMC models",
    href: "https://ccmc.gsfc.nasa.gov/models/",
    blurb: "ENLIL, scoreboards, ISWA catalog",
  },
  {
    id: "swpc-models",
    title: "All SWPC models",
    href: "https://www.swpc.noaa.gov/models",
    blurb: "Operational model list",
  },
];
