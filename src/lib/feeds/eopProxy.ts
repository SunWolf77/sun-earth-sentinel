import { createServerFn } from "@tanstack/react-start";
import { LastGood, fetchWithRetry } from "@/lib/feeds/resilientFetch";
import {
  buildEcdoPoints,
  parseC04,
  parseFinalsDailyCsv,
  type EcdoPoints,
} from "@/lib/geo/polarMotion";

const DAILY =
  "https://datacenter.iers.org/data/csv/finals2000A.daily.csv";
const C04 =
  "https://datacenter.iers.org/products/eop/long-term/c04_14/iau2000/eopc04_14_IAU2000.62-now";

const cache = new LastGood<EcdoPoints>(3 * 60 * 60_000);

/** IERS polar motion → ECDO test points. Cached 12 h. Not a flip score. */
export const fetchEcdoPoints = createServerFn({ method: "GET" }).handler(
  async (): Promise<EcdoPoints | null> => {
    const hit = cache.getFresh("ecdo");
    if (hit) return hit;
    const [dailyRes, c04Res] = await Promise.all([
      fetchWithRetry(DAILY, { timeoutMs: 12_000, retries: 1 }).catch(() => null),
      fetchWithRetry(C04, { timeoutMs: 25_000, retries: 1 }).catch(() => null),
    ]);
    const daily = dailyRes?.ok ? parseFinalsDailyCsv(await dailyRes.text()) : [];
    const c04 = c04Res?.ok ? parseC04(await c04Res.text()) : [];
    const points = buildEcdoPoints(daily, c04);
    if (points) cache.set("ecdo", points);
    return points;
  },
);
