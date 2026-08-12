/**
 * Human-readable “what is this / why is it marked” for focus nodes.
 * Used by 2D popups, tooltips, and 3D node cards.
 */

import type { DragonNode } from "@/lib/feeds/usgs";

export type NodeMarkKind =
  | "ses-published"
  | "volcano-watch"
  | "volcano-elevated"
  | "corridor"
  | "focus";

export function nodeMarkKind(node: DragonNode): NodeMarkKind {
  if (node.id.startsWith("usgs-volc-") || node.id.startsWith("gvp-")) {
    return "volcano-elevated";
  }
  if (node.kind === "volcano") return "volcano-watch";
  if (node.publishedFocus) return "ses-published";
  if (node.watchPriority) return "corridor";
  return "focus";
}

/** Short chip for map labels (always visible). */
export function nodeMarkChip(node: DragonNode): string {
  // Live multi-source volcano alert on SES/volcano nodes
  if (node.kind === "volcano" || node.aviationCode) {
    const av = (node.aviationCode || "").toLowerCase();
    if (av === "yellow" || av === "orange" || av === "red") {
      const lvl =
        av === "red" ? "WARNING" : av === "orange" ? "WATCH" : "ADVISORY";
      return `${lvl} · ${av.toUpperCase()}`;
    }
  }
  switch (nodeMarkKind(node)) {
    case "ses-published":
      return "SES focus";
    case "volcano-elevated":
      return node.aviationCode
        ? `Volcano · ${node.aviationCode.toUpperCase()}`
        : "Volcano watch";
    case "volcano-watch":
      return "Volcano";
    case "corridor":
      return "Watch corridor";
    default:
      return "Focus zone";
  }
}

/** One-line reason this marker exists on the map/globe. */
export function nodeWhyLine(node: DragonNode): string {
  if (node.focusNote) return node.focusNote;
  switch (nodeMarkKind(node)) {
    case "ses-published":
      return "Published Sun Earth Sentinel focus node — tap to zoom the live catalog into this corridor. Not a forecast.";
    case "volcano-elevated":
      return "Elevated volcano watch (live) — marked while aviation color is above green; drops when normal. Not a forecast.";
    case "volcano-watch":
      return "Static volcano watch region — seismic/volcanic context for this box. Not a forecast.";
    case "corridor":
      return "Priority seismic corridor tracked for swarm context. Tap to focus events in this box.";
    default:
      return "Named focus zone — tap to filter the map/globe to earthquakes inside this region.";
  }
}

export function nodeRoleLine(node: DragonNode): string {
  return node.role?.trim() || "Observational focus region";
}

/** Short map label (name can be long — keep readable). */
export function nodeShortName(node: DragonNode, max = 22): string {
  const n = node.name.trim();
  if (n.length <= max) return n;
  return `${n.slice(0, max - 1)}…`;
}

/** HTML fragment for Leaflet popup body (no outer wrapper). */
export function nodePopupHtml(
  node: DragonNode,
  opts: { status?: string; statusColor?: string; isFocus?: boolean },
): string {
  const chip = nodeMarkChip(node);
  const why = nodeWhyLine(node);
  const role = nodeRoleLine(node);
  const st = opts.status
    ? `<div style="margin-top:4px">Activity: <b style="color:${opts.statusColor || "#e2e8f0"}">${opts.status}</b></div>`
    : "";
  const boardHref = node.monitorUrl;
  const isPubBoard =
    !!boardHref &&
    (node.publishedFocus ||
      node.id === "mediterranean" ||
      boardHref.includes("monitor.vercel.app"));
  const boardLabel =
    node.id === "mediterranean"
      ? "Swarm board →"
      : isPubBoard
        ? "Full swarm board →"
        : node.kind === "volcano"
          ? "Volcano profile →"
          : "Full swarm board →";
  const boardColor =
    node.id === "mediterranean" || isPubBoard
      ? "#fbbf24"
      : node.kind === "volcano"
        ? "#fb923c"
        : "#ca8a04";
  const boardLink = boardHref
    ? `<div style="margin-top:6px"><a href="${boardHref}" target="_blank" rel="noopener noreferrer" style="color:${boardColor};font-weight:600">${boardLabel}</a></div>`
    : "";
  const gvp = node.gvpUrl
    ? `<div style="margin-top:4px"><a href="${node.gvpUrl}" target="_blank" rel="noopener noreferrer" style="color:#fb923c">Smithsonian GVP →</a></div>`
    : "";
  const agency = node.agencyUrl
    ? `<div style="margin-top:4px"><a href="${node.agencyUrl}" target="_blank" rel="noopener noreferrer" style="color:#22d3ee">Agency page →</a></div>`
    : "";
  return `
    <div style="font-weight:700;color:#f8fafc;font-size:13px">${node.name}</div>
    <div style="margin-top:3px">
      <span style="display:inline-block;padding:1px 6px;border-radius:999px;border:1px solid #334155;background:#0f172a;color:#fbbf24;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.03em">${chip}</span>
    </div>
    <div style="margin-top:6px;color:#94a3b8;font-size:11px;line-height:1.35">${role}</div>
    <div style="margin-top:6px;padding:6px 8px;border-radius:6px;background:#0f172a;border:1px solid #1e293b;color:#cbd5e1;font-size:11px;line-height:1.4">
      <div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px">Why marked</div>
      ${why}
    </div>
    ${st}
    ${boardLink}${gvp}${agency}
    <button type="button" class="ww-focus-btn" data-node="${node.id}" style="margin-top:8px;cursor:pointer;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600">
      ${opts.isFocus ? "Exit focus · home view" : "Focus this zone"}
    </button>
  `;
}
