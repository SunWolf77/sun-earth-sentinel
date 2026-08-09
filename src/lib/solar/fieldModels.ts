/**
 * Main-field / secular-variation model literacy for SES.
 * Educational only — not operational core telemetry.
 */

export type FieldModelKind = "main-field" | "high-res" | "world-magnetic";

export type FieldModel = {
  id: string;
  name: string;
  short: string;
  kind: FieldModelKind;
  epoch: string;
  svWindow: string;
  blurb: string;
  accuracy: string;
  use: string;
  href: string;
};

export const FIELD_MODELS: FieldModel[] = [
  {
    id: "igrf14",
    name: "International Geomagnetic Reference Field 14",
    short: "IGRF-14",
    kind: "main-field",
    epoch: "2025.0 (DGRF 2020.0)",
    svWindow: "2025.0–2030.0 linear SV (degree ≤ 8)",
    blurb:
      "IAGA community spherical-harmonic main-field model. Degree 13 at 2025.0 plus definitive DGRF 2020. SES embeds official igrf14coeffs and evaluates the field in-app (see IGRF-14 model details).",
    accuracy:
      "Global smooth field only. SV stops at degree 8; n=9–13 hold constant after 2025.0. Not crustal, not Sq, not storm-time. Close to — but not the same as — WMM2025.",
    use: "Research standard · residual main field · SES IGRF-14 explorer under Magneto",
    href: "https://www.ncei.noaa.gov/products/international-geomagnetic-reference-field",
  },
  {
    id: "wmm2025",
    name: "World Magnetic Model 2025",
    short: "WMM2025",
    kind: "world-magnetic",
    epoch: "2025.0",
    svWindow: "2025.0–2030.0 linear SV",
    blurb:
      "Operational DoD/NOAA/BGS navigation model. SES embeds official WMM2025.COF (degree 12) and evaluates declination, inclination, F, and approximate secular variation at any geodetic point.",
    accuracy:
      "Main-field + SV only. Does not include crustal anomalies, Sq, or storm-time disturbance (those sit on top of WMM). Valid for 2025.0–2030.0; replace coefficients next epoch.",
    use: "Compass declination · nav devices · SES WMM2025 sampler under Magneto",
    href: "https://www.ncei.noaa.gov/products/world-magnetic-model",
  },
  {
    id: "chaos",
    name: "CHAOS / research core-field models",
    short: "CHAOS-class",
    kind: "high-res",
    epoch: "Research releases (satellite era)",
    svWindow: "Higher-cadence SV & secular acceleration",
    blurb:
      "Satellite-era research models (e.g. CHAOS family) separate core, crust, and magnetospheric contributions with higher time resolution than IGRF’s five-year steps.",
    accuracy:
      "Research products change between versions. Excellent for science; not a substitute for SWPC storm scales or real-time INTERMAGNET.",
    use: "Core-flow research · secular acceleration · academic residual analysis",
    href: "https://www.spacecenter.dk/files/magnetic-models/CHAOS-7/",
  },
];

export const MODEL_ACCURACY_POINTS = [
  "Main-field models describe the slow core field (nT/year). Storms swing nT in minutes–hours on top of that background.",
  "IGRF/WMM secular variation is a smooth forecast — regional accelerations and outer-core flow papers are research context, not SES red alerts.",
  "SES synthesizes free public feeds (SWPC, USGS, INTERMAGNET via public tools). Always prefer the authority product for ops decisions.",
  "No SES module claims city-level GIC outage, core-velocity telemetry, or official watches beyond what SWPC publishes.",
] as const;
