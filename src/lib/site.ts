/**
 * Public site identity for Open Graph / X (Twitter) cards.
 *
 * X caches cards per exact URL. Bump `ogImageVersion` when the image or
 * copy changes so scrapers fetch a new image. For a full card re-scrape of
 * the *page*, post a new URL variant (e.g. ?v=4) or /share.html.
 *
 * Published slug: sun-earth-sentinel (replaces sol-earth-wolfwatch-sentinel).
 */

/** Live production origin (no trailing slash). */
export const PRODUCTION_ORIGIN = "https://sun-earth-sentinel.grok.me";

const ENV_CANDIDATES = () => {
  const fromVite = (() => {
    try {
      return (import.meta as ImportMeta & { env?: Record<string, string> }).env
        ?.VITE_SITE_URL;
    } catch {
      return undefined;
    }
  })();

  const fromProcess =
    typeof process !== "undefined"
      ? process.env.VITE_SITE_URL ||
        process.env.SITE_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL
      : undefined;

  return [fromVite, fromProcess, PRODUCTION_ORIGIN].filter(Boolean) as string[];
};

function normalizeOrigin(raw: string): string {
  let s = (raw || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/$/, "");
}

export function getSiteOrigin(): string {
  for (const c of ENV_CANDIDATES()) {
    const n = normalizeOrigin(c);
    if (n) return n;
  }
  return PRODUCTION_ORIGIN;
}

export function resolveShareOrigin(): string {
  return getSiteOrigin();
}

export const SITE = {
  name: "Sun-Earth Sentinel",
  shortName: "Sun-Earth Sentinel",
  description:
    "Free Sun-Earth observatory: live earthquakes, plate boundaries, volcano watches, space weather and SUPT continuum. By SunWolf (@Sunwolf77).",
  twitter: "@Sunwolf77",
  twitterCreator: "@Sunwolf77",
  ogImagePath: "/og.png",
  /** Bump when og.png changes — forces X image CDN re-fetch */
  ogImageVersion: "4",
  /** Post this if root URL card is stuck in X cache */
  sharePath: "/share.html",
  themeColor: "#070b12",
  /** Published app slug (path / project name) */
  slug: "sun-earth-sentinel",
};

/** Known X (Twitter) profiles credited in-app — open in new tab. */
export const X_PROFILES = {
  sunwolf: {
    name: "SunWolf",
    handle: "Sunwolf77",
    url: "https://x.com/Sunwolf77",
    role: "Primary technical lineage · Sun-Earth Sentinel",
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
      "Post a NEW tweet with the NEW host (sun-earth-sentinel) or ?v=4 to force re-scrape.",
      "Unpublishing the old sol-earth-wolfwatch-sentinel slug is fine — new URL = fresh card.",
      "og.png is 1200x630 PNG — within X limits.",
      "HTTP 308 → HTTPS; always share https:// links.",
      "Card Validator UI is deprecated; X scrapes on post time only.",
    ],
  };
}
