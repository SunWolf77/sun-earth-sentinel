/**
 * WolfWatch desk → geometric animal glyph map.
 * One unique mark per published desk; Wolf reserved for NZ (home) + network brand.
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
  label: string;
  why: string;
  Icon: ComponentType<{ className?: string; title?: string }>;
};

/** Canonical per-desk glyphs (unique across the network). */
export const DESK_GLYPHS: Record<string, DeskGlyphMeta> = {
  tonga: {
    id: "serpent",
    label: "Serpent",
    why: "Ring of Fire trench corridor",
    Icon: GeoSerpent,
  },
  mediterranean: {
    id: "fox",
    label: "Fox",
    why: "Swift caldera densify watch",
    Icon: GeoFox,
  },
  japan: {
    id: "eagle",
    label: "Eagle",
    why: "Overlook + tsunami watch",
    Icon: GeoEagle,
  },
  kamchatka: {
    id: "bear",
    label: "Bear",
    why: "Volcanic ground strength",
    Icon: GeoBear,
  },
  iceland: {
    id: "raven",
    label: "Raven",
    why: "North Atlantic volcanic watch",
    Icon: GeoRaven,
  },
  southsandwich: {
    id: "whale",
    label: "Whale",
    why: "Scotia / Drake ocean corridor",
    Icon: GeoWhale,
  },
  andes: {
    id: "owl",
    label: "Owl",
    why: "Long Nazca megathrust watch",
    Icon: GeoOwl,
  },
  newzealand: {
    id: "wolf",
    label: "Wolf",
    why: "SunWolf home desk · Aotearoa",
    Icon: GeoWolf,
  },
};

export function getDeskGlyph(sesNodeId: string | null | undefined): DeskGlyphMeta | null {
  if (!sesNodeId) return null;
  return DESK_GLYPHS[sesNodeId] ?? null;
}
