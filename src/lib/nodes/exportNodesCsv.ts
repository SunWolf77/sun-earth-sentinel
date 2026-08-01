/**
 * Export focus-node metadata as CSV (observational catalog, not a forecast).
 */

import type { DragonNode } from "@/lib/feeds/usgs";
import { nodeMarkChip, nodeMarkKind, nodeRoleLine, nodeWhyLine } from "@/lib/nodes/describeNode";

function csvEscape(v: string | number | boolean | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type NodeCsvRow = {
  id: string;
  name: string;
  kind: string;
  mark_kind: string;
  mark_chip: string;
  role: string;
  why_marked: string;
  published_focus: string;
  watch_priority: string;
  lat: string;
  lon: string;
  lat_min: string;
  lon_min: string;
  lat_max: string;
  lon_max: string;
  aviation_code: string;
  monitor_url: string;
  gvp_url: string;
  agency_url: string;
  aliases: string;
};

export function nodeToCsvRow(node: DragonNode): NodeCsvRow {
  const [[latMin, lonMin], [latMax, lonMax]] = node.bounds;
  const clat = node.center?.[0] ?? (latMin + latMax) / 2;
  const clon =
    node.center?.[1] ?? (lonMin <= lonMax ? (lonMin + lonMax) / 2 : -175);
  return {
    id: node.id,
    name: node.name,
    kind: node.kind ?? "seismic",
    mark_kind: nodeMarkKind(node),
    mark_chip: nodeMarkChip(node),
    role: nodeRoleLine(node),
    why_marked: nodeWhyLine(node),
    published_focus: node.publishedFocus ? "yes" : "no",
    watch_priority: node.watchPriority ? "yes" : "no",
    lat: clat.toFixed(4),
    lon: clon.toFixed(4),
    lat_min: String(latMin),
    lon_min: String(lonMin),
    lat_max: String(latMax),
    lon_max: String(lonMax),
    aviation_code: node.aviationCode ?? "",
    monitor_url: node.monitorUrl ?? "",
    gvp_url: node.gvpUrl ?? "",
    agency_url: node.agencyUrl ?? "",
    aliases: (node.aliases ?? []).join("|"),
  };
}

const HEADERS: (keyof NodeCsvRow)[] = [
  "id",
  "name",
  "kind",
  "mark_kind",
  "mark_chip",
  "role",
  "why_marked",
  "published_focus",
  "watch_priority",
  "lat",
  "lon",
  "lat_min",
  "lon_min",
  "lat_max",
  "lon_max",
  "aviation_code",
  "monitor_url",
  "gvp_url",
  "agency_url",
  "aliases",
];

export function nodesToCsv(nodes: DragonNode[]): string {
  const lines = [HEADERS.join(",")];
  for (const n of nodes) {
    const row = nodeToCsvRow(n);
    lines.push(HEADERS.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

/** Trigger browser download of node metadata CSV. */
export function downloadNodesCsv(nodes: DragonNode[], filename?: string): void {
  const csv = nodesToCsv(nodes);
  const stamp = new Date().toISOString().slice(0, 10);
  const name = filename ?? `sun-earth-sentinel-nodes-${stamp}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Compact hover HTML for Leaflet tooltips. */
export function nodeHoverTooltipHtml(node: DragonNode, status?: string): string {
  const chip = nodeMarkChip(node);
  const role = nodeRoleLine(node);
  const st = status ? ` · ${status}` : "";
  return `<div class="ww-hover-tip">
    <div class="ww-hover-tip__title">${node.name}</div>
    <div class="ww-hover-tip__chip">${chip}${st}</div>
    <div class="ww-hover-tip__role">${role}</div>
    <div class="ww-hover-tip__hint">Click for full detail · Focus zone</div>
  </div>`;
}

export function eqHoverTooltipHtml(opts: {
  mag: number;
  place: string;
  depth: number;
  timeLabel?: string;
}): string {
  return `<div class="ww-hover-tip">
    <div class="ww-hover-tip__title">M${opts.mag.toFixed(1)} · ${opts.place}</div>
    <div class="ww-hover-tip__role">${opts.depth.toFixed(0)} km depth${
      opts.timeLabel ? ` · ${opts.timeLabel}` : ""
    }</div>
    <div class="ww-hover-tip__hint">Click for assessment links</div>
  </div>`;
}
