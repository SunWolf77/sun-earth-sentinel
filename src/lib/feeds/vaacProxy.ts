/**
 * Server fetch: Washington VAAC 24h messages + latest KML polygons.
 * Darwin VAAC current advisories (BoM JSON). CORS-blocked in the browser.
 * Other VAACs: official pages only. We do not track clouds.
 *
 * Fallback: retry the page/API, then keep the last good bundle
 * instead of overwriting memory with an empty result.
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
import { fetchWithRetry, LastGood } from "@/lib/feeds/resilientFetch";

const MESSAGES = VAAC_LINKS.washingtonMessages;

const washCache = new LastGood<VaacBundle>(20 * 60_000);
const darwinCache = new LastGood<UsgsVolcanoAlert[]>(20 * 60_000);

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
      const res = await fetchWithRetry(MESSAGES, {
        headers: {
          Accept: "text/html",
          "User-Agent": "SunEarthSentinel/1.0 (observational; VAAC links only)",
        },
        timeoutMs: 12_000,
      });
      if (!res.ok) {
        const hit = washCache.get("w");
        if (hit) return { ...hit, plain: `${hit.plain} · cached (HTTP ${res.status})` };
        return empty(`Washington VAAC page ${res.status}`);
      }
      const html = await res.text();
      const updated =
        html.match(/Advisories Last Updated:\s*([^<]+)/i)?.[1]?.trim() ?? null;
      const stubs = parseWashingtonMessages(html);
      const advisories: VaacAdvisory[] = [];
      for (const s of stubs.slice(0, 5)) {
        let rings: VaacAdvisory["rings"] = [];
        if (s.kmlUrl) {
          try {
            const k = await fetchWithRetry(s.kmlUrl, {
              headers: { Accept: "application/vnd.google-earth.kml+xml,text/xml" },
              retries: 1,
              timeoutMs: 6_000,
            });
            if (k.ok) rings = parseVaacKml(await k.text(), s.volcano);
          } catch {
            /* KML optional */
          }
        }
        advisories.push({ ...s, rings });
      }
      const nRing = advisories.reduce((n, a) => n + a.rings.length, 0);
      const bundle: VaacBundle = {
        source: "washington-vaac",
        fetchedAt: Date.now(),
        updatedNote: updated,
        advisories,
        plain: advisories.length
          ? `${advisories.length} Washington VAA · ${nRing} polygon(s) · official KML`
          : "No Washington VAAC KML in the last 24 h (or parse miss).",
      };
      if (advisories.length) washCache.set("w", bundle);
      return bundle;
    } catch (e) {
      const hit = washCache.get("w");
      if (hit) return { ...hit, plain: `${hit.plain} · cached` };
      return empty(e instanceof Error ? e.message : "Washington VAAC fetch failed");
    }
  },
);

let mem: { at: number; b: VaacBundle } | null = null;

export async function loadWashingtonVaac(): Promise<VaacBundle> {
  if (mem && Date.now() - mem.at < 180_000) return mem.b;
  const b = await fetchWashingtonVaac();
  // Do not overwrite a good cache with an empty failure
  if (b.advisories.length || !mem) mem = { at: Date.now(), b };
  return b.advisories.length ? b : mem?.b ?? b;
}

export const fetchDarwinVaac = createServerFn({ method: "GET" }).handler(
  async (): Promise<UsgsVolcanoAlert[]> => {
    try {
      const res = await fetchWithRetry(DARWIN_VAAC_API, {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SunEarthSentinel/1.0 (observational; Darwin VAAC)",
          Referer: DARWIN_VAAC_PAGE,
        },
        body: "page=volcanic-ash-darwin&javascript=1",
        timeoutMs: 10_000,
      });
      if (!res.ok) return darwinCache.get("d") ?? [];
      const json = (await res.json()) as DarwinVaacApi;
      const alerts = parseDarwinVaacJson(json);
      if (alerts.length) darwinCache.set("d", alerts);
      return alerts;
    } catch {
      return darwinCache.get("d") ?? [];
    }
  },
);

let darwinMem: { at: number; b: UsgsVolcanoAlert[] } | null = null;

export async function loadDarwinVaac(): Promise<UsgsVolcanoAlert[]> {
  if (darwinMem && Date.now() - darwinMem.at < 180_000) return darwinMem.b;
  const b = await fetchDarwinVaac();
  if (b.length || !darwinMem) darwinMem = { at: Date.now(), b };
  return b.length ? b : darwinMem?.b ?? b;
}
