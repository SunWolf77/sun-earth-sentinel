/**
 * MORVEL / NNR-MORVEL56 notes + Euler-pole calculator helpers.
 * Educational layer for Sentinel — not a substitute for published tables.
 *
 * Primary refs:
 * - DeMets, Gordon & Argus (2010) Geochem. Geophys. Geosyst. — MORVEL
 * - Argus, Gordon & DeMets (2011) G³ — NNR-MORVEL56 no-net-rotation frame
 * - Bird (2003) G³ — PB2002 plate polygons/boundaries used on the map
 */

import { EULER_POLES, plateVelocity, type EnVelocity, type EulerPole } from "@/lib/tectonics/euler";

export const MORVEL_NOTES = {
  title: "MORVEL plate motion model",
  oneLiner:
    "MORVEL is a digital set of angular velocities describing how tectonic plates move relative to each other; NNR-MORVEL56 places that motion in a no-net-rotation mantle frame.",
  points: [
    "MORVEL estimates relative plate motions from mid-ocean ridge spreading rates, transform azimuths, and earthquake slip vectors.",
    "NNR-MORVEL56 adds a no-net-rotation constraint so each plate gets an absolute Euler pole (lat, lon, ω) in a global frame.",
    "Surface velocity at any point is v = ω × r — the cross product of the plate’s angular-velocity vector with the position vector.",
    "Relative motion across a boundary is v_A − v_B at that location (what our map arrows show).",
    "Sentinel ships rounded poles for viz; for research use the official MORVEL / NNR-MORVEL56 tables.",
  ],
  citations: [
    {
      label: "MORVEL (DeMets et al. 2010)",
      url: "https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2009GC002892",
    },
    {
      label: "NNR-MORVEL56 (Argus et al. 2011)",
      url: "https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2011GC003751",
    },
    {
      label: "PB2002 plates (Bird 2003)",
      url: "https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2001GC000252",
    },
  ],
};

export const EULER_CALC_NOTES = {
  title: "Euler pole calculations",
  formula: [
    "ω⃗ = ω · [cos φ_p cos λ_p, cos φ_p sin λ_p, sin φ_p]  (rad / Myr)",
    "r̂ = [cos φ cos λ, cos φ sin λ, sin φ]",
    "v⃗ ∝ ω⃗ × r̂   →   east & north components at the surface",
    "speed (mm/yr) ≈ |ω⃗ × r̂| · R_earth(km)   (numerically km/Myr ≡ mm/yr)",
    "bearing = atan2(v_east, v_north)  (degrees clockwise from north)",
  ],
  steps: [
    "1. Look up the plate’s Euler pole (φ_p, λ_p, ω) in the NNR frame.",
    "2. Convert pole + site to unit vectors / angular-velocity vector.",
    "3. Cross product → local east/north velocity.",
    "4. For boundaries, subtract plate B from plate A at the same site.",
    "5. Compare the relative vector to the boundary tangent → convergent / divergent / transform.",
  ],
};

/** Major plates with short labels for UI tables */
export const MAJOR_PLATES: { code: string; name: string }[] = [
  { code: "PA", name: "Pacific" },
  { code: "NA", name: "North America" },
  { code: "SA", name: "South America" },
  { code: "EU", name: "Eurasia" },
  { code: "AF", name: "Africa" },
  { code: "AU", name: "Australia" },
  { code: "AN", name: "Antarctica" },
  { code: "IN", name: "India" },
  { code: "AR", name: "Arabia" },
  { code: "NZ", name: "Nazca" },
  { code: "CO", name: "Cocos" },
  { code: "PS", name: "Philippine Sea" },
  { code: "SO", name: "Somalia" },
  { code: "CA", name: "Caribbean" },
  { code: "JF", name: "Juan de Fuca" },
  { code: "SC", name: "Scotia" },
];

export function listKnownPoles(): { code: string; name: string; pole: EulerPole }[] {
  const nameOf = Object.fromEntries(MAJOR_PLATES.map((p) => [p.code, p.name]));
  return Object.entries(EULER_POLES)
    .filter(([code]) => nameOf[code])
    .map(([code, pole]) => ({
      code,
      name: nameOf[code] || code,
      pole,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Quick absolute velocity at a lat/lon for a plate code. */
export function velocityAt(
  plate: string,
  lat: number,
  lon: number,
): EnVelocity | null {
  return plateVelocity(plate, lat, lon);
}

/** Pacific absolute motion near Tonga trench (demo point). */
export function tongaPacificDemo(): {
  lat: number;
  lon: number;
  v: EnVelocity | null;
} {
  const lat = -25.5;
  const lon = -176;
  return { lat, lon, v: plateVelocity("PA", lat, lon) };
}
