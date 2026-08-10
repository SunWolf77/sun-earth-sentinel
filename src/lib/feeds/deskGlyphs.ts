/**
 * WolfWatch desk → geometric animal glyph map.
 *
 * Rules (refine carefully — don’t reshuffle casually):
 *  1. One unique glyph per published desk (header scan recognition).
 *  2. Prefer tectonic / cultural / ocean fit over decoration.
 *  3. Wolf = network brand + NZ home desk (SunWolf · Aotearoa).
 *  4. “Why” strings stay short enough for tooltips.
 */

import type { ComponentType } from "react";
import {
  GeoBear,
  GeoEagle,
  GeoFox,
  GeoOwl,
  GeoRaven,
  GeoSerpent,
  GeoWhale,
  GeoWolf,
} from "@/components/brand/GeometricAnimals";

export type DeskGlyphId =
  | "wolf"
  | "eagle"
  | "owl"
  | "fox"
  | "raven"
  | "bear"
  | "serpent"
  | "whale";

export type DeskGlyphMeta = {
  id: DeskGlyphId;
  /** Display name of the animal */
  label: string;
  /** One-line tooltip / legend reason */
  why: string;
  /** Desk short code (TK, CF, …) for tables */
  shortCode: string;
  /** Published network order */
  networkOrder: number;
  Icon: ComponentType<{ className?: string; title?: string }>;
};

/**
 * Canonical per-desk glyphs — unique across the network.
 *
 * | # | Code | Desk              | Glyph   | Fit |
 * |---|------|-------------------|---------|-----|
 * | 1 | TK   | Tonga–Kermadec    | Serpent | Pacific RoF trench coil |
 * | 2 | CF   | Campi Flegrei     | Owl     | Continuous caldera densify |
 * | 3 | JP   | Japan Arc         | Fox     | Kitsune · JMA local densify |
 * | 3 | KM   | Kamchatka–Kurils  | Bear    | Peninsula mass · volcanoes |
 * | 4 | IS   | Iceland           | Raven   | Norse north · VALS/VONA |
 * | 5 | SS   | South Sandwich    | Whale   | Scotia–Drake ocean corridor |
 * | 6 | CL   | Chile–Andes       | Eagle   | Andean overlook · Nazca |
 * | 7 | NZ   | New Zealand       | Wolf    | SunWolf home desk |
 */
export const DESK_GLYPHS: Record<string, DeskGlyphMeta> = {
  tonga: {
    id: "serpent",
    label: "Serpent",
    why: "Pacific RoF trench corridor",
    shortCode: "TK",
    networkOrder: 1,
    Icon: GeoSerpent,
  },
  mediterranean: {
    id: "owl",
    label: "Owl",
    why: "Continuous caldera densify (INGV)",
    shortCode: "CF",
    networkOrder: 2,
    Icon: GeoOwl,
  },
  japan: {
    id: "fox",
    label: "Fox",
    why: "Kitsune · JMA archipelago densify",
    shortCode: "JP",
    networkOrder: 3,
    Icon: GeoFox,
  },
  kamchatka: {
    id: "bear",
    label: "Bear",
    why: "Peninsula mass · volcanic ground",
    shortCode: "KM",
    networkOrder: 3,
    Icon: GeoBear,
  },
  iceland: {
    id: "raven",
    label: "Raven",
    why: "Norse north · VALS / VONA watch",
    shortCode: "IS",
    networkOrder: 4,
    Icon: GeoRaven,
  },
  southsandwich: {
    id: "whale",
    label: "Whale",
    why: "Scotia–Drake ocean corridor",
    shortCode: "SS",
    networkOrder: 5,
    Icon: GeoWhale,
  },
  andes: {
    id: "eagle",
    label: "Eagle",
    why: "Andean overlook · Nazca megathrust",
    shortCode: "CL",
    networkOrder: 6,
    Icon: GeoEagle,
  },
  newzealand: {
    id: "wolf",
    label: "Wolf",
    why: "SunWolf home desk · Aotearoa",
    shortCode: "NZ",
    networkOrder: 7,
    Icon: GeoWolf,
  },
};

/** Ordered rows for legends / About tables. */
export function listDeskGlyphRows(): (DeskGlyphMeta & { sesNodeId: string })[] {
  return Object.entries(DESK_GLYPHS)
    .map(([sesNodeId, meta]) => ({ sesNodeId, ...meta }))
    .sort((a, b) => {
      if (a.networkOrder !== b.networkOrder) return a.networkOrder - b.networkOrder;
      return a.shortCode.localeCompare(b.shortCode);
    });
}

export function getDeskGlyph(sesNodeId: string | null | undefined): DeskGlyphMeta | null {
  if (!sesNodeId) return null;
  return DESK_GLYPHS[sesNodeId] ?? null;
}
