import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an instant for display in UTC (USGS / seismic standard).
 * Date#toUTCString ends with "GMT" by ECMAScript; replace so the label matches
 * the agency convention (UTC, not GMT).
 */
export function formatUtc(ms: number | string | Date | null | undefined): string {
  if (ms == null || ms === "") return "—";
  try {
    const d = ms instanceof Date ? ms : new Date(ms);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toUTCString().replace(/\bGMT\b/g, "UTC");
  } catch {
    return "—";
  }
}
