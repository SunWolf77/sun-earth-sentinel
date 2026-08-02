/** Human labels for USGS catalog time windows. */

export type WindowId = "day" | "week" | "month";

/** Full type still accepts legacy "hour" for deep links / storage. */
export type WindowIdLegacy = WindowId | "hour";

export const TIME_WINDOWS: {
  id: WindowId;
  /** Short chip for controls */
  label: string;
  /** Full phrase for titles / badges */
  title: string;
}[] = [
  { id: "day", label: "24h", title: "Past 24 hours" },
  { id: "week", label: "7d", title: "Past 7 days" },
  { id: "month", label: "30d", title: "Past 30 days" },
];

/** Map legacy hour → week (1h removed from product UI). */
export function normalizeTimeWindow(id: string | null | undefined): WindowId {
  if (id === "day" || id === "week" || id === "month") return id;
  if (id === "hour") return "week";
  return "week";
}

export function timeWindowTitle(id: string | null | undefined): string {
  const n = normalizeTimeWindow(id);
  const w = TIME_WINDOWS.find((x) => x.id === n);
  return w?.title ?? "Past 7 days";
}

export function timeWindowChip(id: string | null | undefined): string {
  const n = normalizeTimeWindow(id);
  const w = TIME_WINDOWS.find((x) => x.id === n);
  return w?.label ?? "7d";
}
