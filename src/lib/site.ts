/**
 * Public site identity for Open Graph / X (Twitter) cards.
 *
 * IMPORTANT: Twitterbot does NOT run JS. SSR head tags must use the public
 * production origin. Bump ogImageVersion when branding or image changes.
 *
 * Public host: https://sun-earth-sentinel.vercel.app
 */

/** Live production origin (no trailing slash). Canonical for share cards. */
export const PRODUCTION_ORIGIN = "https://sun-earth-sentinel.vercel.app";

function normalizeOrigin(raw: string): string {
  let s = (raw || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/$/, "");
}

/**
 * Origin used for og:url / twitter:image / canonical.
 * Prefer explicit VITE_SITE_URL (local override), else the public production host.
 */
export function getSiteOrigin(): string {
  try {
    const vite = (import.meta as ImportMeta & { env?: Record<string, string> })
      .env?.VITE_SITE_URL;
    const n = normalizeOrigin(vite || "");
    if (n) return n;
  } catch {
    /* SSR / edge */
  }
  if (typeof process !== "undefined") {
    const n = normalizeOrigin(process.env.VITE_SITE_URL || process.env.SITE_URL || "");
    if (n) return n;
  }
  return PRODUCTION_ORIGIN;
}

export function resolveShareOrigin(): string {
  return getSiteOrigin();
}

export const SITE = {
  name: "Sun Earth Sentinel",
  shortName: "Sun Earth Sentinel",
  description:
    "Free Sun Earth observatory: live earthquakes, plate boundaries, volcano watches, space weather and SUPT continuum. By SunWolf (@Sunwolf77).",
  twitter: "@Sunwolf77",
  twitterCreator: "@Sunwolf77",
  ogImagePath: "/og.png",
  /** Bump when og.png or branding changes — forces X image CDN re-fetch */
  ogImageVersion: "9",
  sharePath: "/share.html",
  themeColor: "#070b12",
  slug: "sun-earth-sentinel",
};

/** Known X (Twitter) profiles credited in-app — open in new tab. */
export const X_PROFILES = {
  sunwolf: {
    name: "SunWolf",
    handle: "Sunwolf77",
    url: "https://x.com/Sunwolf77",
    role: "Primary technical lineage · Sun Earth Sentinel",
  },
  sheppard: {
    name: "Paul Sheppard",
    handle: "PaulSheppard_CO",
    url: "https://x.com/PaulSheppard_CO",
    role: "SUPT & resonance probe",
  },
  dutchsinse: {
    name: "Dutchsinse",
    handle: "RealDutchsinse",
    url: "https://x.com/RealDutchsinse",
    role: "Public seismic globe — limited credit (inspiration only)",
  },
  cordaro: {
    name: "Richard Cordaro",
    handle: "rrichcord",
    url: "https://x.com/rrichcord",
    role: "Magnetic anomaly / INTERMAGNET public tool (drmagneto)",
  },
} as const;

export type XProfileId = keyof typeof X_PROFILES;

export function xProfileUrl(handle: string): string {
  const h = handle.replace(/^@/, "");
  return `https://x.com/${encodeURIComponent(h)}`;
}

export function ogImageUrl(origin = getSiteOrigin()): string {
  return `${origin}${SITE.ogImagePath}?v=${SITE.ogImageVersion}`;
}

export function absoluteUrl(path = "/", origin = getSiteOrigin()): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}

export function shareCardUrl(origin = getSiteOrigin()): string {
  return `${origin}${SITE.sharePath}`;
}

/** Checklist for debugging X card scrapes (human + About panel). */
export function xCardDebugReport(origin = getSiteOrigin()) {
  return {
    origin,
    pageUrl: absoluteUrl("/", origin),
    shareUrl: shareCardUrl(origin),
    imageUrl: ogImageUrl(origin),
    card: "summary_large_image",
    notes: [
      "X caches cards per exact URL — old tweets keep old scrapes forever.",
      "Post a NEW tweet with https://sun-earth-sentinel.vercel.app/?v=9 to force re-scrape.",
      "SSR head tags use PRODUCTION_ORIGIN so Twitterbot sees the right host (no JS).",
      "og.png must be image/png on this host — not HTML.",
      "Always share https:// links.",
    ],
  };
}

/**
 * Dutchsinse Public Seismic Globe (standalone, full controls).
 * Sentinel launches this for the full globe experience — we do not reimplement it.
 */
export const PUBLIC_SEISMIC_GLOBE_URL =
  "https://www.dutchsinse.com/wp-content/uploads/2026/07/public-earthquake-progam-v3.html";

export function openPublicSeismicGlobe(): void {
  if (typeof window === "undefined") return;
  window.open(PUBLIC_SEISMIC_GLOBE_URL, "_blank", "noopener,noreferrer");
}

