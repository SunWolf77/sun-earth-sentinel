/**
 * ISS live position — where-the-iss.at (CORS-open).
 * Observational only; not a space-weather product.
 */

export type IssPosition = {
  lat: number;
  lon: number;
  altitudeKm: number;
  velocityKms: number;
  visibility: string | null;
  timestamp: number;
  name: string;
};

const ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544";

export async function fetchIssPosition(): Promise<IssPosition | null> {
  try {
    const res = await fetch(ISS_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const lat = Number(j.latitude);
    const lon = Number(j.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      lat,
      lon,
      altitudeKm: Number(j.altitude) || 0,
      velocityKms: Number(j.velocity) || 0,
      visibility: j.visibility != null ? String(j.visibility) : null,
      timestamp: (Number(j.timestamp) || Date.now() / 1000) * 1000,
      name: String(j.name || "iss"),
    };
  } catch {
    return null;
  }
}

/** Approx ground-track samples along great circle (short lead/trail). */
export function issTrailPoints(
  lat: number,
  lon: number,
  n = 24,
  stepDeg = 2.5,
): { lat: number; lon: number }[] {
  // Rough orbital inclination ~51.6° — sample along heading east-northeast/west
  const out: { lat: number; lon: number }[] = [];
  const inc = 51.6 * (Math.PI / 180);
  for (let i = -n; i <= n; i++) {
    if (i === 0) {
      out.push({ lat, lon });
      continue;
    }
    const dLon = i * stepDeg;
    const φ1 = (lat * Math.PI) / 180;
    const λ1 = (lon * Math.PI) / 180;
    const δ = ((Math.abs(dLon) * Math.PI) / 180) * Math.cos(inc * 0.35);
    const θ = dLon >= 0 ? Math.PI / 2 - inc * 0.15 : -Math.PI / 2 + inc * 0.15;
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
    );
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
      );
    out.push({
      lat: (φ2 * 180) / Math.PI,
      lon: ((((λ2 * 180) / Math.PI) + 540) % 360) - 180,
    });
  }
  return out;
}
