/**
 * Geographic helpers — including antimeridian-aware boxes
 * (e.g. Tonga–Kermadec: lonMin=170, lonMax=-170 wraps the date line).
 */

export type LatLonBounds = [[number, number], [number, number]];
// [[latMin, lonMin], [latMax, lonMax]]

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

/** Leaflet-friendly rectangle corners (may not wrap — use multi-rect for wrap). */
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
