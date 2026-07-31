import { i as __toESM } from "../_runtime.mjs";
import { N as require_react, h as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { D as getFocusNode, N as magColor, W as useObservatory, a as DRAGON_NODES, w as filteredEq, x as eqDepthKm, z as pointInBounds } from "./observatory-DWEcu3Hj.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Globe3D-C5mYSksy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Full-mode Three.js globe.
* Coherent public-seismic-globe patterns (hex rings, depth stems, spin speed,
* marker scale/opacity, click-pick, antipode) re-implemented for WolfWatch.
* Not a port of the public HTML page (no CDN three r128 / bloom stack).
*/
function Globe3D() {
	const containerRef = (0, import_react.useRef)(null);
	const eq = useObservatory((s) => s.eq);
	const minMag = useObservatory((s) => s.minMag);
	const maxMag = useObservatory((s) => s.maxMag);
	const mapView = useObservatory((s) => s.mapView);
	const mode = useObservatory((s) => s.mode);
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const globeAutoSpin = useObservatory((s) => s.globeAutoSpin);
	const setGlobeAutoSpin = useObservatory((s) => s.setGlobeAutoSpin);
	const globeAntipode = useObservatory((s) => s.globeAntipode);
	const clearGlobeAntipode = useObservatory((s) => s.clearGlobeAntipode);
	const antipodeOf = useObservatory((s) => s.antipodeOf);
	const setMapView = useObservatory((s) => s.setMapView);
	const globeStemScale = useObservatory((s) => s.globeStemScale);
	const setGlobeStemScale = useObservatory((s) => s.setGlobeStemScale);
	const globeMarkerScale = useObservatory((s) => s.globeMarkerScale);
	const setGlobeMarkerScale = useObservatory((s) => s.setGlobeMarkerScale);
	const globeSpinSpeed = useObservatory((s) => s.globeSpinSpeed);
	const setGlobeSpinSpeed = useObservatory((s) => s.setGlobeSpinSpeed);
	const globeMarkerOpacity = useObservatory((s) => s.globeMarkerOpacity);
	const setGlobeMarkerOpacity = useObservatory((s) => s.setGlobeMarkerOpacity);
	const pickEvent = useObservatory((s) => s.pickEvent);
	const pickedEvent = useObservatory((s) => s.pickedEvent);
	const cleanupRef = (0, import_react.useRef)(null);
	const updateRef = (0, import_react.useRef)(null);
	const autoRef = (0, import_react.useRef)(globeAutoSpin);
	const spinSpdRef = (0, import_react.useRef)(globeSpinSpeed);
	const stemRef = (0, import_react.useRef)(globeStemScale);
	const hexRef = (0, import_react.useRef)(globeMarkerScale);
	const opacRef = (0, import_react.useRef)(globeMarkerOpacity);
	const aimRef = (0, import_react.useRef)(null);
	const recenterRef = (0, import_react.useRef)(null);
	const [showTune, setShowTune] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		autoRef.current = globeAutoSpin;
	}, [globeAutoSpin]);
	(0, import_react.useEffect)(() => {
		spinSpdRef.current = globeSpinSpeed;
	}, [globeSpinSpeed]);
	(0, import_react.useEffect)(() => {
		stemRef.current = globeStemScale;
	}, [globeStemScale]);
	(0, import_react.useEffect)(() => {
		hexRef.current = globeMarkerScale;
	}, [globeMarkerScale]);
	(0, import_react.useEffect)(() => {
		opacRef.current = globeMarkerOpacity;
	}, [globeMarkerOpacity]);
	(0, import_react.useEffect)(() => {
		if (mapView !== "3d" || mode !== "full" || !containerRef.current) return;
		let cancelled = false;
		const container = containerRef.current;
		(async () => {
			const THREE = await import("../_libs/three.mjs").then((n) => n.t);
			if (cancelled || !container) return;
			const w = Math.max(container.clientWidth, 280);
			const h = Math.max(container.clientHeight, 320);
			const scene = new THREE.Scene();
			scene.background = new THREE.Color(725536);
			const camera = new THREE.PerspectiveCamera(42, w / h, .1, 100);
			const renderer = new THREE.WebGLRenderer({
				antialias: true,
				alpha: false,
				powerPreference: "high-performance"
			});
			renderer.setSize(w, h);
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
			if ("outputColorSpace" in renderer) renderer.outputColorSpace = "srgb";
			container.innerHTML = "";
			container.appendChild(renderer.domElement);
			renderer.domElement.style.display = "block";
			renderer.domElement.style.width = "100%";
			renderer.domElement.style.height = "100%";
			renderer.domElement.style.touchAction = "none";
			scene.add(new THREE.AmbientLight(12113136, .9));
			scene.add(new THREE.HemisphereLight(14412542, 1981023, .6));
			const sun = new THREE.DirectionalLight(16777215, 1.4);
			sun.position.set(4.5, 2.2, 3.5);
			scene.add(sun);
			const fill = new THREE.DirectionalLight(9684477, .5);
			fill.position.set(-3, -1, -2);
			scene.add(fill);
			const baseTex = makeProceduralEarth(THREE);
			const geo = new THREE.SphereGeometry(1, 64, 64);
			const mat = new THREE.MeshPhongMaterial({
				map: baseTex,
				color: 16777215,
				shininess: 18,
				specular: 3359061,
				emissive: 793136,
				emissiveIntensity: .4
			});
			const earth = new THREE.Mesh(geo, mat);
			scene.add(earth);
			const loader = new THREE.TextureLoader();
			loader.crossOrigin = "anonymous";
			loader.load("https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-blue-marble.jpg", (tex) => {
				if (cancelled) {
					tex.dispose();
					return;
				}
				if ("colorSpace" in tex) tex.colorSpace = "srgb";
				tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
				mat.map = tex;
				mat.emissiveIntensity = .15;
				mat.needsUpdate = true;
			}, void 0, () => {});
			const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.045, 48, 48), new THREE.MeshBasicMaterial({
				color: 3718648,
				transparent: true,
				opacity: .14,
				side: THREE.BackSide,
				depthWrite: false
			}));
			scene.add(atmo);
			const glow = new THREE.Mesh(new THREE.SphereGeometry(1.09, 32, 32), new THREE.MeshBasicMaterial({
				color: 959977,
				transparent: true,
				opacity: .06,
				side: THREE.BackSide,
				depthWrite: false
			}));
			scene.add(glow);
			{
				const n = 400;
				const pos = new Float32Array(n * 3);
				for (let i = 0; i < n; i++) {
					const r = 12 + Math.random() * 20;
					const th = Math.random() * Math.PI * 2;
					const ph = Math.acos(2 * Math.random() - 1);
					pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
					pos[i * 3 + 1] = r * Math.cos(ph);
					pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
				}
				const sg = new THREE.BufferGeometry();
				sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
				scene.add(new THREE.Points(sg, new THREE.PointsMaterial({
					color: 13358561,
					size: .035,
					sizeAttenuation: true,
					transparent: true,
					opacity: .7,
					depthWrite: false
				})));
			}
			const quakeGroup = new THREE.Group();
			scene.add(quakeGroup);
			let pickList = [];
			let neonMats = [];
			let focusRing = null;
			let pickRing = null;
			const spherical = {
				theta: .55,
				phi: 1.15,
				radius: 2.85
			};
			let rotating = false;
			let lastX = 0;
			let lastY = 0;
			let aimAnim = null;
			function applyCam() {
				camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
				camera.position.y = spherical.radius * Math.cos(spherical.phi);
				camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
				camera.lookAt(0, 0, 0);
			}
			applyCam();
			function latLonToVec(lat, lon, radius = 1.02) {
				const phi = (90 - lat) * Math.PI / 180;
				const theta = (lon + 180) * Math.PI / 180;
				return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
			}
			function aimAt(lat, lon, smooth = true) {
				const aim = latLonToVec(lat, lon, 1);
				const toTheta = Math.atan2(aim.x, aim.z);
				const toPhi = Math.acos(Math.max(-1, Math.min(1, aim.y)));
				autoRef.current = false;
				if (!smooth) {
					spherical.theta = toTheta;
					spherical.phi = toPhi;
					applyCam();
					aimAnim = null;
					return;
				}
				aimAnim = {
					t0: performance.now(),
					dur: 1200,
					from: {
						theta: spherical.theta,
						phi: spherical.phi,
						radius: spherical.radius
					},
					to: {
						theta: toTheta,
						phi: toPhi,
						radius: Math.max(2.2, Math.min(spherical.radius, 3.2))
					}
				};
			}
			aimRef.current = aimAt;
			recenterRef.current = () => {
				aimAnim = null;
				spherical.theta = .55;
				spherical.phi = 1.15;
				spherical.radius = 2.85;
				applyCam();
			};
			const hexGeo = makeHexRingGeometry(THREE, 1, .22);
			new THREE.Object3D();
			function disposeGroup(g) {
				while (g.children.length) {
					const o = g.children[0];
					g.remove(o);
					o.traverse((ch) => {
						const mesh = ch;
						if (mesh.geometry && mesh.geometry !== hexGeo) mesh.geometry.dispose();
						const m = mesh.material;
						if (m) if (Array.isArray(m)) m.forEach((x) => x.dispose());
						else m.dispose();
					});
				}
			}
			function updateMarkers(features, focusId) {
				disposeGroup(quakeGroup);
				pickList = [];
				neonMats = [];
				if (focusRing) {
					scene.remove(focusRing);
					focusRing.geometry.dispose();
					focusRing.material.dispose();
					focusRing = null;
				}
				if (pickRing) {
					quakeGroup.remove(pickRing);
					pickRing.geometry.dispose();
					pickRing.material.dispose();
					pickRing = null;
				}
				const focus = getFocusNode(focusId);
				const stemMul = stemRef.current;
				const hexScale = hexRef.current;
				const opac = opacRef.current;
				let list = features.filter((f) => {
					const m = f.properties.mag ?? 0;
					return m >= Math.min(minMag, 3.5) && m <= maxMag;
				});
				if (focus) list = list.filter((f) => {
					const [lon, lat] = f.geometry.coordinates;
					return pointInBounds(lat, lon, focus.bounds);
				});
				list = [...list].sort((a, b) => (a.properties.mag ?? 0) - (b.properties.mag ?? 0)).slice(0, 420);
				const stemPos = [];
				const stemCol = [];
				for (const f of list) {
					const [lon, lat] = f.geometry.coordinates;
					const mag = f.properties.mag ?? 3.5;
					const depth = eqDepthKm(f);
					const place = f.properties.place ?? "—";
					const id = f.id ? String(f.id) : `${lat}_${lon}_${f.properties.time ?? 0}`;
					const neon = mag >= 7;
					let base = .018 + Math.pow(Math.max(mag, .5), 1.05) * .01;
					if (mag >= 5) base *= 1 + (mag - 5) * .12;
					const size = base * hexScale;
					const pos = latLonToVec(lat, lon, 1.012 + Math.min(depth, 700) / 700 * stemMul + size * .35);
					const colHex = magColor(mag);
					const col = new THREE.Color(colHex);
					col.offsetHSL(0, .04, .1);
					const g = new THREE.Group();
					g.position.copy(pos);
					g.lookAt(0, 0, 0);
					g.rotateY(Math.PI);
					(neon ? [
						1.05,
						.78,
						.48
					] : mag >= 5 ? [
						1,
						.68,
						.4
					] : [1, .62]).forEach((s, i) => {
						const ringMat = new THREE.MeshBasicMaterial({
							color: col,
							transparent: true,
							opacity: opac * (1 - i * .18) * (neon && i === 0 ? .95 : .88),
							side: THREE.DoubleSide,
							depthWrite: false
						});
						if (neon && i === 0) neonMats.push({
							mat: ringMat,
							base: opac * .95
						});
						const mesh = new THREE.Mesh(hexGeo, ringMat);
						mesh.scale.setScalar(size * s);
						mesh.renderOrder = 10 + Math.floor(mag);
						g.add(mesh);
					});
					if (mag >= 5) {
						const spr = makeMagSprite(THREE, mag, colHex, opac);
						spr.scale.setScalar(size * 2.8);
						spr.position.set(0, 0, size * .15);
						g.add(spr);
					}
					quakeGroup.add(g);
					const meta = {
						id,
						lat,
						lon,
						mag,
						place,
						depth,
						time: f.properties.time ?? null,
						url: f.properties.url ?? void 0,
						neon
					};
					pickList.push({
						mesh: g,
						meta
					});
					if (depth > 35) {
						const surf = latLonToVec(lat, lon, 1.004);
						stemPos.push(surf.x, surf.y, surf.z, pos.x, pos.y, pos.z);
						stemCol.push(col.r, col.g, col.b, col.r, col.g, col.b);
					}
				}
				if (stemPos.length) {
					const sg = new THREE.BufferGeometry();
					sg.setAttribute("position", new THREE.Float32BufferAttribute(stemPos, 3));
					sg.setAttribute("color", new THREE.Float32BufferAttribute(stemCol, 3));
					const stems = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({
						vertexColors: true,
						transparent: true,
						opacity: Math.max(.2, opac * .5),
						depthWrite: false
					}));
					quakeGroup.add(stems);
				}
				if (focus) {
					const [[latMin, lonMin], [latMax, lonMax]] = focus.bounds;
					const edges = [
						[
							latMin,
							lonMin,
							latMin,
							lonMax
						],
						[
							latMin,
							lonMax,
							latMax,
							lonMax
						],
						[
							latMax,
							lonMax,
							latMax,
							lonMin
						],
						[
							latMax,
							lonMin,
							latMin,
							lonMin
						]
					];
					const verts = [];
					for (const [la0, lo0, la1, lo1] of edges) for (let i = 0; i <= 24; i++) {
						const t = i / 24;
						const la = la0 + (la1 - la0) * t;
						const lo = lo0 + (lo1 - lo0) * t;
						const vv = latLonToVec(la, lo > 180 ? lo - 360 : lo, 1.03);
						verts.push(vv.x, vv.y, vv.z);
					}
					const rg = new THREE.BufferGeometry();
					rg.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
					focusRing = new THREE.Line(rg, new THREE.LineBasicMaterial({
						color: 2282478,
						transparent: true,
						opacity: .9
					}));
					scene.add(focusRing);
					aimAt(focus.center?.[0] ?? (latMin + latMax) / 2, focus.center?.[1] ?? (lonMin + lonMax) / 2, false);
				}
			}
			updateRef.current = updateMarkers;
			updateMarkers(filteredEq(eq?.features, minMag, maxMag), focusNodeId);
			const el = renderer.domElement;
			el.style.touchAction = "none";
			const ray = new THREE.Raycaster();
			ray.params.Points = { threshold: .08 };
			const mouse = new THREE.Vector2();
			function pickAt(clientX, clientY) {
				const rect = el.getBoundingClientRect();
				mouse.x = (clientX - rect.left) / rect.width * 2 - 1;
				mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
				ray.setFromCamera(mouse, camera);
				const objs = pickList.map((p) => p.mesh);
				const hits = ray.intersectObjects(objs, true);
				if (!hits.length) return null;
				let o = hits[0].object;
				while (o) {
					const found = pickList.find((p) => p.mesh === o);
					if (found) return found.meta;
					o = o.parent;
				}
				return null;
			}
			function applyPick(meta) {
				const ev = {
					id: meta.id,
					lat: meta.lat,
					lon: meta.lon,
					mag: meta.mag,
					place: meta.place,
					depth: meta.depth,
					time: meta.time,
					url: meta.url
				};
				pickEvent(ev);
				aimAt(meta.lat, meta.lon, true);
				if (pickRing) {
					quakeGroup.remove(pickRing);
					pickRing.geometry.dispose();
					pickRing.material.dispose();
				}
				const elev = 1.012 + Math.min(meta.depth, 700) / 700 * stemRef.current + .02 * hexRef.current;
				const p = latLonToVec(meta.lat, meta.lon, elev + .012);
				pickRing = new THREE.Mesh(new THREE.RingGeometry(.028, .038, 6), new THREE.MeshBasicMaterial({
					color: 16777215,
					transparent: true,
					opacity: .95,
					side: THREE.DoubleSide,
					depthWrite: false
				}));
				pickRing.position.copy(p);
				pickRing.lookAt(0, 0, 0);
				pickRing.rotateY(Math.PI);
				quakeGroup.add(pickRing);
			}
			const onDown = (x, y) => {
				rotating = true;
				autoRef.current = false;
				lastX = x;
				lastY = y;
			};
			const onMove = (x, y) => {
				if (!rotating) return;
				const dx = x - lastX;
				const dy = y - lastY;
				lastX = x;
				lastY = y;
				spherical.theta -= dx * .005;
				spherical.phi = Math.max(.12, Math.min(Math.PI - .12, spherical.phi + dy * .005));
				applyCam();
			};
			const onUp = () => {
				rotating = false;
			};
			let pinchStartDist = 0;
			let pinchStartRadius = spherical.radius;
			let dragMoved = false;
			const touchDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
			const md = (e) => {
				dragMoved = false;
				onDown(e.clientX, e.clientY);
			};
			const mm = (e) => {
				if (rotating) {
					if (Math.hypot(e.clientX - lastX, e.clientY - lastY) > 3) dragMoved = true;
				}
				onMove(e.clientX, e.clientY);
			};
			const mu = (e) => {
				const was = rotating;
				onUp();
				if (was && !dragMoved && e.button === 0) {
					const meta = pickAt(e.clientX, e.clientY);
					if (meta) applyPick(meta);
				}
			};
			const ctx = (e) => {
				e.preventDefault();
				const meta = pickAt(e.clientX, e.clientY);
				if (meta) {
					applyPick(meta);
					if (meta.url) window.open(meta.url, "_blank", "noopener,noreferrer");
				}
			};
			el.addEventListener("mousedown", md);
			window.addEventListener("mousemove", mm);
			window.addEventListener("mouseup", mu);
			el.addEventListener("contextmenu", ctx);
			const ts = (e) => {
				dragMoved = false;
				if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY);
				else if (e.touches.length === 2) {
					rotating = false;
					pinchStartDist = touchDist(e.touches[0], e.touches[1]);
					pinchStartRadius = spherical.radius;
					autoRef.current = false;
				}
			};
			const tm = (e) => {
				if (e.touches.length === 2) {
					e.preventDefault();
					const d = touchDist(e.touches[0], e.touches[1]);
					if (pinchStartDist > 0) {
						const scale = pinchStartDist / Math.max(d, 1);
						spherical.radius = Math.max(1.55, Math.min(5.5, pinchStartRadius * scale));
						applyCam();
					}
					return;
				}
				if (e.touches.length === 1) {
					e.preventDefault();
					const t = e.touches[0];
					if (Math.hypot(t.clientX - lastX, t.clientY - lastY) > 4) dragMoved = true;
					onMove(t.clientX, t.clientY);
				}
			};
			const te = (e) => {
				if (e.touches.length < 2) pinchStartDist = 0;
				if (e.touches.length === 0) {
					const was = rotating;
					const cx = e.changedTouches[0]?.clientX;
					const cy = e.changedTouches[0]?.clientY;
					onUp();
					if (was && !dragMoved && cx != null && cy != null) {
						const meta = pickAt(cx, cy);
						if (meta) applyPick(meta);
					}
				} else if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY);
			};
			el.addEventListener("touchstart", ts, { passive: true });
			el.addEventListener("touchmove", tm, { passive: false });
			el.addEventListener("touchend", te);
			el.addEventListener("touchcancel", te);
			const wheel = (e) => {
				e.preventDefault();
				spherical.radius = Math.max(1.55, Math.min(5.5, spherical.radius + e.deltaY * .002));
				applyCam();
			};
			el.addEventListener("wheel", wheel, { passive: false });
			const onKey = (e) => {
				if (e.key === "r" || e.key === "R") recenterRef.current?.();
				if (e.ctrlKey && (e.key === "a" || e.key === "A")) e.preventDefault();
			};
			window.addEventListener("keydown", onKey);
			const pinGroup = new THREE.Group();
			for (const node of DRAGON_NODES) {
				const v = latLonToVec(node.center?.[0] ?? (node.bounds[0][0] + node.bounds[1][0]) / 2, node.center?.[1] ?? (node.bounds[0][1] <= node.bounds[1][1] ? (node.bounds[0][1] + node.bounds[1][1]) / 2 : -175), 1.028);
				const pin = new THREE.Mesh(new THREE.SphereGeometry(node.publishedFocus ? .02 : .013, 10, 10), new THREE.MeshBasicMaterial({
					color: node.kind === "volcano" ? 16486972 : node.publishedFocus ? 16498468 : 2282478,
					transparent: true,
					opacity: .95
				}));
				pin.position.copy(v);
				pinGroup.add(pin);
			}
			scene.add(pinGroup);
			let animId = 0;
			let active = true;
			let blink = 0;
			const animate = () => {
				if (!active) return;
				animId = requestAnimationFrame(animate);
				if (aimAnim) {
					const t = Math.min(1, (performance.now() - aimAnim.t0) / aimAnim.dur);
					const e = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
					spherical.theta = aimAnim.from.theta + (aimAnim.to.theta - aimAnim.from.theta) * e;
					spherical.phi = aimAnim.from.phi + (aimAnim.to.phi - aimAnim.from.phi) * e;
					spherical.radius = aimAnim.from.radius + (aimAnim.to.radius - aimAnim.from.radius) * e;
					applyCam();
					if (t >= 1) aimAnim = null;
				} else if (autoRef.current && !rotating) {
					spherical.theta += .0022 * spinSpdRef.current;
					applyCam();
				}
				blink += .045;
				const bo = .42 + .58 * Math.abs(Math.sin(blink));
				for (const n of neonMats) n.mat.opacity = n.base * bo;
				renderer.render(scene, camera);
			};
			animate();
			const onResize = () => {
				if (!container) return;
				const nw = Math.max(container.clientWidth, 280);
				const nh = Math.max(container.clientHeight, 320);
				camera.aspect = nw / nh;
				camera.updateProjectionMatrix();
				renderer.setSize(nw, nh);
			};
			window.addEventListener("resize", onResize);
			const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => onResize()) : null;
			ro?.observe(container);
			const hint = document.createElement("div");
			hint.className = "pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[92%] -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface/95 px-3 py-1.5 text-[0.68rem] text-muted shadow";
			hint.textContent = "Drag · pinch zoom · click hex = select · R recenter · stems = depth";
			container.style.position = "relative";
			container.appendChild(hint);
			const legend = document.createElement("div");
			legend.className = "pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-border bg-surface/90 px-2.5 py-1.5 text-[0.68rem] text-muted";
			legend.innerHTML = "<span style=\"color:#34d399\">⬡</span> M3–4 &nbsp; <span style=\"color:#fbbf24\">⬡</span> M4–5 &nbsp; <span style=\"color:#fb923c\">⬡</span> M5–6 &nbsp; <span style=\"color:#f43f5e\">⬡</span> M6+ &nbsp; <span style=\"opacity:.75\">| stem = depth · pulse M7+</span>";
			container.appendChild(legend);
			cleanupRef.current = () => {
				active = false;
				cancelAnimationFrame(animId);
				window.removeEventListener("mousemove", mm);
				window.removeEventListener("mouseup", mu);
				window.removeEventListener("resize", onResize);
				window.removeEventListener("keydown", onKey);
				ro?.disconnect();
				el.removeEventListener("mousedown", md);
				el.removeEventListener("contextmenu", ctx);
				el.removeEventListener("touchstart", ts);
				el.removeEventListener("touchmove", tm);
				el.removeEventListener("touchend", te);
				el.removeEventListener("touchcancel", te);
				el.removeEventListener("wheel", wheel);
				disposeGroup(quakeGroup);
				if (focusRing) {
					scene.remove(focusRing);
					focusRing.geometry.dispose();
					focusRing.material.dispose();
				}
				hexGeo.dispose();
				earth.geometry.dispose();
				if (mat.map) mat.map.dispose();
				baseTex.dispose();
				mat.dispose();
				atmo.geometry.dispose();
				atmo.material.dispose();
				glow.geometry.dispose();
				glow.material.dispose();
				renderer.dispose();
				if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
				container.innerHTML = "";
				updateRef.current = null;
				aimRef.current = null;
				recenterRef.current = null;
			};
		})().catch((err) => {
			console.error(err);
			if (container) container.innerHTML = "<div class=\"flex h-full min-h-[280px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted\"><p class=\"text-danger\">3D Globe failed to load.</p><p class=\"text-xs text-dim\">Use 2D Map — Full mode globe needs WebGL.</p></div>";
		});
		return () => {
			cancelled = true;
			cleanupRef.current?.();
			cleanupRef.current = null;
		};
	}, [mapView, mode]);
	(0, import_react.useEffect)(() => {
		if (mapView === "3d" && updateRef.current) updateRef.current(filteredEq(eq?.features, minMag, maxMag), focusNodeId);
	}, [
		eq,
		minMag,
		maxMag,
		mapView,
		focusNodeId,
		globeStemScale,
		globeMarkerScale,
		globeMarkerOpacity
	]);
	(0, import_react.useEffect)(() => {
		if (mapView !== "3d" || !globeAntipode || !aimRef.current) return;
		aimRef.current(globeAntipode.lat, globeAntipode.lon, true);
		clearGlobeAntipode();
	}, [
		globeAntipode,
		mapView,
		clearGlobeAntipode
	]);
	if (mapView !== "3d" || mode !== "full") return null;
	const focus = getFocusNode(focusNodeId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-full min-h-[320px] w-full overflow-hidden rounded-lg border border-border bg-[#0b1220]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: containerRef,
				className: "h-full min-h-[320px] w-full"
			}),
			pickedEvent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto absolute left-3 top-14 z-20 max-w-[min(280px,70vw)] rounded-md border border-border bg-surface/95 px-2.5 py-2 text-[0.72rem] shadow-lg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono font-semibold tabular-nums",
							style: { color: magColor(pickedEvent.mag) },
							children: ["M", pickedEvent.mag.toFixed(1)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 line-clamp-2 text-fg",
							children: pickedEvent.place
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[0.62rem] text-dim",
							children: [
								pickedEvent.depth.toFixed(0),
								" km",
								pickedEvent.time ? ` · ${new Date(pickedEvent.time).toLocaleString(void 0, {
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit"
								})}` : ""
							]
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn ww-btn--ghost px-1.5 text-[0.6rem]",
						onClick: () => pickEvent(null),
						"aria-label": "Clear pick",
						children: "✕"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1.5 flex flex-wrap gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn text-[0.62rem]",
						onClick: () => antipodeOf(pickedEvent.lat, pickedEvent.lon),
						children: "Antipode ⊕"
					}), pickedEvent.url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: pickedEvent.url,
						target: "_blank",
						rel: "noopener noreferrer",
						className: "ww-btn text-[0.62rem]",
						children: "Detail"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto absolute bottom-12 right-2 z-20 flex flex-col gap-1.5 sm:right-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `ww-btn text-[0.65rem] ${globeAutoSpin ? "ww-btn--active" : ""}`,
						onClick: () => setGlobeAutoSpin(!globeAutoSpin),
						children: globeAutoSpin ? "Spin ON" : "Spin OFF"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn text-[0.65rem]",
						onClick: () => recenterRef.current?.(),
						children: "Recenter"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn text-[0.65rem]",
						title: "Antipode of picked event, focus, or equator",
						onClick: () => {
							if (pickedEvent) antipodeOf(pickedEvent.lat, pickedEvent.lon);
							else if (focus?.center) antipodeOf(focus.center[0], focus.center[1]);
							else if (focus) {
								const [[a, b], [c, d]] = focus.bounds;
								antipodeOf((a + c) / 2, b <= d ? (b + d) / 2 : -175);
							} else antipodeOf(0, 0);
						},
						children: "Antipode"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `ww-btn text-[0.65rem] ${showTune ? "ww-btn--active" : ""}`,
						onClick: () => setShowTune((v) => !v),
						children: "Tune"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "ww-btn text-[0.65rem]",
						onClick: () => setMapView("2d"),
						children: "2D Map"
					})
				]
			}),
			showTune && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-auto absolute bottom-12 left-2 z-20 w-[min(220px,70vw)] space-y-2 rounded-md border border-border bg-surface/95 p-2.5 text-[0.68rem] shadow-lg sm:left-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium uppercase tracking-wider text-primary",
						children: "Globe tune"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-dim",
						children: [
							"Hex size",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "float-right font-mono text-primary",
								children: [globeMarkerScale.toFixed(1), "×"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: .4,
								max: 3.2,
								step: .05,
								value: globeMarkerScale,
								onChange: (e) => setGlobeMarkerScale(parseFloat(e.target.value)),
								className: "mt-0.5 w-full accent-primary"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-dim",
						children: [
							"Opacity",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "float-right font-mono text-primary",
								children: [Math.round(globeMarkerOpacity * 100), "%"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: .25,
								max: 1,
								step: .01,
								value: globeMarkerOpacity,
								onChange: (e) => setGlobeMarkerOpacity(parseFloat(e.target.value)),
								className: "mt-0.5 w-full accent-primary"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-dim",
						children: [
							"Stem height",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "float-right font-mono text-primary",
								children: globeStemScale.toFixed(2)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: .04,
								max: .4,
								step: .01,
								value: globeStemScale,
								onChange: (e) => setGlobeStemScale(parseFloat(e.target.value)),
								className: "mt-0.5 w-full accent-primary"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-dim",
						children: [
							"Spin speed",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "float-right font-mono text-primary",
								children: globeSpinSpeed.toFixed(2)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: .15,
								max: 2.5,
								step: .05,
								value: globeSpinSpeed,
								onChange: (e) => setGlobeSpinSpeed(parseFloat(e.target.value)),
								className: "mt-0.5 w-full accent-primary"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[0.58rem] leading-snug text-dim",
						children: "Public-globe visual knobs — values persist locally."
					})
				]
			})
		]
	});
}
function makeHexRingGeometry(THREE, outer = 1, thick = .22) {
	const shape = new THREE.Shape();
	for (let i = 0; i <= 6; i++) {
		const a = i / 6 * Math.PI * 2 + Math.PI / 6;
		const x = Math.cos(a) * outer;
		const y = Math.sin(a) * outer;
		if (i === 0) shape.moveTo(x, y);
		else shape.lineTo(x, y);
	}
	const hole = new THREE.Path();
	const inner = Math.max(.05, outer - thick);
	for (let i = 0; i <= 6; i++) {
		const a = i / 6 * Math.PI * 2 + Math.PI / 6;
		const x = Math.cos(a) * inner;
		const y = Math.sin(a) * inner;
		if (i === 0) hole.moveTo(x, y);
		else hole.lineTo(x, y);
	}
	shape.holes.push(hole);
	return new THREE.ShapeGeometry(shape);
}
function makeMagSprite(THREE, mag, color, opac) {
	const c = document.createElement("canvas");
	c.width = 64;
	c.height = 32;
	const ctx = c.getContext("2d");
	ctx.clearRect(0, 0, 64, 32);
	ctx.font = "bold 20px system-ui,sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.lineWidth = 3;
	ctx.strokeStyle = "rgba(0,0,0,0.75)";
	ctx.fillStyle = color;
	const t = mag.toFixed(1);
	ctx.strokeText(t, 32, 16);
	ctx.fillText(t, 32, 16);
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	const mat = new THREE.SpriteMaterial({
		map: tex,
		transparent: true,
		opacity: Math.min(1, opac + .2),
		depthWrite: false
	});
	return new THREE.Sprite(mat);
}
function makeProceduralEarth(THREE) {
	const c = document.createElement("canvas");
	c.width = 1024;
	c.height = 512;
	const ctx = c.getContext("2d");
	const g = ctx.createLinearGradient(0, 0, 0, 512);
	g.addColorStop(0, "#1e4d7b");
	g.addColorStop(.35, "#0f3a62");
	g.addColorStop(.5, "#0c3358");
	g.addColorStop(.65, "#0f3a62");
	g.addColorStop(1, "#1e4d7b");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 1024, 512);
	const iceN = ctx.createLinearGradient(0, 0, 0, 70);
	iceN.addColorStop(0, "rgba(226,232,240,0.55)");
	iceN.addColorStop(1, "rgba(226,232,240,0)");
	ctx.fillStyle = iceN;
	ctx.fillRect(0, 0, 1024, 70);
	const iceS = ctx.createLinearGradient(0, 512, 0, 442);
	iceS.addColorStop(0, "rgba(226,232,240,0.5)");
	iceS.addColorStop(1, "rgba(226,232,240,0)");
	ctx.fillStyle = iceS;
	ctx.fillRect(0, 442, 1024, 70);
	ctx.fillStyle = "#2f6b4f";
	for (const [x, y, w, h] of [
		[
			180,
			120,
			220,
			160
		],
		[
			280,
			200,
			90,
			140
		],
		[
			480,
			100,
			160,
			100
		],
		[
			520,
			180,
			140,
			180
		],
		[
			620,
			120,
			220,
			120
		],
		[
			780,
			220,
			100,
			80
		],
		[
			820,
			280,
			120,
			70
		],
		[
			100,
			280,
			80,
			100
		]
	]) {
		ctx.beginPath();
		ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.strokeStyle = "rgba(148,163,184,0.18)";
	ctx.lineWidth = 1;
	for (let y = 0; y <= 512; y += 32) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(1024, y);
		ctx.stroke();
	}
	for (let x = 0; x <= 1024; x += 32) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, 512);
		ctx.stroke();
	}
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}
//#endregion
export { Globe3D };
