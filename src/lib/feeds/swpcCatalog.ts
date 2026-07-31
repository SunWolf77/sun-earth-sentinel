/**
 * NOAA SWPC public data endpoints used (or available) by WolfWatch.
 * All under https://services.swpc.noaa.gov — free, no API key.
 * CORS: generally Access-Control-Allow-Origin: * (we still batch via server proxy for reliability).
 */

export type SwpcEndpoint = {
  id: string;
  path: string;
  role: string;
  usedInApp: boolean;
  heavy?: boolean;
};

export const SWPC_BASE = "https://services.swpc.noaa.gov";

export const SWPC_ENDPOINTS: SwpcEndpoint[] = [
  {
    id: "kp",
    path: "/products/noaa-planetary-k-index.json",
    role: "Planetary K-index time series",
    usedInApp: true,
  },
  {
    id: "scales",
    path: "/products/noaa-scales.json",
    role: "R / S / G scales now + day forecasts",
    usedInApp: true,
  },
  {
    id: "sw-speed",
    path: "/products/summary/solar-wind-speed.json",
    role: "L1 solar wind speed summary",
    usedInApp: true,
  },
  {
    id: "sw-mag",
    path: "/products/summary/solar-wind-mag-field.json",
    role: "L1 Bz / Bt summary",
    usedInApp: true,
  },
  {
    id: "xrays",
    path: "/json/goes/primary/xrays-1-day.json",
    role: "GOES X-ray flux (1 day)",
    usedInApp: true,
    heavy: true,
  },
  {
    id: "protons",
    path: "/json/goes/primary/integral-protons-1-day.json",
    role: "GOES integral protons",
    usedInApp: true,
    heavy: true,
  },
  {
    id: "10cm",
    path: "/products/summary/10cm-flux.json",
    role: "10.7 cm radio flux",
    usedInApp: true,
  },
  {
    id: "alerts",
    path: "/products/alerts.json",
    role: "SWPC watches / warnings text",
    usedInApp: true,
  },
  {
    id: "3day",
    path: "/text/3-day-forecast.txt",
    role: "Official 3-day forecast text",
    usedInApp: true,
  },
  {
    id: "discussion",
    path: "/text/discussion.txt",
    role: "Forecast discussion",
    usedInApp: true,
  },
  {
    id: "enlil",
    path: "/products/animations/enlil.json",
    role: "WSA-ENLIL frame list",
    usedInApp: true,
    heavy: true,
  },
  {
    id: "ovation",
    path: "/products/animations/ovation_north_24h.json",
    role: "OVATION aurora frames (north)",
    usedInApp: true,
    heavy: true,
  },
  {
    id: "rtsw-mag",
    path: "/json/rtsw/rtsw_mag_1m.json",
    role: "High-cadence RTSW magnetometer (large)",
    usedInApp: false,
    heavy: true,
  },
  {
    id: "rtsw-wind",
    path: "/json/rtsw/rtsw_wind_1m.json",
    role: "High-cadence RTSW plasma (large)",
    usedInApp: false,
    heavy: true,
  },
  {
    id: "kp-forecast",
    path: "/products/noaa-planetary-k-index-forecast.json",
    role: "Kp forecast product",
    usedInApp: true,
  },
];

export function swpcUrl(path: string): string {
  return path.startsWith("http") ? path : `${SWPC_BASE}${path}`;
}
