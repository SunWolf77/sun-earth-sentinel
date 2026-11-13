/**
 * Who can see a flare the Earth-facing X-ray monitors cannot.
 * HEEQ longitude: 0 faces Earth, positive is west, the east limb is −90°.
 * The side that will rotate onto that limb is −180° to −90°.
 */

export type FarSideCraft = {
  name: string;
  lon: number | null;
};

export type FarSideWatch = {
  asOf: string | null;
  stereoA: number | null;
  solo: number | null;
  /** Degrees of the returning far side that no listed camera sees. */
  blindDeg: number;
  /** Days for the far point of that blind arc to reach the east limb. */
  blindDays: number | null;
  /** How far past the west limb STEREO-A still sees, in degrees. */
  westPastLimb: number | null;
  line: string;
};

const SYNODIC = 27.2753;
const DEG_PER_DAY = 360 / SYNODIC;

function norm(lon: number): number {
  let x = lon;
  while (x > 180) x -= 360;
  while (x <= -180) x += 360;
  return x;
}

function sees(craftLon: number, target: number): boolean {
  return Math.abs(norm(target - craftLon)) <= 90;
}

export function buildFarSideWatch(input: {
  asOf?: string | null;
  stereoA?: number | null;
  solo?: number | null;
}): FarSideWatch {
  const stereoA = finite(input.stereoA);
  const solo = finite(input.solo);
  const cams = [stereoA, solo].filter((n): n is number => n != null);
  let blind = 0;
  const step = 5;
  for (let lon = -175; lon <= -95; lon += step) {
    if (!cams.some((c) => sees(c, lon))) blind += step;
  }
  const blindDeg = Math.min(90, blind);
  const blindDays = blindDeg > 0 ? Math.round((blindDeg / DEG_PER_DAY) * 10) / 10 : 0;
  const westPastLimb = stereoA == null ? null : Math.max(0, Math.round(Math.min(180, stereoA + 90) - 90));
  const line = sentence(stereoA, solo, blindDeg, blindDays, westPastLimb);
  return {
    asOf: input.asOf ?? null,
    stereoA,
    solo,
    blindDeg,
    blindDays,
    westPastLimb,
    line,
  };
}

function finite(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) ? n : null;
}

function sentence(
  stereoA: number | null,
  solo: number | null,
  blindDeg: number,
  blindDays: number | null,
  westPastLimb: number | null,
): string {
  const eyes =
    stereoA == null
      ? "STEREO-A’s place is not in yet."
      : `STEREO-A is ${Math.round(stereoA)}° west of Earth${
          solo != null ? `, Solar Orbiter ${Math.round(solo)}° west` : ""
        }.`;
  if (blindDeg >= 80) {
    return `${eyes} Both look toward the west limb. GOES cannot see a flare on the returning side, and neither can they. That side can stay hidden for about ${blindDays ?? 7} days, until it rotates onto the east limb. A flare there shows only if a CME comes around the limb.`;
  }
  if (blindDeg > 0) {
    return `${eyes} Part of the returning side is still unseen, about ${blindDays} days from the east limb. GOES will not class a flare there.`;
  }
  return `${eyes} A camera currently sees the side that rotates onto the east limb. ${
    westPastLimb != null ? `STEREO-A also sees ${westPastLimb}° past the west limb, which is leaving, not arriving.` : ""
  }`;
}
