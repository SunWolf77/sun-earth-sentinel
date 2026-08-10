import L from "leaflet";
import type { EqFeature } from "@/lib/feeds/usgs";
import { heatWeight, halfLifeForWindow } from "@/lib/feeds/usgs";

export type HeatPoint = {
  lat: number;
  lon: number;
  mag: number;
  time: number | null;
  /** Precomputed intensity 0–1 for GPU */
  intensity: number;
};

export type HeatRendererKind =
  | "webgl2-instanced"
  | "webgl-instanced"
  | "webgl-points"
  | "canvas2d"
  | "off";

export type HeatDataOptions = {
  timeDecay?: boolean;
  halfLifeHours?: number;
  now?: number;
};

type HeatLayer = L.Layer & {
  setData: (points: HeatPoint[]) => void;
  setActive: (on: boolean) => void;
  getRenderer: () => HeatRendererKind;
};

const MAX_POINTS = 800;
/** Per-instance: x, y, size, intensity */
const I_STRIDE = 4;

const VERT_INSTANCED = `
precision highp float;
attribute vec2 a_corner;
attribute vec2 a_pos;
attribute float a_size;
attribute float a_t;
uniform vec2 u_res;
varying float v_t;
varying vec2 v_local;
void main() {
  vec2 px = a_pos + a_corner * (a_size * 0.5);
  vec2 clip = (px / u_res) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  v_t = a_t;
  v_local = a_corner;
}
`;

// Intensity t drives both color (fresh/hot) and alpha (time-decay fade)
const FRAG_INSTANCED = `
precision mediump float;
varying float v_t;
varying vec2 v_local;
void main() {
  float soft = max(0.0, 1.0 - dot(v_local, v_local));
  soft *= soft;
  // Fresh / strong → hot red-amber; faded → cool cyan
  vec3 cool = vec3(0.13, 0.83, 0.93);
  vec3 mid  = vec3(0.98, 0.57, 0.24);
  vec3 hot  = vec3(0.96, 0.25, 0.37);
  float t = clamp(v_t, 0.0, 1.0);
  vec3 col = mix(cool, mid, clamp(t * 1.6, 0.0, 1.0));
  col = mix(col, hot, clamp((t - 0.4) * 1.9, 0.0, 1.0));
  float a = soft * (0.08 + t * 0.72);
  gl_FragColor = vec4(col * a, a);
}
`;

const VERT_POINTS = `
precision highp float;
attribute vec2 a_pos;
attribute float a_size;
attribute float a_t;
uniform vec2 u_res;
varying float v_t;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = a_size;
  v_t = a_t;
}
`;

const FRAG_POINTS = `
precision mediump float;
varying float v_t;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float soft = max(0.0, 1.0 - dot(c, c));
  soft *= soft;
  vec3 cool = vec3(0.13, 0.83, 0.93);
  vec3 mid  = vec3(0.98, 0.57, 0.24);
  vec3 hot  = vec3(0.96, 0.25, 0.37);
  float t = clamp(v_t, 0.0, 1.0);
  vec3 col = mix(cool, mid, clamp(t * 1.6, 0.0, 1.0));
  col = mix(col, hot, clamp((t - 0.4) * 1.9, 0.0, 1.0));
  float a = soft * (0.08 + t * 0.72);
  gl_FragColor = vec4(col * a, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(info || "shader compile failed");
  }
  return s;
}

function link(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(info || "program link failed");
  }
  return p;
}

export function createQuakeHeatLayer(): HeatLayer {
  let canvas: HTMLCanvasElement | null = null;
  let map: L.Map | null = null;
  let points: HeatPoint[] = [];
  let active = true;
  let renderer: HeatRendererKind = "off";
  let raf = 0;
  let dirty = false;

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let gl2: WebGL2RenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let instanced = false;
  let angleExt: ANGLE_instanced_arrays | null = null;

  let bufCorner: WebGLBuffer | null = null;
  let bufInstance: WebGLBuffer | null = null;
  let locCorner = -1;
  let locPos = -1;
  let locSize = -1;
  let locT = -1;
  let locRes: WebGLUniformLocation | null = null;

  let cpu = new Float32Array(MAX_POINTS * I_STRIDE);
  let acc: HTMLCanvasElement | null = null;
  let lastKey = "";

  function schedule() {
    if (raf) return;
    dirty = true;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (dirty) {
        dirty = false;
        redraw();
      }
    });
  }

  function setupCommon(g: WebGLRenderingContext) {
    g.enable(g.BLEND);
    g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    g.disable(g.DEPTH_TEST);
    g.disable(g.DITHER);
    g.clearColor(0, 0, 0, 0);
  }

  function initInstanced(g: WebGLRenderingContext, is2: boolean): boolean {
    try {
      const vs = compile(g, g.VERTEX_SHADER, VERT_INSTANCED);
      const fs = compile(g, g.FRAGMENT_SHADER, FRAG_INSTANCED);
      program = link(g, vs, fs);
      g.deleteShader(vs);
      g.deleteShader(fs);
      locCorner = g.getAttribLocation(program, "a_corner");
      locPos = g.getAttribLocation(program, "a_pos");
      locSize = g.getAttribLocation(program, "a_size");
      locT = g.getAttribLocation(program, "a_t");
      locRes = g.getUniformLocation(program, "u_res");
      const corners = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
      bufCorner = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, bufCorner);
      g.bufferData(g.ARRAY_BUFFER, corners, g.STATIC_DRAW);
      bufInstance = g.createBuffer();
      if (!is2) {
        angleExt = g.getExtension("ANGLE_instanced_arrays");
        if (!angleExt) return false;
      }
      setupCommon(g);
      instanced = true;
      return true;
    } catch {
      program = null;
      return false;
    }
  }

  function initPoints(g: WebGLRenderingContext): boolean {
    try {
      const vs = compile(g, g.VERTEX_SHADER, VERT_POINTS);
      const fs = compile(g, g.FRAGMENT_SHADER, FRAG_POINTS);
      program = link(g, vs, fs);
      g.deleteShader(vs);
      g.deleteShader(fs);
      locPos = g.getAttribLocation(program, "a_pos");
      locSize = g.getAttribLocation(program, "a_size");
      locT = g.getAttribLocation(program, "a_t");
      locRes = g.getUniformLocation(program, "u_res");
      bufInstance = g.createBuffer();
      setupCommon(g);
      instanced = false;
      return true;
    } catch {
      program = null;
      return false;
    }
  }

  function initWebGL(c: HTMLCanvasElement): boolean {
    const opts: WebGLContextAttributes = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
      desynchronized: true,
    };
    const g2 = c.getContext("webgl2", opts) as WebGL2RenderingContext | null;
    if (g2) {
      gl = g2;
      gl2 = g2;
      if (initInstanced(g2, true)) {
        renderer = "webgl2-instanced";
        return true;
      }
    }
    const g1 =
      c.getContext("webgl", opts) ||
      (c.getContext("experimental-webgl", opts) as WebGLRenderingContext | null);
    if (!g1) return false;
    gl = g1;
    gl2 = null;
    if (initInstanced(g1, false)) {
      renderer = "webgl-instanced";
      return true;
    }
    if (program) g1.deleteProgram(program);
    program = null;
    if (initPoints(g1)) {
      renderer = "webgl-points";
      return true;
    }
    return false;
  }

  function fillInstances(dpr: number, zoom: number): number {
    if (!map) return 0;
    const baseR = Math.max(16, Math.min(72, 80 - zoom * 3.2)) * dpr;
    const bounds = map.getBounds().pad(0.12);
    let n = 0;
    for (const p of points) {
      if (n >= MAX_POINTS) break;
      if (!bounds.contains([p.lat, p.lon])) continue;
      const pt = map.latLngToContainerPoint([p.lat, p.lon]);
      const i = n * I_STRIDE;
      const intensity = p.intensity;
      cpu[i] = pt.x * dpr;
      cpu[i + 1] = pt.y * dpr;
      // Size grows with intensity (fresh + strong)
      cpu[i + 2] = baseR * (0.45 + intensity * 0.95);
      cpu[i + 3] = intensity;
      n++;
    }
    return n;
  }

  function redrawWebGL(size: L.Point, dpr: number, zoom: number) {
    if (!gl || !program || !map || !canvas || !bufInstance) return;
    const w = Math.floor(size.x * dpr);
    const h = Math.floor(size.y * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      gl.viewport(0, 0, w, h);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    const n = fillInstances(dpr, zoom);
    if (!n) return;

    gl.useProgram(program);
    gl.uniform2f(locRes, w, h);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufInstance);
    gl.bufferData(gl.ARRAY_BUFFER, cpu.subarray(0, n * I_STRIDE), gl.DYNAMIC_DRAW);

    if (instanced && bufCorner) {
      gl.bindBuffer(gl.ARRAY_BUFFER, bufCorner);
      gl.enableVertexAttribArray(locCorner);
      gl.vertexAttribPointer(locCorner, 2, gl.FLOAT, false, 0, 0);
      if (gl2) gl2.vertexAttribDivisor(locCorner, 0);
      else angleExt!.vertexAttribDivisorANGLE(locCorner, 0);

      const bytes = I_STRIDE * 4;
      gl.bindBuffer(gl.ARRAY_BUFFER, bufInstance);
      gl.enableVertexAttribArray(locPos);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, bytes, 0);
      gl.enableVertexAttribArray(locSize);
      gl.vertexAttribPointer(locSize, 1, gl.FLOAT, false, bytes, 8);
      gl.enableVertexAttribArray(locT);
      gl.vertexAttribPointer(locT, 1, gl.FLOAT, false, bytes, 12);

      if (gl2) {
        gl2.vertexAttribDivisor(locPos, 1);
        gl2.vertexAttribDivisor(locSize, 1);
        gl2.vertexAttribDivisor(locT, 1);
        gl2.drawArraysInstanced(gl2.TRIANGLES, 0, 6, n);
      } else if (angleExt) {
        angleExt.vertexAttribDivisorANGLE(locPos, 1);
        angleExt.vertexAttribDivisorANGLE(locSize, 1);
        angleExt.vertexAttribDivisorANGLE(locT, 1);
        angleExt.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, n);
      }
    } else {
      const bytes = I_STRIDE * 4;
      gl.enableVertexAttribArray(locPos);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, bytes, 0);
      gl.enableVertexAttribArray(locSize);
      gl.vertexAttribPointer(locSize, 1, gl.FLOAT, false, bytes, 8);
      gl.enableVertexAttribArray(locT);
      gl.vertexAttribPointer(locT, 1, gl.FLOAT, false, bytes, 12);
      gl.drawArrays(gl.POINTS, 0, n);
    }
  }

  function redrawCanvas2D(size: L.Point, dpr: number, zoom: number) {
    if (!canvas || !map) return;
    const w = Math.floor(size.x * dpr);
    const h = Math.floor(size.y * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);
    if (!points.length) return;

    if (!acc) acc = document.createElement("canvas");
    if (acc.width !== w || acc.height !== h) {
      acc.width = w;
      acc.height = h;
    }
    const actx = acc.getContext("2d");
    if (!actx) return;
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    actx.clearRect(0, 0, size.x, size.y);

    const baseR = Math.max(14, Math.min(52, 72 - zoom * 3.5));
    const bounds = map.getBounds().pad(0.15);
    let n = 0;
    for (const p of points) {
      if (n >= MAX_POINTS) break;
      if (!bounds.contains([p.lat, p.lon])) continue;
      const pt = map.latLngToContainerPoint([p.lat, p.lon]);
      const t = p.intensity;
      const r = baseR * (0.5 + t * 0.9);
      const alpha = Math.min(0.7, 0.08 + t * 0.55);
      const g = actx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      g.addColorStop(0, `rgba(244, 63, 94, ${alpha})`);
      g.addColorStop(0.4, `rgba(251, 146, 60, ${alpha * 0.5})`);
      g.addColorStop(0.75, `rgba(34, 211, 238, ${alpha * 0.15})`);
      g.addColorStop(1, "rgba(34, 211, 238, 0)");
      actx.fillStyle = g;
      actx.beginPath();
      actx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      actx.fill();
      n++;
    }
    ctx.globalAlpha = 0.9;
    ctx.drawImage(acc, 0, 0, size.x, size.y);
    ctx.globalAlpha = 1;
  }

  function redraw() {
    if (!map || !canvas || !active) {
      if (canvas && renderer === "canvas2d") {
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      } else if (gl) {
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      return;
    }
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);
    const size = map.getSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const zoom = map.getZoom();
    const c = map.getCenter();
    const key = `${Math.round(c.lat * 1e3)}_${Math.round(c.lng * 1e3)}_${zoom}_${size.x}_${points.length}`;
    if (key === lastKey && !dirty) return;
    lastKey = key;
    if (renderer !== "canvas2d" && gl) redrawWebGL(size, dpr, zoom);
    else redrawCanvas2D(size, dpr, zoom);
  }

  const layer = new L.Layer() as HeatLayer;

  layer.onAdd = function onAdd(m: L.Map) {
    map = m;
    canvas = L.DomUtil.create(
      "canvas",
      "ww-heat-canvas leaflet-zoom-animated",
    ) as HTMLCanvasElement;
    canvas.style.pointerEvents = "none";
    const pane = m.getPane("overlayPane") ?? m.getContainer();
    pane.appendChild(canvas);
    if (!initWebGL(canvas)) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = L.DomUtil.create(
        "canvas",
        "ww-heat-canvas leaflet-zoom-animated",
      ) as HTMLCanvasElement;
      canvas.style.pointerEvents = "none";
      pane.appendChild(canvas);
      renderer = "canvas2d";
      gl = null;
      gl2 = null;
    }
    m.on("moveend zoomend resize viewreset", schedule);
    schedule();
    return this;
  };

  layer.onRemove = function onRemove(m: L.Map) {
    m.off("moveend zoomend resize viewreset", schedule);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (gl && program) {
      gl.deleteProgram(program);
      if (bufCorner) gl.deleteBuffer(bufCorner);
      if (bufInstance) gl.deleteBuffer(bufInstance);
    }
    gl = null;
    gl2 = null;
    program = null;
    angleExt = null;
    bufCorner = null;
    bufInstance = null;
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    acc = null;
    map = null;
    renderer = "off";
    lastKey = "";
    return this;
  };

  layer.setData = (pts: HeatPoint[]) => {
    // Prefer higher intensity when capping
    points =
      pts.length > MAX_POINTS
        ? [...pts].sort((a, b) => b.intensity - a.intensity).slice(0, MAX_POINTS)
        : pts;
    lastKey = "";
    schedule();
  };

  layer.setActive = (on: boolean) => {
    active = on;
    if (canvas) canvas.style.display = on ? "block" : "none";
    lastKey = "";
    if (on) schedule();
    else if (gl) gl.clear(gl.COLOR_BUFFER_BIT);
    else if (canvas) {
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  layer.getRenderer = () => renderer;
  return layer;
}

/** Build heat points with magnitude × optional exponential time-decay. */
export function featuresToHeatPoints(
  features: EqFeature[],
  opts: HeatDataOptions = {},
): HeatPoint[] {
  const timeDecay = opts.timeDecay !== false;
  const halfLifeHours = opts.halfLifeHours ?? halfLifeForWindow("day");
  const now = opts.now ?? Date.now();

  const raw = features
    .filter((f) => (f.properties.mag ?? 0) > 0)
    .map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const mag = f.properties.mag ?? 3;
      const time = f.properties.time ?? null;
      const w = heatWeight(mag, time, { timeDecay, halfLifeHours, now });
      // Pacific display frame (0…360) — keep RoF continuous on heat canvas
      const displayLon = lon < 0 ? lon + 360 : lon;
      return { lat, lon: displayLon, mag, time, weight: w };
    });

  // Normalize weights → intensity 0–1 for GPU
  let maxW = 0;
  for (const p of raw) if (p.weight > maxW) maxW = p.weight;
  const denom = maxW > 0 ? maxW : 1;

  return raw.map((p) => ({
    lat: p.lat,
    lon: p.lon,
    mag: p.mag,
    time: p.time,
    intensity: Math.max(0.05, Math.min(1, p.weight / denom)),
  }));
}
