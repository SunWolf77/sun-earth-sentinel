/**
 * Zone-aware agency links for earthquake assessment.
 * USGS ComCat remains the global anchor; regional links open the local authority
 * catalog/UI for denser/local analysis (JMA, INGV, GeoNet, etc.).
 */

export type AgencyLink = {
  id: string;
  label: string;
  url: string;
  /** Prefer showing first in the popup */
  primary?: boolean;
};

function normLon(lon: number): number {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function inBox(
  lat: number,
  lon: number,
  latMin: number,
  latMax: number,
  lonMin: number,
  lonMax: number,
): boolean {
  const x = normLon(lon);
  if (lat < latMin || lat > latMax) return false;
  if (lonMin <= lonMax) return x >= lonMin && x <= lonMax;
  return x >= lonMin || x <= lonMax;
}

/** Honshu/Hokkaido/Kyushu/Shikoku + Ryukyu, Izu–Bonin, near-offshore Japan. */
export function isJapanRegion(lat: number, lon: number, place?: string | null): boolean {
  const placeL = (place || "").toLowerCase();
  if (
    /japan|honshu|hokkaido|kyushu|shikoku|ryukyu|okinawa|tokyo|osaka|fukushima|iwate|miyagi|aomori|akita|yamagata|niigata|nagano|gifu|shizuoka|kanagawa|chiba|ibaraki|tochigi|gunma|saitama|yamanashi|toyama|ishikawa|fukui|mie|nara|wakayama|hyogo|kyoto|shiga|hiroshima|okayama|yamaguchi|tottori|shimane|kagawa|tokushima|ehime|kochi|fukuoka|saga|nagasaki|kumamoto|oita|miyazaki|kagoshima|mutsu|sendai|sapporo|yokohama|kobe|nagoya|izu island|bonin|ogasawara|nankai|suruga|sagami|japan trench|sea of japan|east of.*japan|off.*japan|near the east coast of|near the south coast of|near the west coast of/i.test(
      placeL,
    )
  ) {
    return true;
  }
  // Main islands + near offshore
  if (inBox(lat, lon, 30, 46.2, 128.5, 146.5)) return true;
  // Okinawa / Ryukyu arc
  if (inBox(lat, lon, 24, 30.5, 122.5, 132)) return true;
  // Izu–Bonin / Volcano Islands
  if (inBox(lat, lon, 24, 35.5, 138.5, 145)) return true;
  // Kuril side near Japan (southern)
  if (inBox(lat, lon, 43, 46.5, 145, 149) && /kuril|hokkaido|e\. of|east of/i.test(placeL)) {
    return true;
  }
  return false;
}

/** JMA Bosai map + multilang list, centered on hypocenter when possible. */
export function jmaLinksForEvent(lat: number, lon: number): AgencyLink[] {
  const la = lat.toFixed(3);
  const lo = normLon(lon).toFixed(3);
  // Zoom ~7–8 around epicenter; intensity + hypocenter layers
  const mapUrl =
    `https://www.jma.go.jp/bosai/map.html#8/${la}/${lo}/` +
    `&elem=int&contents=earthquake_map&lang=en`;
  return [
    {
      id: "jma-map",
      label: "JMA map",
      url: mapUrl,
      primary: true,
    },
    {
      id: "jma-list",
      label: "JMA list",
      url: "https://www.data.jma.go.jp/multi/quake/index.html?lang=en",
    },
    {
      id: "jma-hypo",
      label: "JMA hypocenters",
      url: "https://www.jma.go.jp/bosai/map.html#5/36/138/&elem=hypo&contents=hypo&lang=en",
    },
  ];
}

export function agencyLinksForEvent(opts: {
  lat: number;
  lon: number;
  eventId?: string | null;
  place?: string | null;
  url?: string | null;
}): AgencyLink[] {
  const { lat, lon, eventId, place, url } = opts;
  const links: AgencyLink[] = [];
  const id = eventId ? String(eventId) : "";
  const isGeofon = id.startsWith("geofon:");
  const isJma = id.startsWith("jma:");
  const geofonId = isGeofon ? id.replace(/^geofon:/, "") : "";
  const usgsId = !isGeofon && !isJma && id ? id : null;
  const placeL = (place || "").toLowerCase();
  const japan = isJapanRegion(lat, lon, place) || isJma;

  // Primary source link
  if (isJma) {
    links.push(...jmaLinksForEvent(lat, lon));
    // still add USGS map nearby below
  } else if (isGeofon && geofonId) {
    links.push({
      id: "geofon",
      label: "GEOFON event",
      url: `https://geofon.gfz.de/eqinfo/event.php?id=${encodeURIComponent(geofonId)}`,
      primary: true,
    });
  } else if (url && /^https?:\/\//i.test(url)) {
    links.push({
      id: "source",
      label: japan ? "USGS event" : "Event page",
      url,
      primary: !japan, // for Japan, JMA map is co-primary
    });
  } else if (usgsId) {
    links.push({
      id: "usgs",
      label: "USGS event",
      url: `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(usgsId)}`,
      primary: !japan,
    });
  }

  // Japan — JMA first among regional (map + list + hypocenters)
  if (japan && !links.some((l) => l.id.startsWith("jma"))) {
    links.push(...jmaLinksForEvent(lat, lon));
  }

  // Always offer USGS map/search near the hypocenter
  const latQ = lat.toFixed(3);
  const lonQ = normLon(lon).toFixed(3);
  if (!links.some((l) => l.id === "usgs" || l.id === "source")) {
    links.push({
      id: "usgs-map",
      label: "USGS map",
      url: usgsId
        ? `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(usgsId)}/map`
        : `https://earthquake.usgs.gov/earthquakes/map/?extent=${(lat - 4).toFixed(2)},${(normLon(lon) - 6).toFixed(2)}&extent=${(lat + 4).toFixed(2)},${(normLon(lon) + 6).toFixed(2)}`,
    });
  } else if (usgsId) {
    links.push({
      id: "usgs-map",
      label: "USGS map",
      url: `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(usgsId)}/map`,
    });
  }

  // Global multi-agency catalogs
  links.push({
    id: "emsc",
    label: "EMSC",
    url: `https://www.emsc-csem.org/Earthquake_information/?lat=${latQ}&lon=${lonQ}`,
  });
  if (!links.some((l) => l.id === "geofon")) {
    links.push({
      id: "geofon-search",
      label: "GEOFON",
      url: isGeofon && geofonId
        ? `https://geofon.gfz.de/eqinfo/event.php?id=${encodeURIComponent(geofonId)}`
        : `https://geofon.gfz.de/eqinfo/event.php`,
    });
  }

  // Italy / Campi Flegrei / Med — INGV
  if (
    inBox(lat, lon, 35, 48, 6, 20) ||
    /italy|italia|campi flegrei|naples|napoli|sicily|etna|stromboli|po valley|adriatic/i.test(placeL)
  ) {
    links.push({
      id: "ingv",
      label: "INGV",
      url: "https://terremoti.ingv.it/",
    });
  }

  // New Zealand — GeoNet
  if (
    inBox(lat, lon, -48, -33, 165, 180) ||
    inBox(lat, lon, -48, -33, -180, -175) ||
    /new zealand|kermadec|auckland|wellington|christchurch|taupo/i.test(placeL)
  ) {
    links.push({
      id: "geonet",
      label: "GeoNet NZ",
      url: "https://www.geonet.org.nz/earthquake",
    });
  }

  // Iceland — IMO / Veðurstofa (national authority; denser than USGS)
  if (
    inBox(lat, lon, 62.5, 67.5, -25.5, -12.5) ||
    /iceland|reykjanes|reykjav|askja|krafla|grímsvötn|grimsvotn|katla|bárðarbunga|bardarbunga|hengill|tjörnes|tjornes/i.test(
      placeL,
    )
  ) {
    links.push({
      id: "imo",
      label: "IMO Iceland",
      url: "https://en.vedur.is/earthquakes-and-volcanism/earthquakes/",
    });
  }

  // Indonesia — BMKG
  if (
    inBox(lat, lon, -11, 6, 95, 141) ||
    /indonesia|sumatra|java|sulawesi|bali|banda|aceh|jakarta/i.test(placeL)
  ) {
    links.push({
      id: "bmkg",
      label: "BMKG",
      url: "https://www.bmkg.go.id/gempabumi/gempabumi-terkini.bmkg",
    });
  }

  // Alaska / Aleutians
  if (inBox(lat, lon, 50, 72, -180, -130) || /alaska|aleutian|atka|unalaska/i.test(placeL)) {
    links.push({
      id: "alaska",
      label: "Alaska EQ Center",
      url: "https://earthquake.alaska.edu/",
    });
  }

  // Chile — CSN
  if (inBox(lat, lon, -56, -17, -76, -66) || /chile|coquimbo|santiago|atacama/i.test(placeL)) {
    links.push({
      id: "csn",
      label: "CSN Chile",
      url: "https://www.sismologia.cl/",
    });
  }

  // Mexico — SSN
  if (inBox(lat, lon, 14, 33, -118, -86) || /mexico|oaxaca|guerrero|chiapas|jalisco/i.test(placeL)) {
    links.push({
      id: "ssn",
      label: "SSN Mexico",
      url: "http://www.ssn.unam.mx/",
    });
  }

  // Philippines — PHIVOLCS
  if (
    inBox(lat, lon, 4.5, 21.5, 116, 127) ||
    /philippines|luzon|mindanao|visayas|manila/i.test(placeL)
  ) {
    links.push({
      id: "phivolcs",
      label: "PHIVOLCS",
      url: "https://www.phivolcs.dost.gov.ph/",
    });
  }

  // Greece / Hellenic — NOA
  if (inBox(lat, lon, 34, 42, 19, 30) || /greece|hellenic|crete|aegean|athens/i.test(placeL)) {
    links.push({
      id: "noa",
      label: "NOA Greece",
      url: "https://www.gein.noa.gr/en/",
    });
  }

  // Turkey — KOERI
  if (
    inBox(lat, lon, 35.5, 42.5, 25.5, 45) ||
    /turkey|türkiye|anatolia|istanbul|aegean sea/i.test(placeL)
  ) {
    links.push({
      id: "koeri",
      label: "KOERI",
      url: "http://www.koeri.boun.edu.tr/scripts/lasteq.asp",
    });
  }

  // Deduplicate by id; keep first occurrence (JMA already early for Japan)
  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
}

/** Compact HTML for map popups. Regional agencies (JMA etc.) sorted after primary. */
export function agencyLinksHtml(links: AgencyLink[], max = 8): string {
  if (!links.length) return "";
  const ranked = [...links].sort((a, b) => {
    const ap = a.primary ? 0 : a.id.startsWith("jma") ? 1 : 2;
    const bp = b.primary ? 0 : b.id.startsWith("jma") ? 1 : 2;
    return ap - bp;
  });
  const shown = ranked.slice(0, max);
  const parts = shown.map((l) => {
    const weight = l.primary || l.id.startsWith("jma") ? "600" : "500";
    const color = l.primary || l.id.startsWith("jma") ? "#0891b2" : "#64748b";
    return `<a href="${l.url}" target="_blank" rel="noopener noreferrer" style="color:${color};font-weight:${weight};font-size:11px;margin-right:8px;white-space:nowrap">${l.label} →</a>`;
  });
  return `<div style="margin-top:6px;line-height:1.55;display:flex;flex-wrap:wrap;gap:2px 0">${parts.join("")}</div>`;
}
