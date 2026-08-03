/**
 * WebGL draw-call strategy + checklist + WebGPU migration notes
 * for the 3D globe (Three.js). Surfaced in the perf HUD.
 */

export type ChecklistItem = {
  id: string;
  label: string;
  status: "done" | "partial" | "planned";
  detail: string;
};

/** Live status of globe optimizations (keep in sync with Globe3D). */
export const WEBGL_CHECKLIST: ChecklistItem[] = [
  {
    id: "fps-cap",
    label: "FPS cap by quality",
    status: "done",
    detail: "Mobile 30 / desktop 60 via rAF throttle",
  },
  {
    id: "pixel-ratio",
    label: "Pixel-ratio cap",
    status: "done",
    detail: "Mobile ≤1.25 · desktop ≤2",
  },
  {
    id: "idle-skip",
    label: "Idle frame skip",
    status: "done",
    detail: "No GPU submit when spin/anim off",
  },
  {
    id: "geo-pool",
    label: "Shared pin geometries",
    status: "done",
    detail: "Unit stem/foot/head/hit scaled per pin — not new GPU buffers each EQ",
  },
  {
    id: "mat-pool",
    label: "Material cache by color",
    status: "done",
    detail: "Non-neon MeshBasicMaterial reused; fewer program binds",
  },
  {
    id: "marker-cap",
    label: "Marker budget",
    status: "done",
    detail: "maxMarkers · maxRings · cluster before draw",
  },
  {
    id: "instancing",
    label: "InstancedMesh for dense pins",
    status: "partial",
    detail: "Clusters + shared geos first; full instance path when spiderfy off",
  },
  {
    id: "merge-static",
    label: "Merge static earth/atmo",
    status: "done",
    detail: "Single earth + atmo mesh (not per-frame rebuild)",
  },
  {
    id: "context-loss",
    label: "Context-loss fallback",
    status: "done",
    detail: "webglcontextlost → 2D map",
  },
  {
    id: "webgpu",
    label: "WebGPU path",
    status: "planned",
    detail: "Probe only — Three WebGPURenderer when stable + no Leaflet dual-path",
  },
];

export const WEBGPU_MIGRATION = {
  title: "WebGPU migration path",
  steps: [
    "Keep Three.js WebGLRenderer as default (shipping).",
    "Feature-detect navigator.gpu; never require WebGPU for Map.",
    "Phase 1: optional WebGPURenderer behind Full + flag for globe only.",
    "Phase 2: compute path for dense heat / particle EQ field (if needed).",
    "Do not replace Leaflet 2D basemap until a full custom basemap exists.",
    "Exit criteria: equal or better FPS on mid mobile, no context-loss regressions.",
  ],
  probeSnippet: `async function probeWebGPU() {
  if (!navigator.gpu) return { ok: false, reason: "no navigator.gpu" };
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) return { ok: false, reason: "no adapter" };
  const device = await adapter.requestDevice();
  return { ok: true, adapter, device };
}`,
};

export function checklistSummary(items: ChecklistItem[] = WEBGL_CHECKLIST): string {
  const d = items.filter((i) => i.status === "done").length;
  const p = items.filter((i) => i.status === "partial").length;
  const pl = items.filter((i) => i.status === "planned").length;
  return `${d} done · ${p} partial · ${pl} planned`;
}

/** Runtime WebGPU probe (safe, no device held). */
export async function probeWebGpuAvailable(): Promise<{
  available: boolean;
  detail: string;
}> {
  try {
    const nav = navigator as Navigator & {
      gpu?: { requestAdapter: (o?: object) => Promise<unknown> };
    };
    if (!nav.gpu) return { available: false, detail: "navigator.gpu missing" };
    const adapter = await nav.gpu.requestAdapter({ powerPreference: "low-power" });
    if (!adapter) return { available: false, detail: "no adapter" };
    return { available: true, detail: "adapter OK (not used in production path)" };
  } catch (e) {
    return {
      available: false,
      detail: e instanceof Error ? e.message : "probe failed",
    };
  }
}
