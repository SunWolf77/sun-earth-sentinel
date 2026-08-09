/**
 * Parse SWPC alerts.json messages into structured watch / warning / alert rows.
 */

export type SwpcAlertTier = "warning" | "watch" | "alert" | "summary" | "other";

export type ParsedSwpcAlert = {
  tier: SwpcAlertTier;
  title: string;
  body: string;
  issued: string | null;
  /** Detected NOAA scale fragment e.g. G2, R1, S1 */
  scaleHint: string | null;
  raw: string;
};

export type SwpcAlertItem = {
  message?: string;
  issue_datetime?: string;
};

const TIER_ORDER: Record<SwpcAlertTier, number> = {
  warning: 0,
  watch: 1,
  alert: 2,
  summary: 3,
  other: 4,
};

export function classifySwpcTier(message: string): SwpcAlertTier {
  const m = message.toUpperCase();
  // SWPC often leads with WARNING: / WATCH: / ALERT:
  if (/\bWARNING\b/.test(m) || m.startsWith("WARNING")) return "warning";
  if (/\bWATCH\b/.test(m) || m.startsWith("WATCH")) return "watch";
  if (/\bALERT\b/.test(m) || m.startsWith("ALERT")) return "alert";
  if (/\bSUMMARY\b/.test(m) || m.startsWith("SUMMARY")) return "summary";
  if (/\bEXTENDED WARNING\b/.test(m)) return "warning";
  return "other";
}

export function extractScaleHint(message: string): string | null {
  const hits = message.match(/\b([GRS]\s*[1-5]|G\s*OF\s*[1-5]|KP\s*(?:OF\s*)?[0-9](?:\.[0-9])?)\b/gi);
  if (!hits?.length) return null;
  // Normalize first hit
  return hits[0]!.replace(/\s+/g, " ").toUpperCase();
}

export function parseSwpcAlert(item: SwpcAlertItem): ParsedSwpcAlert {
  const raw = (item.message || "").trim();
  const issued = item.issue_datetime?.trim() || null;
  if (!raw) {
    return {
      tier: "other",
      title: issued ? `SWPC notice · ${issued}` : "SWPC notice",
      body: "",
      issued,
      scaleHint: null,
      raw: "",
    };
  }
  const tier = classifySwpcTier(raw);
  const firstLine = raw.split(/\n|\r/)[0]?.trim() || raw.slice(0, 120);
  const title =
    firstLine.length > 100 ? `${firstLine.slice(0, 97)}…` : firstLine;
  const body =
    raw.length > firstLine.length
      ? raw.slice(firstLine.length).trim()
      : raw;
  return {
    tier,
    title,
    body: body.slice(0, 600),
    issued,
    scaleHint: extractScaleHint(raw),
    raw,
  };
}

export function parseSwpcAlerts(items: SwpcAlertItem[]): ParsedSwpcAlert[] {
  return items
    .map(parseSwpcAlert)
    .filter((a) => a.raw || a.issued)
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
}

export const TIER_LABEL: Record<SwpcAlertTier, string> = {
  warning: "Warning",
  watch: "Watch",
  alert: "Alert",
  summary: "Summary",
  other: "Notice",
};

export function tierTone(tier: SwpcAlertTier): string {
  switch (tier) {
    case "warning":
      return "border-danger/45 bg-danger/10 text-danger";
    case "watch":
      return "border-warn/40 bg-warn/10 text-warn";
    case "alert":
      return "border-gold/40 bg-gold/10 text-gold";
    case "summary":
      return "border-primary/35 bg-primary/10 text-primary";
    default:
      return "border-border bg-panel text-muted";
  }
}
