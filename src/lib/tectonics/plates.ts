/**
 * Plate boundary loading + motion-arrow sampling (PB2002 + Euler poles).
 */

import {
  relativeVelocity,
  type BoundaryKinematics,
  type EnVelocity,
} from "@/lib/tectonics/euler";

export type PlateBoundaryProps = {
  Name?: string;
  PlateA?: string;
  PlateB?: string;
  Type?: string;
  Source?: string;
};

export type PlateBoundaryFeature = GeoJSON.Feature<
  GeoJSON.LineString | GeoJSON.MultiLineString,
  PlateBoundaryProps
>;

export type PlateBoundaryCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString | GeoJSON.MultiLineString,
  PlateBoundaryProps
>;

export type MotionArrow = {
  lat: number;
  lon: number;
  /** Absolute-ish relative motion A vs B */
  bearing: number;
  speed: number;
  plateA: string;
  plateB: string;
  kind: BoundaryKinematics;
  name: string;
  /** Boundary tangent bearing (deg from N) for transform styling */
  tangentBearing: number;
};

export const BOUNDARY_COLORS: Record<BoundaryKinematics, string> = {
  convergent: "#f43f5e", // subduction / collision
  divergent: "#38bdf8", // ridge / spreading
  transform: "#a3e635", // strike-slip
  unknown: "#94a3b8",
};

export const BOUNDARY_LABELS: Record<BoundaryKinematics, string> = {
  convergent: "Convergent",
  divergent: "Divergent",
  transform: "Transform",
  unknown: "Boundary",
};

let cache: PlateBoundaryCollection | null = null;
let cachePromise: Promise<PlateBoundaryCollection> | null = null;

export async function loadPlateBoundaries(
  signal?: AbortSignal,
): Promise<PlateBoundaryCollection> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    // Prefer local bundle; fall back to GitHub raw (fraxen/tectonicplates)
    const urls = [
      "/data/pb2002_boundaries.json",
      "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json",
    ];
    let lastErr: unknown;
    for (const url of urls) {
      try {
        const res = await fetch(url, { signal, cache: "force-cache" });
        if (!res.ok) throw new Error(`${url} ${res.status}`);
        const data = (await res.json()) as PlateBoundaryCollection;
        if (!data.features?.length) throw new Error("empty plate data");
        cache = data;
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Plate boundaries failed to load");
  })();

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
}

function lineStringsOf(
  geom: GeoJSON.LineString | GeoJSON.MultiLineString,
): number[][][] {
  if (geom.type === "LineString") return [geom.coordinates as number[][]];
  return geom.coordinates as number[][][];
}

function parsePlates(name: string | undefined, a?: string, b?: string): [string, string] {
  if (a && b) return [a, b];
  if (!name) return ["", ""];
  // Names like AF-AN, EU/AF, AN\SA, PA-AU
  const m = name.match(/^([A-Z]{2})[-/\\]([A-Z]{2})/i);
  if (m) return [m[1]!.toUpperCase(), m[2]!.toUpperCase()];
  return ["", ""];
}

function segmentTangent(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): { e: number; n: number; bearing: number } {
  // Local EN approx
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const n = dLat;
  const e = dLon * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const len = Math.hypot(e, n) || 1;
  let bearing = (Math.atan2(e, n) * 180) / Math.PI;
  if (bearing < 0) bearing += 360;
  return { e: e / len, n: n / len, bearing };
}

function kindForBoundary(
  props: PlateBoundaryProps,
  rel: EnVelocity | null,
  te: number,
  tn: number,
): BoundaryKinematics {
  const type = (props.Type || "").toLowerCase();
  if (type.includes("subduction") || type.includes("trench")) return "convergent";
  if (type.includes("ridge") || type.includes("spreading")) return "divergent";
  if (type.includes("transform")) return "transform";

  if (!rel || rel.speed < 2) return "unknown";

  const vPar = Math.abs(rel.ve * te + rel.vn * tn);
  const vNor = Math.abs(rel.ve * -tn + rel.vn * te);

  // Name heuristics for classic ridges / trenches
  const name = props.Name || "";
  if (/PA-NA|NA-PA|PA-CO|CO-NA|PA-NZ|NZ-SA|SA-NZ|PA-AU|AU-PA|PH|PS-EU|EU-PS/i.test(name) && type) {
    /* keep */
  }

  if (vPar > vNor * 1.25) return "transform";
  if (vNor >= vPar) {
    // Normal motion: subduction tags already handled. Ridges often lack Type.
    // Use plate pairs known for spreading vs use speed: still ambiguous.
    // Prefer divergent for mid-ocean-ish pairs commonly listed without Type.
    const [pa, pb] = parsePlates(props.Name, props.PlateA, props.PlateB);
    const pair = `${pa}-${pb}`;
    const convergentPairs =
      /PA-NA|NA-PA|PA-CO|CO-PA|NZ-SA|SA-NZ|PA-AU|AU-PA|PA-PS|PS-PA|EU-IN|IN-EU|AR-EU|EU-AR|AU-EU|SU-|TO-|NH-|JF-/;
    if (convergentPairs.test(pair) || convergentPairs.test(name)) return "convergent";
    // Southern ocean / Atlantic ridges
    if (/AF-AN|AN-AF|AF-SA|SA-AF|NA-EU|EU-NA|AU-AN|AN-AU|AN-PA|PA-AN|SO-AN|AN-SO/.test(pair))
      return "divergent";
    return vNor > 15 ? "convergent" : "divergent";
  }
  return "transform";
}

/**
 * Sample motion arrows along boundaries.
 * stepVertices: take every Nth segment midpoint.
 */
export function sampleMotionArrows(
  data: PlateBoundaryCollection,
  opts: { step?: number; minSpeed?: number } = {},
): MotionArrow[] {
  const step = opts.step ?? 4;
  const minSpeed = opts.minSpeed ?? 4;
  const arrows: MotionArrow[] = [];

  for (const f of data.features) {
    const props = f.properties || {};
    const [plateA, plateB] = parsePlates(props.Name, props.PlateA, props.PlateB);
    const lines = lineStringsOf(f.geometry);

    for (const line of lines) {
      if (line.length < 2) continue;
      for (let i = 0; i < line.length - 1; i += step) {
        const a = line[i]!;
        const b = line[Math.min(i + 1, line.length - 1)]!;
        const lon1 = a[0]!,
          lat1 = a[1]!;
        const lon2 = b[0]!,
          lat2 = b[1]!;
        // skip huge dateline jumps
        if (Math.abs(lon2 - lon1) > 90) continue;

        const lat = (lat1 + lat2) / 2;
        const lon = (lon1 + lon2) / 2;
        const tan = segmentTangent(lon1, lat1, lon2, lat2);
        const rel =
          plateA && plateB ? relativeVelocity(plateA, plateB, lat, lon) : null;
        if (!rel || rel.speed < minSpeed) continue;

        const kind = kindForBoundary(props, rel, tan.e, tan.n);
        arrows.push({
          lat,
          lon,
          bearing: rel.bearing,
          speed: rel.speed,
          plateA: plateA || "?",
          plateB: plateB || "?",
          kind,
          name: props.Name || `${plateA}-${plateB}`,
          tangentBearing: tan.bearing,
        });
      }
    }
  }
  return arrows;
}

/** Style a boundary feature from props + first-segment kinematics. */
export function boundaryKind(feature: PlateBoundaryFeature): BoundaryKinematics {
  const props = feature.properties || {};
  const type = (props.Type || "").toLowerCase();
  if (type.includes("subduction")) return "convergent";

  const lines = lineStringsOf(feature.geometry);
  const line = lines[0];
  if (!line || line.length < 2) return "unknown";
  const a = line[0]!;
  const b = line[Math.min(3, line.length - 1)]!;
  if (Math.abs(b[0]! - a[0]!) > 90) return "unknown";
  const lat = (a[1]! + b[1]!) / 2;
  const lon = (a[0]! + b[0]!) / 2;
  const [pa, pb] = parsePlates(props.Name, props.PlateA, props.PlateB);
  const rel = pa && pb ? relativeVelocity(pa, pb, lat, lon) : null;
  const tan = segmentTangent(a[0]!, a[1]!, b[0]!, b[1]!);
  return kindForBoundary(props, rel, tan.e, tan.n);
}
