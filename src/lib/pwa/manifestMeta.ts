/**
 * Web App Manifest field notes — what we set and why (WolfWatch).
 * Spec: https://www.w3.org/TR/appmanifest/
 */

export type ManifestFieldNote = {
  field: string;
  value: string;
  why: string;
};

export const MANIFEST_FIELD_NOTES: ManifestFieldNote[] = [
  {
    field: "id",
    value: "/",
    why: "Stable identity for install updates (not tied to query strings).",
  },
  {
    field: "name / short_name",
    value: "Sol-Earth WolfWatch Sentinel / WolfWatch",
    why: "Home-screen label (short_name under ~12 chars preferred).",
  },
  {
    field: "start_url",
    value: "/?source=pwa",
    why: "Launch into app; source=pwa for analytics-free install attribution.",
  },
  {
    field: "scope",
    value: "/",
    why: "All same-origin routes stay in the PWA window.",
  },
  {
    field: "display",
    value: "standalone",
    why: "Chrome-less shell on install; display_override allows browser fallback.",
  },
  {
    field: "theme_color / background_color",
    value: "#14b8a6 / #0b0b0f",
    why: "Matches status bar + splash with the dark observatory UI.",
  },
  {
    field: "icons",
    value: "favicon.svg (any + maskable) · og.png",
    why: "SVG any-size for modern installers; PNG for legacy / rich install UI.",
  },
  {
    field: "shortcuts",
    value: "Live Map · Solar",
    why: "Long-press app icon → jump to primary tabs without re-nav.",
  },
  {
    field: "launch_handler.client_mode",
    value: "navigate-existing",
    why: "Re-use open PWA window when possible (less multi-instance clutter).",
  },
  {
    field: "categories",
    value: "education, news, utilities, weather",
    why: "Store / install surfaces classification (not App Store).",
  },
];
