/** Human labels for USGS catalog time windows. */

export type WindowId = "hour" | "day" | "week" | "month";

export const TIME_WINDOWS: {
  id: WindowId;
  /** Short chip for controls */
  label: string;
  /** Full phrase for titles / badges */
  title: string;
}[] = [
  { id: "hour", label: "1h", title: "Past 1 hour" },
  { id: "day", label: "24h", title: "Past 24 hours" },
  { id: "week", label: "7d", title: "Past 7 days" },
  { id: "month", label: "30d", title: "Past 30 days" },
];

export function timeWindowTitle(id: string | null | undefined): string {
  const w = TIME_WINDOWS.find((x) => x.id === id);
  return w?.title ?? "Selected window";
}

export function timeWindowChip(id: string | null | undefined): string {
  const w = TIME_WINDOWS.find((x) => x.id === id);
  return w?.label ?? "—";
}
