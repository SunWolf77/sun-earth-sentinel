import { i as __toESM } from "../_runtime.mjs";
import { N as require_react, h as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { A as heatWeight, D as getFocusNode, E as getAllFocusNodes, F as mobileLeanOverlays, N as magColor, O as halfLifeForWindow, P as mmiContourColor, R as nodeStatus, S as eventPageUrl, T as formatMmi, U as shakeMapEventUrl, W as useObservatory, b as depthColor, c as OVERLAY_META, g as boundsToLeafletRects, i as DEPTH_LEGEND, k as hasShakeMapProduct, r as BASEMAP_STYLES, w as filteredEq, x as eqDepthKm, z as pointInBounds } from "./observatory-DWEcu3Hj.mjs";
import { A as Layers2, B as Earth, D as List, G as ChevronDown, I as Flame, P as Funnel, U as ChevronUp, X as Activity, a as Waves, d as Sparkles, j as Info, k as Layers, l as Square, n as X, s as Timer, t as Zap, v as Radar, w as Mountain, z as ExternalLink } from "../_libs/lucide-react.mjs";
import { a as NodeFocusBanner, f as relativeVelocity, l as decaySwatch, m as useIsMobile, p as timeDecayLegendRows, s as attachMapTouchGestures, u as halfLifeLabel } from "./reference-DIt7NWTn.mjs";
import { t as require_leaflet_src } from "../_libs/leaflet.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/LiveMap-HlkQvq5y.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_leaflet_src = /* @__PURE__ */ __toESM(require_leaflet_src());
var MAX_POINTS = 800;
/** Per-instance: x, y, size, intensity */
var I_STRIDE = 4;
var VERT_INSTANCED = `
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
var FRAG_INSTANCED = `
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
var VERT_POINTS = `
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
var FRAG_POINTS = `
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
function compile(gl, type, src) {
	const s = gl.createShader(type);
	gl.shaderSource(s, src);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(s);
		gl.deleteShader(s);
		throw new Error(info || "shader compile failed");
	}
	return s;
}
function link(gl, vs, fs) {
	const p = gl.createProgram();
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
function createQuakeHeatLayer() {
	let canvas = null;
	let map = null;
	let points = [];
	let active = true;
	let renderer = "off";
	let raf = 0;
	let dirty = false;
	let gl = null;
	let gl2 = null;
	let program = null;
	let instanced = false;
	let angleExt = null;
	let bufCorner = null;
	let bufInstance = null;
	let locCorner = -1;
	let locPos = -1;
	let locSize = -1;
	let locT = -1;
	let locRes = null;
	let cpu = new Float32Array(MAX_POINTS * I_STRIDE);
	let acc = null;
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
	function setupCommon(g) {
		g.enable(g.BLEND);
		g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
		g.disable(g.DEPTH_TEST);
		g.disable(g.DITHER);
		g.clearColor(0, 0, 0, 0);
	}
	function initInstanced(g, is2) {
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
			const corners = new Float32Array([
				-1,
				-1,
				1,
				-1,
				-1,
				1,
				-1,
				1,
				1,
				-1,
				1,
				1
			]);
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
	function initPoints(g) {
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
	function initWebGL(c) {
		const opts = {
			alpha: true,
			premultipliedAlpha: true,
			antialias: false,
			depth: false,
			stencil: false,
			preserveDrawingBuffer: false,
			powerPreference: "high-performance",
			desynchronized: true
		};
		const g2 = c.getContext("webgl2", opts);
		if (g2) {
			gl = g2;
			gl2 = g2;
			if (initInstanced(g2, true)) {
				renderer = "webgl2-instanced";
				return true;
			}
		}
		const g1 = c.getContext("webgl", opts) || c.getContext("experimental-webgl", opts);
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
	function fillInstances(dpr, zoom) {
		if (!map) return 0;
		const baseR = Math.max(16, Math.min(72, 80 - zoom * 3.2)) * dpr;
		const bounds = map.getBounds().pad(.12);
		let n = 0;
		for (const p of points) {
			if (n >= MAX_POINTS) break;
			if (!bounds.contains([p.lat, p.lon])) continue;
			const pt = map.latLngToContainerPoint([p.lat, p.lon]);
			const i = n * I_STRIDE;
			const intensity = p.intensity;
			cpu[i] = pt.x * dpr;
			cpu[i + 1] = pt.y * dpr;
			cpu[i + 2] = baseR * (.45 + intensity * .95);
			cpu[i + 3] = intensity;
			n++;
		}
		return n;
	}
	function redrawWebGL(size, dpr, zoom) {
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
			else angleExt.vertexAttribDivisorANGLE(locCorner, 0);
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
	function redrawCanvas2D(size, dpr, zoom) {
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
		const bounds = map.getBounds().pad(.15);
		let n = 0;
		for (const p of points) {
			if (n >= MAX_POINTS) break;
			if (!bounds.contains([p.lat, p.lon])) continue;
			const pt = map.latLngToContainerPoint([p.lat, p.lon]);
			const t = p.intensity;
			const r = baseR * (.5 + t * .9);
			const alpha = Math.min(.7, .08 + t * .55);
			const g = actx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
			g.addColorStop(0, `rgba(244, 63, 94, ${alpha})`);
			g.addColorStop(.4, `rgba(251, 146, 60, ${alpha * .5})`);
			g.addColorStop(.75, `rgba(34, 211, 238, ${alpha * .15})`);
			g.addColorStop(1, "rgba(34, 211, 238, 0)");
			actx.fillStyle = g;
			actx.beginPath();
			actx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
			actx.fill();
			n++;
		}
		ctx.globalAlpha = .9;
		ctx.drawImage(acc, 0, 0, size.x, size.y);
		ctx.globalAlpha = 1;
	}
	function redraw() {
		if (!map || !canvas || !active) {
			if (canvas && renderer === "canvas2d") canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
			else if (gl) gl.clear(gl.COLOR_BUFFER_BIT);
			return;
		}
		const topLeft = map.containerPointToLayerPoint([0, 0]);
		import_leaflet_src.default.DomUtil.setPosition(canvas, topLeft);
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
	const layer = new import_leaflet_src.default.Layer();
	layer.onAdd = function onAdd(m) {
		map = m;
		canvas = import_leaflet_src.default.DomUtil.create("canvas", "ww-heat-canvas leaflet-zoom-animated");
		canvas.style.pointerEvents = "none";
		const pane = m.getPane("overlayPane") ?? m.getContainer();
		pane.appendChild(canvas);
		if (!initWebGL(canvas)) {
			if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
			canvas = import_leaflet_src.default.DomUtil.create("canvas", "ww-heat-canvas leaflet-zoom-animated");
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
	layer.onRemove = function onRemove(m) {
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
	layer.setData = (pts) => {
		points = pts.length > MAX_POINTS ? [...pts].sort((a, b) => b.intensity - a.intensity).slice(0, MAX_POINTS) : pts;
		lastKey = "";
		schedule();
	};
	layer.setActive = (on) => {
		active = on;
		if (canvas) canvas.style.display = on ? "block" : "none";
		lastKey = "";
		if (on) schedule();
		else if (gl) gl.clear(gl.COLOR_BUFFER_BIT);
		else if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
	};
	layer.getRenderer = () => renderer;
	return layer;
}
/** Build heat points with magnitude × optional exponential time-decay. */
function featuresToHeatPoints(features, opts = {}) {
	const timeDecay = opts.timeDecay !== false;
	const halfLifeHours = opts.halfLifeHours ?? halfLifeForWindow("day");
	const now = opts.now ?? Date.now();
	const raw = features.filter((f) => (f.properties.mag ?? 0) > 0).map((f) => {
		const [lon, lat] = f.geometry.coordinates;
		const mag = f.properties.mag ?? 3;
		const time = f.properties.time ?? null;
		return {
			lat,
			lon,
			mag,
			time,
			weight: heatWeight(mag, time, {
				timeDecay,
				halfLifeHours,
				now
			})
		};
	});
	let maxW = 0;
	for (const p of raw) if (p.weight > maxW) maxW = p.weight;
	const denom = maxW > 0 ? maxW : 1;
	return raw.map((p) => ({
		lat: p.lat,
		lon: p.lon,
		mag: p.mag,
		time: p.time,
		intensity: Math.max(.05, Math.min(1, p.weight / denom))
	}));
}
/**
* Leaflet GeoJSON layer for USGS cont_mmi.json (MultiLineString contours).
* Official product only — no local interpolation.
*/
function createMmiContourLayer() {
	const layer = import_leaflet_src.default.geoJSON(void 0, {
		style: (feature) => {
			const v = Number(feature?.properties?.value ?? 0);
			return {
				color: feature?.properties?.color || mmiContourColor(v),
				weight: Number(feature?.properties?.weight ?? 0) || Math.max(2, Math.min(5, 1.5 + v * .45)),
				opacity: .88,
				fillOpacity: 0,
				lineCap: "round",
				lineJoin: "round",
				interactive: true
			};
		},
		onEachFeature: (feature, lyr) => {
			const v = feature.properties?.value;
			if (v != null) lyr.bindTooltip(`MMI ${Number(v).toFixed(1)}`, {
				sticky: true,
				direction: "top",
				className: "ww-mmi-tip"
			});
		}
	});
	layer.setContours = function setContours(g) {
		this.clearLayers();
		if (g?.features?.length) this.addData(g);
	};
	return layer;
}
/**
* Plate boundary loading + motion-arrow sampling (PB2002 + Euler poles).
*/
var BOUNDARY_COLORS = {
	convergent: "#f43f5e",
	divergent: "#38bdf8",
	transform: "#a3e635",
	unknown: "#94a3b8"
};
var BOUNDARY_LABELS = {
	convergent: "Convergent",
	divergent: "Divergent",
	transform: "Transform",
	unknown: "Boundary"
};
var cache = null;
var cachePromise = null;
async function loadPlateBoundaries(signal) {
	if (cache) return cache;
	if (cachePromise) return cachePromise;
	cachePromise = (async () => {
		const urls = ["/data/pb2002_boundaries.json", "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json"];
		let lastErr;
		for (const url of urls) try {
			const res = await fetch(url, {
				signal,
				cache: "force-cache"
			});
			if (!res.ok) throw new Error(`${url} ${res.status}`);
			const data = await res.json();
			if (!data.features?.length) throw new Error("empty plate data");
			cache = data;
			return data;
		} catch (e) {
			lastErr = e;
		}
		throw lastErr instanceof Error ? lastErr : /* @__PURE__ */ new Error("Plate boundaries failed to load");
	})();
	try {
		return await cachePromise;
	} finally {
		cachePromise = null;
	}
}
function lineStringsOf(geom) {
	if (geom.type === "LineString") return [geom.coordinates];
	return geom.coordinates;
}
function parsePlates(name, a, b) {
	if (a && b) return [a, b];
	if (!name) return ["", ""];
	const m = name.match(/^([A-Z]{2})[-/\\]([A-Z]{2})/i);
	if (m) return [m[1].toUpperCase(), m[2].toUpperCase()];
	return ["", ""];
}
function segmentTangent(lon1, lat1, lon2, lat2) {
	const dLat = lat2 - lat1;
	const dLon = lon2 - lon1;
	const n = dLat;
	const e = dLon * Math.cos((lat1 + lat2) / 2 * (Math.PI / 180));
	const len = Math.hypot(e, n) || 1;
	let bearing = Math.atan2(e, n) * 180 / Math.PI;
	if (bearing < 0) bearing += 360;
	return {
		e: e / len,
		n: n / len,
		bearing
	};
}
function kindForBoundary(props, rel, te, tn) {
	const type = (props.Type || "").toLowerCase();
	if (type.includes("subduction") || type.includes("trench")) return "convergent";
	if (type.includes("ridge") || type.includes("spreading")) return "divergent";
	if (type.includes("transform")) return "transform";
	if (!rel || rel.speed < 2) return "unknown";
	const vPar = Math.abs(rel.ve * te + rel.vn * tn);
	const vNor = Math.abs(rel.ve * -tn + rel.vn * te);
	const name = props.Name || "";
	if (/PA-NA|NA-PA|PA-CO|CO-NA|PA-NZ|NZ-SA|SA-NZ|PA-AU|AU-PA|PH|PS-EU|EU-PS/i.test(name) && type) {}
	if (vPar > vNor * 1.25) return "transform";
	if (vNor >= vPar) {
		const [pa, pb] = parsePlates(props.Name, props.PlateA, props.PlateB);
		const pair = `${pa}-${pb}`;
		const convergentPairs = /PA-NA|NA-PA|PA-CO|CO-PA|NZ-SA|SA-NZ|PA-AU|AU-PA|PA-PS|PS-PA|EU-IN|IN-EU|AR-EU|EU-AR|AU-EU|SU-|TO-|NH-|JF-/;
		if (convergentPairs.test(pair) || convergentPairs.test(name)) return "convergent";
		if (/AF-AN|AN-AF|AF-SA|SA-AF|NA-EU|EU-NA|AU-AN|AN-AU|AN-PA|PA-AN|SO-AN|AN-SO/.test(pair)) return "divergent";
		return vNor > 15 ? "convergent" : "divergent";
	}
	return "transform";
}
/**
* Sample motion arrows along boundaries.
* stepVertices: take every Nth segment midpoint.
*/
function sampleMotionArrows(data, opts = {}) {
	const step = opts.step ?? 4;
	const minSpeed = opts.minSpeed ?? 4;
	const arrows = [];
	for (const f of data.features) {
		const props = f.properties || {};
		const [plateA, plateB] = parsePlates(props.Name, props.PlateA, props.PlateB);
		const lines = lineStringsOf(f.geometry);
		for (const line of lines) {
			if (line.length < 2) continue;
			for (let i = 0; i < line.length - 1; i += step) {
				const a = line[i];
				const b = line[Math.min(i + 1, line.length - 1)];
				const lon1 = a[0], lat1 = a[1];
				const lon2 = b[0], lat2 = b[1];
				if (Math.abs(lon2 - lon1) > 90) continue;
				const lat = (lat1 + lat2) / 2;
				const lon = (lon1 + lon2) / 2;
				const tan = segmentTangent(lon1, lat1, lon2, lat2);
				const rel = plateA && plateB ? relativeVelocity(plateA, plateB, lat, lon) : null;
				if (!rel || rel.speed < minSpeed) continue;
				const kind = kindForBoundary(props, rel, tan.e, tan.n);
				arrows.push({
					lat,
					lon,
					bearing: rel.bearing,
					speed: rel.speed,
					plateA: plateA || "?",
					plateB: plateB || "?",
					kind,
					name: props.Name || `${plateA}-${plateB}`,
					tangentBearing: tan.bearing
				});
			}
		}
	}
	return arrows;
}
/** Style a boundary feature from props + first-segment kinematics. */
function boundaryKind(feature) {
	const props = feature.properties || {};
	if ((props.Type || "").toLowerCase().includes("subduction")) return "convergent";
	const line = lineStringsOf(feature.geometry)[0];
	if (!line || line.length < 2) return "unknown";
	const a = line[0];
	const b = line[Math.min(3, line.length - 1)];
	if (Math.abs(b[0] - a[0]) > 90) return "unknown";
	const lat = (a[1] + b[1]) / 2;
	const lon = (a[0] + b[0]) / 2;
	const [pa, pb] = parsePlates(props.Name, props.PlateA, props.PlateB);
	const rel = pa && pb ? relativeVelocity(pa, pb, lat, lon) : null;
	const tan = segmentTangent(a[0], a[1], b[0], b[1]);
	return kindForBoundary(props, rel, tan.e, tan.n);
}
/**
* PB2002 plate boundaries + MORVEL-style relative-motion arrows.
*/
function createPlateLayer(map) {
	const group = import_leaflet_src.default.layerGroup();
	const lineGroup = import_leaflet_src.default.layerGroup().addTo(group);
	const arrowGroup = import_leaflet_src.default.layerGroup().addTo(group);
	let active = false;
	let loaded = false;
	let loading = null;
	let data = null;
	function clear() {
		lineGroup.clearLayers();
		arrowGroup.clearLayers();
	}
	function arrowIcon(arrow) {
		const color = BOUNDARY_COLORS[arrow.kind];
		const len = Math.max(14, Math.min(28, 10 + arrow.speed * .18));
		const html = `<div class="ww-plate-arrow" style="--a:${arrow.bearing.toFixed(1)}deg;--c:${color};--l:${len}px" title="${arrow.name} ${arrow.speed.toFixed(0)} mm/yr">
      <span class="ww-plate-arrow__shaft"></span>
      <span class="ww-plate-arrow__head"></span>
    </div>`;
		return import_leaflet_src.default.divIcon({
			className: "ww-plate-arrow-wrap",
			html,
			iconSize: [len + 8, len + 8],
			iconAnchor: [(len + 8) / 2, (len + 8) / 2]
		});
	}
	function draw(collection) {
		clear();
		const geo = import_leaflet_src.default.geoJSON(collection, {
			style: (feat) => {
				const kind = boundaryKind(feat);
				return {
					color: BOUNDARY_COLORS[kind],
					weight: kind === "convergent" ? 2.25 : 1.75,
					opacity: .88,
					lineCap: "round",
					lineJoin: "round"
				};
			},
			onEachFeature: (feat, layer) => {
				const p = feat.properties || {};
				const kind = boundaryKind(feat);
				const name = p.Name || "Boundary";
				layer.bindTooltip(`<strong style="color:${BOUNDARY_COLORS[kind]}">${name}</strong>
           · ${BOUNDARY_LABELS[kind]}${p.Type ? ` · ${p.Type}` : ""}
           <br/><span style="opacity:.85">${p.PlateA || "?"} / ${p.PlateB || "?"}</span>`, {
					sticky: true,
					className: "ww-plate-tip"
				});
			}
		});
		lineGroup.addLayer(geo);
		const arrows = sampleMotionArrows(collection, {
			step: 5,
			minSpeed: 5
		});
		const step = Math.max(1, Math.ceil(arrows.length / 280));
		for (let i = 0; i < arrows.length; i += step) {
			const a = arrows[i];
			const m = import_leaflet_src.default.marker([a.lat, a.lon], {
				icon: arrowIcon(a),
				interactive: true,
				keyboard: false
			});
			m.bindTooltip(`<strong>${a.plateA}→${a.plateB}</strong> · ${a.speed.toFixed(0)} mm/yr<br/>
         <span style="color:${BOUNDARY_COLORS[a.kind]}">${BOUNDARY_LABELS[a.kind]}</span>
         · rel. bearing ${a.bearing.toFixed(0)}°`, {
				direction: "top",
				className: "ww-plate-tip",
				opacity: .95
			});
			arrowGroup.addLayer(m);
		}
	}
	async function load() {
		if (loaded && data) {
			draw(data);
			return;
		}
		if (loading) return loading;
		loading = (async () => {
			data = await loadPlateBoundaries();
			loaded = true;
			if (active) draw(data);
		})();
		try {
			await loading;
		} finally {
			loading = null;
		}
	}
	return {
		group,
		setActive(on) {
			active = on;
			if (on) {
				if (!map.hasLayer(group)) group.addTo(map);
				load();
			} else {
				clear();
				if (map.hasLayer(group)) map.removeLayer(group);
			}
		},
		isActive: () => active,
		load,
		destroy() {
			clear();
			if (map.hasLayer(group)) map.removeLayer(group);
			loaded = false;
			data = null;
		}
	};
}
/**
* Mobile map chrome patterns (collapse strategy).
*
* Principles:
*  1. Map is the hero — overlays chrome starts collapsed / minimal.
*  2. Progressive disclosure: quick bar (few) → sheet (full) → legend Key chip.
*  3. Mutually exclusive expand: opening Layers sheet closes Legend, and vice versa.
*  4. Persist only explicit user expands (legend open key); sheets stay session-ephemeral.
*  5. Touch targets ≥ 36–44px; avoid wrapping a second full row of toggles on ~390px.
*/
var MAP_CHROME_EVENT = "ww-map-chrome";
function emitMapChrome(msg) {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent(MAP_CHROME_EVENT, { detail: msg }));
}
function onMapChrome(handler) {
	if (typeof window === "undefined") return () => void 0;
	const fn = (e) => {
		const ce = e;
		if (ce.detail) handler(ce.detail);
	};
	window.addEventListener(MAP_CHROME_EVENT, fn);
	return () => window.removeEventListener(MAP_CHROME_EVENT, fn);
}
/**
* Mobile bottom bar: NO layer chips here — only Filters / Events / More.
* Layer toggles live inside the More sheet (avoids dock overflow on ~390px).
*/
var MOBILE_QUICK_LAYERS = [];
/** Full desktop quick bar */
var DESKTOP_QUICK_LAYERS = [
	"quakes",
	"heatmap",
	"significant",
	"globalActivity",
	"plates",
	"depthColor",
	"timeDecay",
	"mmiContours",
	"nodes",
	"volcanoes",
	"corridors"
];
var LAYER_GROUPS = [
	{
		id: "core",
		label: "Core",
		ids: [
			"quakes",
			"heatmap",
			"significant",
			"globalActivity",
			"nodes"
		]
	},
	{
		id: "geology",
		label: "Geology & depth",
		ids: [
			"plates",
			"depthColor",
			"timeDecay",
			"volcanoes",
			"corridors"
		]
	},
	{
		id: "focus",
		label: "Focus tools",
		ids: ["mmiContours"]
	}
];
var OVERLAY_ICONS = {
	quakes: Activity,
	heatmap: Flame,
	significant: Zap,
	globalActivity: Earth,
	depthColor: Waves,
	timeDecay: Timer,
	plates: Earth,
	mmiContours: Layers2,
	nodes: Radar,
	volcanoes: Mountain,
	corridors: Square
};
function MapStyleControl() {
	const [open, setOpen] = (0, import_react.useState)(false);
	const panelRef = (0, import_react.useRef)(null);
	const basemapStyle = useObservatory((s) => s.basemapStyle);
	const overlays = useObservatory((s) => s.overlays);
	const setBasemapStyle = useObservatory((s) => s.setBasemapStyle);
	const setOverlay = useObservatory((s) => s.setOverlay);
	const setOverlaysBulk = useObservatory((s) => s.setOverlaysBulk);
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const mobile = useIsMobile();
	const mobileSheet = useObservatory((s) => s.mobileSheet);
	const setMobileSheet = useObservatory((s) => s.setMobileSheet);
	const quickIds = mobile ? MOBILE_QUICK_LAYERS : DESKTOP_QUICK_LAYERS;
	const onCount = (0, import_react.useMemo)(() => OVERLAY_META.filter(({ id }) => overlays[id]).length, [overlays]);
	const setOpenSafe = (next) => {
		setOpen((prev) => {
			const v = typeof next === "function" ? next(prev) : next;
			if (v) emitMapChrome({ type: "open-layers" });
			else emitMapChrome({ type: "close-layers" });
			return v;
		});
	};
	(0, import_react.useEffect)(() => {
		return onMapChrome((msg) => {
			if (msg.type === "open-legend") setOpen(false);
		});
	}, []);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === "Escape") setOpenSafe(false);
		};
		const onDown = (e) => {
			const t = e.target;
			if (panelRef.current && !panelRef.current.contains(t)) setOpenSafe(false);
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("mousedown", onDown, true);
		document.addEventListener("touchstart", onDown, true);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("mousedown", onDown, true);
			document.removeEventListener("touchstart", onDown, true);
		};
	}, [open]);
	const applySimpleMap = () => {
		const lean = mobileLeanOverlays();
		if (setOverlaysBulk) setOverlaysBulk(lean);
		else for (const id of Object.keys(lean)) setOverlay(id, lean[id]);
		setOpenSafe(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: panelRef,
		className: "pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex flex-col items-stretch gap-1.5 p-2 sm:items-end sm:gap-2 sm:p-3",
		children: [open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			id: "map-style-layers",
			className: `ww-style-panel pointer-events-auto w-full self-center sm:max-w-sm sm:self-end ${mobile ? "ww-style-panel--sheet" : ""}`,
			role: "dialog",
			"aria-label": "Map layers and basemap",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-2 flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[0.65rem] font-semibold uppercase tracking-wider text-dim",
					children: "Map layers"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[0.6rem] text-dim",
					children: [onCount, " on · map stays interactive"]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1",
					children: [mobile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "ww-btn min-h-8 px-2 text-[0.62rem]",
						onClick: applySimpleMap,
						title: "Quakes + nodes only — hide plates/depth chrome",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }), "Simple"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn ww-btn--icon h-9 w-9 min-h-0",
						"aria-label": "Close layer panel",
						onClick: () => setOpenSafe(false),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ww-style-panel__scroll",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ww-style-panel__label",
						children: "Basemap"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-4 gap-1.5",
						children: Object.keys(BASEMAP_STYLES).map((id) => {
							const s = BASEMAP_STYLES[id];
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setBasemapStyle(id),
								className: `ww-style-chip ${basemapStyle === id ? "ww-style-chip--on" : ""}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: s.short
								})
							}, id);
						})
					}),
					LAYER_GROUPS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ww-style-panel__label",
							children: g.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "space-y-1",
							children: g.ids.map((id) => {
								const meta = OVERLAY_META.find((m) => m.id === id);
								if (!meta) return null;
								const Icon = OVERLAY_ICONS[id];
								const on = overlays[id];
								const focusOnly = id === "mmiContours";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setOverlay(id, !on),
									className: `ww-layer-row ${on ? "ww-layer-row--on" : ""} ${focusOnly && !focusNodeId ? "opacity-70" : ""}`,
									disabled: focusOnly && !focusNodeId,
									title: focusOnly && !focusNodeId ? "Select a focus node first" : meta.hint,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5 shrink-0" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "min-w-0 flex-1 text-left",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block text-[0.72rem] font-medium",
												children: meta.label
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block text-[0.58rem] text-dim",
												children: meta.hint
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-2 w-2 shrink-0 rounded-full ${on ? "bg-primary" : "bg-border"}` })
									]
								}) }, id);
							})
						})]
					}, g.id))
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `ww-toggle-bar pointer-events-auto mx-auto sm:mx-0 ${mobile ? "ww-toggle-bar--mobile ww-toggle-bar--dock3" : ""}`,
			children: [
				quickIds.map((id) => {
					const meta = OVERLAY_META.find((m) => m.id === id);
					const Icon = OVERLAY_ICONS[id];
					const on = overlays[id];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						title: meta.hint,
						"aria-pressed": on,
						onClick: () => setOverlay(id, !on),
						className: `ww-toggle ${on ? "ww-toggle--on" : ""} ${on && id === "heatmap" ? "ww-toggle--heat" : ""} ${on && id === "plates" ? "ww-toggle--plates" : ""} ${on && id === "significant" ? "ww-toggle--mmi" : ""}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: "h-3.5 w-3.5 shrink-0",
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: meta.short })]
					}, id);
				}),
				mobile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `ww-toggle ww-toggle--dock ${mobileSheet === "filters" ? "ww-toggle--style" : ""}`,
						"aria-pressed": mobileSheet === "filters",
						"aria-label": "Filters",
						title: "Filters",
						onClick: () => {
							setOpenSafe(false);
							setMobileSheet(mobileSheet === "filters" ? "closed" : "filters");
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, {
							className: "h-4 w-4 shrink-0",
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Filters" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `ww-toggle ww-toggle--dock ${mobileSheet === "events" ? "ww-toggle--style" : ""}`,
						"aria-pressed": mobileSheet === "events",
						"aria-label": "Events",
						title: "Events",
						onClick: () => {
							setOpenSafe(false);
							setMobileSheet(mobileSheet === "events" ? "closed" : "events");
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
							className: "h-4 w-4 shrink-0",
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Events" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							setMobileSheet("closed");
							setOpenSafe((v) => !v);
						},
						className: `ww-toggle ww-toggle--dock ${open ? "ww-toggle--style" : ""}`,
						"aria-expanded": open,
						"aria-controls": "map-style-layers",
						"aria-label": "Layers and basemap",
						title: open ? "Close layers" : "Layers & basemap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, {
								className: "h-4 w-4",
								"aria-hidden": true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Layers" }),
							onCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ww-toggle-badge",
								children: onCount
							})
						]
					})
				] }),
				!mobile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ww-toggle-sep",
					"aria-hidden": true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setOpenSafe((v) => !v),
					className: `ww-toggle ${open ? "ww-toggle--style" : ""}`,
					"aria-expanded": open,
					"aria-controls": "map-style-layers",
					title: open ? "Close layers (Esc)" : "Basemap & all layers",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, {
							className: "h-3.5 w-3.5",
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: BASEMAP_STYLES[basemapStyle].short }),
						open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3 w-3 opacity-70" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-3 w-3 opacity-70" })
					]
				})] })
			]
		})]
	});
}
var LEGEND_OPEN_KEY = "wolfwatch_map_legend_open";
/**
* Map legend — top-left.
* Mobile strategy:
*  - Collapsed by default (Key chip + mini swatches)
*  - Never auto-opens when plates/depth enabled (user opt-in)
*  - Closes when Layers sheet opens (mutual exclusion)
*  - Accordion: one section expanded at a time on mobile
*/
function MapLegend() {
	const overlays = useObservatory((s) => s.overlays);
	const timeWindow = useObservatory((s) => s.timeWindow);
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const mobile = useIsMobile();
	const showDepth = overlays.quakes && overlays.depthColor;
	const showDecay = overlays.heatmap && overlays.timeDecay;
	const showPlates = overlays.plates;
	const hasContent = showDepth || showDecay || showPlates;
	const [open, setOpen] = (0, import_react.useState)(false);
	/** Mobile accordion: which block is expanded inside the panel */
	const [section, setSection] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!hasContent) {
			setOpen(false);
			return;
		}
		if (!mobile) {
			setOpen(true);
			setSection(null);
			return;
		}
		try {
			setOpen(localStorage.getItem(LEGEND_OPEN_KEY) === "1");
		} catch {
			setOpen(false);
		}
	}, [mobile, hasContent]);
	(0, import_react.useEffect)(() => {
		if (!open || !mobile) return;
		if (section) return;
		if (showPlates) setSection("plates");
		else if (showDepth) setSection("depth");
		else if (showDecay) setSection("decay");
	}, [
		open,
		mobile,
		showPlates,
		showDepth,
		showDecay,
		section
	]);
	(0, import_react.useEffect)(() => {
		return onMapChrome((msg) => {
			if (msg.type === "open-layers" && mobile) setOpen(false);
		});
	}, [mobile]);
	const toggle = () => {
		setOpen((prev) => {
			const next = !prev;
			if (mobile) {
				try {
					localStorage.setItem(LEGEND_OPEN_KEY, next ? "1" : "0");
				} catch {}
				if (next) emitMapChrome({ type: "open-legend" });
				else emitMapChrome({ type: "close-legend" });
			}
			return next;
		});
	};
	if (!hasContent) return null;
	const decayRows = timeDecayLegendRows(timeWindow);
	const hl = halfLifeLabel(timeWindow);
	const topClass = focusNodeId ? "top-14 sm:top-16" : "top-2 sm:top-3";
	const miniSwatches = [];
	if (showPlates) miniSwatches.push({
		color: BOUNDARY_COLORS.convergent,
		title: "Convergent"
	}, {
		color: BOUNDARY_COLORS.divergent,
		title: "Divergent"
	}, {
		color: BOUNDARY_COLORS.transform,
		title: "Transform"
	});
	if (showDepth) for (const d of DEPTH_LEGEND.slice(0, 4)) miniSwatches.push({
		color: d.color,
		title: d.label
	});
	if (mobile && !open) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `pointer-events-auto absolute left-2 z-[450] ${topClass}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "inline-flex min-h-9 max-w-[11rem] items-center gap-1.5 rounded-full border border-border bg-bg/92 px-2.5 py-1.5 text-[0.65rem] font-semibold text-muted shadow-md backdrop-blur hover:text-fg",
			onClick: toggle,
			"aria-expanded": false,
			"aria-label": "Show map legend",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, {
					className: "h-3.5 w-3.5 shrink-0 text-primary",
					"aria-hidden": true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Key" }),
				miniSwatches.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex items-center gap-0.5",
					"aria-hidden": true,
					children: miniSwatches.slice(0, 6).map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "h-1.5 w-1.5 rounded-full border border-black/20",
						style: { background: s.color },
						title: s.title
					}, i))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
					className: "h-3 w-3 shrink-0 opacity-70",
					"aria-hidden": true
				})
			]
		})
	});
	const showSection = (id) => {
		if (!mobile) return true;
		return section === id;
	};
	const sectionHeader = (id, label) => {
		if (!mobile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mb-1 text-[0.58rem] font-semibold uppercase tracking-wider text-dim",
			children: label
		});
		const isOn = section === id;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "mb-1 flex w-full items-center justify-between text-left text-[0.58rem] font-semibold uppercase tracking-wider text-dim",
			onClick: () => setSection(isOn ? null : id),
			"aria-expanded": isOn,
			children: [label, isOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3 w-3" })]
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `ww-map-legend absolute left-2 z-[450] max-w-[11.5rem] space-y-1.5 sm:left-3 ${topClass} ${mobile ? "pointer-events-auto" : "pointer-events-none"}`,
		children: [
			mobile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "pointer-events-auto mb-0.5 inline-flex min-h-8 w-full items-center justify-between gap-1 rounded-lg border border-border bg-bg/95 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-dim shadow-md backdrop-blur",
				onClick: toggle,
				"aria-expanded": true,
				"aria-label": "Hide map legend",
				children: ["Map key", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, {
					className: "h-3.5 w-3.5",
					"aria-hidden": true
				})]
			}),
			showPlates && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-border bg-bg/92 px-2 py-1.5 shadow-md backdrop-blur",
				children: [sectionHeader("plates", "Plates"), showSection("plates") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-0.5",
					children: [
						"convergent",
						"divergent",
						"transform"
					].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-1.5 text-[0.62rem] text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "h-0.5 w-3 shrink-0 rounded-full",
							style: { background: BOUNDARY_COLORS[k] }
						}), BOUNDARY_LABELS[k]]
					}, k))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-[0.52rem] leading-snug text-dim",
					children: "Arrows = relative mm/yr · PB2002"
				})] })]
			}),
			showDepth && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-border bg-bg/92 px-2 py-1.5 shadow-md backdrop-blur",
				children: [sectionHeader("depth", "Depth"), showSection("depth") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-0.5",
					children: DEPTH_LEGEND.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-1.5 text-[0.62rem] text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "h-2 w-2 shrink-0 rounded-full border border-black/20",
							style: { background: d.color }
						}), d.label]
					}, d.band))
				})]
			}),
			showDecay && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-border bg-bg/92 px-2 py-1.5 shadow-md backdrop-blur",
				children: [sectionHeader("decay", "Heat decay"), showSection("decay") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-0.5 flex items-baseline justify-between gap-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-[0.55rem] text-primary",
							children: ["t½ = ", hl]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-1 text-[0.55rem] leading-snug text-dim",
						children: ["w = ½^(age / t½) · ", timeWindow]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1 h-1.5 overflow-hidden rounded-full bg-elevated",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full w-full rounded-full",
							style: { background: "linear-gradient(90deg, #22d3ee66 0%, #fbbf24 45%, #fb923c 70%, #f43f5e 100%)" }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
						className: "w-full text-[0.58rem] text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: decayRows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-px",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "inline-block h-1.5 w-1.5 rounded-full",
									style: { background: decaySwatch(r.weight) }
								}), r.ageLabel]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-px text-right font-mono tabular-nums text-fg/90",
							children: r.pct
						})] }, r.ageLabel)) })
					})
				] })]
			})
		]
	});
}
/** Chip over the map when focused-node MMI contours are loaded / loading / failed. */
function MmiFocusBanner() {
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const mmi = useObservatory((s) => s.focusMmi);
	const dismissFocusMmi = useObservatory((s) => s.dismissFocusMmi);
	const overlays = useObservatory((s) => s.overlays);
	if (!focusNodeId || !overlays.mmiContours) return null;
	if (!mmi.status || mmi.status === "idle") return null;
	if (mmi.status === "loading") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute bottom-16 left-1/2 z-[460] w-[min(96%,22rem)] -translate-x-1/2 sm:bottom-20",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "rounded-lg border border-primary/30 bg-bg/95 px-3 py-2 text-center text-[0.7rem] text-primary shadow-lg backdrop-blur",
			children: "Loading USGS MMI contours for focused node…"
		})
	});
	if (mmi.status === "empty") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-auto absolute bottom-16 left-1/2 z-[460] w-[min(96%,24rem)] -translate-x-1/2 sm:bottom-20",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-2 rounded-lg border border-border bg-bg/95 px-3 py-2 text-[0.7rem] text-dim shadow-lg backdrop-blur",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers2, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-dim" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex-1",
					children: "No USGS ShakeMap MMI contours for a strong event in this focus box yet."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "shrink-0 rounded p-0.5 hover:bg-elevated",
					onClick: () => dismissFocusMmi(),
					"aria-label": "Dismiss",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
				})
			]
		})
	});
	if (mmi.status === "error") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-auto absolute bottom-16 left-1/2 z-[460] w-[min(96%,24rem)] -translate-x-1/2 sm:bottom-20",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[0.7rem] text-danger/90 shadow-lg backdrop-blur",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex-1",
				children: ["MMI overlay failed: ", mmi.error ?? "unknown"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "shrink-0 rounded p-0.5 hover:bg-elevated",
				onClick: () => dismissFocusMmi(),
				"aria-label": "Dismiss",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
			})]
		})
	});
	const mag = mmi.mag != null ? `M${mmi.mag.toFixed(1)}` : "Event";
	const place = mmi.place ?? "focused event";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-auto absolute bottom-16 left-1/2 z-[460] w-[min(96%,26rem)] -translate-x-1/2 sm:bottom-20",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-2 rounded-lg border border-warn/40 bg-bg/95 px-3 py-2 shadow-lg backdrop-blur",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers2, { className: "mt-0.5 h-4 w-4 shrink-0 text-warn" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1 text-[0.7rem] leading-snug",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-semibold text-fg",
							children: [
								"MMI contours · ",
								mag,
								mmi.mmi != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-normal text-warn",
									children: [" · max ~", formatMmi(mmi.mmi)]
								}) : null
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "truncate text-dim",
							children: place
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-0.5 text-[0.62rem] text-dim",
							children: "Official USGS cont_mmi.json · single focused event only"
						}),
						mmi.shakeMapUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: mmi.shakeMapUrl,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "mt-1 inline-flex items-center gap-1 font-semibold text-primary hover:underline",
							children: ["Full USGS ShakeMap", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "shrink-0 rounded p-0.5 text-dim hover:bg-elevated hover:text-fg",
					onClick: () => dismissFocusMmi(),
					"aria-label": "Hide MMI contours",
					title: "Hide MMI contours",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
				})
			]
		})
	});
}
function makeTileLayer(styleId) {
	const style = BASEMAP_STYLES[styleId];
	const opts = {
		attribution: style.attribution,
		maxZoom: style.maxZoom ?? 19,
		className: "ww-basemap",
		updateWhenIdle: true,
		updateWhenZooming: false,
		keepBuffer: 2,
		crossOrigin: true
	};
	if (style.subdomains) opts.subdomains = style.subdomains;
	return import_leaflet_src.default.tileLayer(style.url, opts);
}
function LiveMap() {
	const mapRef = (0, import_react.useRef)(null);
	const mapObj = (0, import_react.useRef)(null);
	const baseLayer = (0, import_react.useRef)(null);
	const canvasRenderer = (0, import_react.useRef)(null);
	const eqLayer = (0, import_react.useRef)(null);
	const nodeLayer = (0, import_react.useRef)(null);
	const volcLayer = (0, import_react.useRef)(null);
	const heatLayer = (0, import_react.useRef)(null);
	const mmiLayer = (0, import_react.useRef)(null);
	const plateLayer = (0, import_react.useRef)(null);
	const touchHandle = (0, import_react.useRef)(null);
	const [pressLabel, setPressLabel] = (0, import_react.useState)(null);
	const [showGestureTip, setShowGestureTip] = (0, import_react.useState)(false);
	const eq = useObservatory((s) => s.eq);
	const volc = useObservatory((s) => s.volc);
	const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
	const volcWatchNodes = useObservatory((s) => s.volcWatchNodes);
	const globalSeismic = useObservatory((s) => s.globalSeismic);
	const minMag = useObservatory((s) => s.minMag);
	const maxMag = useObservatory((s) => s.maxMag);
	const mapView = useObservatory((s) => s.mapView);
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const setFocusNode = useObservatory((s) => s.setFocusNode);
	const basemapStyle = useObservatory((s) => s.basemapStyle);
	const overlays = useObservatory((s) => s.overlays);
	const timeWindow = useObservatory((s) => s.timeWindow);
	const focusMmi = useObservatory((s) => s.focusMmi);
	const mapFlyTo = useObservatory((s) => s.mapFlyTo);
	const clearMapFlyTo = useObservatory((s) => s.clearMapFlyTo);
	(0, import_react.useEffect)(() => {
		try {
			if (!localStorage.getItem("wolfwatch_gesture_tip_v1")) setShowGestureTip(true);
		} catch {}
	}, []);
	(0, import_react.useEffect)(() => {
		if (!pressLabel) return;
		const t = setTimeout(() => setPressLabel(null), 2800);
		return () => clearTimeout(t);
	}, [pressLabel]);
	(0, import_react.useEffect)(() => {
		if (!mapRef.current || mapObj.current) return;
		const map = import_leaflet_src.default.map(mapRef.current, {
			center: [20, 0],
			zoom: 2,
			worldCopyJump: true,
			zoomControl: false,
			preferCanvas: true,
			fadeAnimation: false,
			markerZoomAnimation: false,
			zoomAnimation: true,
			dragging: true,
			touchZoom: true,
			doubleClickZoom: true,
			scrollWheelZoom: true,
			boxZoom: true,
			keyboard: true,
			bounceAtZoomLimits: false
		});
		import_leaflet_src.default.control.zoom({ position: "bottomright" }).addTo(map);
		touchHandle.current = attachMapTouchGestures(map, {
			doubleTapZoomDelta: 1,
			longPressMs: 500,
			onLongPress: (lat, lon) => {
				setPressLabel(`${lat.toFixed(2)}°, ${lon.toFixed(2)}° · long-press`);
			}
		});
		canvasRenderer.current = import_leaflet_src.default.canvas({ padding: .5 });
		const initial = useObservatory.getState().basemapStyle;
		baseLayer.current = makeTileLayer(initial).addTo(map);
		map.getContainer().classList.add(`ww-tone-${BASEMAP_STYLES[initial].tone}`);
		plateLayer.current = createPlateLayer(map);
		heatLayer.current = createQuakeHeatLayer();
		heatLayer.current.addTo(map);
		heatLayer.current.setActive(false);
		mmiLayer.current = createMmiContourLayer();
		mmiLayer.current.addTo(map);
		eqLayer.current = import_leaflet_src.default.layerGroup().addTo(map);
		nodeLayer.current = import_leaflet_src.default.layerGroup().addTo(map);
		volcLayer.current = import_leaflet_src.default.layerGroup().addTo(map);
		mapObj.current = map;
		if (useObservatory.getState().overlays.plates) plateLayer.current.setActive(true);
		return () => {
			touchHandle.current?.destroy();
			touchHandle.current = null;
			plateLayer.current?.destroy();
			plateLayer.current = null;
			map.remove();
			mapObj.current = null;
			baseLayer.current = null;
			canvasRenderer.current = null;
			heatLayer.current = null;
			mmiLayer.current = null;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const map = mapObj.current;
		if (!map) return;
		if (baseLayer.current) {
			map.removeLayer(baseLayer.current);
			baseLayer.current = null;
		}
		baseLayer.current = makeTileLayer(basemapStyle).addTo(map);
		if (plateLayer.current?.group && map.hasLayer(plateLayer.current.group)) try {
			plateLayer.current.group.bringToBack?.();
		} catch {}
		if (heatLayer.current) {
			if (map.hasLayer(heatLayer.current)) map.removeLayer(heatLayer.current);
			heatLayer.current.addTo(map);
			heatLayer.current.setActive(overlays.heatmap);
		}
		if (mmiLayer.current) {
			if (map.hasLayer(mmiLayer.current)) map.removeLayer(mmiLayer.current);
			mmiLayer.current.addTo(map);
		}
		const el = map.getContainer();
		el.classList.remove("ww-tone-light", "ww-tone-dark", "ww-tone-sat");
		el.classList.add(`ww-tone-${BASEMAP_STYLES[basemapStyle].tone}`);
	}, [basemapStyle, overlays.heatmap]);
	(0, import_react.useEffect)(() => {
		if (mapView === "2d" && mapObj.current) setTimeout(() => mapObj.current?.invalidateSize(), 80);
	}, [mapView]);
	(0, import_react.useEffect)(() => {
		const map = mapObj.current;
		if (!map || !mapFlyTo || mapView !== "2d") return;
		map.flyTo([mapFlyTo.lat, mapFlyTo.lon], mapFlyTo.zoom ?? 6, {
			animate: true,
			duration: .85
		});
		clearMapFlyTo();
	}, [
		mapFlyTo,
		mapView,
		clearMapFlyTo
	]);
	(0, import_react.useEffect)(() => {
		plateLayer.current?.setActive(!!overlays.plates);
	}, [overlays.plates]);
	(0, import_react.useEffect)(() => {
		const map = mapObj.current;
		if (!map) return;
		const node = getFocusNode(focusNodeId);
		if (!node) {
			if (focusNodeId === null) map.setView([20, 0], 2, { animate: true });
			return;
		}
		const rects = boundsToLeafletRects(node.bounds);
		if (rects.length === 1) {
			const [[latMin, lonMin], [latMax, lonMax]] = rects[0];
			map.fitBounds([[latMin, lonMin], [latMax, lonMax]], {
				padding: [40, 40],
				maxZoom: 6,
				animate: true
			});
		} else if (node.center) map.setView(node.center, 5, { animate: true });
		else {
			const [[latMin, lonMin], [latMax, lonMax]] = rects[0];
			map.fitBounds([[latMin, lonMin], [latMax, lonMax]], {
				padding: [40, 40],
				maxZoom: 5,
				animate: true
			});
		}
	}, [focusNodeId]);
	(0, import_react.useEffect)(() => {
		const layer = mmiLayer.current;
		if (!layer) return;
		const show = !!focusNodeId && overlays.mmiContours && !focusMmi.dismissed && focusMmi.status === "ready" && !!focusMmi.contours;
		layer.setContours(show ? focusMmi.contours : null);
		layer.bringToFront();
	}, [
		focusNodeId,
		overlays.mmiContours,
		focusMmi
	]);
	(0, import_react.useEffect)(() => {
		const map = mapObj.current;
		if (!map || !eqLayer.current || !nodeLayer.current || !volcLayer.current) return;
		const sync = (layer, on) => {
			if (on && !map.hasLayer(layer)) layer.addTo(map);
			if (!on && map.hasLayer(layer)) map.removeLayer(layer);
		};
		sync(eqLayer.current, overlays.quakes);
		sync(nodeLayer.current, overlays.nodes || overlays.corridors);
		sync(volcLayer.current, overlays.volcanoes);
		heatLayer.current?.setActive(overlays.heatmap);
	}, [overlays]);
	(0, import_react.useEffect)(() => {
		if (!eqLayer.current || !nodeLayer.current) return;
		eqLayer.current.clearLayers();
		nodeLayer.current.clearLayers();
		const renderer = canvasRenderer.current ?? void 0;
		const sat = basemapStyle === "satellite";
		const all = filteredEq(eq?.features, minMag, maxMag);
		const focus = getFocusNode(focusNodeId);
		let features = focus ? all.filter((f) => {
			const [lon, lat] = f.geometry.coordinates;
			return pointInBounds(lat, lon, focus.bounds);
		}) : all;
		if (overlays.significant) features = features.filter((f) => (f.properties.mag ?? 0) >= 6);
		heatLayer.current?.setData(featuresToHeatPoints(features, {
			timeDecay: overlays.timeDecay,
			halfLifeHours: halfLifeForWindow(timeWindow)
		}));
		heatLayer.current?.setActive(overlays.heatmap);
		if (overlays.quakes) for (const f of features) {
			const [lon, lat] = f.geometry.coordinates;
			const mag = f.properties.mag ?? 0;
			const depth = eqDepthKm(f);
			const place = f.properties.place ?? "Unknown";
			const time = f.properties.time ? new Date(f.properties.time).toUTCString() : "—";
			const isSig = mag >= 6;
			const radius = Math.max(5, Math.min(22, (mag - 2) * 3.4) + (isSig && overlays.significant ? 3 : 0));
			const fill = overlays.depthColor ? depthColor(depth) : magColor(mag);
			const stroke = isSig ? "#fbbf24" : sat ? "#ffffff" : overlays.depthColor ? magColor(mag) : "#0f172a";
			const mmi = f.properties.mmi;
			const sm = hasShakeMapProduct(f.properties.types) || mmi != null && Number.isFinite(mmi);
			const smUrl = shakeMapEventUrl(f.id);
			const pageUrl = f.properties.url || eventPageUrl(f.id);
			const isMmiSource = focusMmi.eventId && f.id === focusMmi.eventId && focusMmi.status === "ready";
			const marker = import_leaflet_src.default.circleMarker([lat, lon], {
				renderer,
				radius: isMmiSource ? radius + 3 : radius,
				color: isMmiSource ? "#fbbf24" : stroke,
				fillColor: fill,
				fillOpacity: overlays.heatmap ? .62 : sat ? .95 : .9,
				weight: isMmiSource || isSig ? 2.5 : sat ? 2 : overlays.depthColor ? 1.75 : 1.25,
				opacity: .95,
				bubblingMouseEvents: false
			});
			marker.bindPopup(() => {
				const el = document.createElement("div");
				const mmiLine = mmi != null && Number.isFinite(mmi) ? `<br/><span style="color:#0e7490;font-size:11px">USGS MMI ~${formatMmi(mmi)}${sm ? " · ShakeMap product" : ""}</span>` : "";
				const contourNote = isMmiSource ? `<br/><span style="color:#ca8a04;font-size:11px">★ MMI contours drawn for this event</span>` : "";
				const sigNote = isSig ? `<br/><span style="color:#fbbf24;font-size:11px">Significant · M≥6</span>` : "";
				const smLink = sm && smUrl ? `<br/><a href="${smUrl}" target="_blank" rel="noopener noreferrer" style="color:#0891b2;font-weight:600;font-size:11px">Open official USGS ShakeMap →</a>` : pageUrl ? `<br/><a href="${pageUrl}" target="_blank" rel="noopener noreferrer" style="color:#64748b;font-size:11px">USGS event page →</a>` : "";
				el.innerHTML = `<strong style="color:${fill}">M${mag.toFixed(1)}</strong>
            <span style="color:#64748b;font-size:11px"> · ${depth.toFixed(0)} km</span>${sigNote}${mmiLine}${contourNote}<br/>
            ${place}<br/>
            <span style="color:#64748b;font-size:11px">${time}</span>${smLink}`;
				return el;
			});
			eqLayer.current.addLayer(marker);
		}
		if (overlays.globalActivity && globalSeismic) {
			const world = [...globalSeismic.m45?.features ?? [], ...globalSeismic.significant?.features ?? []];
			const seen = /* @__PURE__ */ new Set();
			for (const f of world) {
				const id = String(f.id ?? "");
				if (id && seen.has(id)) continue;
				if (id) seen.add(id);
				const [lon, lat] = f.geometry.coordinates;
				const mag = f.properties.mag ?? 0;
				const sig = (f.properties.sig ?? 0) >= 600 || mag >= 6;
				const marker = import_leaflet_src.default.circleMarker([lat, lon], {
					renderer,
					radius: sig ? 8 : 5,
					color: sig ? "#fbbf24" : "#64748b",
					fillColor: sig ? "#f59e0b" : "#94a3b8",
					fillOpacity: .35,
					weight: 1,
					opacity: .75,
					bubblingMouseEvents: false
				});
				marker.bindPopup(`<strong style="color:#fbbf24">M${mag.toFixed(1)}</strong> · global 24h<br/>${f.properties.place || "Event"}<br/><span style="color:#64748b;font-size:11px">USGS world layer</span>`);
				eqLayer.current?.addLayer(marker);
			}
		}
		const allNodes = getAllFocusNodes();
		for (const node of allNodes) {
			const st = nodeStatus(all, node);
			const [[latMin, lonMin], [latMax, lonMax]] = node.bounds;
			const clat = node.center?.[0] ?? (latMin + latMax) / 2;
			const clon = node.center?.[1] ?? (lonMin <= lonMax ? (lonMin + lonMax) / 2 : -175);
			const isFocus = focusNodeId === node.id;
			const isPublished = !!node.publishedFocus;
			const isVolc = node.kind === "volcano";
			const isPriority = !!node.watchPriority;
			const dimmed = focusNodeId != null && !isFocus;
			const color = isVolc && node.aviationCode === "orange" ? "#fb923c" : isVolc && node.aviationCode === "red" ? "#f43f5e" : st === "watch" ? "#e11d48" : st === "active" ? "#ea580c" : st === "elevated" ? "#d97706" : isPublished || isFocus ? "#ca8a04" : "#0891b2";
			if (overlays.nodes) {
				const ring = import_leaflet_src.default.circleMarker([clat, clon], {
					renderer,
					radius: isFocus ? 17 : isVolc ? 15 : isPublished ? 13 : st === "watch" ? 14 : st === "active" ? 11 : 9,
					color: sat ? "#fff" : color,
					fillColor: color,
					fillOpacity: isFocus ? .35 : isVolc ? .3 : isPublished ? .22 : .16,
					weight: isFocus || isVolc ? 3 : isPublished ? 2.5 : 2,
					opacity: dimmed ? .3 : .95,
					dashArray: st === "quiet" && !isPublished && !isFocus && !isVolc ? "4 4" : void 0,
					bubblingMouseEvents: false
				});
				const monitorLink = node.monitorUrl && !isVolc ? `<br/><a href="${node.monitorUrl}" target="_blank" rel="noopener noreferrer" style="color:#0891b2;font-weight:600">Open full swarm board →</a>` : node.monitorUrl && isVolc ? `<br/><a href="${node.monitorUrl}" target="_blank" rel="noopener noreferrer" style="color:#fb923c;font-weight:600">Volcano profile →</a>` : "";
				const gvpLink = node.gvpUrl ? `<br/><a href="${node.gvpUrl}" target="_blank" rel="noopener noreferrer" style="color:#fb923c;font-weight:600">Smithsonian GVP →</a>` : "";
				const kvertLink = node.agencyUrl ? `<br/><a href="${node.agencyUrl}" target="_blank" rel="noopener noreferrer" style="color:#22d3ee;font-weight:600">KVERT →</a>` : "";
				const badge = isVolc ? `<br/><span style="color:#fb923c;font-size:11px">${node.id.startsWith("usgs-volc-") ? "USGS elevated watch (live · drops at GREEN)" : "Active volcano watch"}${node.aviationCode ? ` · Aviation ${node.aviationCode.toUpperCase()}` : ""}</span>` : isPublished ? `<br/><span style="color:#ca8a04;font-size:11px">★ Published focused node</span>` : "";
				const note = node.focusNote ? `<br/><span style="color:#64748b;font-size:11px">${node.focusNote}</span>` : "";
				ring.bindPopup(`<strong>${node.name}</strong>${badge}<br/><span style="color:#64748b">${node.role}</span><br/>Status: <b style="color:${color}">${st}</b>${note}${gvpLink}${kvertLink}${monitorLink}<br/><button type="button" class="ww-focus-btn" data-node="${node.id}" style="margin-top:6px;cursor:pointer;background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:11px">${isFocus ? "Exit focus" : "Focus this watch"}</button>`);
				ring.on("popupopen", () => {
					const btn = document.querySelector(`.ww-focus-btn[data-node="${node.id}"]`);
					if (btn) btn.addEventListener("click", () => {
						setFocusNode(isFocus ? null : node.id);
						mapObj.current?.closePopup();
					}, { once: true });
				});
				nodeLayer.current.addLayer(ring);
			}
			if (overlays.corridors && (isFocus || isPublished || isPriority)) for (const rectBounds of boundsToLeafletRects(node.bounds)) {
				const [[rLatMin, rLonMin], [rLatMax, rLonMax]] = rectBounds;
				const rect = import_leaflet_src.default.rectangle([[rLatMin, rLonMin], [rLatMax, rLonMax]], {
					renderer,
					color: isVolc ? "#fb923c" : isFocus ? "#22d3ee" : "#ca8a04",
					weight: isFocus ? 2.5 : isVolc ? 2 : 1.75,
					dashArray: isFocus ? void 0 : "6 4",
					fillColor: isVolc ? "#fb923c" : isFocus ? "#22d3ee" : "#ca8a04",
					fillOpacity: isFocus ? .12 : isVolc ? .08 : .07,
					opacity: dimmed ? .25 : .95,
					interactive: false
				});
				nodeLayer.current.addLayer(rect);
			}
		}
	}, [
		eq,
		minMag,
		maxMag,
		focusNodeId,
		setFocusNode,
		timeWindow,
		basemapStyle,
		focusMmi.eventId,
		focusMmi.status,
		overlays.quakes,
		overlays.heatmap,
		overlays.depthColor,
		overlays.timeDecay,
		overlays.nodes,
		overlays.corridors,
		volcWatchNodes,
		globalSeismic,
		overlays.globalActivity,
		overlays.significant
	]);
	(0, import_react.useEffect)(() => {
		if (!volcLayer.current) return;
		volcLayer.current.clearLayers();
		if (!overlays.volcanoes) return;
		const renderer = canvasRenderer.current ?? void 0;
		const focus = getFocusNode(focusNodeId);
		let features = volc?.features ?? [];
		if (focus) features = features.filter((f) => {
			const [lon, lat] = f.geometry.coordinates;
			return pointInBounds(lat, lon, focus.bounds);
		});
		for (const f of features) {
			const [lon, lat] = f.geometry.coordinates;
			const mag = f.properties.mag ?? 0;
			const place = f.properties.place ?? "Volcanic activity";
			const marker = import_leaflet_src.default.circleMarker([lat, lon], {
				renderer,
				radius: 10,
				color: "#fff",
				fillColor: "#f97316",
				fillOpacity: .65,
				weight: 2,
				dashArray: "2 3",
				bubblingMouseEvents: false
			});
			marker.bindPopup(`<strong style="color:#ea580c">M${mag.toFixed(1)}</strong><br/>${place}<br/><span style="color:#64748b;font-size:11px">USGS volcanic earthquake / proxy</span>`);
			volcLayer.current.addLayer(marker);
		}
		for (const v of usgsVolcAlerts) {
			if (v.lat == null || v.lon == null) continue;
			if (focus) {}
			const fill = v.colorCode === "RED" ? "#f43f5e" : v.colorCode === "ORANGE" ? "#fb923c" : v.colorCode === "YELLOW" ? "#fbbf24" : "#34d399";
			const marker = import_leaflet_src.default.circleMarker([v.lat, v.lon], {
				renderer,
				radius: 11,
				color: "#0f172a",
				fillColor: fill,
				fillOpacity: .85,
				weight: 2.5,
				bubblingMouseEvents: false
			});
			const notice = v.noticeUrl ? `<br/><a href="${v.noticeUrl}" target="_blank" rel="noopener">Official notice</a>` : "";
			const elev = v.elevationM != null ? `<br/>Elev ${Math.round(v.elevationM)} m` : "";
			marker.bindPopup(`<strong style="color:${fill}">${v.name}</strong><br/><span style="font-size:11px">${v.alertLevel} · Aviation ${v.colorCode}</span><br/><span style="color:#64748b;font-size:11px">${v.obsName}${v.region ? " · " + v.region : ""}</span>` + elev + notice + `<br/><span style="color:#64748b;font-size:10px">USGS HANS · not a forecast</span>`);
			volcLayer.current.addLayer(marker);
		}
	}, [
		volc,
		usgsVolcAlerts,
		focusNodeId,
		overlays.volcanoes
	]);
	const dismissTip = () => {
		setShowGestureTip(false);
		try {
			localStorage.setItem("wolfwatch_gesture_tip_v1", "1");
		} catch {}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-full min-h-[280px] w-full overflow-hidden rounded-lg border border-border",
		style: { display: mapView === "2d" ? "block" : "none" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: mapRef,
				className: "ww-map h-full min-h-[280px] w-full"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NodeFocusBanner, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MmiFocusBanner, {}),
			mapView === "2d" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapLegend, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapStyleControl, {})] }),
			pressLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute left-1/2 top-3 z-[520] -translate-x-1/2 rounded-full border border-border bg-bg/95 px-3 py-1.5 font-mono text-[0.7rem] text-primary shadow-lg backdrop-blur",
				children: pressLabel
			}),
			showGestureTip && mapView === "2d" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute bottom-[4.6rem] left-1/2 z-[510] w-[min(92%,20rem)] -translate-x-1/2 rounded-xl border border-border bg-bg/95 p-3 text-xs text-muted shadow-xl backdrop-blur sm:bottom-20",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1 font-semibold text-fg",
						children: "Touch map"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mb-2 space-y-0.5 text-[0.7rem] leading-snug text-dim",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Drag to pan · pinch to zoom" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Double-tap to zoom in" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Long-press for coordinates" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Swipe tabs left/right between views" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn w-full text-[0.7rem]",
						onClick: dismissTip,
						children: "Got it"
					})
				]
			})
		]
	});
}
//#endregion
export { LiveMap };
