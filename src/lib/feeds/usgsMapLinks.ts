/**
 * Deep-link builders for USGS Earthquake Map (satellite / feed / extent).
 * Hash config is what the USGS SPA actually reads for basemap + feed + viewport.
 */

export type UsgsMapLinkOpts = {
  /** SW corner [lat, lon] */
  sw: [number, number];
  /** NE corner [lat, lon] */
  ne: [number, number];
  feed?: "1day_m25" | "7day_m25" | "30day_m25" | "1day_m45" | "7day_m45" | "30day_m45";
  basemap?: "grayscale" | "terrain" | "satellite" | "street";
  restrictListToMap?: boolean;
};

/** Canonical USGS map hash URL for a boxed view. */
export function usgsEarthquakeMapUrl(opts: UsgsMapLinkOpts): string {
  const feed = opts.feed ?? "30day_m25";
  const basemap = opts.basemap ?? "satellite";
  const cfg = {
    feed,
    sort: "newest",
    basemap,
    autoUpdate: false,
    restrictListToMap: opts.restrictListToMap ?? true,
    timeZone: "utc",
    mapposition: [opts.sw, opts.ne] as [[number, number], [number, number]],
    overlays: { plates: true },
    viewModes: {
      map: true,
      list: true,
      settings: false,
      help: false,
    },
  };
  return `https://earthquake.usgs.gov/earthquakes/map/#${encodeURIComponent(JSON.stringify(cfg))}`;
}

/**
 * South Sandwich / Drake / Scotia Arc — matches ops screenshot:
 * 30-day M2.5+, satellite, plates, Scotia Sea + Drake Passage + SS swarm.
 */
export function usgsSouthSandwichMapUrl(): string {
  return usgsEarthquakeMapUrl({
    // Wider than trench-only so Drake Passage + Scotia plate show (screenshot view)
    sw: [-63.5, -78],
    ne: [-47.5, -12],
    feed: "30day_m25",
    basemap: "satellite",
  });
}
