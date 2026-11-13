/**
 * Public site identity for Open Graph / X (Twitter) cards.
 *
 * IMPORTANT: Twitterbot does NOT run JS. SSR head tags must use the public
 * production origin. Bump ogImageVersion when branding or image changes.
 * Bump APP_VERSION on each intentional production ship (Vercel).
 *
 * Public host: https://wolfwatch.site (vercel.app redirects here)
 */

/** Live production origin (no trailing slash). Canonical for share cards. */
export const PRODUCTION_ORIGIN = "https://wolfwatch.site";

/**
 * Public product version — bump on ship so About / cache-bust links show the release.
 * 1.29.0: first-visit mobile folder coach (dock + Pulse).
 * 1.29.1: last-good catalog on first paint; Esri street/dark tiles (Carto keyless).
 * 1.29.2: Darwin VAAC (Anak Krakatau); volcano LOOK decays with the VAA, not a July note.
 * 1.29.3: Pulse/LOOK caps — Darwin standing VAAs stay listed, only FL200+/RED raise the desk.
 * 1.29.4: mobile map-first chrome — Pulse overlay, desk fades on pan, folders icon-only.
 * 1.29.5: proxy fallback — retry + last-good on magneto, solar, VAAC, INGV, GeoNet, IRIS.
 * 1.29.6: TanStack Start >=1.168.60 (CVE-2026-102989) so Vercel will deploy.
 * 1.29.7: Rhythm “Pick an event” opens the live map instead of a dead button.
 * 1.29.9: 3D globe chunk retry + SW asset fetch retry (mobile dynamic import).
 * 1.29.8: Waveform button stays enabled and reads nearest BHZ (newest M4.5+ if none selected).
 * 1.30.0: public host is https://wolfwatch.site
 * 1.30.1: USGS catalog paints when it returns — not after solar and volcano feeds.
 * 1.30.2: Solar Now leads with Kp and the latest RTSW minute.
 * 1.30.3: Live GOES SUVI / CCOR frames and SWPC model stills on Solar.
 * 1.30.4: Solar Now is one desk — numbers left, frames and outlook right, no repeated gauges.
 * 1.30.5: Magneto ECDO test points — IERS pole, LOD, Chandler band. Not a flip time.
 * 1.30.6: Polar-motion track — two-year IERS path, last step, m/year drift.
 * 1.30.7: Polar motion has its own Solar tab.
 * 1.30.8: Pole desk credits Ethical Skeptic’s ECDO research.
 * 1.30.9: Exit full sits top-left in 3D so it no longer covers the toggle strip.
 * 1.31.0: EQ notices open that event. A focused quake no longer snaps back to the world view.
 * 1.31.1: Map catalog no longer waits on solar imagery. Regional catalogs cache for 3 minutes.
 * 1.31.2: Refresh is a labeled control on the header, the map dock, and the phone map.
 * 1.31.3: Section tabs collapse to the current choice, with the same Open / Close.
 * 1.31.4: First screen is one header line. Desk rail stays closed until Desks.
 * 1.31.5: Live pulse sits in the header gap. The map starts on the next line.
 * 1.31.6: Full screen drops the header. Home frame includes South Sandwich / Drake.
 * 1.31.7: View menu drops under the title. Pulse no longer runs into the X link.
 * 1.31.8: The view control is a dropdown. Current choice, chevron, menu.
 * 1.31.9: Live Map and Pulse menus paint over the map, not under it.
 * 1.32.0: Pulse leaves the header. It lives at the top of the map sidebar.
 * 1.32.1: Pulse is a scrolling tape. Toggles filter it. Majors always show.
 * 1.32.2: Tape quakes are M5+ or M4+ on a monitored node. Quiet lines stay off.
 * 1.32.3: Pulse sits in its own row. It no longer covers the 3D globe.
 * 1.32.4: Solar-wind tape line is labeled RTSW, with the spacecraft when known.
 * 1.32.5: Each tape line leads with a mark — fracture, volcano, sun, or wind.
 * 1.32.6: Volcano tape lines are notices from the last 7 days, newest first.
 * 1.32.7: A new agency RED / WARNING eruption raises a notice.
 * 1.32.8: OS notices follow the Pulse tape, with a switch for quakes, solar, and volcanoes.
 * 1.33.0: Sunspot desk shows Hale class and whether the region faces Earth.
 * 1.34.0: Flare window on the GOES 7-day record. Solar is the front door.
 * 1.34.1: Mode details drop over the map instead of stretching the header.
 * 1.34.2: The view menu is a fixed dropdown, so the map cannot cover it.
 * 1.35.0: Solar opens as a dashboard. The chart and the pictures sit under Closer look.
 * 1.35.1: Kp, X-ray, wind, and Bz are one chain from the Sun to the ground.
 * 1.36.0: A flare chance of 50% or more goes on Pulse and notifies. The fit learns from catalogued flares placed on the X-ray chart.
 * 1.37.0: The flare chance also uses the last 10 years of the NOAA GOES flare report.
 * 1.37.1: Sunspot desk uses the live visible-light Sun, with each region labeled.
 * 1.37.2: Active-region numbers on the Sun are larger.
 * 1.37.3: Sunspots are dots on the disk. The list shows each region and NOAA’s C, M, and X chance.
 * 1.37.4: Each sunspot and its list row share a number, so the disk can be read.
 * 1.38.0: Sunspot desk opens full screen. Closer look sits under the flare chance so the desk fits.
 * 1.39.0: Each flare this week is mapped on the X-ray chart, with a harmonic read and a DONKI source when one exists.
 * 1.39.1: Phone layout keeps the Sun beside the region list, and the header no longer covers the clock.
 * 1.39.2: Great Sitkin’s board opens the live AVO page. A Watch that is still erupting says so.
 * 1.39.3: Full-screen sunspot list scrolls on its own. The disk stays on screen.
 * 1.39.4: The Sun sticks to the top while the region list scrolls.
 * 1.39.5: Limb numbers stay on the disk. Hovering one no longer jumps the page.
 * 1.39.6: The sunspot desk sizes itself to the space it is in, on a phone or a wide screen.
 * 1.39.7: Full screen is a named grid. The disk, the detail, and the region list each have their own area.
 * 1.39.8: Region rows and the closer-look columns use subgrid, so they share the parent tracks.
 * 1.39.9: The side column is a nested grid, and the status chain sizes to its own cell.
 * 1.39.10: The region card shows spots, area, flares already seen, and class change. It no longer repeats the list line.
 * 1.39.11: Full screen nesting is finished. The Sun is the outer track. Detail and the list are a grid inside the side track.
 * 1.39.12: Container queries are named. The solar page is measured by the shell around it, so the two-column layout can actually run.
 * 1.39.13: Region numbers run left to right across the Sun, and each number stays on its own spot.
 * 1.39.14: Number 1 is the region about to leave the western limb. Numbers increase back toward the east.
 * 1.39.15: Spots use their NOAA AR number. The side panel still opens that region’s detail.
 * 1.39.16: AR chips stay readable. On a small Sun only the selected number is drawn; the full disk shows every AR.
 * 1.39.17: The AR chip sits on the NOAA spot. The Sun image is no longer zoomed out from under it.
 * 1.39.18: Far-side flare watch. Says which cameras see past the limb, and that the returning side is currently unseen.
 */
export const APP_VERSION = "1.39.18";



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
  // Prefer the host the user is on so preview + prod deep-links hydrate same-origin.
  // Localhost still uses production so shared links open the public app.
  try {
    if (typeof window !== "undefined" && window.location?.origin) {
      const h = window.location.hostname;
      if (h && h !== "localhost" && h !== "127.0.0.1") {
        return window.location.origin.replace(/\/$/, "");
      }
    }
  } catch {
    /* SSR */
  }
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
    role: "Magneto · INTERMAGNET processing (drmagneto public tool)",
    avatarSrc: undefined as string | undefined,
    avatarRemote: undefined as string | undefined,
  },
  ethicalskeptic: {
    name: "The Ethical Skeptic",
    handle: "EthicalSkeptic",
    url: "https://x.com/EthicalSkeptic",
    role: "ECDO research · Exothermic Core-Mantle Decoupling",
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
      `Post a NEW tweet with https://wolfwatch.site/?v=${SITE.ogImageVersion} to force re-scrape.`,
      "SSR head tags use PRODUCTION_ORIGIN so Twitterbot sees the right host (no JS).",
      "og.png must be image/png on this host — not HTML.",
      "Always share https:// links.",
    ],
  };
}
