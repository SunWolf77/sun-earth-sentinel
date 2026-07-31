/**
 * Runtime GPU capability probe for About diagnostics + future WebGPU path.
 * Safe to call in browser only.
 */

export type GpuCapabilities = {
  webgl: boolean;
  webgl2: boolean;
  /** ANGLE_instanced_arrays (or WebGL2 native) */
  instancing: boolean;
  maxPointSize: number | null;
  webgpu: boolean;
  leafletVersion: string;
  notes: string[];
};

export const LEAFLET_VERSION = "1.9.4";

export function probeGpu(): GpuCapabilities {
  const notes: string[] = [];
  let webgl = false;
  let webgl2 = false;
  let instancing = false;
  let maxPointSize: number | null = null;

  if (typeof document === "undefined") {
    return {
      webgl: false,
      webgl2: false,
      instancing: false,
      maxPointSize: null,
      webgpu: false,
      leafletVersion: LEAFLET_VERSION,
      notes: ["SSR / non-browser"],
    };
  }

  try {
    const c = document.createElement("canvas");
    const gl2 = c.getContext("webgl2") as WebGL2RenderingContext | null;
    if (gl2) {
      webgl2 = true;
      webgl = true;
      instancing = true; // drawArraysInstanced is core in WebGL2
      maxPointSize = gl2.getParameter(gl2.ALIASED_POINT_SIZE_RANGE)?.[1] ?? null;
      notes.push("WebGL2: native instancing (drawArraysInstanced)");
    } else {
      const gl =
        c.getContext("webgl") ||
        (c.getContext("experimental-webgl") as WebGLRenderingContext | null);
      if (gl) {
        webgl = true;
        const ext = gl.getExtension("ANGLE_instanced_arrays");
        instancing = !!ext;
        maxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)?.[1] ?? null;
        notes.push(
          ext
            ? "WebGL1 + ANGLE_instanced_arrays"
            : "WebGL1 points path (no instancing ext)",
        );
      }
    }
  } catch {
    notes.push("WebGL probe failed");
  }

  const webgpu =
    typeof navigator !== "undefined" && "gpu" in navigator && !!(navigator as Navigator & { gpu?: unknown }).gpu;

  if (webgpu) {
    notes.push("WebGPU present — future path only (not used for live map yet)");
  } else {
    notes.push("WebGPU not available in this browser");
  }

  notes.push(
    `Leaflet ${LEAFLET_VERSION}: preferCanvas + L.canvas renderer, idle tiles, WebGL heat overlay`,
  );

  return {
    webgl,
    webgl2,
    instancing,
    maxPointSize,
    webgpu,
    leafletVersion: LEAFLET_VERSION,
    notes,
  };
}
