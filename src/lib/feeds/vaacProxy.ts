/**
 * Server fetch: Washington VAAC 24h messages + latest KML polygons.
 * CORS-blocked in the browser. Other VAACs: official pages only.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  parseVaacKml,
  parseWashingtonMessages,
  type VaacAdvisory,
  type VaacBundle,
  VAAC_LINKS,
} from "@/lib/feeds/vaac";

const MESSAGES = VAAC_LINKS.washingtonMessages;

export const fetchWashingtonVaac = createServerFn({ method: "GET" }).handler(
  async (): Promise<VaacBundle> => {
    const empty = (note: string): VaacBundle => ({
      source: "washington-vaac",
      fetchedAt: Date.now(),
      updatedNote: null,
      advisories: [],
      plain: note,
    });
    try {
      const res = await fetch(MESSAGES, {
        headers: {
          Accept: "text/html",
          "User-Agent": "SunEarthSentinel/1.0 (observational; VAAC links only)",
        },
      });
      if (!res.ok) return empty(`Washington VAAC page ${res.status}`);
      const html = await res.text();
      const updated =
        html.match(/Advisories Last Updated:\s*([^<]+)/i)?.[1]?.trim() ?? null;
      const stubs = parseWashingtonMessages(html);
      const advisories: VaacAdvisory[] = [];
      for (const s of stubs.slice(0, 5)) {
        let rings: VaacAdvisory["rings"] = [];
        if (s.kmlUrl) {
          try {
            const k = await fetch(s.kmlUrl, {
              headers: { Accept: "application/vnd.google-earth.kml+xml,text/xml" },
            });
            if (k.ok) rings = parseVaacKml(await k.text(), s.volcano);
          } catch {
            /* KML optional */
          }
        }
        advisories.push({ ...s, rings });
      }
      const nRing = advisories.reduce((n, a) => n + a.rings.length, 0);
      return {
        source: "washington-vaac",
        fetchedAt: Date.now(),
        updatedNote: updated,
        advisories,
        plain: advisories.length
          ? `${advisories.length} Washington VAA · ${nRing} polygon(s) · official KML`
          : "No Washington VAAC KML in the last 24 h (or parse miss).",
      };
    } catch {
      return empty("Washington VAAC fetch failed");
    }
  },
);

let mem: { at: number; b: VaacBundle } | null = null;

export async function loadWashingtonVaac(): Promise<VaacBundle> {
  if (mem && Date.now() - mem.at < 180_000) return mem.b;
  const b = await fetchWashingtonVaac();
  mem = { at: Date.now(), b };
  return b;
}
