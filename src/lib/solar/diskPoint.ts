/** NOAA's daily longitude matches the disk at 00:00 UTC the next day, not at midnight of the labeled date. */
export function longitudeAt(lon: number, lat: number, observed: string | null | undefined, at: number): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(observed ?? "");
  if (!m) return lon;
  const epoch = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1);
  const s = Math.sin((lat * Math.PI) / 180);
  const rate = 13.2 - 1.5 * s * s;
  return lon - (rate * (at - epoch)) / 86400000;
}

function solarB0(at: number): number {
  const year = new Date(at).getUTCFullYear();
  const doy = Math.floor((at - Date.UTC(year, 0, 1)) / 86400000) + 1;
  return (7.25 * Math.sin((2 * Math.PI * (doy - 157)) / 365.25) * Math.PI) / 180;
}

/** East is left, north is up. Returns null once the region has rotated off the Earth-facing disk. */
export function diskXY(
  lat: number,
  lon: number,
  at: number,
  geom: { cx: number; cy: number; r: number },
): { x: number; y: number } | null {
  if (lon > 90 || lon < -90) return null;
  const b0 = solarB0(at);
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  const x = geom.cx - Math.cos(la) * Math.sin(lo) * geom.r;
  const north = Math.sin(la) * Math.cos(b0) - Math.cos(la) * Math.cos(lo) * Math.sin(b0);
  return { x, y: geom.cy - north * geom.r };
}
