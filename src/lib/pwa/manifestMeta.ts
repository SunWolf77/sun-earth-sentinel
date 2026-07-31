/**
 * Web App Manifest field notes — what we set and why (Sun-Earth Sentinel).
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
    value: "Sun-Earth Sentinel / Sentinel",
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
    why: "Matches observatory chrome on splash / status bar.",
  },
];
