/**
 * Public site identity for Open Graph / X (Twitter) cards.
 *
 * IMPORTANT: Twitterbot does NOT run JS. SSR head tags must use the public
 * production origin. Bump ogImageVersion when branding or image changes.
 * Bump APP_VERSION on each intentional production ship (Vercel).
 *
 * Public host: https://sun-earth-sentinel.vercel.app
 */

/** Live production origin (no trailing slash). Canonical for share cards. */
export const PRODUCTION_ORIGIN = "https://sun-earth-sentinel.vercel.app";

/**
 * Public product version — bump on ship so About / cache-bust links show the release.
 * 1.23.1: WolfWatch rail polish — segmented strip, short chip names, boards in All only.
 */
export const APP_VERSION = "1.23.1";



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
    "Free Sun Earth observatory: live earthquakes, volcano watches, space weather, timing patterns, and sky context. By SunWolf (@Sunwolf77).",
  twitter: "@Sunwolf77",
  twitterCreator: "@Sunwolf77",
  ogImagePath: "/og.png",
  /** Bump when og.png or branding changes — forces X image CDN re-fetch */
  ogImageVersion: "11",
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
    role: "Primary technical lineage · Sun Earth Sentinel · WolfWatch",
    /**
     * Self-hosted copy of X profile image (permission granted by SunWolf).
     * Source: pbs.twimg.com/profile_images/1928027843285635074/…
     * Refresh: re-download when the X avatar changes.
     */
    avatarSrc: "/brand/sunwolf-x.jpg",
    avatarRemote:
      "https://pbs.twimg.com/profile_images/1928027843285635074/KJIylhSA_400x400.jpg",
  },
  sheppard: {
    name: "Paul Sheppard",
    handle: "PaulSheppard_CO",
    url: "https://x.com/PaulSheppard_CO",
    role: "SUPT & resonance probe",
    avatarSrc: undefined as string | undefined,
    avatarRemote: undefined as string | undefined,
  },
  dutchsinse: {
    name: "Dutchsinse",
    handle: "RealDutchsinse",
    url: "https://x.com/RealDutchsinse",
    role: "Public seismic globe — limited credit (inspiration only)",
    avatarSrc: undefined as string | undefined,
    avatarRemote: undefined as string | undefined,
  },
  cordaro: {
    name: "Richard Cordaro",
    handle: "rrichcord",
    url: "https://x.com/rrichcord",
    role: "Magnetic anomaly / INTERMAGNET public tool (drmagneto)",
    avatarSrc: undefined as string | undefined,
    avatarRemote: undefined as string | undefined,
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
    pageUrl: absoluteUrl(`/?v=${SITE.ogImageVersion}`, origin),
    shareUrl: shareCardUrl(origin),
    imageUrl: ogImageUrl(origin),
    card: "summary_large_image",
    notes: [
      "X caches cards per exact URL — old tweets keep old scrapes forever.",
      `Post a NEW tweet with https://sun-earth-sentinel.vercel.app/?v=${SITE.ogImageVersion} to force re-scrape.`,
      "SSR head tags use PRODUCTION_ORIGIN so Twitterbot sees the right host (no JS).",
      "og.png must be image/png on this host — not HTML.",
      "Always share https:// links.",
    ],
  };
}
