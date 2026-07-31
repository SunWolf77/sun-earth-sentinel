import { i as __toESM } from "../_runtime.mjs";
import { N as require_react, h as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { D as getFocusNode, E as getAllFocusNodes, G as viewEvents, I as nodeEventStats, M as isMobileViewport, R as nodeStatus, W as useObservatory, n as AVIATION_LABEL, t as AVIATION_COLOR } from "./observatory-DWEcu3Hj.mjs";
import { V as Crosshair, n as X, w as Mountain, z as ExternalLink } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reference-DIt7NWTn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Major PB2002 plates — absolute NNR-ish poles (°/Myr). */
var EULER_POLES = {
	AF: {
		lat: 50.6,
		lon: -74,
		omega: .285
	},
	AM: {
		lat: 60,
		lon: -120,
		omega: .25
	},
	AN: {
		lat: 65.9,
		lon: -118.1,
		omega: .25
	},
	AR: {
		lat: 27.4,
		lon: 4.2,
		omega: .515
	},
	AU: {
		lat: 33.9,
		lon: 37.8,
		omega: .632
	},
	BH: {
		lat: 30,
		lon: 90,
		omega: .4
	},
	BR: {
		lat: -1,
		lon: -76,
		omega: .2
	},
	BS: {
		lat: 20,
		lon: 140,
		omega: .3
	},
	BU: {
		lat: 15,
		lon: 95,
		omega: .5
	},
	CA: {
		lat: 35,
		lon: -93,
		omega: .25
	},
	CL: {
		lat: 15,
		lon: -105,
		omega: 1.2
	},
	CO: {
		lat: 36.8,
		lon: -108.6,
		omega: 1.2
	},
	CR: {
		lat: 20,
		lon: -105,
		omega: 1.5
	},
	EA: {
		lat: 55,
		lon: 140,
		omega: .9
	},
	EU: {
		lat: 56.3,
		lon: -99.7,
		omega: .223
	},
	FT: {
		lat: 0,
		lon: -110,
		omega: .5
	},
	GP: {
		lat: 15,
		lon: -105,
		omega: 1
	},
	IN: {
		lat: 50.9,
		lon: 1.5,
		omega: .524
	},
	JF: {
		lat: -11.4,
		lon: 65,
		omega: .95
	},
	JZ: {
		lat: -10,
		lon: -110,
		omega: 1
	},
	KE: {
		lat: -40,
		lon: 50,
		omega: .8
	},
	MA: {
		lat: 0,
		lon: 80,
		omega: .6
	},
	MN: {
		lat: 5,
		lon: 125,
		omega: .5
	},
	MO: {
		lat: 15,
		lon: 125,
		omega: .4
	},
	MS: {
		lat: -5,
		lon: 145,
		omega: .4
	},
	NA: {
		lat: -4.9,
		lon: -80.6,
		omega: .209
	},
	NB: {
		lat: 0,
		lon: 135,
		omega: .5
	},
	ND: {
		lat: 10,
		lon: 95,
		omega: .4
	},
	NH: {
		lat: -10,
		lon: 170,
		omega: 1.5
	},
	NI: {
		lat: 10,
		lon: -85,
		omega: .8
	},
	NZ: {
		lat: 55.6,
		lon: -90.1,
		omega: .636
	},
	OK: {
		lat: 30,
		lon: 140,
		omega: .3
	},
	ON: {
		lat: 35,
		lon: 135,
		omega: .5
	},
	PA: {
		lat: -63.1,
		lon: 107.2,
		omega: .651
	},
	PM: {
		lat: 50,
		lon: -100,
		omega: .2
	},
	PS: {
		lat: -2,
		lon: 135,
		omega: .9
	},
	RI: {
		lat: 20,
		lon: -107,
		omega: 1.8
	},
	SA: {
		lat: -16.3,
		lon: -117.9,
		omega: .121
	},
	SB: {
		lat: -5,
		lon: 150,
		omega: .8
	},
	SC: {
		lat: 22,
		lon: -100,
		omega: .15
	},
	SL: {
		lat: 10,
		lon: -85,
		omega: .5
	},
	SO: {
		lat: 58.8,
		lon: -81.6,
		omega: .339
	},
	SS: {
		lat: 0,
		lon: 120,
		omega: .5
	},
	SU: {
		lat: 50,
		lon: -90,
		omega: .3
	},
	SW: {
		lat: -55,
		lon: -30,
		omega: .3
	},
	TI: {
		lat: -5,
		lon: 125,
		omega: .6
	},
	TO: {
		lat: -28,
		lon: -175,
		omega: 2.5
	},
	WL: {
		lat: 0,
		lon: 140,
		omega: .4
	},
	YA: {
		lat: 40,
		lon: 140,
		omega: .3
	}
};
var R_EARTH_KM = 6371;
var DEG2RAD = Math.PI / 180;
var RAD2DEG = 180 / Math.PI;
/** Convert Euler pole to Cartesian angular velocity (rad/Myr). */
function omegaVector(pole) {
	const lat = pole.lat * DEG2RAD;
	const lon = pole.lon * DEG2RAD;
	const w = pole.omega * DEG2RAD;
	return [
		w * Math.cos(lat) * Math.cos(lon),
		w * Math.cos(lat) * Math.sin(lon),
		w * Math.sin(lat)
	];
}
function positionUnit(lat, lon) {
	const φ = lat * DEG2RAD;
	const λ = lon * DEG2RAD;
	return [
		Math.cos(φ) * Math.cos(λ),
		Math.cos(φ) * Math.sin(λ),
		Math.sin(φ)
	];
}
function cross(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0]
	];
}
/**
* Horizontal surface velocity of a plate at (lat, lon) in mm/yr.
* v = ω × r  → tangential speed = |ω×r̂| * R_earth.
* Convert rad/Myr * km → mm/yr: * 1e6 mm/km / Myr… wait:
* |ω| in rad/Myr, R in km → speed km/Myr = |ω×r| * R
* km/Myr * 1e6 mm/km / 1e6 yr/Myr? 1 Myr = 1e6 yr
* km/Myr = 1e6 mm / 1e6 yr = mm/yr. So speed_mm_yr = |ω×r̂| * R_km.
*/
function plateVelocity(plateCode, lat, lon) {
	const pole = EULER_POLES[plateCode];
	if (!pole) return null;
	const vCart = cross(omegaVector(pole), positionUnit(lat, lon));
	const φ = lat * DEG2RAD;
	const λ = lon * DEG2RAD;
	const east = [
		-Math.sin(λ),
		Math.cos(λ),
		0
	];
	const north = [
		-Math.sin(φ) * Math.cos(λ),
		-Math.sin(φ) * Math.sin(λ),
		Math.cos(φ)
	];
	const ve_rad = vCart[0] * east[0] + vCart[1] * east[1] + vCart[2] * east[2];
	const vn_rad = vCart[0] * north[0] + vCart[1] * north[1] + vCart[2] * north[2];
	const ve = ve_rad * R_EARTH_KM;
	const vn = vn_rad * R_EARTH_KM;
	const speed = Math.hypot(ve, vn);
	let bearing = Math.atan2(ve, vn) * RAD2DEG;
	if (bearing < 0) bearing += 360;
	return {
		ve,
		vn,
		speed,
		bearing
	};
}
/** Relative velocity of plate A w.r.t. plate B at a point. */
function relativeVelocity(plateA, plateB, lat, lon) {
	const a = plateVelocity(plateA, lat, lon);
	const b = plateVelocity(plateB, lat, lon);
	if (!a || !b) {
		if (a) return a;
		if (b) return {
			ve: -b.ve,
			vn: -b.vn,
			speed: b.speed,
			bearing: (b.bearing + 180) % 360
		};
		return null;
	}
	const ve = a.ve - b.ve;
	const vn = a.vn - b.vn;
	const speed = Math.hypot(ve, vn);
	let bearing = Math.atan2(ve, vn) * RAD2DEG;
	if (bearing < 0) bearing += 360;
	return {
		ve,
		vn,
		speed,
		bearing
	};
}
/**
* Attach mobile-first gestures to a Leaflet map instance.
*/
function attachMapTouchGestures(map, opts = {}) {
	const el = map.getContainer();
	const doubleTapZoomDelta = opts.doubleTapZoomDelta ?? 1;
	const longPressMs = opts.longPressMs ?? 520;
	el.classList.add("ww-map--touch");
	el.style.touchAction = "none";
	el.style.userSelect = "none";
	el.style.webkitUserSelect = "none";
	map.dragging?.enable();
	map.touchZoom?.enable();
	map.doubleClickZoom?.enable();
	map.scrollWheelZoom?.enable();
	map.boxZoom?.enable();
	map.keyboard?.enable();
	map.options.bounceAtZoomLimits = false;
	map.options.worldCopyJump = true;
	let lastTapAt = 0;
	let lastTapX = 0;
	let lastTapY = 0;
	let longTimer = null;
	let pressStart = null;
	let moved = false;
	let suppressClick = false;
	const clearLong = () => {
		if (longTimer) {
			clearTimeout(longTimer);
			longTimer = null;
		}
	};
	const clientXY = (e) => {
		if ("changedTouches" in e && e.changedTouches[0]) return {
			x: e.changedTouches[0].clientX,
			y: e.changedTouches[0].clientY
		};
		if ("clientX" in e) return {
			x: e.clientX,
			y: e.clientY
		};
		return {
			x: 0,
			y: 0
		};
	};
	const onPointerDown = (e) => {
		if ("touches" in e && e.touches.length > 1) {
			clearLong();
			pressStart = null;
			return;
		}
		const { x, y } = clientXY(e);
		pressStart = {
			x,
			y,
			t: Date.now()
		};
		moved = false;
		clearLong();
		longTimer = setTimeout(() => {
			if (!pressStart || moved) return;
			const rect = el.getBoundingClientRect();
			const point = map.containerPointToLatLng([pressStart.x - rect.left, pressStart.y - rect.top]);
			opts.onLongPress?.(point.lat, point.lng);
			suppressClick = true;
			try {
				navigator.vibrate?.(12);
			} catch {}
		}, longPressMs);
	};
	const onPointerMove = (e) => {
		if (!pressStart) return;
		if ("touches" in e && e.touches.length > 1) {
			clearLong();
			return;
		}
		const { x, y } = clientXY(e);
		if (Math.hypot(x - pressStart.x, y - pressStart.y) > 12) {
			moved = true;
			clearLong();
		}
	};
	const onPointerUp = (e) => {
		clearLong();
		if ("touches" in e && e.touches.length > 0) {
			pressStart = null;
			return;
		}
		if (suppressClick) {
			suppressClick = false;
			pressStart = null;
			return;
		}
		if (!pressStart || moved) {
			pressStart = null;
			return;
		}
		if ("touches" in e && e.changedTouches.length !== 1) {
			pressStart = null;
			return;
		}
		const { x, y } = clientXY(e);
		const now = Date.now();
		const dt = now - lastTapAt;
		const dist = Math.hypot(x - lastTapX, y - lastTapY);
		if (dt < 320 && dist < 36) {
			const rect = el.getBoundingClientRect();
			const latlng = map.containerPointToLatLng([x - rect.left, y - rect.top]);
			const z = Math.min(map.getMaxZoom(), map.getZoom() + doubleTapZoomDelta);
			map.setView(latlng, z, { animate: true });
			lastTapAt = 0;
			e.preventDefault?.();
		} else {
			lastTapAt = now;
			lastTapX = x;
			lastTapY = y;
		}
		pressStart = null;
	};
	const onPointerCancel = () => {
		clearLong();
		pressStart = null;
	};
	const usePointer = typeof window !== "undefined" && "PointerEvent" in window;
	if (usePointer) {
		el.addEventListener("pointerdown", onPointerDown, { passive: true });
		el.addEventListener("pointermove", onPointerMove, { passive: true });
		el.addEventListener("pointerup", onPointerUp, { passive: false });
		el.addEventListener("pointercancel", onPointerCancel, { passive: true });
	} else {
		el.addEventListener("touchstart", onPointerDown, { passive: true });
		el.addEventListener("touchmove", onPointerMove, { passive: true });
		el.addEventListener("touchend", onPointerUp, { passive: false });
		el.addEventListener("touchcancel", onPointerCancel, { passive: true });
	}
	const onTouchMoveDoc = (e) => {
		if (!el.contains(e.target)) return;
		if (e.touches.length >= 1) {
			if (e.cancelable && (e.target === el || el.contains(e.target))) {}
		}
	};
	document.addEventListener("touchmove", onTouchMoveDoc, { passive: true });
	return { destroy() {
		clearLong();
		el.classList.remove("ww-map--touch");
		if (usePointer) {
			el.removeEventListener("pointerdown", onPointerDown);
			el.removeEventListener("pointermove", onPointerMove);
			el.removeEventListener("pointerup", onPointerUp);
			el.removeEventListener("pointercancel", onPointerCancel);
		} else {
			el.removeEventListener("touchstart", onPointerDown);
			el.removeEventListener("touchmove", onPointerMove);
			el.removeEventListener("touchend", onPointerUp);
			el.removeEventListener("touchcancel", onPointerCancel);
		}
		document.removeEventListener("touchmove", onTouchMoveDoc);
	} };
}
/**
* Horizontal swipe between tabs (mobile).
* Returns pointer handlers for a panel container.
*/
function createTabSwipe(opts) {
	const threshold = opts.threshold ?? 56;
	const maxVertical = opts.maxVertical ?? 48;
	let startX = 0;
	let startY = 0;
	let tracking = false;
	return {
		onTouchStart(e) {
			if (e.touches.length !== 1) return;
			const t = e.touches[0];
			startX = t.clientX;
			startY = t.clientY;
			tracking = true;
		},
		onTouchEnd(e) {
			if (!tracking || e.changedTouches.length !== 1) {
				tracking = false;
				return;
			}
			const t = e.changedTouches[0];
			const dx = t.clientX - startX;
			const dy = t.clientY - startY;
			tracking = false;
			if (Math.abs(dy) > maxVertical) return;
			if (Math.abs(dx) < threshold) return;
			const target = e.target;
			if (target?.closest?.(".leaflet-container, .ww-map, canvas, .scroll-thin")) {
				if (target.closest(".leaflet-container, .ww-map, canvas")) return;
			}
			if (dx < 0) opts.onSwipeLeft();
			else opts.onSwipeRight();
		},
		onTouchCancel() {
			tracking = false;
		}
	};
}
var STATUS_DOT = {
	quiet: "bg-primary border-primary",
	elevated: "bg-gold border-gold",
	active: "bg-warn border-warn",
	watch: "bg-danger border-danger animate-pulse-soft"
};
var STATUS_LABEL = {
	quiet: "Quiet",
	elevated: "Elevated",
	active: "Active",
	watch: "Watch"
};
/**
* Lightweight node focus — fly-to + filter + status.
* Includes seismic corridors, manual volcano watches, and live USGS elevated volcanoes (auto-drop when green).
*/
function NodeFocusPanel({ allFeatures }) {
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const setFocusNode = useObservatory((s) => s.setFocusNode);
	useObservatory((s) => s.volcWatchNodes);
	const focus = getFocusNode(focusNodeId);
	const allNodes = getAllFocusNodes();
	const ranked = [...allNodes].sort((a, b) => {
		const aUsgs = a.id.startsWith("usgs-volc-");
		const bUsgs = b.id.startsWith("usgs-volc-");
		if (aUsgs && !bUsgs) return -1;
		if (!aUsgs && bUsgs) return 1;
		if (a.watchPriority && !b.watchPriority) return -1;
		if (!a.watchPriority && b.watchPriority) return 1;
		const rank = (id) => {
			const st = nodeStatus(allFeatures, allNodes.find((x) => x.id === id));
			if (st === "watch") return 0;
			if (st === "active") return 1;
			if (st === "elevated") return 2;
			return 3;
		};
		const ra = rank(a.id);
		const rb = rank(b.id);
		if (ra !== rb) return ra - rb;
		if (a.publishedFocus && !b.publishedFocus) return -1;
		if (!a.publishedFocus && b.publishedFocus) return 1;
		return a.name.localeCompare(b.name);
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-primary",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, { className: "h-3.5 w-3.5" }), "Node Focus"]
				}), focus && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setFocusNode(null),
					className: "inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[0.65rem] text-muted hover:text-fg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3 w-3" }), "Global"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[0.65rem] leading-snug text-dim",
				children: "Tap a node for swarm corridors or volcano watches — map zooms, list filters. Not a forecast product."
			}),
			focus && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `rounded-lg border px-2.5 py-2 ${focus.kind === "volcano" ? "border-warn/50 bg-warn/10" : "border-primary/40 bg-primary/10"}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 text-xs font-semibold text-fg",
								children: [focus.kind === "volcano" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mountain, { className: "h-3.5 w-3.5 shrink-0 text-warn" }), focus.name]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[0.65rem] text-dim",
								children: focus.role
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] font-medium ${nodeStatus(allFeatures, focus) === "watch" ? "border-danger/50 text-danger" : nodeStatus(allFeatures, focus) === "active" ? "border-warn/50 text-warn" : "border-primary/40 text-primary"}`,
							children: STATUS_LABEL[nodeStatus(allFeatures, focus)]
						})]
					}),
					focus.kind === "volcano" && focus.aviationCode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.68rem]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-semibold",
							style: {
								borderColor: AVIATION_COLOR[focus.aviationCode],
								color: AVIATION_COLOR[focus.aviationCode]
							},
							children: ["Aviation ", AVIATION_LABEL[focus.aviationCode]]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-dim",
							children: "KVERT / GVP watch"
						})]
					}),
					focus.focusNote && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-[0.65rem] leading-snug text-muted",
						children: focus.focusNote
					}),
					(() => {
						const s = nodeEventStats(allFeatures, focus);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1.5 text-[0.68rem] text-muted",
							children: [
								s.count,
								" seismic in box",
								s.maxMag > 0 ? ` · max M${s.maxMag.toFixed(1)}` : "",
								s.m5 > 0 ? ` · ${s.m5}× M5+` : ""
							]
						});
					})(),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1.5 flex flex-wrap gap-2",
						children: [
							focus.gvpUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: focus.gvpUrl,
								target: "_blank",
								rel: "noopener noreferrer",
								className: "inline-flex items-center gap-1 text-[0.68rem] font-medium text-warn hover:underline",
								children: ["Smithsonian GVP", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
							}),
							focus.agencyUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: focus.agencyUrl,
								target: "_blank",
								rel: "noopener noreferrer",
								className: "inline-flex items-center gap-1 text-[0.68rem] font-medium text-primary hover:underline",
								children: ["KVERT", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
							}),
							focus.monitorUrl && focus.kind !== "volcano" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: focus.monitorUrl,
								target: "_blank",
								rel: "noopener noreferrer",
								className: "inline-flex items-center gap-1 text-[0.68rem] font-medium text-gold hover:underline",
								children: ["Open full swarm board", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "max-h-52 space-y-1 overflow-y-auto scroll-thin",
				children: ranked.map((node) => {
					const st = nodeStatus(allFeatures, node);
					const stats = nodeEventStats(allFeatures, node);
					const active = focusNodeId === node.id;
					const isVolc = node.kind === "volcano";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setFocusNode(active ? null : node.id),
						className: `flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition ${active ? isVolc ? "border-warn/50 bg-warn/15" : "border-primary/50 bg-primary/15" : "border-border/70 bg-panel hover:border-border-strong hover:bg-elevated/50"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `mt-1 h-2 w-2 shrink-0 rounded-full border ${STATUS_DOT[st]}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex flex-wrap items-center gap-1",
								children: [
									isVolc && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mountain, { className: "h-3 w-3 text-warn" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[0.75rem] font-medium text-fg",
										children: node.name
									}),
									node.watchPriority && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded border border-danger/40 px-1 text-[0.55rem] uppercase text-danger",
										children: "Volc watch"
									}),
									node.publishedFocus && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded border border-gold/40 px-1 text-[0.55rem] uppercase text-gold",
										children: "Pub"
									}),
									isVolc && node.aviationCode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded border px-1 text-[0.55rem] font-semibold uppercase",
										style: {
											borderColor: AVIATION_COLOR[node.aviationCode],
											color: AVIATION_COLOR[node.aviationCode]
										},
										children: AVIATION_LABEL[node.aviationCode]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block text-[0.62rem] text-dim",
								children: [isVolc ? `${STATUS_LABEL[st]} · volcano watch` : STATUS_LABEL[st], stats.count > 0 ? ` · ${stats.count} · M${stats.maxMag.toFixed(1)}` : isVolc ? " · local seismicity filter" : " · none in view"]
							})]
						})]
					}) }, node.id);
				})
			})
		]
	});
}
/** Compact map overlay when a node is focused. */
function NodeFocusBanner() {
	const focusNodeId = useObservatory((s) => s.focusNodeId);
	const setFocusNode = useObservatory((s) => s.setFocusNode);
	const eq = useObservatory((s) => s.eq);
	const minMag = useObservatory((s) => s.minMag);
	const maxMag = useObservatory((s) => s.maxMag);
	const focus = getFocusNode(focusNodeId);
	if (!focus) return null;
	const events = viewEvents(eq?.features, minMag, focusNodeId, maxMag);
	const st = nodeStatus(events.length ? events : eq?.features ?? [], focus);
	const stats = nodeEventStats(eq?.features ?? [], focus);
	const isVolc = focus.kind === "volcano";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `pointer-events-auto absolute left-3 right-3 top-3 z-[500] flex flex-wrap items-center gap-2 rounded-lg border bg-bg/95 px-3 py-2 text-xs shadow-lg backdrop-blur sm:left-auto sm:right-3 sm:max-w-md ${isVolc ? "border-warn/50" : "border-primary/40"}`,
		children: [
			isVolc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mountain, { className: "h-3.5 w-3.5 shrink-0 text-warn" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, { className: "h-3.5 w-3.5 shrink-0 text-primary" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold text-fg",
					children: focus.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[0.68rem] text-dim",
					children: isVolc && focus.aviationCode ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						"Aviation ",
						AVIATION_LABEL[focus.aviationCode],
						" · ",
						STATUS_LABEL[st],
						stats.count > 0 ? ` · ${stats.count} eq · max M${stats.maxMag.toFixed(1)}` : " · volcano watch"
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						STATUS_LABEL[st],
						" · ",
						stats.count,
						" events · max M",
						stats.maxMag > 0 ? stats.maxMag.toFixed(1) : "—",
						focus.publishedFocus ? " · published monitor available" : ""
					] })
				})]
			}),
			focus.gvpUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
				href: focus.gvpUrl,
				target: "_blank",
				rel: "noopener noreferrer",
				className: "inline-flex items-center gap-1 rounded-md border border-warn/40 bg-warn/10 px-2 py-1 text-[0.68rem] font-medium text-warn hover:bg-warn/20",
				children: ["GVP", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
			}),
			focus.monitorUrl && !isVolc && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
				href: focus.monitorUrl,
				target: "_blank",
				rel: "noopener noreferrer",
				className: "inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-[0.68rem] font-medium text-gold hover:bg-gold/20",
				children: ["Swarm board", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setFocusNode(null),
				className: "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted hover:text-fg",
				title: "Exit node focus",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
			})
		]
	});
}
/** false on SSR + first paint; then real viewport (avoids hydration mismatch). */
function useIsMobile() {
	const [mobile, setMobile] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const update = () => setMobile(isMobileViewport());
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);
	return mobile;
}
/**
* Educational seismology reference for About + legends.
* Not used for forecasting or early warning products.
*/
/** Half-life (h) for heat time-decay by USGS window — mirrors halfLifeForWindow. */
var DECAY_HALF_LIFE_H = {
	hour: .75,
	day: 6,
	week: 36,
	month: 120
};
/** Weight remaining at age for a given half-life (exponential). */
function decayAtAge(ageHours, halfLifeH) {
	return Math.pow(.5, ageHours / Math.max(.5, halfLifeH));
}
/**
* Legend rows for the active window: age → remaining weight %.
* Shows concrete values so "Decay" is not a black-box gradient.
*/
function timeDecayLegendRows(window) {
	const hl = DECAY_HALF_LIFE_H[window];
	return (window === "hour" ? [
		{
			ageLabel: "now",
			ageHours: 0
		},
		{
			ageLabel: "15 m",
			ageHours: .25
		},
		{
			ageLabel: "45 m",
			ageHours: .75
		},
		{
			ageLabel: "1.5 h",
			ageHours: 1.5
		},
		{
			ageLabel: "3 h",
			ageHours: 3
		}
	] : window === "day" ? [
		{
			ageLabel: "now",
			ageHours: 0
		},
		{
			ageLabel: "3 h",
			ageHours: 3
		},
		{
			ageLabel: "6 h",
			ageHours: 6
		},
		{
			ageLabel: "12 h",
			ageHours: 12
		},
		{
			ageLabel: "24 h",
			ageHours: 24
		}
	] : window === "week" ? [
		{
			ageLabel: "now",
			ageHours: 0
		},
		{
			ageLabel: "18 h",
			ageHours: 18
		},
		{
			ageLabel: "1.5 d",
			ageHours: 36
		},
		{
			ageLabel: "3 d",
			ageHours: 72
		},
		{
			ageLabel: "7 d",
			ageHours: 168
		}
	] : [
		{
			ageLabel: "now",
			ageHours: 0
		},
		{
			ageLabel: "5 d",
			ageHours: 120
		},
		{
			ageLabel: "10 d",
			ageHours: 240
		},
		{
			ageLabel: "20 d",
			ageHours: 480
		},
		{
			ageLabel: "30 d",
			ageHours: 720
		}
	]).map((a) => {
		const w = decayAtAge(a.ageHours, hl);
		return {
			...a,
			weight: w,
			pct: `${Math.round(w * 100)}%`
		};
	});
}
function halfLifeLabel(window) {
	const h = DECAY_HALF_LIFE_H[window];
	if (h < 1) return `${Math.round(h * 60)} min`;
	if (h < 48) return `${h} h`;
	return `${(h / 24).toFixed(h % 24 === 0 ? 0 : 1)} d`;
}
/** Intensity color for legend swatch from remaining weight 0–1. */
function decaySwatch(weight) {
	const t = Math.max(0, Math.min(1, weight));
	if (t > .7) return "#f43f5e";
	if (t > .45) return "#fb923c";
	if (t > .25) return "#fbbf24";
	if (t > .12) return "#67e8f9";
	return "#22d3ee66";
}
/**
* Seismic attenuation (GMPE / GMM) — educational summary only.
* Full intensity maps would need site Vs30, style, path — not in Sentinel.
*/
var ATTENUATION_NOTES = {
	title: "Seismic attenuation models (GMPE / GMM)",
	summary: "Ground-motion prediction equations estimate how shaking intensity decays with distance, magnitude, depth, and site class. They power shake maps and design spectra — not our heat layer.",
	models: [
		{
			name: "Boore–Atkinson / NGA-West2 family",
			region: "Active crust (e.g. WUS)",
			notes: "Distance, mag, depth, Vs30; standard for crustal events."
		},
		{
			name: "Abrahamson–Silva / ASK14 et al.",
			region: "NGA-West2",
			notes: "Next-generation attenuation; used in USGS hybrid products."
		},
		{
			name: "Zhao / Si–Midorikawa style",
			region: "Subduction (Japan / similar)",
			notes: "Interface vs intraslab paths; relevant for Tonga–Kermadec context."
		},
		{
			name: "Atkinson–Boore subduction",
			region: "Cascadia / global subduction",
			notes: "Separate terms for interface and in-slab."
		}
	],
	sentinelStance: "Sentinel does not compute PGA/PGV fields. Heat is magnitude × time-decay density for swarm visualization only. Focused monitors stay event-list dense; official shaking → USGS ShakeMap."
};
/**
* Earthquake early warning — investigate only; Sentinel is not an EEW client.
*/
var EEW_NOTES = {
	title: "Earthquake early warning (EEW) systems",
	summary: "EEW uses the P-wave / S-wave speed gap: detect near the source, estimate magnitude, alert areas still waiting for damaging S-waves and surface waves. Seconds to tens of seconds of notice when geometry allows.",
	systems: [
		{
			name: "ShakeAlert® (USGS)",
			region: "US West Coast",
			notes: "Public / institutional alerts; not a browser GeoJSON feed for third-party apps."
		},
		{
			name: "JMA EEW (Japan)",
			region: "Japan",
			notes: "Mature national system; cell broadcast + apps."
		},
		{
			name: "SASMEX / Mexican EEW",
			region: "Mexico",
			notes: "Coastal sensors → inland cities (e.g. Mexico City)."
		},
		{
			name: "OpenEEW / community",
			region: "Research / pilot",
			notes: "Low-cost sensors; not a substitute for official EEW."
		}
	],
	limits: [
		"Blind zone near epicenter — too close for useful lead time",
		"Mag estimates update as more stations report (early under/over-shoot)",
		"Offshore / sparse networks reduce reliability",
		"Browser apps cannot replace certified alert paths (cell broadcast, IPAWS, etc.)"
	],
	sentinelStance: "WolfWatch Sentinel is a monitoring observatory on public USGS + SWPC feeds. It is not connected to ShakeAlert or any EEW pipeline and must not be used for life-safety alerting."
};
//#endregion
export { NodeFocusBanner as a, createTabSwipe as c, plateVelocity as d, relativeVelocity as f, EULER_POLES as i, decaySwatch as l, useIsMobile as m, DECAY_HALF_LIFE_H as n, NodeFocusPanel as o, timeDecayLegendRows as p, EEW_NOTES as r, attachMapTouchGestures as s, ATTENUATION_NOTES as t, halfLifeLabel as u };
