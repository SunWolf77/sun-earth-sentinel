/**
 * Geometric animal logo set — monoline / gold-friendly (currentColor).
 * Same visual language as WolfFaceIcon: angular, header-readable, 24×24.
 */

import type { ReactNode } from "react";

type IconProps = {
  className?: string;
  title?: string;
};

function Svg({
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-6 w-6"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Wolf — WolfWatch primary (ears · brow · eyes · snout). */
export function GeoWolf({ className, title = "Wolf" }: IconProps) {
  return (
    <Svg className={className} title={title}>
      <path
        d="M5 10.5 7.2 3.5 10.5 8.2"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M19 10.5 16.8 3.5 13.5 8.2"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M5 10.5 4.2 14.2 7.5 19.5h9l3.3-5.3L19 10.5 16 8.8 12 7.6 8 8.8 5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <path d="M8.2 11.2h7.6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="9.4" cy="13.15" r="1.05" fill="currentColor" />
      <circle cx="14.6" cy="13.15" r="1.05" fill="currentColor" />
      <path
        d="M10.2 15.1 12 17.6 13.8 15.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="12" cy="18.35" r="0.85" fill="currentColor" />
    </Svg>
  );
}

/** Eagle — watch / overlook (spread wings · hooked beak). */
export function GeoEagle({ className, title = "Eagle" }: IconProps) {
  return (
    <Svg className={className} title={title}>
      <path
        d="M3.5 11.5 8 9.2 12 10.5 16 9.2 20.5 11.5 17.5 13.5 12 12.2 6.5 13.5 3.5 11.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 10.2 12 5.5 14.5 10.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M10.5 13.2c0 2.2 1 4.3 1.5 5.8.5-1.5 1.5-3.6 1.5-5.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M12 12.4 14.2 13.1 13.2 14.4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="11.2" cy="11.6" r="0.7" fill="currentColor" />
    </Svg>
  );
}

/** Owl — night watch (round face · ear tufts · V beak). */
export function GeoOwl({ className, title = "Owl" }: IconProps) {
  return (
    <Svg className={className} title={title}>
      <path
        d="M7 5.5 9 8M17 5.5 15 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="13" r="6.2" stroke="currentColor" strokeWidth="1.55" />
      <circle cx="9.5" cy="12.5" r="2.1" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="14.5" cy="12.5" r="2.1" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="9.5" cy="12.5" r="0.7" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="0.7" fill="currentColor" />
      <path
        d="M11.2 15.4 12 16.6 12.8 15.4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 17.8c1 .9 2.2 1.4 3.5 1.4s2.5-.5 3.5-1.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Fox — sharp muzzle · tall ears · cheek slash. */
export function GeoFox({ className, title = "Fox" }: IconProps) {
  return (
    <Svg className={className} title={title}>
      <path
        d="M6 11 8.5 3.8 11 9.5"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M18 11 15.5 3.8 13 9.5"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M6 11 5 14.5 9 20h6l4-5.5L18 11 12 9.2 6 11Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <circle cx="9.6" cy="13.2" r="0.95" fill="currentColor" />
      <circle cx="14.4" cy="13.2" r="0.95" fill="currentColor" />
      <path
        d="M10.3 15.4 12 18.2 13.7 15.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M7.2 14.5 8.6 15.2M16.8 14.5 15.4 15.2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Raven — sentinel bird (wedge body · beak · wing chevron). */
export function GeoRaven({ className, title = "Raven" }: IconProps) {
  return (
    <Svg className={className} title={title}>
      <path
        d="M5 13.5 10 8.5 14.5 10l4-2.5L20.5 10 16 13.5 12.5 12 8 15.5 5 13.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 10 18.5 9 20 11"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M10 12.5c.5 2.5 1.5 4.5 2.2 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M8 15.5 6.5 18.5M9.5 16 8.5 19"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="12.8" cy="11.2" r="0.75" fill="currentColor" />
    </Svg>
  );
}

/** Bear — broad head · round ears · short snout. */
export function GeoBear({ className, title = "Bear" }: IconProps) {
  return (
    <Svg className={className} title={title}>
      <circle cx="7.2" cy="7.5" r="2.3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.8" cy="7.5" r="2.3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 10.5c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5c0 4.2-2.6 7.5-6.5 7.5S5.5 14.7 5.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.55"
      />
      <circle cx="9.5" cy="11.2" r="0.95" fill="currentColor" />
      <circle cx="14.5" cy="11.2" r="0.95" fill="currentColor" />
      <ellipse cx="12" cy="14.3" rx="2.1" ry="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="14.1" r="0.55" fill="currentColor" />
    </Svg>
  );
}

/** Serpent / dragon — RoF corridor energy (S-curve · eye · tongue tip). */
export function GeoSerpent({ className, title = "Serpent" }: IconProps) {
  return (
    <Svg className={className} title={title}>
      <path
        d="M4 16c2-4 4-6 6-6s3 2 4 4 2.5 4 4.5 4 3.5-2 3.5-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 9.5c1.2 0 2.2.9 2.2 2.2"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
      <circle cx="19.5" cy="11.2" r="0.75" fill="currentColor" />
      <path
        d="M20.5 13.2 22 14.5M20.5 13.2 22 12.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M6.5 14.5c-.8.2-1.5.8-2 1.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Whale — ocean corridor (arc body · fluke · eye). */
export function GeoWhale({ className, title = "Whale" }: IconProps) {
  return (
    <Svg className={className} title={title}>
      <path
        d="M3.5 13c1.5-3.5 5-5.5 9-5.5 4.5 0 7.5 2.2 8.5 5.5 0 0-2 1.2-3.5 1.2H10c-2.5 0-4.5-0.5-6.5-1.2Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <path
        d="M18 14.5 21.5 12 22 16.5 18.5 15.2"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M8 9.5c.3-1.5 1.2-2.5 2.2-2.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="7.8" cy="12.2" r="0.8" fill="currentColor" />
      <path
        d="M4 15.5c1 .8 2.2 1.2 3.5 1.2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export const GEOMETRIC_ANIMALS = [
  { id: "wolf", name: "Wolf", role: "WolfWatch primary", Icon: GeoWolf },
  { id: "eagle", name: "Eagle", role: "Overlook / watch", Icon: GeoEagle },
  { id: "owl", name: "Owl", role: "Night watch", Icon: GeoOwl },
  { id: "fox", name: "Fox", role: "Swift desk", Icon: GeoFox },
  { id: "raven", name: "Raven", role: "Sentinel bird", Icon: GeoRaven },
  { id: "bear", name: "Bear", role: "Ground strength", Icon: GeoBear },
  { id: "serpent", name: "Serpent", role: "Ring of Fire", Icon: GeoSerpent },
  { id: "whale", name: "Whale", role: "Ocean corridor", Icon: GeoWhale },
] as const;
