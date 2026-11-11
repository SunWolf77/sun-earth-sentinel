/**
 * Last 10 years of the NOAA GOES flare report.
 * Yearly CSVs, reduced to counts. Not the minute flux — that archive is huge.
 * https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/multi/l2/data/xrsf-l2-flrpt_science/csv/
 */

const BASE =
  "https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/multi/l2/data/xrsf-l2-flrpt_science/csv";
const CYCLE = "https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json";

export type FlareDecade = {
  fromYear: number;
  toYear: number;
  years: number;
  mCount: number;
  xCount: number;
  /** Chance an M or X flare fell in a 6-hour window, at a similar sunspot level. */
  pM6h: number | null;
  matchedMonths: number;
  ssn: number | null;
  medianRiseMin: number | null;
};

type Bin = { m: number; x: number };
type CycleRow = { "time-tag": string; ssn: number; smoothed_ssn: number };

let cache: { at: number; value: FlareDecade } | null = null;
const TTL = 12 * 3600_000;

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

function poisson6h(count: number, months: number): number | null {
  if (months < 3 || count < 0) return null;
  const hours = months * 30.44 * 24;
  const lambda = (count / hours) * 6;
  return 1 - Math.exp(-lambda);
}

async function loadYear(year: number): Promise<string | null> {
  const url = `${BASE}/sci_xrsf-l2-flrpt_geo_y${year}_v1-0-1.csv`;
  try {
    const res = await fetch(url, { headers: { Accept: "text/csv" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function consume(csv: string, sinceMs: number, bins: Map<string, Bin>, rises: number[]) {
  const lines = csv.split("\n");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 24) continue;
    const cols = line.split(",");
    const letter = (cols[5] ?? "").trim()[0]?.toUpperCase();
    if (letter !== "M" && letter !== "X") continue;
    const peak = Date.parse(`${(cols[0] ?? "").trim().replace(" ", "T")}Z`);
    if (!Number.isFinite(peak) || peak < sinceMs) continue;
    const month = (cols[0] ?? "").slice(0, 7);
    if (month.length < 7) continue;
    const bin = bins.get(month) ?? { m: 0, x: 0 };
    if (letter === "X") bin.x += 1;
    else bin.m += 1;
    bins.set(month, bin);
    const start = Date.parse(`${(cols[1] ?? "").trim().replace(" ", "T")}Z`);
    if (Number.isFinite(start) && peak > start) {
      const rise = (peak - start) / 60_000;
      if (rise > 0 && rise < 180) rises.push(rise);
    }
  }
}

export async function getFlareDecade(now = Date.now()): Promise<FlareDecade | null> {
  if (cache && now - cache.at < TTL) return cache.value;
  const toYear = new Date(now).getUTCFullYear();
  const fromYear = toYear - 9;
  const sinceMs = now - 10 * 365.25 * 24 * 3600_000;
  const years: number[] = [];
  for (let y = fromYear; y <= toYear; y++) years.push(y);

  const [files, cycle] = await Promise.all([
    Promise.all(years.map((y) => loadYear(y))),
    fetch(CYCLE, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? (r.json() as Promise<CycleRow[]>) : []))
      .catch(() => [] as CycleRow[]),
  ]);

  const bins = new Map<string, Bin>();
  const rises: number[] = [];
  let got = 0;
  files.forEach((csv) => {
    if (!csv) return;
    got += 1;
    consume(csv, sinceMs, bins, rises);
  });
  if (got < 5) return null;

  let mCount = 0;
  let xCount = 0;
  for (const bin of bins.values()) {
    mCount += bin.m;
    xCount += bin.x;
  }

  const ssnByMonth = new Map<string, number>();
  for (const row of cycle) {
    const tag = String(row["time-tag"] ?? "").slice(0, 7);
    const ssn = Number(row.ssn);
    if (tag.length === 7 && Number.isFinite(ssn)) ssnByMonth.set(tag, ssn);
  }
  const latest = [...ssnByMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))[0];
  const ssn = latest ? latest[1] : null;

  let matched = 0;
  let matchedMx = 0;
  if (ssn != null) {
    for (const [month, bin] of bins) {
      const monthSsn = ssnByMonth.get(month);
      if (monthSsn == null || Math.abs(monthSsn - ssn) > 25) continue;
      matched += 1;
      matchedMx += bin.m + bin.x;
    }
  }
  const pM6h =
    matched >= 6 ? poisson6h(matchedMx, matched) : poisson6h(mCount + xCount, bins.size);

  const value: FlareDecade = {
    fromYear,
    toYear,
    years: got,
    mCount,
    xCount,
    pM6h,
    matchedMonths: matched,
    ssn,
    medianRiseMin: median(rises),
  };
  cache = { at: now, value };
  return value;
}
