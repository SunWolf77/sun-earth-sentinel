/**
 * Geographic helpers — including antimeridian-aware boxes
 * (e.g. Tonga–Kermadec: lonMin=170, lonMax=-170 wraps the date line).
 *
 * Display frame: Pacific-centered (0…360°). See toPacificLon / worldView.
 */

export type LatLonBounds = [[number, number], [number, number]];
// [[latMin, lonMin], [latMax, lonMax]] — lon in canonical −180…180

/** True if lon is inside [lonMin, lonMax], allowing wrap when lonMin > lonMax. */
export function lonInRange(lon: number, lonMin: number, lonMax: number): boolean {
  if (lonMin <= lonMax) return lon >= lonMin && lon <= lonMax;
  // wraps dateline: e.g. 170..180 ∪ -180..-170
  return lon >= lonMin || lon <= lonMax;
}

export function pointInBounds(
  lat: number,
  lon: number,
  bounds: LatLonBounds,
  padDeg = 0,
): boolean {
  const [[latMin, lonMin], [latMax, lonMax]] = bounds;
  if (lat < latMin - padDeg || lat > latMax + padDeg) return false;
  if (padDeg === 0) return lonInRange(lon, lonMin, lonMax);

  // pad on lon is approximate near dateline
  if (lonMin <= lonMax) {
    return lon >= lonMin - padDeg && lon <= lonMax + padDeg;
  }
  return lon >= lonMin - padDeg || lon <= lonMax + padDeg;
}

export function boundsCenter(bounds: LatLonBounds): [number, number] {
  const [[latMin, lonMin], [latMax, lonMax]] = bounds;
  const lat = (latMin + latMax) / 2;
  if (lonMin <= lonMax) return [lat, (lonMin + lonMax) / 2];
  // midpoint across dateline
  const span = 360 - lonMin + lonMax;
  let lon = lonMin + span / 2;
  if (lon > 180) lon -= 360;
  return [lat, lon];
}

/**
 * Leaflet-friendly rectangle corners in *canonical* −180…180.
 * Prefer boundsToPacificLeaflet for the SES 2D map (continuous RoF).
 */
export function boundsToLeafletRects(
  bounds: LatLonBounds,
): Array<[[number, number], [number, number]]> {
  const [[latMin, lonMin], [latMax, lonMax]] = bounds;
  if (lonMin <= lonMax) {
    return [
      [
        [latMin, lonMin],
        [latMax, lonMax],
      ],
    ];
  }
  // two rectangles either side of dateline
  return [
    [
      [latMin, lonMin],
      [latMax, 180],
    ],
    [
      [latMin, -180],
      [latMax, lonMax],
    ],
  ];
}

/**
 * Single Pacific-frame rectangle for fitBounds (0…360 lon).
 * Dateline-wrapping boxes (Tonga 170…−170) become one span (170…190).
 */
export function boundsToPacificLeaflet(
  bounds: LatLonBounds,
): [[number, number], [number, number]] {
  const [[latMin, lonMin], [latMax, lonMax]] = bounds;
  if (lonMin <= lonMax) {
    // May still cross display seam if box is Atlantic-wide; rare for our desks
    let a = toPacificLon(lonMin);
    let b = toPacificLon(lonMax);
    if (b < a) {
      // e.g. box in Atlantic near seam — keep canonical shift
      b += 360;
    }
    // If both in western hemisphere originally, both are +360 — fine
    // If box is purely E hemisphere, both < 180 — fine
    // If box spans greenwich (lonMin=-10, lonMax=10) → 350 and 10 → b < a → 350..370
    return [
      [latMin, a],
      [latMax, b],
    ];
  }
  // wraps dateline in canonical form: lonMin=170, lonMax=-170 → 170…190
  return [
    [latMin, lonMin],
    [latMax, lonMax + 360],
  ];
}

/**
 * Pacific-centered display longitude (0…360).
 * Leaflet’s native −180…180 frame pins the Kermadec / Chile / Japan
 * swarm to opposite edges of a Greenwich-centered home view.
 * Shift W-hemisphere lons into (0…360) so the Ring of Fire is continuous:
 * Japan → Kamchatka → Aleutians → Kermadec → Chile without a seam.
 */
export function toPacificLon(lon: number): number {
  if (!Number.isFinite(lon)) return lon;
  // Normalize into (−180, 180] first
  let x = lon;
  while (x > 180) x -= 360;
  while (x <= -180) x += 360;
  if (x < 0) return x + 360;
  return x;
}

/** Inverse: map/display lon → canonical −180…180 for APIs / labels. */
export function fromPacificLon(lon: number): number {
  if (!Number.isFinite(lon)) return lon;
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

/** Leaflet LatLng in Pacific display frame. */
export function pacificLatLng(lat: number, lon: number): [number, number] {
  return [lat, toPacificLon(lon)];
}
