/**
 * NASA CCMC DONKI — CME / flare catalog.
 * Browser CORS is blocked; use createServerFn proxy in solarDonki.server.ts.
 */

export type DonkiCmeAnalysis = {
  isMostAccurate?: boolean;
  speed?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  halfAngle?: number | null;
  type?: string | null;
  time21_5?: string | null;
  enlilList?: {
    estimatedShockArrivalTime?: string | null;
    isEarthGB?: boolean | null;
    isEarthMinorImpact?: boolean | null;
    kp_18?: number | null;
    kp_90?: number | null;
    kp_135?: number | null;
    kp_180?: number | null;
    link?: string | null;
  }[];
};

export type DonkiCme = {
  activityID: string;
  startTime: string;
  sourceLocation?: string | null;
  note?: string | null;
  link?: string | null;
  instruments?: { displayName?: string }[];
  cmeAnalyses?: DonkiCmeAnalysis[];
};

export type DonkiFlare = {
  flrID: string;
  beginTime?: string | null;
  peakTime?: string | null;
  classType?: string | null;
  sourceLocation?: string | null;
  activeRegionNum?: number | null;
  link?: string | null;
  linkedEvents?: { activityID?: string }[] | null;
};

export type DonkiBundle = {
  cmes: DonkiCme[];
  flares: DonkiFlare[];
  fetchedAt: number;
  error?: string;
};

export function bestCmeAnalysis(cme: DonkiCme): DonkiCmeAnalysis | null {
  const list = cme.cmeAnalyses ?? [];
  if (!list.length) return null;
  return list.find((a) => a.isMostAccurate) ?? list[0] ?? null;
}

export function earthDirectedCmes(cmes: DonkiCme[]): DonkiCme[] {
  return cmes.filter((c) => {
    const a = bestCmeAnalysis(c);
    const en = a?.enlilList?.[0];
    return !!(en?.isEarthGB || en?.isEarthMinorImpact || en?.estimatedShockArrivalTime);
  });
}

export function cmeImpactSummary(cme: DonkiCme): {
  speed: number | null;
  eta: string | null;
  earth: boolean;
  kpHint: number | null;
} {
  const a = bestCmeAnalysis(cme);
  const en = a?.enlilList?.[0];
  const kps = [en?.kp_18, en?.kp_90, en?.kp_135, en?.kp_180].filter(
    (k): k is number => typeof k === "number" && Number.isFinite(k),
  );
  return {
    speed: a?.speed ?? null,
    eta: en?.estimatedShockArrivalTime ?? null,
    earth: !!(en?.isEarthGB || en?.isEarthMinorImpact || en?.estimatedShockArrivalTime),
    kpHint: kps.length ? Math.max(...kps) : null,
  };
}

export function isoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return isoDate(d);
}
