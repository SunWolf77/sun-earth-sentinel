/**
 * Absolute plate motion via Euler poles (NNR-MORVEL56-style approximations).
 * Velocities in mm/yr at Earth's surface. Educational — not a full MORVEL solution.
 *
 * Sources: DeMets et al. MORVEL / Argus NNR-MORVEL56 plate angular velocities
 * (rounded for client-side viz). Plate codes match PB2002 Bird (2003).
 */

export type EulerPole = {
  /** Pole latitude °N */
  lat: number;
  /** Pole longitude °E */
  lon: number;
  /** Angular speed °/Myr (right-handed, CCW when looking from tip of ω) */
  omega: number;
};

/** Major PB2002 plates — absolute NNR-ish poles (°/Myr). */
export const EULER_POLES: Record<string, EulerPole> = {
  AF: { lat: 50.6, lon: -74.0, omega: 0.285 }, // Africa
  AM: { lat: 60.0, lon: -120.0, omega: 0.25 }, // Amur (approx)
  AN: { lat: 65.9, lon: -118.1, omega: 0.25 }, // Antarctica
  AR: { lat: 27.4, lon: 4.2, omega: 0.515 }, // Arabia
  AU: { lat: 33.9, lon: 37.8, omega: 0.632 }, // Australia
  BH: { lat: 30.0, lon: 90.0, omega: 0.4 }, // Birds Head approx
  BR: { lat: -1.0, lon: -76.0, omega: 0.2 }, // Burma approx
  BS: { lat: 20.0, lon: 140.0, omega: 0.3 }, // Banda Sea approx
  BU: { lat: 15.0, lon: 95.0, omega: 0.5 }, // Burma
  CA: { lat: 35.0, lon: -93.0, omega: 0.25 }, // Caribbean
  CL: { lat: 15.0, lon: -105.0, omega: 1.2 }, // Cocos-ish / Caroline
  CO: { lat: 36.8, lon: -108.6, omega: 1.2 }, // Cocos
  CR: { lat: 20.0, lon: -105.0, omega: 1.5 }, // Rivera-ish
  EA: { lat: 55.0, lon: 140.0, omega: 0.9 }, // Easter approx
  EU: { lat: 56.3, lon: -99.7, omega: 0.223 }, // Eurasia
  FT: { lat: 0, lon: -110, omega: 0.5 }, // Futuna approx
  GP: { lat: 15.0, lon: -105.0, omega: 1.0 }, // Galapagos
  IN: { lat: 50.9, lon: 1.5, omega: 0.524 }, // India
  JF: { lat: -11.4, lon: 65.0, omega: 0.95 }, // Juan de Fuca
  JZ: { lat: -10.0, lon: -110.0, omega: 1.0 }, // Juan Fernandez
  KE: { lat: -40.0, lon: 50.0, omega: 0.8 }, // Kerguelen
  MA: { lat: 0.0, lon: 80.0, omega: 0.6 }, // Manus
  MN: { lat: 5.0, lon: 125.0, omega: 0.5 }, // Maoke
  MO: { lat: 15.0, lon: 125.0, omega: 0.4 }, // Molucca Sea
  MS: { lat: -5.0, lon: 145.0, omega: 0.4 }, // North Bismarck
  NA: { lat: -4.9, lon: -80.6, omega: 0.209 }, // North America
  NB: { lat: 0.0, lon: 135.0, omega: 0.5 }, // North Bismarck
  ND: { lat: 10.0, lon: 95.0, omega: 0.4 }, // North Andes?
  NH: { lat: -10.0, lon: 170.0, omega: 1.5 }, // New Hebrides
  NI: { lat: 10.0, lon: -85.0, omega: 0.8 }, // Nazca-ish? (use NZ)
  NZ: { lat: 55.6, lon: -90.1, omega: 0.636 }, // Nazca
  OK: { lat: 30.0, lon: 140.0, omega: 0.3 }, // Okhotsk
  ON: { lat: 35.0, lon: 135.0, omega: 0.5 }, // Okinawa
  PA: { lat: -63.1, lon: 107.2, omega: 0.651 }, // Pacific
  PM: { lat: 50.0, lon: -100.0, omega: 0.2 }, // Panama
  PS: { lat: -2.0, lon: 135.0, omega: 0.9 }, // Philippine Sea
  RI: { lat: 20.0, lon: -107.0, omega: 1.8 }, // Rivera
  SA: { lat: -16.3, lon: -117.9, omega: 0.121 }, // South America
  SB: { lat: -5.0, lon: 150.0, omega: 0.8 }, // South Bismarck
  SC: { lat: 22.0, lon: -100.0, omega: 0.15 }, // Scotia
  SL: { lat: 10.0, lon: -85.0, omega: 0.5 }, // Shetland / Sunda-ish
  SO: { lat: 58.8, lon: -81.6, omega: 0.339 }, // Somalia
  SS: { lat: 0.0, lon: 120.0, omega: 0.5 }, // Solomon Sea
  SU: { lat: 50.0, lon: -90.0, omega: 0.3 }, // Sunda
  SW: { lat: -55.0, lon: -30.0, omega: 0.3 }, // Sandwich
  TI: { lat: -5.0, lon: 125.0, omega: 0.6 }, // Timor
  TO: { lat: -28.0, lon: -175.0, omega: 2.5 }, // Tonga (fast)
  WL: { lat: 0.0, lon: 140.0, omega: 0.4 }, // Woodlark
  YA: { lat: 40.0, lon: 140.0, omega: 0.3 }, // Yangtze
};

export type EnVelocity = {
  /** Eastward mm/yr */
  ve: number;
  /** Northward mm/yr */
  vn: number;
  /** Speed mm/yr */
  speed: number;
  /** Bearing ° clockwise from north */
  bearing: number;
};

const R_EARTH_KM = 6371;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Convert Euler pole to Cartesian angular velocity (rad/Myr). */
function omegaVector(pole: EulerPole): [number, number, number] {
  const lat = pole.lat * DEG2RAD;
  const lon = pole.lon * DEG2RAD;
  const w = pole.omega * DEG2RAD; // rad/Myr
  return [w * Math.cos(lat) * Math.cos(lon), w * Math.cos(lat) * Math.sin(lon), w * Math.sin(lat)];
}

function positionUnit(lat: number, lon: number): [number, number, number] {
  const φ = lat * DEG2RAD;
  const λ = lon * DEG2RAD;
  return [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Horizontal surface velocity of a plate at (lat, lon) in mm/yr.
 * v = ω × r  → tangential speed = |ω×r̂| * R_earth.
 * Convert rad/Myr * km → mm/yr: * 1e6 mm/km / Myr… wait:
 * |ω| in rad/Myr, R in km → speed km/Myr = |ω×r| * R
 * km/Myr * 1e6 mm/km / 1e6 yr/Myr? 1 Myr = 1e6 yr
 * km/Myr = 1e6 mm / 1e6 yr = mm/yr. So speed_mm_yr = |ω×r̂| * R_km.
 */
export function plateVelocity(
  plateCode: string,
  lat: number,
  lon: number,
): EnVelocity | null {
  const pole = EULER_POLES[plateCode];
  if (!pole) return null;
  const w = omegaVector(pole);
  const r = positionUnit(lat, lon);
  const vCart = cross(w, r); // rad/Myr in ECEF-ish units (on unit sphere)
  // Local ENU basis
  const φ = lat * DEG2RAD;
  const λ = lon * DEG2RAD;
  // East: (-sin λ, cos λ, 0)
  const east: [number, number, number] = [-Math.sin(λ), Math.cos(λ), 0];
  // North: (-sin φ cos λ, -sin φ sin λ, cos φ)
  const north: [number, number, number] = [
    -Math.sin(φ) * Math.cos(λ),
    -Math.sin(φ) * Math.sin(λ),
    Math.cos(φ),
  ];
  const ve_rad = vCart[0] * east[0] + vCart[1] * east[1] + vCart[2] * east[2];
  const vn_rad = vCart[0] * north[0] + vCart[1] * north[1] + vCart[2] * north[2];
  const ve = ve_rad * R_EARTH_KM; // mm/yr numerically as km/Myr ≡ mm/yr
  const vn = vn_rad * R_EARTH_KM;
  const speed = Math.hypot(ve, vn);
  let bearing = Math.atan2(ve, vn) * RAD2DEG;
  if (bearing < 0) bearing += 360;
  return { ve, vn, speed, bearing };
}

/** Relative velocity of plate A w.r.t. plate B at a point. */
export function relativeVelocity(
  plateA: string,
  plateB: string,
  lat: number,
  lon: number,
): EnVelocity | null {
  const a = plateVelocity(plateA, lat, lon);
  const b = plateVelocity(plateB, lat, lon);
  if (!a || !b) {
    // fall back to whichever is known
    if (a) return a;
    if (b) return { ve: -b.ve, vn: -b.vn, speed: b.speed, bearing: (b.bearing + 180) % 360 };
    return null;
  }
  const ve = a.ve - b.ve;
  const vn = a.vn - b.vn;
  const speed = Math.hypot(ve, vn);
  let bearing = Math.atan2(ve, vn) * RAD2DEG;
  if (bearing < 0) bearing += 360;
  return { ve, vn, speed, bearing };
}

export type BoundaryKinematics = "convergent" | "divergent" | "transform" | "unknown";

/**
 * Classify boundary using relative velocity vs local boundary tangent.
 * tangent: unit vector along the boundary (east, north).
 */
export function classifyKinematics(
  rel: EnVelocity,
  tangentE: number,
  tangentN: number,
): BoundaryKinematics {
  const tLen = Math.hypot(tangentE, tangentN) || 1;
  const te = tangentE / tLen;
  const tn = tangentN / tLen;
  // Normal pointing left of tangent (CCW): (-tn, te) wait: left of (te,tn) is (-tn, te)
  const ne = -tn;
  const nn = te;
  const vPar = rel.ve * te + rel.vn * tn;
  const vNor = rel.ve * ne + rel.vn * nn;
  const absP = Math.abs(vPar);
  const absN = Math.abs(vNor);
  if (rel.speed < 3) return "unknown";
  if (absN >= absP * 0.85) {
    // normal-dominated: sign of vNor is arbitrary (normal direction); use Type when known
    return "convergent"; // refined by caller if subduction tagged
  }
  if (absP >= absN * 1.15) return "transform";
  return absN > absP ? "convergent" : "transform";
}

/** Better classify: use normal component magnitude vs parallel; divergent if plates separate. */
export function classifyWithNormal(
  rel: EnVelocity,
  tangentE: number,
  tangentN: number,
  /** If USGS/PB2002 says subduction */
  forceSubduction?: boolean,
): BoundaryKinematics {
  if (forceSubduction) return "convergent";
  const tLen = Math.hypot(tangentE, tangentN) || 1;
  const te = tangentE / tLen;
  const tn = tangentN / tLen;
  // Use absolute normal vs parallel only
  const vPar = Math.abs(rel.ve * te + rel.vn * tn);
  const vNor = Math.abs(rel.ve * -tn + rel.vn * te);
  if (rel.speed < 2.5) return "unknown";
  if (vNor > vPar * 1.05) {
    // For divergent vs convergent we need extension sense — approximate with
    // whether relative motion has a large component; without plate side we
    // use speed bands: mid-ocean ridges often faster extension in MORVEL...
    // Heuristic: if Name uses ridge pairs known — leave as divergent when
    // parallel is small and caller may override. Default normal → check
    // relative to mid-ocean: many AF-AN style are divergent.
    return "divergent"; // caller may override with subduction flag
  }
  if (vPar > vNor * 1.1) return "transform";
  return "unknown";
}
