/**
 * Map performance notes + copyable snippets used in About.
 */

export const WEBGL_INSTANCING_SNIPPET = `// WebGL instancing for heat blobs
// Base mesh: 1 unit quad (6 verts). Per instance: center, size, mag-t.
// Prefer WebGL2 drawArraysInstanced; else ANGLE_instanced_arrays; else gl.POINTS.

// Per-instance buffer layout (stride 4 floats):
// [x_px, y_px, size_px, t] * N   // t = (mag-3)/4 clamped

attribute vec2  a_corner; // divisor 0 — unit quad
attribute vec2  a_pos;    // divisor 1
attribute float a_size;   // divisor 1
attribute float a_t;      // divisor 1

// WebGL2:
vertexAttribDivisor(locPos, 1);
drawArraysInstanced(TRIANGLES, 0, 6, instanceCount);

// WebGL1:
const ext = gl.getExtension('ANGLE_instanced_arrays');
ext.vertexAttribDivisorANGLE(locPos, 1);
ext.drawArraysInstancedANGLE(TRIANGLES, 0, 6, instanceCount);

// Why quads > gl.POINTS when available?
// - No ALIASED_POINT_SIZE_RANGE clamp (mobile often caps ~64–256px)
// - Same soft disc in fragment via v_local (no gl_PointCoord)
// Cap N≈800 strongest mags; rAF-coalesce; one DYNAMIC_DRAW upload/frame
`;

export const WEBGPU_FUTURE_SNIPPET = `// WebGPU — investigate for future maps (not shipping in Sentinel yet)
// Why later: Leaflet tiles/SVG/canvas path still DOM-centric; WebGPU wins when
// you own the full frame (custom globe, dense particle fields, compute).

async function probeWebGPU() {
  if (!navigator.gpu) return null;
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  // Heat path sketch: storage buffer of {lat,lon,mag} → compute pass projects
  // to screen → render pass instanced quads (same math as WebGL2).
  // Keep Leaflet for basemap tiles until a full custom basemap exists.
  return { adapter, device };
}

// Recommended timeline for WolfWatch:
// 1) Keep Leaflet 1.9.x + WebGL2 heat (now)
// 2) Optional WebGPU heat behind feature detect (Full mode)
// 3) Only then consider WebGPU basemap / 3D earth replacement
`;

export const LEAFLET_VERSION_SNIPPET = `// Stack (shipping)
// leaflet@1.9.4  (package.json: "^1.9.4", resolved 1.9.4)
// three@0.185.x  (Full-mode globe only, lazy)

import L from 'leaflet'; // 1.9.4

const map = L.map(el, {
  preferCanvas: true,       // 1.x: paths use Canvas when true
  fadeAnimation: false,
  markerZoomAnimation: false,
});

// 1.9.x Canvas renderer for dense circleMarkers
const canvasRenderer = L.canvas({ padding: 0.5 });

L.tileLayer(url, {
  updateWhenIdle: true,     // stable since 1.0+
  updateWhenZooming: false,
  keepBuffer: 2,
}).addTo(map);

L.circleMarker(ll, { renderer: canvasRenderer, radius: 6 });

// Note: Leaflet 2.x is still evolving; stay on 1.9.4 for Vercel SSR +
// plugin ecosystem (no Mapbox token required for our free basemaps).
`;

export const PERF_TIPS = [
  {
    id: "instancing",
    title: "WebGL instancing techniques",
    body: "Unit-quad + per-instance center/size/mag via WebGL2 or ANGLE_instanced_arrays; POINTS fallback; 800-cap; rAF upload.",
    snippet: WEBGL_INSTANCING_SNIPPET,
  },
  {
    id: "webgpu",
    title: "WebGPU for future maps",
    body: "Probe-only today. Keep Leaflet basemap; optional WebGPU heat/compute later in Full mode — not a full basemap rewrite yet.",
    snippet: WEBGPU_FUTURE_SNIPPET,
  },
  {
    id: "leaflet",
    title: "Leaflet version details",
    body: "Shipping leaflet@1.9.4 with preferCanvas, L.canvas renderer, idle tiles. Stay on 1.9.x for ecosystem stability.",
    snippet: LEAFLET_VERSION_SNIPPET,
  },
] as const;
