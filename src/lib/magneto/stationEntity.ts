/**
 * Station entity — separate processor. Never writes into the seismic catalog.
 *
 * INTERMAGNET IMOs measure magnetic field (nT) at a known pier elevation.
 * They are not seismometers. This entity only:
 *   1) geometry — surface range, hypocentral slant, azimuth, station elev
 *   2) optional coincidence with a catalog origin (time window + distance)
 *
 * Real-time *seismicity* stays on FDSN / agency catalogs. This desk answers
 * “which magnetic observatories sit near this rupture, at what height.”
 */

import { haversineKm, MAG_STATIONS, type MagStation } from "@/lib/magneto/stations";
import type { EqFeature } from "@/lib/feeds/usgs";
import type { MagPeak } from "@/lib/magneto/analyze";

export type StationLink = {
  station: MagStation;
  surfaceKm: number;
  /** Hypocentre → pier slant (depth + station elevation). */
  slantKm: number;
  azimuthDeg: number;
  band: "local" | "regional" | "far";
};

export type EventStationReport = {
  eventId: string;
  mag: number | null;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depthKm: number;
  links: StationLink[];
};

export type Coincidence = {
  eventId: string;
  stationCode: string;
  peakT: number;
  lagMin: number;
  slantKm: number;
};

const LOCAL_KM = 800;
const REGIONAL_KM = 3000;

export function hypocentralSlantKm(
  surfaceKm: number,
  depthKm: number,
  elevationM: number | null,
): number {
  const elevKm = (elevationM ?? 0) / 1000;
  const dVert = depthKm + elevKm;
  return Math.hypot(surfaceKm, dVert);
}

export function azimuthDeg(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δλ = ((toLon - fromLon) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function bandOf(km: number): StationLink["band"] {
  if (km < LOCAL_KM) return "local";
  if (km < REGIONAL_KM) return "regional";
  return "far";
}

export function linkStationToOrigin(
  station: MagStation,
  lat: number,
  lon: number,
  depthKm: number,
): StationLink {
  const surfaceKm = haversineKm(station.lat, station.lon, lat, lon);
  return {
    station,
    surfaceKm,
    slantKm: hypocentralSlantKm(surfaceKm, depthKm, station.elevationM),
    azimuthDeg: azimuthDeg(station.lat, station.lon, lat, lon),
    band: bandOf(surfaceKm),
  };
}

export function stationsNearOrigin(opts: {
  lat: number;
  lon: number;
  depthKm: number;
  max?: number;
  maxSurfaceKm?: number;
  stations?: MagStation[];
}): StationLink[] {
  const max = opts.max ?? 6;
  const cap = opts.maxSurfaceKm ?? 12_000;
  const list = opts.stations ?? MAG_STATIONS;
  return list
    .map((s) => linkStationToOrigin(s, opts.lat, opts.lon, opts.depthKm))
    .filter((l) => l.surfaceKm <= cap)
    .sort((a, b) => a.slantKm - b.slantKm)
    .slice(0, max);
}

function eventCore(f: EqFeature): {
  id: string;
  mag: number | null;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depthKm: number;
} | null {
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat, depth] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const time = f.properties.time;
  if (time == null || !Number.isFinite(time)) return null;
  return {
    id: String(f.id ?? `${time}_${lat}_${lon}`),
    mag: f.properties.mag,
    place: f.properties.place?.trim() || "location pending",
    time,
    lat,
    lon,
    depthKm: Number.isFinite(depth) ? (depth as number) : 0,
  };
}

/** Pure report — does not mutate features / catalog. */
export function reportForEvent(
  f: EqFeature,
  opts?: { max?: number; maxSurfaceKm?: number },
): EventStationReport | null {
  const e = eventCore(f);
  if (!e) return null;
  return {
    eventId: e.id,
    mag: e.mag,
    place: e.place,
    time: e.time,
    lat: e.lat,
    lon: e.lon,
    depthKm: e.depthKm,
    links: stationsNearOrigin({
      lat: e.lat,
      lon: e.lon,
      depthKm: e.depthKm,
      max: opts?.max,
      maxSurfaceKm: opts?.maxSurfaceKm,
    }),
  };
}

export function reportsForCatalog(
  features: EqFeature[],
  opts: { minMag?: number; maxEvents?: number; maxStations?: number } = {},
): EventStationReport[] {
  const minMag = opts.minMag ?? 5;
  const maxEvents = opts.maxEvents ?? 4;
  const scored = features
    .map((f) => ({ f, mag: f.properties.mag ?? -1, t: f.properties.time ?? 0 }))
    .filter((x) => x.mag >= minMag)
    .sort((a, b) => b.t - a.t)
    .slice(0, maxEvents);

  const out: EventStationReport[] = [];
  for (const x of scored) {
    const r = reportForEvent(x.f, { max: opts.maxStations ?? 4 });
    if (r) out.push(r);
  }
  return out;
}

/** Optional: H-series peak near an origin — coincidence, not a pick. */
export function coincidePeaks(opts: {
  peaks: MagPeak[];
  station: MagStation;
  features: EqFeature[];
  preMin?: number;
  postMin?: number;
  maxSlantKm?: number;
  minMag?: number;
}): Coincidence[] {
  const pre = (opts.preMin ?? 45) * 60_000;
  const post = (opts.postMin ?? 180) * 60_000;
  const maxS = opts.maxSlantKm ?? 4000;
  const minMag = opts.minMag ?? 5;
  const hits: Coincidence[] = [];

  for (const f of opts.features) {
    const e = eventCore(f);
    if (!e || e.mag == null || e.mag < minMag) continue;
    const link = linkStationToOrigin(opts.station, e.lat, e.lon, e.depthKm);
    if (link.slantKm > maxS) continue;
    for (const p of opts.peaks) {
      const lag = e.time - p.t;
      if (lag < -pre || lag > post) continue;
      hits.push({
        eventId: e.id,
        stationCode: opts.station.code,
        peakT: p.t,
        lagMin: lag / 60_000,
        slantKm: link.slantKm,
      });
    }
  }
  return hits.sort((a, b) => Math.abs(a.lagMin) - Math.abs(b.lagMin)).slice(0, 8);
}

export const STATION_ENTITY_NOTE =
  "INTERMAGNET IMOs are magnetometers. Elevation is pier / yearbook. Slant is hypocentre → station — geometry only. Not a seismic pick, not EEW.";
