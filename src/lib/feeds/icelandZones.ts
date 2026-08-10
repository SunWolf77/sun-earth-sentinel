/**
 * Iceland volcanic / seismic system zones for SES node #5.
 * Bounds are operational focus boxes (not legal hazard zones).
 * Codes align with IMO volcano codes where possible.
 */

import type { LatLonBounds } from "@/lib/geo/bounds";
import { pointInBounds } from "@/lib/geo/bounds";
import type { EqFeature } from "@/lib/feeds/usgs";

export type IcelandZoneId =
  | "reykjanes"
  | "hengill"
  | "katla"
  | "hekla"
  | "askja"
  | "bardarbunga"
  | "grimsvotn"
  | "tjornes"
  | "other";

export type IcelandZone = {
  id: IcelandZoneId;
  name: string;
  /** IMO volcano code when one primary vent/system */
  imoCode?: string;
  bounds: LatLonBounds;
  center: [number, number];
  /** Why this box matters for SUPT volcanic analytics */
  role: string;
  gvpUrl?: string;
};

/**
 * Focus boxes for dense IMO catalog segmentation.
 * Order matters for assignment: first match wins (more specific first).
 */
export const ICELAND_ZONES: IcelandZone[] = [
  {
    id: "reykjanes",
    name: "Reykjanes / Svartsengi",
    imoCode: "REY",
    bounds: [
      [63.7, -23.0],
      [64.15, -21.7],
    ],
    center: [63.9, -22.3],
    role: "Recent fissure eruptions · dike-related swarms",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=371020",
  },
  {
    id: "hengill",
    name: "Hengill / Ölfus",
    imoCode: "HEN",
    bounds: [
      [63.9, -21.7],
      [64.25, -21.0],
    ],
    center: [64.08, -21.3],
    role: "Geothermal · plate boundary stress",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=371050",
  },
  {
    id: "katla",
    name: "Katla / Mýrdalsjökull",
    imoCode: "KAT",
    bounds: [
      [63.45, -19.6],
      [63.85, -18.5],
    ],
    center: [63.63, -19.05],
    role: "Ice-covered caldera · glacial seismicity context",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=372030",
  },
  {
    id: "hekla",
    name: "Hekla",
    imoCode: "HEK",
    bounds: [
      [63.85, -19.9],
      [64.15, -19.3],
    ],
    center: [63.98, -19.7],
    role: "Classic Icelandic stratovolcano",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=372020",
  },
  {
    id: "askja",
    name: "Askja / Dyngjufjöll",
    imoCode: "ASK",
    bounds: [
      [64.85, -17.2],
      [65.25, -16.3],
    ],
    center: [65.05, -16.78],
    role: "Northern zone caldera · unrest watch",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=373060",
  },
  {
    id: "bardarbunga",
    name: "Bárðarbunga",
    imoCode: "BAR",
    bounds: [
      [64.4, -18.0],
      [64.85, -16.8],
    ],
    center: [64.64, -17.53],
    role: "Vatnajökull system · large past eruptions",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=373030",
  },
  {
    id: "grimsvotn",
    name: "Grímsvötn",
    imoCode: "GRI",
    bounds: [
      [64.25, -17.6],
      [64.55, -16.9],
    ],
    center: [64.42, -17.33],
    role: "Most frequent Holocene eruptions · under ice",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=373010",
  },
  {
    id: "tjornes",
    name: "Tjörnes / North TFZ",
    imoCode: "TEY",
    bounds: [
      [65.7, -19.0],
      [66.7, -16.5],
    ],
    center: [66.1, -17.5],
    role: "Transform fracture zone · tectonic swarms",
    gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=373080",
  },
];

/** Whole-island node bbox (matches dragon node). */
export const ICELAND_NODE_BOUNDS: LatLonBounds = [
  [62.8, -25.5],
  [67.3, -12.5],
];

export const ICELAND_NODE_CENTER: [number, number] = [64.9, -18.8];

export function assignIcelandZone(lat: number, lon: number): IcelandZoneId {
  for (const z of ICELAND_ZONES) {
    if (pointInBounds(lat, lon, z.bounds)) return z.id;
  }
  if (pointInBounds(lat, lon, ICELAND_NODE_BOUNDS)) return "other";
  return "other";
}

export function featuresInIcelandZone(
  features: EqFeature[],
  zoneId: IcelandZoneId,
  minMag = 0,
): EqFeature[] {
  return features.filter((f) => {
    const mag = f.properties.mag ?? 0;
    if (mag < minMag) return false;
    const [lon, lat] = f.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    return assignIcelandZone(lat, lon) === zoneId;
  });
}

export function featuresInIceland(
  features: EqFeature[],
  minMag = 0,
): EqFeature[] {
  return features.filter((f) => {
    const mag = f.properties.mag ?? 0;
    if (mag < minMag) return false;
    const [lon, lat] = f.geometry.coordinates;
    return pointInBounds(lat, lon, ICELAND_NODE_BOUNDS);
  });
}
