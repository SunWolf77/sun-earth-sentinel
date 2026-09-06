/**
 * Server fetch: Washington VAAC 24h messages + latest KML polygons.
 * Darwin VAAC current advisories (BoM JSON). CORS-blocked in the browser.
 * Other VAACs: official pages only. We do not track clouds.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  parseVaacKml,
  parseWashingtonMessages,
  type VaacAdvisory,
  type VaacBundle,
  VAAC_LINKS,
} from "@/lib/feeds/vaac";
import {
  DARWIN_VAAC_API,
  DARWIN_VAAC_PAGE,
  parseDarwinVaacJson,
  type DarwinVaacApi,
} from "@/lib/feeds/darwinVaac";
import type { UsgsVolcanoAlert } from "@/lib/feeds/usgsVolcanoAlerts";

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

export const fetchDarwinVaac = createServerFn({ method: "GET" }).handler(
  async (): Promise<UsgsVolcanoAlert[]> => {
    try {
      const res = await fetch(DARWIN_VAAC_API, {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SunEarthSentinel/1.0 (observational; Darwin VAAC)",
          Referer: DARWIN_VAAC_PAGE,
        },
        body: "page=volcanic-ash-darwin&javascript=1",
      });
      if (!res.ok) return [];
      const json = (await res.json()) as DarwinVaacApi;
      return parseDarwinVaacJson(json);
    } catch {
      return [];
    }
  },
);

let darwinMem: { at: number; b: UsgsVolcanoAlert[] } | null = null;

export async function loadDarwinVaac(): Promise<UsgsVolcanoAlert[]> {
  if (darwinMem && Date.now() - darwinMem.at < 180_000) return darwinMem.b;
  const b = await fetchDarwinVaac();
  darwinMem = { at: Date.now(), b };
  return b;
}
