/**
 * NOAA renumbers a region every time it is on the Earth-facing disk.
 * The place that lasts is Carrington longitude and latitude.
 * The public region file keeps about one rotation and has no polarity sign.
 */

export type RegionChain = {
  ids: number[];
  lat: number;
  carrington: number;
  days: number;
  area: number;
};

export type WindReturn = {
  date: string;
  kp: number;
};

export type CarringtonMark = {
  id: number;
  lat: number;
  car: number;
};

export type DuePlace = {
  id: number;
  lat: number;
  car: number;
  days: number;
};

export type SolarContinuity = {
  chains: RegionChain[];
  holeText: string | null;
  windReturns: WindReturn[];
  /** Carrington rotation number for the latest region report. */
  rotation: number | null;
  /** Carrington longitude of the central meridian that day. */
  central: number | null;
  /** Carrington longitude of the east limb. New places arrive here. */
  east: number | null;
  marks: CarringtonMark[];
  /** Places in the file that are off the disk and reach the east limb within 7 days. */
  due: DuePlace[];
};

type Row = {
  region?: number;
  latitude?: number;
  carrington_longitude?: number;
  observed_date?: string;
  area?: number | null;
  mag_class?: string | null;
};

type Passage = {
  id: number;
  lat: number;
  car: number;
  first: string;
  last: string;
  area: number;
};

function circ(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

export function linkRegionChains(raw: unknown): RegionChain[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<number, Row[]>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Row;
    if (r.region == null || r.observed_date == null || r.latitude == null || r.carrington_longitude == null) continue;
    const list = byId.get(r.region) ?? [];
    list.push(r);
    byId.set(r.region, list);
  }
  const passages: Passage[] = [];
  for (const [id, rows] of byId) {
    const sorted = rows.slice().sort((a, b) => String(a.observed_date).localeCompare(String(b.observed_date)));
    const last = sorted[sorted.length - 1]!;
    passages.push({
      id,
      lat: last.latitude ?? 0,
      car: last.carrington_longitude ?? 0,
      first: String(sorted[0]!.observed_date),
      last: String(last.observed_date),
      area: Math.max(...sorted.map((r) => r.area ?? 0)),
    });
  }

  const pairs: { old: Passage; neu: Passage; score: number }[] = [];
  for (const a of passages) {
    for (const b of passages) {
      if (a.id === b.id) continue;
      if (a.last >= b.first) continue;
      if ((a.lat >= 0) !== (b.lat >= 0)) continue;
      const gap = daysBetween(a.last, b.first);
      if (gap < 8 || gap > 22) continue;
      const dCar = circ(a.car, b.car);
      const dLat = Math.abs(a.lat - b.lat);
      if (dCar > 12 || dLat > 7) continue;
      pairs.push({ old: a, neu: b, score: dCar + dLat * 1.5 });
    }
  }
  pairs.sort((a, b) => a.score - b.score);
  const next = new Map<number, Passage>();
  const usedNew = new Set<number>();
  for (const p of pairs) {
    if (next.has(p.old.id) || usedNew.has(p.neu.id)) continue;
    next.set(p.old.id, p.neu);
    usedNew.add(p.neu.id);
  }

  const byPassage = new Map(passages.map((p) => [p.id, p]));
  const chains: RegionChain[] = [];
  const seen = new Set<number>();
  for (const start of passages) {
    if (seen.has(start.id) || usedNew.has(start.id)) continue;
    const ids = [start.id];
    seen.add(start.id);
    let cur = start;
    while (next.has(cur.id)) {
      const n = next.get(cur.id)!;
      if (seen.has(n.id)) break;
      ids.push(n.id);
      seen.add(n.id);
      cur = n;
    }
    if (ids.length < 2) continue;
    const last = byPassage.get(ids[ids.length - 1]!)!;
    const first = byPassage.get(ids[0]!)!;
    chains.push({
      ids,
      lat: last.lat,
      carrington: last.car,
      days: Math.max(1, daysBetween(first.first, last.last)),
      area: Math.max(...ids.map((id) => byPassage.get(id)!.area)),
    });
  }
  return chains.sort((a, b) => b.area - a.area || b.days - a.days);
}

const ROTATION_DAYS = 27.2753;
const DEG_PER_DAY = 360 / ROTATION_DAYS;
/** Epoch that lands within about 2° of the SWPC synoptic sheet. */
const CARRINGTON_EPOCH = 2398140;

function wrap(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function carringtonFrame(raw: unknown): {
  rotation: number | null;
  central: number | null;
  east: number | null;
  marks: CarringtonMark[];
  due: DuePlace[];
} {
  const empty = { rotation: null, central: null, east: null, marks: [] as CarringtonMark[], due: [] as DuePlace[] };
  if (!Array.isArray(raw)) return empty;
  const rows = raw.filter((r): r is Row => !!r && typeof r === "object" && r.observed_date != null);
  const latest = rows.map((r) => String(r.observed_date)).sort().at(-1);
  if (!latest) return empty;
  const jd = new Date(`${latest}T12:00:00Z`).getTime() / 86_400_000 + 2440587.5;
  const cr = (jd - CARRINGTON_EPOCH) / ROTATION_DAYS;
  const frac = cr - Math.floor(cr);
  const central = Math.round(wrap((1 - frac) * 360));
  const east = Math.round(wrap(central - 90));
  const today = rows.filter((r) => String(r.observed_date) === latest && r.region != null && r.carrington_longitude != null);
  const onDisk = new Set(today.map((r) => r.region));
  const lastById = new Map<number, Row>();
  for (const r of rows) {
    if (r.region == null || r.carrington_longitude == null) continue;
    const prev = lastById.get(r.region);
    if (!prev || String(r.observed_date) > String(prev.observed_date)) lastById.set(r.region, r);
  }
  const due: DuePlace[] = [];
  for (const [id, r] of lastById) {
    if (onDisk.has(id)) continue;
    const car = wrap(r.carrington_longitude ?? 0);
    const days = Math.round((wrap(east - car) / DEG_PER_DAY) * 10) / 10;
    if (days <= 0.2 || days > 7) continue;
    due.push({ id, lat: r.latitude ?? 0, car: Math.round(car), days });
  }
  due.sort((a, b) => a.days - b.days);
  return {
    rotation: Math.floor(cr),
    central,
    east,
    marks: today.map((r) => ({
      id: r.region!,
      lat: r.latitude ?? 0,
      car: wrap(r.carrington_longitude ?? 0),
    })),
    due: due.slice(0, 6),
  };
}

export function parseHoleNote(discussion: string): string | null {
  const chunks = discussion.split(/\n\s*\n/);
  const hit = chunks.find((c) => /coronal hole/i.test(c) && !c.startsWith(":"));
  if (!hit) return null;
  return hit.replace(/^#+.*$/gm, "").replace(/\s+/g, " ").trim();
}

export function parseWindReturns(outlook: string): WindReturn[] {
  const out: WindReturn[] = [];
  for (const m of outlook.matchAll(/^(\d{4} [A-Z][a-z]{2} \d{2})\s+\d+\s+\d+\s+(\d+)\s*$/gm)) {
    const kp = Number(m[2]);
    if (kp >= 5) out.push({ date: m[1]!, kp });
  }
  return out;
}
