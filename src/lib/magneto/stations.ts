/**
 * INTERMAGNET observatory subset used by Richard Cordaro's public tool
 * (drmagneto.appspot.com). Coords + elevation from operator / IAGA yearbooks
 * (approximate). These are magnetometers (nT), not seismometers.
 */

export type MagStation = {
  code: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
  /** Metres above sea level — observatory pier / yearbook, not a survey here */
  elevationM: number | null;
  /** Prefer for default multi-station watch */
  priority?: boolean;
};

/** Curated global + Pacific-relevant set. Elevation: IAGA / operator yearbook approx. */
export const MAG_STATIONS: MagStation[] = [
  { code: "HYB", name: "Hyderabad, India", lat: 17.417, lon: 78.553, region: "India", elevationM: 505, priority: true },
  { code: "IZN", name: "Iznik, Turkey", lat: 40.43, lon: 29.72, region: "Europe", elevationM: 220, priority: true },
  { code: "BOU", name: "Boulder, USA", lat: 40.137, lon: -105.237, region: "N America", elevationM: 1682, priority: true },
  { code: "FRD", name: "Fredericksburg, USA", lat: 38.205, lon: -77.373, region: "N America", elevationM: 69 },
  { code: "TUC", name: "Tucson, USA", lat: 32.174, lon: -110.733, region: "N America", elevationM: 946 },
  { code: "HON", name: "Honolulu, USA", lat: 21.32, lon: -158.0, region: "Pacific", elevationM: 4, priority: true },
  { code: "GUA", name: "Guam, USA", lat: 13.59, lon: 144.87, region: "Pacific", elevationM: 140, priority: true },
  { code: "CTA", name: "Charters Towers, Australia", lat: -20.09, lon: 146.26, region: "Australia", elevationM: 370, priority: true },
  { code: "CNB", name: "Canberra, Australia", lat: -35.32, lon: 149.36, region: "Australia", elevationM: 859, priority: true },
  { code: "ASP", name: "Alice Springs, Australia", lat: -23.76, lon: 133.88, region: "Australia", elevationM: 557 },
  { code: "KNY", name: "Kanoya, Japan", lat: 31.42, lon: 130.88, region: "Japan", elevationM: 107, priority: true },
  { code: "KAK", name: "Kakioka, Japan", lat: 36.23, lon: 140.19, region: "Japan", elevationM: 36, priority: true },
  { code: "PPT", name: "Pamatai, French Polynesia", lat: -17.57, lon: -149.58, region: "Pacific", elevationM: 355, priority: true },
  { code: "API", name: "Apia, Samoa", lat: -13.81, lon: -171.78, region: "Pacific", elevationM: 2 },
  { code: "EYR", name: "Eyrewell, New Zealand", lat: -43.41, lon: 172.35, region: "NZ", elevationM: 64, priority: true },
  { code: "IPM", name: "Isla de Pascua, Chile", lat: -27.17, lon: -109.42, region: "Pacific", elevationM: 120 },
  { code: "PHU", name: "Phuthuy, Vietnam", lat: 21.03, lon: 105.95, region: "SE Asia", elevationM: 5 },
  { code: "TAM", name: "Tamanrasset, Algeria", lat: 22.79, lon: 5.53, region: "Africa", elevationM: 1373 },
  { code: "ABK", name: "Abisko, Sweden", lat: 68.36, lon: 18.82, region: "Arctic", elevationM: 380 },
  { code: "BRW", name: "Barrow, USA", lat: 71.32, lon: -156.62, region: "Arctic", elevationM: 10 },
  { code: "CMO", name: "College, USA", lat: 64.87, lon: -147.86, region: "Alaska", elevationM: 197 },
  { code: "BEL", name: "Belsk, Poland", lat: 51.84, lon: 20.79, region: "Europe", elevationM: 180 },
  { code: "CLF", name: "Chambon-la-Forêt, France", lat: 48.02, lon: 2.26, region: "Europe", elevationM: 145 },
  { code: "HAD", name: "Hartland, UK", lat: 51.0, lon: -4.48, region: "Europe", elevationM: 95 },
];

export function getStation(code: string): MagStation | undefined {
  return MAG_STATIONS.find((s) => s.code === code.toUpperCase());
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
