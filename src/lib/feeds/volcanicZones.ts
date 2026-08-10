/**
 * WolfWatch volcanic / system zone packs for SUPT volcanic desks.
 * Bounds are operational focus boxes — not legal hazard zones.
 */

import type { LatLonBounds } from "@/lib/geo/bounds";
import { ICELAND_ZONES, ICELAND_NODE_BOUNDS } from "@/lib/feeds/icelandZones";
import type { VolcDeskConfig, VolcZoneDef } from "@/lib/supt/volcanicDesk";
import type { GlobalVolcAlert } from "@/lib/feeds/globalVolcanoAlerts";

function icelandZonesAsVolc(): VolcZoneDef[] {
  return ICELAND_ZONES.map((z) => ({
    id: z.id,
    name: z.name,
    bounds: z.bounds,
    center: z.center,
    role: z.role,
    agencyCode: z.imoCode,
    gvpUrl: z.gvpUrl,
  }));
}

const NZ_BOUNDS: LatLonBounds = [
  [-48, 165],
  [-33, 180],
];

const JP_BOUNDS: LatLonBounds = [
  [24, 122],
  [46.5, 154],
];

const CL_BOUNDS: LatLonBounds = [
  [-45, -80],
  [-15, -65],
];

const KM_BOUNDS: LatLonBounds = [
  [42, 145],
  [62, 175],
];

const NZ_ZONES: VolcZoneDef[] = [
  {
    id: "auckland",
    name: "Auckland Volcanic Field",
    bounds: [
      [-37.2, 174.4],
      [-36.6, 175.2],
    ],
    center: [-36.9, 174.8],
    role: "Urban monogenetic field · GeoNet watch context",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=241020",
  },
  {
    id: "taupo",
    name: "Taupō / Rotorua",
    bounds: [
      [-39.2, 175.5],
      [-37.8, 176.8],
    ],
    center: [-38.5, 176.1],
    role: "TVZ · caldera systems · geothermal seismicity",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=241070",
  },
  {
    id: "tongariro",
    name: "Tongariro / Ruapehu",
    bounds: [
      [-39.5, 175.3],
      [-38.9, 176.0],
    ],
    center: [-39.2, 175.6],
    role: "Andesite cones · ski-field / aviation watch",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=241100",
  },
  {
    id: "taranaki",
    name: "Taranaki",
    bounds: [
      [-39.5, 173.8],
      [-39.0, 174.4],
    ],
    center: [-39.3, 174.1],
    role: "Stratovolcano · western North Island",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=241030",
  },
  {
    id: "hikurangi",
    name: "Hikurangi margin",
    bounds: [
      [-42.5, 176.5],
      [-37.5, 180],
    ],
    center: [-40.0, 178.0],
    role: "Subduction corridor · slow-slip / interface context",
  },
  {
    id: "alpine",
    name: "Alpine / Fiordland",
    bounds: [
      [-46.5, 166.5],
      [-42.5, 171.5],
    ],
    center: [-44.5, 168.5],
    role: "Plate boundary · Fiordland seismicity",
  },
];

const JP_ZONES: VolcZoneDef[] = [
  {
    id: "hokkaido",
    name: "Hokkaido",
    bounds: [
      [41.2, 139.5],
      [45.8, 146.0],
    ],
    center: [43.5, 142.5],
    role: "Northern arc · volcanoes + plate interface",
  },
  {
    id: "tohoku",
    name: "Tōhoku",
    bounds: [
      [36.5, 139.5],
      [41.5, 143.5],
    ],
    center: [39.0, 141.0],
    role: "Pacific plate interface · megathrust context",
  },
  {
    id: "kanto",
    name: "Kantō / Chūbu",
    bounds: [
      [34.5, 136.5],
      [37.0, 141.0],
    ],
    center: [35.7, 139.0],
    role: "Dense population corridor · crustal + subduction",
  },
  {
    id: "kyushu",
    name: "Kyūshū",
    bounds: [
      [30.5, 129.0],
      [34.0, 132.5],
    ],
    center: [32.5, 130.8],
    role: "Active volcanic arc · Sakurajima / Aso region",
  },
  {
    id: "nansei",
    name: "Nansei / Tokara",
    bounds: [
      [24.0, 122.0],
      [31.0, 131.5],
    ],
    center: [28.0, 129.0],
    role: "Island-arc swarm corridor · JMA dense",
  },
];

const CL_ZONES: VolcZoneDef[] = [
  {
    id: "norte",
    name: "Norte Grande",
    bounds: [
      [-28, -72],
      [-15, -66],
    ],
    center: [-22, -69],
    role: "Northern Andes · megathrust + high volcanoes",
  },
  {
    id: "central",
    name: "Chile Central",
    bounds: [
      [-36, -74],
      [-28, -68],
    ],
    center: [-33, -71],
    role: "Central corridor · high population exposure",
  },
  {
    id: "sur",
    name: "Sur / Lake District",
    bounds: [
      [-42, -75],
      [-36, -70],
    ],
    center: [-39, -72.5],
    role: "Southern volcanic zone · Villarrica / Calbuco context",
  },
  {
    id: "austral",
    name: "Austral",
    bounds: [
      [-45, -76],
      [-42, -70],
    ],
    center: [-43.5, -73],
    role: "Southern tip · sparse stations · CSN densify",
  },
];

const KM_ZONES: VolcZoneDef[] = [
  {
    id: "northern",
    name: "Northern Kamchatka",
    bounds: [
      [55.5, 158],
      [62, 165],
    ],
    center: [56.7, 161.4],
    role: "Shiveluch · northern arc watch",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=300270",
  },
  {
    id: "central",
    name: "Klyuchevskoy group",
    bounds: [
      [52.5, 157],
      [56.5, 162],
    ],
    center: [56.1, 160.6],
    role: "Highest Eurasian volcanoes · continuous unrest context",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=300250",
  },
  {
    id: "southern",
    name: "Southern Kamchatka",
    bounds: [
      [50, 155],
      [53.5, 160],
    ],
    center: [52, 157.5],
    role: "Southern peninsula · arc seismicity",
  },
  {
    id: "kurils",
    name: "Northern Kurils",
    bounds: [
      [45, 148],
      [51, 156],
    ],
    center: [48, 152],
    role: "Kuril arc · tsunami source potential",
  },
];

function imoAlert(a: GlobalVolcAlert): boolean {
  return a.source === "imo" || /iceland|reykjanes|katla|askja/i.test(a.name);
}

function gvpOrUsgs(a: GlobalVolcAlert): boolean {
  return (
    a.source === "usgs" ||
    a.source === "gvp" ||
    a.source === "kvert" ||
    a.source === "official"
  );
}

/** Desk configs keyed by SES dragon / published node id */
export const VOLCANIC_DESK_CONFIGS: Record<string, VolcDeskConfig> = {
  iceland: {
    deskId: "iceland",
    name: "Iceland",
    shortName: "Iceland",
    networkOrder: 5,
    authority: "IMO (Veðurstofa)",
    nodeBounds: ICELAND_NODE_BOUNDS,
    zones: icelandZonesAsVolc(),
    probeMinMag: 1.5,
    matchAlert: imoAlert,
    links: [
      {
        label: "IMO earthquakes",
        href: "https://en.vedur.is/earthquakes-and-volcanism/earthquakes/",
      },
      { label: "Skjálftalísa", href: "https://skjalftalisa.vedur.is/" },
      {
        label: "IMO volcanoes",
        href: "https://en.vedur.is/earthquakes-and-volcanism/volcanic-eruptions/",
      },
    ],
    disclaimer:
      "Educational volcanic analytics · IMO is authority · not a forecast · SUPT spacing is a timing probe, not hazard · relative rate is vs peer zones in this window.",
  },
  newzealand: {
    deskId: "newzealand",
    name: "New Zealand",
    shortName: "NZ",
    networkOrder: 8,
    authority: "GeoNet / GNS Science",
    nodeBounds: NZ_BOUNDS,
    zones: NZ_ZONES,
    probeMinMag: 2.0,
    matchAlert: gvpOrUsgs,
    links: [
      { label: "GeoNet", href: "https://www.geonet.org.nz/" },
      { label: "GeoNet volcanoes", href: "https://www.geonet.org.nz/volcano" },
    ],
    disclaimer:
      "Educational volcanic / system analytics · GeoNet / GNS is authority · not a forecast · SUPT spacing is a timing probe · relative rate vs peer zones.",
  },
  japan: {
    deskId: "japan",
    name: "Japan Arc",
    shortName: "Japan",
    networkOrder: 3,
    authority: "JMA (Bosai) + GVP",
    nodeBounds: JP_BOUNDS,
    zones: JP_ZONES,
    probeMinMag: 2.5,
    matchAlert: gvpOrUsgs,
    links: [
      {
        label: "JMA volcano",
        href: "https://www.jma.go.jp/jma/en/Activities/earthquake.html",
      },
      {
        label: "Japan board",
        href: "https://japan-kamchatka-monitor.vercel.app/",
      },
    ],
    disclaimer:
      "Educational arc analytics · JMA is domestic authority · not a forecast · SUPT spacing is a timing probe · relative rate vs peer zones.",
  },
  andes: {
    deskId: "andes",
    name: "Chile–Andes",
    shortName: "Andes",
    networkOrder: 7,
    authority: "CSN Chile + GVP",
    nodeBounds: CL_BOUNDS,
    zones: CL_ZONES,
    probeMinMag: 2.5,
    matchAlert: gvpOrUsgs,
    links: [
      { label: "CSN", href: "https://www.sismologia.cl/" },
      {
        label: "SERNAGEOMIN",
        href: "https://www.sernageomin.cl/",
      },
    ],
    disclaimer:
      "Educational megathrust / arc analytics · CSN / SERNAGEOMIN are authorities · not a forecast · SUPT spacing is a timing probe · relative rate vs peer zones.",
  },
  kamchatka: {
    deskId: "kamchatka",
    name: "Kamchatka–Kurils",
    shortName: "Kamchatka",
    networkOrder: 4,
    authority: "USGS + KVERT / GVP",
    nodeBounds: KM_BOUNDS,
    zones: KM_ZONES,
    probeMinMag: 2.5,
    matchAlert: gvpOrUsgs,
    links: [
      {
        label: "KVERT",
        href: "http://www.kscnet.ru/ivs/kvert/index_eng.php",
      },
      {
        label: "Japan–Kamchatka board",
        href: "https://japan-kamchatka-monitor.vercel.app/?node=kamchatka",
      },
    ],
    disclaimer:
      "Educational arc analytics · KVERT / USGS remain authorities · not a forecast · SUPT spacing is a timing probe · relative rate vs peer zones.",
  },
};

export function getVolcanicDeskConfig(
  nodeId: string | null | undefined,
): VolcDeskConfig | null {
  if (!nodeId) return null;
  return VOLCANIC_DESK_CONFIGS[nodeId] ?? null;
}

export function hasVolcanicDesk(nodeId: string | null | undefined): boolean {
  return Boolean(getVolcanicDeskConfig(nodeId));
}
