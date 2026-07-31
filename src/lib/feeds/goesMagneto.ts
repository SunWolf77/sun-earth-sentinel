/**
 * NOAA SWPC GOES primary magnetometer (1-day JSON).
 * Free, CORS-open — space magnetometer context for SSC/SI awareness.
 * Credit: NOAA SWPC / GOES.
 */

export type GoesMagPoint = {
  time_tag: string;
  t: number;
  satellite: number;
  He: number;
  Hp: number;
  Hn: number;
  total: number;
  arcjet_flag: boolean;
};

const URL =
  "https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json";

export async function fetchGoesMagnetometer(): Promise<GoesMagPoint[]> {
  try {
    const res = await fetch(URL);
    if (!res.ok) return [];
    const raw = (await res.json()) as {
      time_tag: string;
      satellite?: number;
      He?: number;
      Hp?: number;
      Hn?: number;
      total?: number;
      arcjet_flag?: boolean;
    }[];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r) => {
        const t = Date.parse(r.time_tag);
        return {
          time_tag: r.time_tag,
          t: Number.isFinite(t) ? t : 0,
          satellite: r.satellite ?? 0,
          He: Number(r.He) || 0,
          Hp: Number(r.Hp) || 0,
          Hn: Number(r.Hn) || 0,
          total: Number(r.total) || 0,
          arcjet_flag: Boolean(r.arcjet_flag),
        };
      })
      .filter((r) => r.t > 0);
  } catch {
    return [];
  }
}
