import { n as createServerFn, r as getServerFnById, t as TSS_SERVER_FUNCTION } from "./ssr.mjs";
import { C as longChannelXrays, _ as fetchXrays, c as fetchAlerts, d as fetchKp, i as cmeImpactSummary, o as earthDirectedCmes, r as bestCmeAnalysis, v as fluxToClass } from "./solarMedia-BbNb_6Ei.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/observatory-DWEcu3Hj.js
var VOLCANO_WATCHES = [{
	id: "shiveluch",
	name: "Shiveluch (Kamchatka)",
	aliases: [
		"Sheveluch",
		"Shivelyuch",
		"Шивелуч"
	],
	role: "Active volcano watch · Explosive–extrusive dome",
	kind: "volcano",
	bounds: [[55.4, 160], [57.9, 162.8]],
	center: [56.653, 161.36],
	elevationM: 3283,
	region: "Kamchatka Peninsula, Russia",
	aviationCode: "orange",
	aviationNote: "KVERT Aviation Color Code Orange (second-highest). Ongoing lava-dome growth, ash plumes reported into mid/late July 2026. Not a forecast — operational watch only.",
	gvpUrl: "https://volcano.si.edu/volcano.cfm?vn=300270",
	agencyUrl: "http://www.kscnet.ru/ivs/kvert/index_eng.php",
	monitorUrl: "https://volcano.si.edu/volcano.cfm?vn=300270",
	focusNote: "Priority volcano watch: Shiveluch (Sheveluch). Stratovolcano under continuous 2026 eruptive episode. Sentinel focuses map + local seismicity; KVERT/GVP remain authoritative for aviation & ash.",
	watchPriority: true,
	publishedFocus: false
}];
var AVIATION_LABEL = {
	green: "Green",
	yellow: "Yellow",
	orange: "Orange",
	red: "Red"
};
var AVIATION_COLOR = {
	green: "#34d399",
	yellow: "#fbbf24",
	orange: "#fb923c",
	red: "#f43f5e"
};
/** Map aviation code → node status for shared UI chrome */
function aviationToNodeStatus(code) {
	switch (code) {
		case "red": return "watch";
		case "orange": return "watch";
		case "yellow": return "active";
		case "green": return "elevated";
	}
}
/** True if lon is inside [lonMin, lonMax], allowing wrap when lonMin > lonMax. */
function lonInRange(lon, lonMin, lonMax) {
	if (lonMin <= lonMax) return lon >= lonMin && lon <= lonMax;
	return lon >= lonMin || lon <= lonMax;
}
function pointInBounds(lat, lon, bounds, padDeg = 0) {
	const [[latMin, lonMin], [latMax, lonMax]] = bounds;
	if (lat < latMin - padDeg || lat > latMax + padDeg) return false;
	if (padDeg === 0) return lonInRange(lon, lonMin, lonMax);
	if (lonMin <= lonMax) return lon >= lonMin - padDeg && lon <= lonMax + padDeg;
	return lon >= lonMin - padDeg || lon <= lonMax + padDeg;
}
/** Leaflet-friendly rectangle corners (may not wrap — use multi-rect for wrap). */
function boundsToLeafletRects(bounds) {
	const [[latMin, lonMin], [latMax, lonMax]] = bounds;
	if (lonMin <= lonMax) return [[[latMin, lonMin], [latMax, lonMax]]];
	return [[[latMin, lonMin], [latMax, 180]], [[latMin, -180], [latMax, lonMax]]];
}
var FEEDS = {
	hour: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
	day: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
	week: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
	month: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson"
};
var REALTIME_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";
async function fetchEarthquakes(window = "day") {
	const url = FEEDS[window] ?? FEEDS.day;
	const res = await fetch(url, { cache: "no-cache" });
	if (!res.ok) throw new Error(`USGS ${res.status}`);
	return await res.json();
}
/** Significant events (hour) — fast path for large shocks between full refreshes. */
async function fetchSignificantPulse() {
	const res = await fetch(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson?_=${Date.now()}`, { cache: "no-store" });
	if (!res.ok) throw new Error(`USGS significant pulse ${res.status}`);
	return await res.json();
}
async function fetchRealtimePulse() {
	const res = await fetch(REALTIME_FEED, { cache: "no-cache" });
	if (!res.ok) throw new Error(`USGS realtime ${res.status}`);
	return await res.json();
}
function mergeEqCollections(base, pulse) {
	const map = /* @__PURE__ */ new Map();
	const keyOf = (f) => {
		if (f.id) return String(f.id);
		const [lon, lat] = f.geometry.coordinates;
		return `${lat.toFixed(3)}_${lon.toFixed(3)}_${f.properties.time ?? 0}`;
	};
	for (const f of base?.features ?? []) map.set(keyOf(f), f);
	for (const f of pulse?.features ?? []) map.set(keyOf(f), f);
	const features = [...map.values()].sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));
	return {
		type: "FeatureCollection",
		features,
		metadata: {
			generated: Date.now(),
			count: features.length,
			title: "USGS merged (window + realtime hour)"
		}
	};
}
/**
* Cap marker count without erasing priority corridors (Tonga, volcano watches, etc.).
* Keeps all events inside priority node boxes, then fills remaining slots by magnitude.
*/
function capFeaturesForMode(features, maxMarkers, priorityBounds = []) {
	if (features.length <= maxMarkers) return features;
	const priority = [];
	const rest = [];
	for (const f of features) {
		const [lon, lat] = f.geometry.coordinates;
		if (priorityBounds.some((b) => pointInBounds(lat, lon, b, .15))) priority.push(f);
		else rest.push(f);
	}
	const sortedRest = [...rest].sort((a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0));
	const room = Math.max(0, maxMarkers - priority.length);
	if (priority.length > maxMarkers) return [...priority].sort((a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0)).slice(0, maxMarkers);
	return [...priority, ...sortedRest.slice(0, room)];
}
function latestEventAgeMs(features) {
	if (!features?.length) return null;
	let max = 0;
	for (const f of features) {
		const t = f.properties.time ?? 0;
		if (t > max) max = t;
	}
	if (!max) return null;
	return Date.now() - max;
}
async function fetchVolcanoes() {
	try {
		const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson", { cache: "no-cache" });
		if (!res.ok) return null;
		return {
			type: "FeatureCollection",
			features: (await res.json()).features.filter((f) => (f.properties.type || "").toLowerCase().includes("volcanic") || (f.properties.place || "").toLowerCase().includes("volcano"))
		};
	} catch {
		return null;
	}
}
function magColor(mag) {
	if (mag >= 6) return "#f43f5e";
	if (mag >= 5) return "#fb923c";
	if (mag >= 4) return "#fbbf24";
	return "#34d399";
}
function eqDepthKm(f) {
	const d = f.geometry.coordinates[2];
	if (typeof d !== "number" || Number.isNaN(d)) return 10;
	return Math.abs(d);
}
function depthBand(depthKm) {
	if (depthKm < 35) return "shallow";
	if (depthKm < 70) return "crust";
	if (depthKm < 150) return "upper";
	if (depthKm < 300) return "mid";
	return "deep";
}
function depthColor(depthKm) {
	switch (depthBand(depthKm)) {
		case "shallow": return "#f43f5e";
		case "crust": return "#fb923c";
		case "upper": return "#fbbf24";
		case "mid": return "#34d399";
		case "deep": return "#818cf8";
	}
}
var DEPTH_LEGEND = [
	{
		band: "shallow",
		label: "<35 km",
		color: depthColor(10)
	},
	{
		band: "crust",
		label: "35–70",
		color: depthColor(50)
	},
	{
		band: "upper",
		label: "70–150",
		color: depthColor(100)
	},
	{
		band: "mid",
		label: "150–300",
		color: depthColor(200)
	},
	{
		band: "deep",
		label: "300+ km",
		color: depthColor(400)
	}
];
function timeDecayWeight(timeMs, halfLifeHours = 8, now = Date.now()) {
	if (timeMs == null || !Number.isFinite(timeMs)) return .12;
	const ageH = Math.max(0, (now - timeMs) / 36e5);
	const w = Math.pow(.5, ageH / Math.max(.5, halfLifeHours));
	return Math.max(.04, Math.min(1, w));
}
function halfLifeForWindow(window) {
	switch (window) {
		case "hour": return .75;
		case "day": return 6;
		case "week": return 36;
		case "month": return 120;
	}
}
function heatWeight(mag, timeMs, opts) {
	return Math.min(40, Math.pow(10, .45 * (Math.max(0, mag) - 3))) * (opts.timeDecay ? timeDecayWeight(timeMs, opts.halfLifeHours, opts.now) : 1);
}
function volcanoAsDragon(v) {
	return {
		id: v.id,
		name: v.name,
		role: v.role,
		bounds: v.bounds,
		monitorUrl: v.monitorUrl,
		publishedFocus: v.publishedFocus,
		focusNote: v.focusNote,
		kind: "volcano",
		center: v.center,
		aliases: v.aliases,
		aviationCode: v.aviationCode,
		gvpUrl: v.gvpUrl,
		agencyUrl: v.agencyUrl,
		watchPriority: v.watchPriority
	};
}
var DRAGON_NODES = [
	...VOLCANO_WATCHES.map(volcanoAsDragon),
	{
		id: "tonga",
		name: "Tonga–Kermadec",
		role: "Published focus · Swarm corridor",
		kind: "seismic",
		/**
		* Trench-aligned box on the *east* side of the dateline only.
		* Previous 170°E→wrap drew the corridor too far west (Fiji basin).
		* Current swarm ~lon −179…−175, lat −29…−18 (Kermadec + south of Tonga).
		*/
		bounds: [[-33, -180], [-15.5, -171.5]],
		center: [-25.5, -176],
		monitorUrl: "https://tonga-kermadec-node-monitor.grok.me/",
		publishedFocus: true,
		watchPriority: true,
		focusNote: "Tonga–Kermadec trench corridor — bounds pinned to the trench (east of dateline), not the Fiji basin."
	},
	{
		id: "southsandwich",
		name: "South Sandwich / Drake",
		role: "Dragon Head · Fracture Sentinel / Long-tail",
		kind: "seismic",
		bounds: [[-65, -40], [-50, -15]]
	},
	{
		id: "andes",
		name: "Chile–Andes / Nazca",
		role: "Release Valve · KE Threshold",
		kind: "seismic",
		bounds: [[-45, -80], [-15, -65]]
	},
	{
		id: "mediterranean",
		name: "Campi Flegrei / Mediterranean",
		role: "Fragile Proxy Lens",
		kind: "seismic",
		bounds: [[35, 5], [48, 30]]
	},
	{
		id: "japan",
		name: "Japan–Kuril–Kamchatka",
		role: "Transmitter Node · Tension–Oscillator",
		kind: "seismic",
		bounds: [[30, 130], [55, 165]]
	},
	{
		id: "cascadia",
		name: "Cascadia / Pacific NW",
		role: "Fracture Sentinel / Locked Node",
		kind: "seismic",
		bounds: [[40, -130], [52, -120]]
	},
	{
		id: "alaska",
		name: "Alaska–Aleutians",
		role: "Fracture Sentinel · Rebalancer",
		kind: "seismic",
		bounds: [[50, -180], [72, -140]]
	}
];
var FOCUSED_MONITORS = DRAGON_NODES.filter((n) => n.publishedFocus);
/** Bounds that must survive marker capping. */
function priorityNodeBounds(extra = []) {
	const base = DRAGON_NODES.filter((n) => n.publishedFocus || n.watchPriority);
	return [...extra.filter((n) => n.watchPriority), ...base].map((n) => n.bounds);
}
function nodeStatus(features, node) {
	if (node.kind === "volcano" && node.aviationCode) {
		const floor = aviationToNodeStatus(node.aviationCode);
		const seismic = seismicNodeStatus(features, node);
		const rank = {
			quiet: 0,
			elevated: 1,
			active: 2,
			watch: 3
		};
		return rank[seismic] > rank[floor] ? seismic : floor;
	}
	return seismicNodeStatus(features, node);
}
function seismicNodeStatus(features, node) {
	const inBounds = features.filter((f) => {
		const [lon, lat] = f.geometry.coordinates;
		const mag = f.properties.mag ?? 0;
		return pointInBounds(lat, lon, node.bounds) && mag >= 3.5;
	});
	const maxMag = inBounds.reduce((m, f) => Math.max(m, f.properties.mag ?? 0), 0);
	if (maxMag >= 6 || inBounds.filter((f) => (f.properties.mag ?? 0) >= 5).length >= 2) return "watch";
	if (maxMag >= 5) return "active";
	if (maxMag >= 4 || inBounds.length >= 5) return "elevated";
	return "quiet";
}
function nodeEventStats(features, node, minMag = 0) {
	let count = 0;
	let maxMag = 0;
	let m5 = 0;
	for (const f of features ?? []) {
		const mag = f.properties.mag ?? 0;
		if (mag < minMag) continue;
		const [lon, lat] = f.geometry.coordinates;
		if (!pointInBounds(lat, lon, node.bounds)) continue;
		count++;
		if (mag > maxMag) maxMag = mag;
		if (mag >= 5) m5++;
	}
	return {
		count,
		maxMag,
		m5
	};
}
var GEOFON_QUERY = "https://geofon.gfz.de/fdsnws/event/1/query";
/**
* Fetch ~7 days of GEOFON events as text FDSN, map into our feature shape.
* Failures return empty collection (USGS remains primary).
*/
async function fetchGeofonWeek(minMag = 0) {
	const end = /* @__PURE__ */ new Date();
	const start = /* @__PURE__ */ new Date(end.getTime() - 7 * 864e5);
	const url = new URL(GEOFON_QUERY);
	url.searchParams.set("starttime", start.toISOString().slice(0, 19));
	url.searchParams.set("endtime", end.toISOString().slice(0, 19));
	url.searchParams.set("minmag", String(minMag));
	url.searchParams.set("format", "text");
	url.searchParams.set("limit", "2000");
	url.searchParams.set("orderby", "time");
	try {
		const res = await fetch(url.toString(), { cache: "no-cache" });
		if (!res.ok) throw new Error(`GEOFON ${res.status}`);
		return parseGeofonText(await res.text());
	} catch {
		return {
			type: "FeatureCollection",
			features: [],
			metadata: {
				generated: Date.now(),
				count: 0,
				title: "GEOFON (unavailable)"
			}
		};
	}
}
/** FDSN text: EventID|Time|Latitude|Longitude|Depth/km|...|Magnitude|...|EventLocationName */
function parseGeofonText(text) {
	const lines = text.trim().split("\n");
	const features = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!line || line.startsWith("#") || line.startsWith("EventID")) continue;
		const c = line.split("|");
		if (c.length < 11) continue;
		const id = (c[0] || "").trim();
		const timeMs = Date.parse(c[1] || "");
		const lat = parseFloat(c[2] || "");
		const lon = parseFloat(c[3] || "");
		const depth = parseFloat(c[4] || "0");
		let mag = parseFloat(c[10] || "");
		if (!Number.isFinite(mag)) mag = parseFloat(c[9] || "");
		const place = (c[12] || c[c.length - 1] || "GEOFON").trim();
		if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(mag)) continue;
		features.push({
			type: "Feature",
			id: id ? `geofon:${id}` : `geofon:${lat}_${lon}_${timeMs}`,
			properties: {
				mag,
				place: place || "GEOFON",
				time: Number.isFinite(timeMs) ? timeMs : null,
				url: id ? `https://geofon.gfz.de/eqinfo/event.php?id=${encodeURIComponent(id)}` : void 0,
				title: `M${mag.toFixed(1)} ${place} (GEOFON)`,
				type: "earthquake",
				status: "automatic",
				detail: "geofon"
			},
			geometry: {
				type: "Point",
				coordinates: [
					lon,
					lat,
					Number.isFinite(depth) ? depth : 0
				]
			}
		});
	}
	features.sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0));
	return {
		type: "FeatureCollection",
		features,
		metadata: {
			generated: Date.now(),
			count: features.length,
			title: "GEOFON GFZ"
		}
	};
}
/**
* Lightweight Web Audio alerts for new seismic events (no external files).
* Inspired by public seismic globe patterns — short beep only, user-toggleable.
*/
var ctx = null;
function getCtx() {
	try {
		if (typeof window === "undefined") return null;
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		if (!ctx) ctx = new AC();
		return ctx;
	} catch {
		return null;
	}
}
/** Soft chirp — pitch scales mildly with magnitude. */
function playQuakeAlert(mag) {
	const audio = getCtx();
	if (!audio) return;
	audio.resume().catch(() => void 0);
	const t0 = audio.currentTime;
	const osc = audio.createOscillator();
	const gain = audio.createGain();
	osc.connect(gain);
	gain.connect(audio.destination);
	const m = Math.max(2, Math.min(8, mag));
	const freq = 420 + m * 70;
	osc.type = m >= 6 ? "triangle" : "sine";
	osc.frequency.setValueAtTime(freq, t0);
	osc.frequency.exponentialRampToValueAtTime(freq * 1.35, t0 + .08);
	const vol = m >= 6 ? .14 : m >= 5 ? .11 : .08;
	gain.gain.setValueAtTime(1e-4, t0);
	gain.gain.exponentialRampToValueAtTime(vol, t0 + .02);
	gain.gain.exponentialRampToValueAtTime(1e-4, t0 + .28);
	osc.start(t0);
	osc.stop(t0 + .3);
}
/**
* Compare previous id set to new features; alert on fresh M≥minMag events.
* Returns the updated id set.
*/
function alertNewEvents(features, prevIds, opts = { enabled: true }) {
	const minMag = opts.minMag ?? 4.5;
	const maxAlerts = opts.maxAlerts ?? 3;
	const next = /* @__PURE__ */ new Set();
	const fresh = [];
	for (const f of features) {
		const id = f.id || `${f.properties.time ?? 0}_${f.properties.mag ?? 0}`;
		next.add(String(id));
		if (opts.enabled && prevIds.size > 0 && !prevIds.has(String(id)) && (f.properties.mag ?? 0) >= minMag) {
			if (Date.now() - (f.properties.time ?? 0) < 30 * 6e4) fresh.push(f.properties.mag ?? minMag);
		}
	}
	if (opts.enabled && prevIds.size > 0) fresh.sort((a, b) => b - a).slice(0, maxAlerts).forEach((m) => playQuakeAlert(m));
	return next;
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
/** DONKI is Origin-blocked in browsers — always pull server-side. */
var fetchDonkiBundle = createServerFn({ method: "GET" }).handler(createSsrRpc("47232bcf19be7d1ced74947b83b745cda4ca3a1ec60090437c62dd20d33441cb"));
/**
* Server-side SWPC batch — `heavy: false` keeps first-open mobile lean.
*/
var fetchSolarCore = createServerFn({ method: "POST" }).inputValidator((input) => ({ heavy: input?.heavy !== false })).handler(createSsrRpc("043f84134b4e664d87fa6393d0fd0c4fa5512144ecc6ab91f79f70cb062b67c7"));
/** Solar Orbiter EUI via Helioviewer — API is CORS-restricted from browsers. */
var fetchSoloFrame = createServerFn({ method: "GET" }).handler(createSsrRpc("43746247c6dcf09095a24008d7c8d9b46d53caa3f48dcacb83ac3b3b7655588a"));
var MODES = {
	lite: {
		key: "lite",
		label: "Lite",
		minMag: 4,
		maxMarkers: 80,
		refreshMs: 18e4,
		realtimeMs: 9e4,
		loadChart: false,
		loadVolc: false,
		loadSolarWind: true,
		loadImage: false,
		load3d: false,
		shuffleN: 40,
		description: "Mobile / low-data. Solar wind + scales on; imagery off."
	},
	standard: {
		key: "standard",
		label: "Standard",
		minMag: 3.5,
		maxMarkers: 280,
		refreshMs: 9e4,
		realtimeMs: 45e3,
		loadChart: true,
		loadVolc: true,
		loadSolarWind: true,
		loadImage: true,
		load3d: false,
		shuffleN: 80,
		description: "Balanced everyday monitoring + real-time hour pulse."
	},
	full: {
		key: "full",
		label: "Full",
		minMag: 2.5,
		maxMarkers: 500,
		refreshMs: 6e4,
		realtimeMs: 3e4,
		loadChart: true,
		loadVolc: true,
		loadSolarWind: true,
		loadImage: true,
		load3d: true,
		shuffleN: 120,
		description: "Higher density, analytics, 3D globe, faster live pulse."
	}
};
var HANS = "https://volcanoes.usgs.gov/hans-public/api";
function rankColor(c) {
	switch ((c || "").toUpperCase()) {
		case "RED": return 4;
		case "ORANGE": return 3;
		case "YELLOW": return 2;
		case "GREEN": return 1;
		default: return 0;
	}
}
function rankAlert(a) {
	switch ((a || "").toUpperCase()) {
		case "WARNING": return 4;
		case "WATCH": return 3;
		case "ADVISORY": return 2;
		case "NORMAL": return 1;
		default: return 0;
	}
}
function colorCodeHex(c) {
	switch ((c || "").toUpperCase()) {
		case "RED": return "#f43f5e";
		case "ORANGE": return "#fb923c";
		case "YELLOW": return "#fbbf24";
		case "GREEN": return "#34d399";
		default: return "#94a3b8";
	}
}
function colorToAviation(c) {
	switch ((c || "").toUpperCase()) {
		case "RED": return "red";
		case "ORANGE": return "orange";
		case "YELLOW": return "yellow";
		default: return "green";
	}
}
/** ~deg half-box around vent for node focus filter / fly zoom context */
function boundsAround(lat, lon, halfDeg = .75) {
	return [[lat - halfDeg, lon - halfDeg], [lat + halfDeg, lon + halfDeg]];
}
/** Map elevated HANS alert → DragonNode watch (only while elevated). */
function alertToWatchNode(v) {
	if (v.lat == null || v.lon == null) return null;
	const av = colorToAviation(v.colorCode);
	if (av === "green" && rankAlert(v.alertLevel) <= 1) return null;
	return {
		id: `usgs-volc-${v.vnum || v.id}`,
		name: v.name,
		role: `USGS ${v.alertLevel} · Aviation ${v.colorCode} · ${v.obsAbbr}`,
		kind: "volcano",
		bounds: boundsAround(v.lat, v.lon),
		center: [v.lat, v.lon],
		aviationCode: av,
		monitorUrl: v.volcanoUrl || v.noticeUrl || void 0,
		agencyUrl: v.noticeUrl || void 0,
		gvpUrl: v.vnum ? `https://volcano.si.edu/volcano.cfm?vn=${v.vnum}` : void 0,
		watchPriority: true,
		publishedFocus: false,
		focusNote: `Live USGS HANS watch while elevated (${v.alertLevel} / ${v.colorCode}). Returns to baseline when NORMAL/GREEN. ${v.region || ""} · ${v.obsName}. Not a forecast.`,
		aliases: v.vnum ? [v.vnum] : void 0
	};
}
/** Diff previous elevated ids vs next — smart watchlist transitions. */
function diffVolcWatch(prev, next) {
	const prevMap = new Map(prev.map((v) => [v.vnum || v.id, v]));
	const nextMap = new Map(next.map((v) => [v.vnum || v.id, v]));
	const now = Date.now();
	const transitions = [];
	for (const [id, v] of nextMap) if (!prevMap.has(id)) transitions.push({
		id: `usgs-volc-${id}`,
		name: v.name,
		kind: "elevated",
		colorCode: v.colorCode,
		alertLevel: v.alertLevel,
		at: now
	});
	else {
		const p = prevMap.get(id);
		if (rankColor(v.colorCode) > rankColor(p.colorCode) || rankAlert(v.alertLevel) > rankAlert(p.alertLevel)) transitions.push({
			id: `usgs-volc-${id}`,
			name: v.name,
			kind: "elevated",
			colorCode: v.colorCode,
			alertLevel: v.alertLevel,
			at: now
		});
	}
	for (const [id, v] of prevMap) if (!nextMap.has(id)) transitions.push({
		id: `usgs-volc-${id}`,
		name: v.name,
		kind: "baseline",
		colorCode: "GREEN",
		alertLevel: "NORMAL",
		at: now
	});
	return transitions;
}
async function fetchUsgsElevatedVolcanoes() {
	try {
		const res = await fetch(`${HANS}/volcano/getElevatedVolcanoes`, { headers: { Accept: "application/json" } });
		if (!res.ok) return [];
		const raw = await res.json();
		if (!Array.isArray(raw)) return [];
		const base = raw.map((r, i) => {
			const vnum = r.vnum != null ? String(r.vnum) : null;
			const name = String(r.volcano_name || "Volcano");
			return {
				id: vnum || String(r.notice_identifier || name) || `volc-${i}`,
				name,
				vnum,
				alertLevel: String(r.alert_level || "ADVISORY"),
				colorCode: String(r.color_code || "YELLOW"),
				obsAbbr: String(r.obs_abbr || "").toUpperCase(),
				obsName: String(r.obs_fullname || r.obs_abbr || "USGS"),
				sentUtc: r.sent_utc != null ? String(r.sent_utc) : null,
				sentUnix: typeof r.sent_unixtime === "number" ? r.sent_unixtime : null,
				noticeUrl: r.notice_url != null ? String(r.notice_url) : null,
				noticeId: r.notice_identifier != null ? String(r.notice_identifier) : null,
				lat: null,
				lon: null,
				elevationM: null,
				region: null,
				volcanoUrl: null
			};
		});
		return (await Promise.all(base.map(async (v) => {
			if (!v.vnum) return v;
			try {
				const r = await fetch(`${HANS}/volcano/getVolcano/${v.vnum}`, { headers: { Accept: "application/json" } });
				if (!r.ok) return v;
				const d = await r.json();
				const lat = Number(d.latitude);
				const lon = Number(d.longitude);
				return {
					...v,
					lat: Number.isFinite(lat) ? lat : null,
					lon: Number.isFinite(lon) ? lon : null,
					elevationM: typeof d.elevation_meters === "number" ? d.elevation_meters : null,
					region: d.region != null ? String(d.region) : null,
					volcanoUrl: d.volcano_url != null ? String(d.volcano_url) : null,
					name: d.volcano_name != null ? String(d.volcano_name) : v.name
				};
			} catch {
				return v;
			}
		}))).filter((v) => v.lat != null && v.lon != null).sort((a, b) => {
			const c = rankColor(b.colorCode) - rankColor(a.colorCode);
			if (c) return c;
			return rankAlert(b.alertLevel) - rankAlert(a.alertLevel);
		});
	} catch {
		return [];
	}
}
var SIG_DAY = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson";
var M45_DAY = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";
var M25_DAY = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
async function fetchGeo(url) {
	try {
		const res = await fetch(url, { cache: "no-cache" });
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
async function fetchGlobalSeismic() {
	const [significant, m45, m25] = await Promise.all([
		fetchGeo(SIG_DAY),
		fetchGeo(M45_DAY),
		fetchGeo(M25_DAY)
	]);
	return {
		significant,
		m45,
		m25,
		fetchedAt: Date.now()
	};
}
/**
* Manual watchlist overrides for USGS volcano watches.
* pin = stay on map even after NORMAL/GREEN
* mute = hide even while elevated
*/
var PIN_KEY = "wolfwatch_volc_pins";
var MUTE_KEY = "wolfwatch_volc_mutes";
var MEM_KEY = "wolfwatch_volc_memory";
function loadIdSet(key) {
	if (typeof window === "undefined") return /* @__PURE__ */ new Set();
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return /* @__PURE__ */ new Set();
		const arr = JSON.parse(raw);
		return new Set(Array.isArray(arr) ? arr : []);
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
function saveIdSet(key, set) {
	try {
		localStorage.setItem(key, JSON.stringify([...set]));
	} catch {}
}
function loadPins() {
	return loadIdSet(PIN_KEY);
}
function loadMutes() {
	return loadIdSet(MUTE_KEY);
}
function savePins(s) {
	saveIdSet(PIN_KEY, s);
}
function saveMutes(s) {
	saveIdSet(MUTE_KEY, s);
}
function alertKey(v) {
	return v.vnum || v.id;
}
function nodeIdForAlert(v) {
	return `usgs-volc-${alertKey(v)}`;
}
function loadAlertMemory() {
	if (typeof window === "undefined") return {};
	try {
		const raw = localStorage.getItem(MEM_KEY);
		if (!raw) return {};
		return JSON.parse(raw);
	} catch {
		return {};
	}
}
function rememberAlerts(alerts) {
	try {
		const mem = loadAlertMemory();
		for (const a of alerts) mem[alertKey(a)] = a;
		const keys = Object.keys(mem);
		if (keys.length > 40) for (const k of keys.slice(0, keys.length - 40)) delete mem[k];
		localStorage.setItem(MEM_KEY, JSON.stringify(mem));
	} catch {}
}
/**
* Build watch nodes: elevated (minus mutes) + pinned from memory.
*/
function buildWatchNodes(elevated, pins, mutes) {
	rememberAlerts(elevated);
	const mem = loadAlertMemory();
	const byKey = /* @__PURE__ */ new Map();
	for (const a of elevated) {
		const k = alertKey(a);
		if (mutes.has(k)) continue;
		byKey.set(k, a);
	}
	for (const k of pins) {
		if (mutes.has(k)) continue;
		if (byKey.has(k)) continue;
		const snap = mem[k];
		if (snap) byKey.set(k, {
			...snap,
			alertLevel: snap.alertLevel || "NORMAL",
			colorCode: "GREEN"
		});
	}
	const nodes = [];
	for (const a of byKey.values()) {
		const n = alertToWatchNode(a);
		if (!n) {
			if (a.lat != null && a.lon != null && pins.has(alertKey(a))) nodes.push({
				id: nodeIdForAlert(a),
				name: a.name,
				role: `Pinned watch · baseline (was ${a.obsAbbr})`,
				kind: "volcano",
				bounds: [[a.lat - .75, a.lon - .75], [a.lat + .75, a.lon + .75]],
				center: [a.lat, a.lon],
				aviationCode: "green",
				watchPriority: true,
				focusNote: "Manually pinned — stays on watchlist after return to NORMAL/GREEN. Unpin to release.",
				monitorUrl: a.volcanoUrl || a.noticeUrl || void 0,
				agencyUrl: a.noticeUrl || void 0
			});
			continue;
		}
		const k = alertKey(a);
		if (pins.has(k) && (a.colorCode === "GREEN" || a.alertLevel === "NORMAL")) {
			n.role = `Pinned · ${n.role}`;
			n.focusNote = (n.focusNote || "") + " Manually pinned through baseline.";
		}
		if (pins.has(k)) n.watchPriority = true;
		nodes.push(n);
	}
	return nodes;
}
/**
* Paul Sheppard SUPT frozen probe (α = 0.01).
*
* Copyright: Sheppard's Universal Proxy Theory, U.S. Copyright TXu 2-468-771
* (effective 2025-01-20). That date is the copyright effective date — not a
* claim about when the operator was frozen.
*
* Port notes: even-N median average, Math.floor tail, 1e-12 guards,
* mulberry32 seed 20250120, Fisher–Yates shuffle. Do not retune α / seed /
* tail rule / band edges.
*/
var SUPT_ALPHA = .01;
var SUPT_SEED = 20250120;
/** U.S. Copyright TXu 2-468-771 effective date (copyright only — not operator freeze). */
var SUPT_COPYRIGHT = {
	registration: "TXu 2-468-771",
	effectiveDate: "2025-01-20",
	notice: "Sheppard's Universal Proxy Theory · U.S. Copyright TXu 2-468-771 (effective 2025-01-20)"
};
/** Corpus anchors — context on the shared axis; never fitted to live windows. */
var SUPT_ANCHORS = {
	zetaFloor: 3.6125,
	ribosome: 1.88,
	tokamak: 1.93,
	clash: 1.9102,
	clutchCusp: [1.88, 1.96]
};
function median(sorted) {
	const n = sorted.length;
	if (n === 0) return 0;
	const mid = Math.floor(n / 2);
	if (n % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
	return sorted[mid];
}
function mad(values, med) {
	return median(values.map((v) => Math.abs(v - med)).sort((a, b) => a - b));
}
/** Deterministic PRNG for shuffle null (seed 20250120). */
function mulberry32(seed) {
	let s = seed >>> 0;
	return function next() {
		s = s + 1831565813 >>> 0;
		let t = s;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
/**
* In-place-style Fisher–Yates (Durstenfeld) on a copy.
* For i from n−1 → 1: j = floor(U·(i+1)), swap a[i], a[j].
* Uses mulberry32 so every shuffle of the same multiset is reproducible.
* Multiset of gaps is preserved — only order is destroyed (the null hypothesis).
*/
function fisherYates(arr, rng) {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = a[i];
		a[i] = a[j];
		a[j] = tmp;
	}
	return a;
}
/** Core probe operator on an ordered positive sequence. */
function probe(values) {
	const x0 = values.filter((v) => Number.isFinite(v));
	if (x0.length < 4) return null;
	const med = median(x0.slice().sort((a, b) => a - b));
	const m = mad(x0, med);
	const x = x0.map((v) => (v - med) / (m + 1e-12));
	const phi = [];
	let acc = 0;
	for (const v of x) {
		acc += v;
		phi.push(acc);
	}
	const g = [];
	for (let i = 1; i < phi.length; i++) g.push(phi[i] - phi[i - 1]);
	const meanAbs = g.reduce((s, v) => s + Math.abs(v), 0) / (g.length || 1);
	const gn = g.map((v) => v / (meanAbs + 1e-12));
	const C = new Array(gn.length);
	C[0] = Math.cos(2 * Math.PI * gn[0]);
	for (let i = 1; i < gn.length; i++) C[i] = SUPT_ALPHA * Math.cos(2 * Math.PI * gn[i]) + (1 - SUPT_ALPHA) * C[i - 1];
	const tail = Math.max(50, Math.floor(.2 * C.length));
	const slice = C.slice(-tail);
	const meanAbsC = slice.reduce((s, v) => s + Math.abs(v), 0) / (slice.length || 1);
	return -Math.log(meanAbsC + 1e-12);
}
function bandFromD(d) {
	if (d === null) return "N/A";
	if (d < 1) return "COHERENCE";
	if (d < 2) return "CLUTCH";
	if (d < SUPT_ANCHORS.zetaFloor) return "SUB-FLOOR";
	return "VACUUM";
}
function resonanceScore(values, nShuffle = 80, seed = SUPT_SEED) {
	const v = values.filter((x) => Number.isFinite(x) && x > 0);
	const n = v.length;
	const short_window = n < 50;
	const d = probe(v);
	if (d === null) return {
		d_ij: null,
		band: "N/A",
		n,
		null_mean: null,
		null_sd: null,
		z: null,
		separated: false,
		short_window,
		note: n < 4 ? "Insufficient events for probe (need ≥ 4 inter-event intervals)." : "Probe returned null."
	};
	const rng = mulberry32(seed);
	const nulls = [];
	for (let i = 0; i < nShuffle; i++) {
		const nd = probe(fisherYates(v, rng));
		if (nd !== null && Number.isFinite(nd)) nulls.push(nd);
	}
	const null_mean = nulls.length ? nulls.reduce((a, b) => a + b, 0) / nulls.length : 0;
	const variance = nulls.length > 1 ? nulls.reduce((s, x) => s + (x - null_mean) ** 2, 0) / (nulls.length - 1) : 0;
	const null_sd = Math.sqrt(variance);
	const z = (d - null_mean) / (null_sd + 1e-12);
	const separated = Math.abs(z) >= 3;
	let note = "";
	if (!separated) note = "Not separated from shuffle null — no excess structure detected in this window.";
	else if (d >= SUPT_ANCHORS.clutchCusp[0] && d <= SUPT_ANCHORS.clutchCusp[1]) note = "In CLUTCH cusp band (~1.88–1.96); heavy-tailed noise can land here ~12% of the time.";
	else if (separated) note = "Separated from null (|z| ≥ 3) — ordered structure present relative to shuffle baseline.";
	if (short_window) note += " Short window (N < 50) — regime-valid but lower precision.";
	return {
		d_ij: Math.round(d * 1e4) / 1e4,
		band: bandFromD(d),
		n,
		null_mean: Math.round(null_mean * 1e4) / 1e4,
		null_sd: Math.round(null_sd * 1e4) / 1e4,
		z: Math.round(z * 100) / 100,
		separated,
		short_window,
		note: note.trim()
	};
}
/** Build inter-event times (seconds) from sorted epoch ms. */
function interEventSeconds(timesMs) {
	const t = timesMs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
	const out = [];
	for (let i = 1; i < t.length; i++) {
		const dt = (t[i] - t[i - 1]) / 1e3;
		if (dt > 0) out.push(dt);
	}
	return out;
}
/**
* Everyday bottom line — null is first-class; d_ij is an address not a forecast;
* timing ≠ amplitude. Cusp ~12% and N<50 flags preserved.
*/
function readingSummary(score) {
	const short = score.short_window ? " Short window (N<50): regime-valid, lower precision." : "";
	if (score.d_ij === null) return score.n < 4 ? "Need ≥4 inter-event gaps before the frozen probe can place an address on the corpus axis." : "No score for this window.";
	const addr = `Address d=${score.d_ij.toFixed(3)} · ${score.band}`;
	const zbit = score.z != null ? ` · z=${score.z >= 0 ? "+" : ""}${score.z.toFixed(2)} vs shuffle` : "";
	if (!score.separated) return `${addr}${zbit}: not separated from shuffle null — spacing looks like a random reordering of the same gaps. Null is valid and informative (not “all clear,” not a forecast).${short}`;
	if (score.d_ij >= SUPT_ANCHORS.clutchCusp[0] && score.d_ij <= SUPT_ANCHORS.clutchCusp[1]) return `${addr}${zbit}: separated, but in the clutch cusp (~1.88–1.96). Heavy-tailed noise can land here ~12% of the time — check tails / window length; not an alert.${short}`;
	if (score.band === "COHERENCE") return `${addr}${zbit}: ordered structure beyond shuffle (timing only). Not magnitude, not arrival time, not a bigger-event prediction.${short}`;
	if (score.band === "CLUTCH") return `${addr}${zbit}: transitional cusp on the corpus axis — between strong order and weak structure. Study interest only.${short}`;
	if (score.band === "SUB-FLOOR") return `${addr}${zbit}: weak structure vs chance (below ζ-floor). Timing proxy only — amplitude (M, R/S/G) is a separate stack.${short}`;
	return `${addr}${zbit}: sparse / vacuum-side address vs the study scale. Not a forecast.${short}`;
}
/** Everyday labels for bands (UI). */
function bandPlainLabel(band) {
	switch (band) {
		case "COHERENCE": return "More ordered than chance";
		case "CLUTCH": return "Mixed / transitional";
		case "SUB-FLOOR": return "Weak structure";
		case "VACUUM": return "Scattered / sparse";
		default: return "No reading yet";
	}
}
/** One-line verdict for the hero card. */
function resonanceVerdict(score) {
	if (!score || score.d_ij == null) return {
		title: "Waiting for enough events",
		tone: "none"
	};
	if (!score.separated) return {
		title: "Looks like normal scatter",
		tone: "chance"
	};
	if (score.band === "COHERENCE") return {
		title: "Timing looks more ordered than chance",
		tone: "ordered"
	};
	if (score.band === "CLUTCH") return {
		title: "Mixed timing pattern",
		tone: "mixed"
	};
	if (score.band === "SUB-FLOOR") return {
		title: "Weak structure vs chance",
		tone: "mixed"
	};
	return {
		title: "Sparse / low-structure reading",
		tone: "sparse"
	};
}
/** Viewport / UA helpers for first-open defaults (mobile-first data). */
function isMobileViewport() {
	if (typeof window === "undefined") return false;
	try {
		if (window.matchMedia?.("(max-width: 767px)").matches) return true;
		if (window.matchMedia?.("(pointer: coarse)").matches && window.innerWidth < 900) return true;
	} catch {}
	const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
	return /Android|iPhone|iPod|Mobile|webOS|BlackBerry/i.test(ua);
}
/** First visit with no saved mode → lite on phone, standard on desktop. */
function defaultPerformanceMode() {
	return isMobileViewport() ? "lite" : "standard";
}
function historyCap() {
	return isMobileViewport() ? 24 : 48;
}
function cacheSoftLimitBytes() {
	return isMobileViewport() ? 12e5 : 35e5;
}
/**
* Versioned localStorage cache + bounded history.
* Prunes on quota / soft size limit (tighter on mobile).
*/
var PREFIX = "ww_";
var CACHE_VER = 3;
var VER_KEY = `${PREFIX}cache_ver`;
function ensureVersion() {
	if (typeof localStorage === "undefined") return;
	try {
		if (localStorage.getItem(VER_KEY) === String(CACHE_VER)) return;
		const kill = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k && k.startsWith(PREFIX) && k !== VER_KEY) kill.push(k);
		}
		for (const k of kill) localStorage.removeItem(k);
		localStorage.setItem(VER_KEY, String(CACHE_VER));
	} catch {}
}
if (typeof window !== "undefined") try {
	ensureVersion();
} catch {}
function approxBytes() {
	let n = 0;
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (!k) continue;
			const v = localStorage.getItem(k) ?? "";
			n += k.length + v.length;
		}
	} catch {}
	return n * 2;
}
/** Drop oldest ww_ cache/history entries until under soft limit. */
function pruneCache(force = false) {
	if (typeof localStorage === "undefined") return;
	ensureVersion();
	const limit = cacheSoftLimitBytes();
	if (!force && approxBytes() < limit) return;
	const entries = [];
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (!k || !k.startsWith(PREFIX) || k === VER_KEY) continue;
			let ts = 0;
			try {
				const raw = localStorage.getItem(k);
				if (raw) {
					const parsed = JSON.parse(raw);
					if (typeof parsed.ts === "number") ts = parsed.ts;
				}
			} catch {
				ts = 0;
			}
			entries.push({
				key: k,
				ts
			});
		}
		entries.sort((a, b) => a.ts - b.ts);
		for (const e of entries) {
			if (approxBytes() < limit * .75) break;
			if (e.key.includes("hist_") || e.key.includes("eq") || e.key.includes("xray") || e.key.includes("donki")) localStorage.removeItem(e.key);
		}
		for (const e of entries) {
			if (approxBytes() < limit * .85) break;
			if (localStorage.getItem(e.key) != null) localStorage.removeItem(e.key);
		}
	} catch {}
}
function getCache(key, maxAgeMs = 240 * 1e3) {
	ensureVersion();
	try {
		const raw = localStorage.getItem(PREFIX + key);
		if (!raw) return null;
		const { ts, data } = JSON.parse(raw);
		if (Date.now() - ts < maxAgeMs) return data;
		localStorage.removeItem(PREFIX + key);
	} catch {}
	return null;
}
function setCache(key, data) {
	ensureVersion();
	try {
		if (isMobileViewport() && (key === "donki" || key === "xray" || key === "protons")) pruneCache(true);
		localStorage.setItem(PREFIX + key, JSON.stringify({
			ts: Date.now(),
			data,
			v: CACHE_VER
		}));
	} catch {
		pruneCache(true);
		try {
			localStorage.setItem(PREFIX + key, JSON.stringify({
				ts: Date.now(),
				data,
				v: CACHE_VER
			}));
		} catch {}
	}
	if (approxBytes() > cacheSoftLimitBytes()) pruneCache(true);
}
function getHistory(key, maxItems) {
	ensureVersion();
	const cap = maxItems ?? historyCap();
	try {
		const raw = localStorage.getItem("ww_hist_" + key);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return (Array.isArray(parsed) ? parsed : Array.isArray(parsed.data) ? parsed.data : []).slice(-cap);
	} catch {
		return [];
	}
}
function pushHistory(key, item, maxItems) {
	const cap = maxItems ?? historyCap();
	const prev = getHistory(key, cap);
	const last = prev[prev.length - 1];
	const nextItem = item;
	if (last && typeof last.t === "number" && typeof nextItem.t === "number" && nextItem.t - last.t < 3e4 && last.d_ij === nextItem.d_ij) return prev;
	const next = [...prev, item].slice(-cap);
	try {
		localStorage.setItem("ww_hist_" + key, JSON.stringify({
			ts: Date.now(),
			data: next,
			v: CACHE_VER
		}));
	} catch {
		pruneCache(true);
		try {
			localStorage.setItem("ww_hist_" + key, JSON.stringify({
				ts: Date.now(),
				data: next.slice(-Math.floor(cap / 2)),
				v: CACHE_VER
			}));
		} catch {}
	}
	return next;
}
function scaleNum(s) {
	const n = parseInt(String(s ?? "0"), 10);
	return Number.isFinite(n) ? n : 0;
}
/**
* Plain-language Earth-impact briefing from NOAA scales + L1 wind + DONKI CMEs.
* Not an official forecast — synthesizes free public products.
*/
function buildImpactBrief(opts) {
	const { scales, wind, kp, xClass, cmes } = opts;
	const R = scaleNum(scales?.R);
	const S = scaleNum(scales?.S);
	const G = scaleNum(scales?.G);
	const maxScale = Math.max(R, S, G);
	const earthCmes = earthDirectedCmes(cmes);
	const nextEta = earthCmes.map((c) => cmeImpactSummary(c)).filter((x) => x.eta).sort((a, b) => (a.eta || "").localeCompare(b.eta || ""))[0];
	const southBz = wind?.bz != null && wind.bz <= -5;
	const fastWind = wind?.speed != null && wind.speed >= 550;
	const highKp = kp != null && kp >= 5;
	const strongFlare = /^[MX]/i.test(xClass);
	const bullets = [];
	if (R >= 3) bullets.push(`Radio blackout R${R}: HF radio & some GNSS on dayside Earth can degrade during the flare.`);
	else if (R >= 1) bullets.push(`Radio blackout R${R}: brief HF fade possible on the sunlit side.`);
	else if (strongFlare) bullets.push(`Flare class ${xClass}: watch for shortwave radio effects if it peaks higher.`);
	if (S >= 2) bullets.push(`Solar radiation S${S}: elevated energetic protons — aviation polar routes & satellite ops may see elevated risk.`);
	else if (S >= 1) bullets.push(`Solar radiation S${S}: minor proton event — polar HF & some spacecraft sensors may notice.`);
	if (G >= 3) bullets.push(`Geomagnetic G${G}: power-grid operators on alert; aurora possible at mid-latitudes; GNSS/HF disruption more likely.`);
	else if (G >= 1) bullets.push(`Geomagnetic G${G}: weak–moderate storming — high-latitude aurora more active; minor satellite drag/GNSS effects possible.`);
	else if (highKp) bullets.push(`Kp ${kp?.toFixed(1)}: elevated geomagnetic activity even if G-scale is still 0.`);
	if (southBz) bullets.push(`Bz ${wind.bz.toFixed(1)} nT (south): IMF coupling is favorable for geomagnetic response if it holds.`);
	if (fastWind) bullets.push(`Solar wind ~${Math.round(wind.speed)} km/s: fast stream — can drive activity at Earth.`);
	if (nextEta?.eta) {
		const when = new Date(nextEta.eta).toUTCString().replace("GMT", "UTC");
		bullets.push(`Modeled CME arrival window ≈ ${when}${nextEta.kpHint != null ? ` · model Kp up to ~${nextEta.kpHint}` : ""}.`);
	} else if (earthCmes.length) bullets.push(`${earthCmes.length} recent CME(s) flagged Earth-directed in DONKI/ENLIL — check arrival estimates below.`);
	else if (cmes.length) bullets.push(`${cmes.length} CME(s) cataloged in the last week; none currently flagged as strong Earth hits.`);
	if (!bullets.length) bullets.push("No major R/S/G storm levels right now. Keep watching flares, LASCO CMEs, and L1 wind.");
	bullets.push("Impacts vary by longitude, technology, and latitude — always cross-check NOAA SWPC for official watches/warnings.");
	let level = "quiet";
	let title = "Quiet to unsettled";
	let color = "ok";
	let summary = "Earth environment looks relatively calm on official NOAA scales.";
	if (maxScale >= 3 || highKp && southBz && fastWind) {
		level = "storm";
		title = "Storm conditions";
		color = "danger";
		summary = "Elevated storm scales — prioritize official SWPC alerts for ops & safety-critical systems.";
	} else if (maxScale >= 1 || nextEta || highKp || strongFlare && southBz) {
		level = "elevated";
		title = "Elevated watch";
		color = "warn";
		summary = "Something is cooking — flare, wind, and/or CME context warrants closer monitoring.";
	} else if (strongFlare || fastWind || southBz || cmes.length > 2) {
		level = "watch";
		title = "Watchful quiet";
		color = "gold";
		summary = "Scales are low, but the Sun is active enough to watch for evolution.";
	}
	if (scales?.RMinorProb) bullets.splice(-1, 0, `SWPC day-1 probabilities: R (minor) ~${scales.RMinorProb}% · S ~${scales.SProb ?? "—"}% · G forecast ${scales.G1 ?? "—"}.`);
	return {
		level,
		title,
		summary,
		bullets: bullets.slice(0, 7),
		color
	};
}
/**
* SunWolf SUPT Solar Interpreter
* -----------------------------
* Deterministic multi-channel assessment agent.
* Uses the same frozen SUPT probe (α=0.01) on ordered positive sequences
* derived from solar catalogs, then fuses with SWPC scales / L1 / ENLIL context.
*
* This is NOT a free-form LLM and NOT an official forecast.
* Null / non-separated outcomes are first-class results.
*/
function parseIsoMs(s) {
	if (!s) return null;
	const t = Date.parse(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
	return Number.isFinite(t) ? t : null;
}
function flareTimes(flares) {
	const times = [];
	for (const f of flares) {
		const t = parseIsoMs(f.peakTime || f.beginTime || null);
		if (t != null) times.push(t);
	}
	return times;
}
function cmeTimes(cmes) {
	const times = [];
	for (const c of cmes) {
		const t = parseIsoMs(c.startTime);
		if (t != null) times.push(t);
	}
	return times;
}
/** Local maxima in long-channel GOES X-ray (M+ candidates / peaks). */
function xrayPeakTimes(xray, minFlux = 5e-6) {
	const series = longChannelXrays(xray).map((d) => ({
		t: parseIsoMs(d.time_tag),
		f: d.flux || d.observed_flux || 0
	})).filter((d) => d.t != null).sort((a, b) => a.t - b.t);
	if (series.length < 5) return [];
	const peaks = [];
	for (let i = 2; i < series.length - 2; i++) {
		const a = series[i - 2].f;
		const b = series[i - 1].f;
		const c = series[i].f;
		const d = series[i + 1].f;
		const e = series[i + 2].f;
		if (c >= minFlux && c >= b && c >= d && c >= a && c >= e) {
			if (!peaks.length || series[i].t - peaks[peaks.length - 1] > 20 * 6e4) peaks.push(series[i].t);
		}
	}
	return peaks;
}
function channelReading(score, kind) {
	if (score.d_ij == null) return score.n < 4 ? `Not enough ${kind} events for a SUPT timing read (need ≥4 gaps).` : `No ${kind} probe score.`;
	if (!score.separated) return `${kind} spacing looks like normal scatter vs shuffle (null is valid). Not a forecast.`;
	return `${kind} timing is ${bandPlainLabel(score.band).toLowerCase()} vs chance (d=${score.d_ij.toFixed(3)}, z=${score.z}). Rhythm only — not arrival prediction.`;
}
function latestProton(protons, energy) {
	const rows = protons.filter((p) => (p.energy || "").includes(energy));
	if (!rows.length) return null;
	const last = rows[rows.length - 1];
	return {
		flux: last.flux,
		time: last.time_tag
	};
}
/**
* Full multi-input SUPT solar assessment.
*/
function interpretSolar(opts) {
	const shuffleN = opts.shuffleN ?? 60;
	const impact = buildImpactBrief({
		scales: opts.scales,
		wind: opts.wind,
		kp: opts.kp,
		xClass: opts.xClass,
		cmes: opts.cmes
	});
	const fTimes = flareTimes(opts.flares);
	const cTimes = cmeTimes(opts.cmes);
	const xPeaks = xrayPeakTimes(opts.xray);
	const flareScore = resonanceScore(interEventSeconds(fTimes), shuffleN);
	const cmeScore = resonanceScore(interEventSeconds(cTimes), shuffleN);
	const xrayScore = resonanceScore(interEventSeconds(xPeaks), shuffleN);
	const channels = [
		{
			id: "flares",
			label: "Flare catalog rhythm",
			score: flareScore,
			plain: channelReading(flareScore, "Flare"),
			nEvents: fTimes.length
		},
		{
			id: "cmes",
			label: "CME catalog rhythm",
			score: cmeScore,
			plain: channelReading(cmeScore, "CME"),
			nEvents: cTimes.length
		},
		{
			id: "xray_peaks",
			label: "GOES X-ray peak rhythm",
			score: xrayScore,
			plain: channelReading(xrayScore, "X-ray peak"),
			nEvents: xPeaks.length
		}
	];
	const p10 = latestProton(opts.protons, ">=10 MeV");
	const p50 = latestProton(opts.protons, ">=50 MeV");
	const p100 = latestProton(opts.protons, ">=100 MeV");
	const sLike = p10 != null && p10.flux >= 10;
	const earth = earthDirectedCmes(opts.cmes);
	const arrivals = earth.map((c) => ({
		c,
		imp: cmeImpactSummary(c)
	})).filter((x) => x.imp.eta).sort((a, b) => (a.imp.eta || "").localeCompare(b.imp.eta || ""));
	const observations = [];
	observations.push(`NOAA scales now: R${opts.scales?.R ?? "—"} · S${opts.scales?.S ?? "—"} · G${opts.scales?.G ?? "—"} · X-ray ${opts.xClass} · Kp ${opts.kp != null ? opts.kp.toFixed(1) : "—"}.`);
	if (opts.wind?.speed != null || opts.wind?.bz != null) observations.push(`L1 solar wind: ${opts.wind.speed != null ? Math.round(opts.wind.speed) + " km/s" : "speed —"}${opts.wind.bz != null ? ` · Bz ${opts.wind.bz.toFixed(1)} nT` : ""}${opts.wind.bt != null ? ` · Bt ${opts.wind.bt.toFixed(1)} nT` : ""}${opts.wind.density != null ? ` · n ${opts.wind.density.toFixed(1)} cm⁻³` : ""}.`);
	observations.push(`Catalog window: ${opts.flares.length} flares · ${opts.cmes.length} CMEs (${earth.length} Earth-flagged) · ${xPeaks.length} GOES peaks (≥C5 local max).`);
	if (p10) observations.push(`GOES protons ≥10 MeV: ${p10.flux.toFixed(2)} pfu${sLike ? " (S1-class territory)" : ""}${p50 ? ` · ≥50 MeV ${p50.flux.toFixed(3)}` : ""}${p100 ? ` · ≥100 MeV ${p100.flux.toFixed(3)}` : ""}.`);
	if (arrivals[0]) {
		const a = arrivals[0];
		observations.push(`Next modeled CME arrival ≈ ${new Date(a.imp.eta).toUTCString().replace("GMT", "UTC")}${a.imp.speed != null ? ` · ${Math.round(a.imp.speed)} km/s` : ""}${a.imp.kpHint != null ? ` · model Kp~${a.imp.kpHint}` : ""}.`);
	}
	const interpretation = [];
	interpretation.push(impact.summary);
	for (const ch of channels) if (ch.score.n >= 4) interpretation.push(ch.plain);
	const anySeparated = channels.some((c) => c.score.separated && c.score.d_ij != null);
	const south = opts.wind?.bz != null && opts.wind.bz <= -5;
	const fast = opts.wind?.speed != null && opts.wind.speed >= 550;
	if (anySeparated && (south || fast || earth.length)) interpretation.push("SUPT sees non-random structure in at least one solar timing channel while L1/Earth context is also disturbed — treat as elevated attention, still not a magnitude/arrival forecast from SUPT alone.");
	else if (!anySeparated && impact.level === "quiet") interpretation.push("SUPT timing channels are consistent with shuffle null and NOAA scales are quiet — coherent “calm stack,” but null never means “nothing can fire next hour.”");
	else if (!anySeparated && impact.level !== "quiet") interpretation.push("Impact stack is elevated from scales/CME/L1 even though SUPT timing is null — the driver is amplitude / Earth-directed geometry, not catalog rhythm.");
	let enlilNote = "WSA-ENLIL is a physics model of heliospheric density/velocity. Arrival times are typically good to ~±6–12 h for well-observed CMEs; speed and magnetic connectivity (Bz at Earth) remain the large uncertainty. Use ENLIL + DONKI together, not either alone.";
	if (opts.enlilTimeHint) enlilNote += ` Latest ENLIL frame tag: ${opts.enlilTimeHint}.`;
	if (arrivals.length) {
		if (arrivals.map((a) => a.imp.speed).filter((s) => s != null).some((s) => s < 300 || s > 1500)) enlilNote += " At least one CME speed is outside the best-constrained band — widen your arrival window.";
	}
	const watchItems = [];
	for (const b of impact.bullets.slice(0, 4)) watchItems.push(b);
	if (sLike) watchItems.push("Proton flux elevated — polar HF, aviation high-latitude routes, and single-event effects on spacecraft are the practical concerns.");
	if (south && arrivals.length) watchItems.push("Southward Bz now + incoming CME: if the ejecta arrives while Bz stays south, geomagnetic response can step up quickly.");
	const strong = opts.flares.find((f) => /^[MX]/i.test(f.classType || ""));
	if (strong) watchItems.push(`Strongest recent catalog flare ${strong.classType} at ${strong.sourceLocation || "—"} — check linked CME/SEP rows in DONKI.`);
	const fastCme = opts.cmes.map((c) => ({
		c,
		a: bestCmeAnalysis(c)
	})).filter((x) => (x.a?.speed ?? 0) >= 800).slice(0, 2);
	for (const x of fastCme) watchItems.push(`Fast CME ${x.c.startTime}: ~${Math.round(x.a.speed)} km/s — higher uncertainty if Earth-directed.`);
	const caveats = [
		"SUPT on solar catalogs measures ordered structure in event spacing only — not flare class, not CME hit/miss, not Kp.",
		"DONKI times are analyst-cataloged; GOES X-ray peaks are automatic — the two channels can disagree.",
		"Solar Orbiter / STEREO frames are contextual imagery; they do not enter the SUPT numeric probe.",
		"Not an official NOAA/ESA product. Cross-check SWPC watches/warnings for ops."
	];
	let attention = 12;
	const R = parseInt(String(opts.scales?.R ?? 0), 10) || 0;
	const S = parseInt(String(opts.scales?.S ?? 0), 10) || 0;
	const G = parseInt(String(opts.scales?.G ?? 0), 10) || 0;
	attention += R * 12 + S * 14 + G * 16;
	if (opts.kp != null) attention += Math.max(0, (opts.kp - 3) * 6);
	if (south) attention += 8;
	if (fast) attention += 6;
	if (sLike) attention += 14;
	if (arrivals.length) attention += 10 + Math.min(12, arrivals.length * 4);
	if (anySeparated) attention += 8;
	if (/^X/.test(opts.xClass)) attention += 12;
	else if (/^M/.test(opts.xClass)) attention += 6;
	attention = Math.max(0, Math.min(100, Math.round(attention)));
	const headlineParts = [impact.title];
	if (anySeparated) {
		const best = channels.filter((c) => c.score.separated).sort((a, b) => Math.abs(b.score.z ?? 0) - Math.abs(a.score.z ?? 0))[0];
		if (best) headlineParts.push(`SUPT: ${best.label.replace(" rhythm", "")} non-null`);
	} else headlineParts.push("SUPT timing null");
	if (arrivals[0]?.imp.eta) headlineParts.push(`CME ETA ${new Date(arrivals[0].imp.eta).toISOString().slice(0, 16).replace("T", " ")}Z`);
	return {
		generatedAt: Date.now(),
		impact,
		channels,
		headline: headlineParts.join(" · "),
		observations,
		interpretation,
		watchItems: watchItems.slice(0, 8),
		caveats,
		attention,
		protons: {
			p10: p10?.flux ?? null,
			p50: p50?.flux ?? null,
			p100: p100?.flux ?? null,
			time: p10?.time ?? p50?.time ?? null,
			sLike
		},
		enlilNote
	};
}
var BASEMAP_STYLES = {
	soft: {
		id: "soft",
		label: "Soft lit",
		short: "Soft",
		url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
		attribution: "&copy; OSM &copy; CARTO",
		subdomains: "abcd",
		maxZoom: 19,
		tone: "light"
	},
	dark: {
		id: "dark",
		label: "Night ops",
		short: "Night",
		url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
		attribution: "&copy; OSM &copy; CARTO",
		subdomains: "abcd",
		maxZoom: 19,
		tone: "dark"
	},
	satellite: {
		id: "satellite",
		label: "Satellite",
		short: "Sat",
		url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
		attribution: "Tiles &copy; Esri",
		maxZoom: 18,
		tone: "sat"
	},
	topo: {
		id: "topo",
		label: "Terrain",
		short: "Topo",
		url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
		attribution: "Map data: &copy; OSM, SRTM | Map style: &copy; OpenTopoMap",
		subdomains: "abc",
		maxZoom: 17,
		tone: "light"
	}
};
var DEFAULT_OVERLAYS = {
	quakes: true,
	heatmap: false,
	nodes: true,
	volcanoes: true,
	corridors: true,
	depthColor: true,
	timeDecay: true,
	mmiContours: true,
	plates: true,
	/** Emphasize M6+ in the active window */
	significant: false,
	/** Global M4.5+ / significant day context */
	globalActivity: false
};
/**
* First-open mobile: map-first, fewer chrome/legend drivers.
* Plates + depth coloring off → no stacked legend blocks; mag colors stay readable.
*/
function mobileLeanOverlays() {
	return {
		...DEFAULT_OVERLAYS,
		plates: false,
		depthColor: false,
		corridors: false,
		volcanoes: false,
		heatmap: false,
		timeDecay: false,
		mmiContours: true,
		nodes: true,
		significant: false,
		globalActivity: false
	};
}
var OVERLAY_META = [
	{
		id: "quakes",
		label: "Earthquake markers",
		short: "Quakes",
		hint: "Individual event circles (size = magnitude)"
	},
	{
		id: "heatmap",
		label: "Heatmap density",
		short: "Heat",
		hint: "Swarm density — mag × time-decay when Decay is on"
	},
	{
		id: "significant",
		label: "Significant M6+",
		short: "M6+",
		hint: "Highlight strong events (M≥6) in the active window"
	},
	{
		id: "globalActivity",
		label: "Global M4.5+ (day)",
		short: "World",
		hint: "Worldwide USGS M4.5+ and significant events (24h context layer)"
	},
	{
		id: "depthColor",
		label: "Depth coloring",
		short: "Depth",
		hint: "Marker fill by depth km (shallow hot → deep cool)"
	},
	{
		id: "timeDecay",
		label: "Heat time-decay",
		short: "Decay",
		hint: "Recent events hotter on heat (exponential half-life)"
	},
	{
		id: "plates",
		label: "Plate boundaries + motion",
		short: "Plates",
		hint: "PB2002 boundaries with relative plate-motion arrows (mm/yr)"
	},
	{
		id: "mmiContours",
		label: "MMI contours (focus)",
		short: "MMI",
		hint: "Official USGS cont_mmi for one focused-node event only"
	},
	{
		id: "nodes",
		label: "Priority nodes",
		short: "Nodes",
		hint: "Proxy node status pins"
	},
	{
		id: "volcanoes",
		label: "Volcano proxy",
		short: "Volc",
		hint: "USGS HANS elevated volcanoes + volcanic earthquake proxies"
	},
	{
		id: "corridors",
		label: "Focus corridors",
		short: "Zones",
		hint: "Published / focused bounds"
	}
];
function loadBasemapStyle() {
	if (typeof window === "undefined") return "satellite";
	try {
		const v = localStorage.getItem("wolfwatch_basemap");
		if (v === "soft" || v === "dark" || v === "satellite" || v === "topo") return v;
	} catch {}
	return "satellite";
}
function loadOverlays(opts) {
	if (typeof window === "undefined") return { ...DEFAULT_OVERLAYS };
	try {
		const raw = localStorage.getItem("wolfwatch_overlays");
		if (raw) {
			const parsed = JSON.parse(raw);
			return {
				...DEFAULT_OVERLAYS,
				...parsed
			};
		}
	} catch {}
	if (opts?.mobile) return mobileLeanOverlays();
	try {
		if (window.matchMedia?.("(max-width: 767px)").matches) return mobileLeanOverlays();
	} catch {}
	return { ...DEFAULT_OVERLAYS };
}
/**
* USGS ShakeMap technology — notes + product helpers.
* Manual: https://ghsc.code-pages.usgs.gov/esi/shakemap/
*/
var SHAKEMAP_NOTES = {
	title: "USGS ShakeMap technology",
	oneLiner: "Near-real-time maps of estimated ground shaking (not epicenter dots) after significant earthquakes — stations + GMPE fill-in + site amplification.",
	pipeline: [
		{
			step: "1. Observations",
			detail: "Instrumental peak motions (PGA, PGV, PSA) from seismic networks + optional DYFI macroseismic reports."
		},
		{
			step: "2. GMPE backbone",
			detail: "Ground-motion prediction equations estimate shaking where stations are sparse."
		},
		{
			step: "3. Site amplification",
			detail: "Vs30 (often topographic slope proxy) adjusts rock predictions."
		},
		{
			step: "4. Bias & interpolate",
			detail: "Station residuals adjust the continuous intensity field."
		},
		{
			step: "5. Intensity (MMI)",
			detail: "GMICE converts peak motions ↔ Modified Mercalli Intensity."
		},
		{
			step: "6. Products",
			detail: "PNG/PDF, cont_mmi.json contours, coverage grids, rupture, uncertainty."
		}
	],
	intensityMeasures: [
		{
			code: "MMI",
			name: "Modified Mercalli Intensity",
			use: "Human/felt scale map (I–X+)"
		},
		{
			code: "PGA",
			name: "Peak ground acceleration",
			use: "Short-period structural demand"
		},
		{
			code: "PGV",
			name: "Peak ground velocity",
			use: "Damage proxy; mid-period"
		},
		{
			code: "PSA 0.3 / 1.0 / 3.0 s",
			name: "Pseudo-spectral acceleration",
			use: "Building-period sensitive"
		}
	],
	access: {
		catalog: "ComCat producttype=shakemap",
		detail: "properties.products.shakemap[0].contents",
		usefulContents: [
			"download/cont_mmi.json — MMI contours (Leaflet overlay)",
			"download/intensity.jpg — intensity image",
			"download/info.json — metadata / bounds",
			"download/attenuation_curves.json",
			"download/rupture.json"
		],
		eventPage: "https://earthquake.usgs.gov/earthquakes/eventpage/{eventid}/shakemap"
	},
	vsSentinel: {
		shakemap: "Spatial field of shaking intensity for one significant event",
		heat: "Magnitude × time-decay density of many hypocenters (swarm viz)",
		depth: "Hypocentral depth palette — source geometry, not site shaking"
	},
	stance: "WolfWatch does not recompute ShakeMaps. Focused Node mode may draw official USGS cont_mmi.json contours for a single preferred event. Authoritative product remains USGS."
};
function shakeMapEventUrl(eventId) {
	if (!eventId) return null;
	return `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(String(eventId))}/shakemap`;
}
function eventPageUrl(eventId) {
	if (!eventId) return null;
	return `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(String(eventId))}`;
}
function hasShakeMapProduct(types) {
	if (!types) return false;
	return types.split(",").map((t) => t.trim()).includes("shakemap");
}
function formatMmi(mmi) {
	if (mmi == null || !Number.isFinite(mmi)) return "—";
	return mmi.toFixed(1);
}
function mmiContourColor(value) {
	if (value >= 9) return "#960000";
	if (value >= 8) return "#c80000";
	if (value >= 7) return "#ff0000";
	if (value >= 6) return "#ff6400";
	if (value >= 5) return "#ffba00";
	if (value >= 4) return "#ffff00";
	if (value >= 3) return "#c8ff64";
	if (value >= 2.5) return "#afd9ff";
	if (value >= 2) return "#7db7ff";
	return "#b0c4de";
}
async function fetchMmiContours(eventId, signal) {
	const detailUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=${encodeURIComponent(eventId)}&format=geojson`;
	const res = await fetch(detailUrl, {
		cache: "no-cache",
		signal
	});
	if (!res.ok) throw new Error(`ComCat detail ${res.status}`);
	const detail = await res.json();
	const sm = detail.properties?.products?.shakemap?.[0];
	if (!sm?.contents) return null;
	const cont = sm.contents["download/cont_mmi.json"] || sm.contents["cont_mmi.json"] || Object.entries(sm.contents).find(([k]) => /cont_mmi\.json$/i.test(k))?.[1];
	if (!cont?.url) return null;
	const cRes = await fetch(cont.url, {
		cache: "no-cache",
		signal
	});
	if (!cRes.ok) throw new Error(`cont_mmi ${cRes.status}`);
	const contours = await cRes.json();
	if (!contours?.features?.length) return null;
	const id = detail.id || eventId;
	return {
		eventId: id,
		mag: detail.properties?.mag ?? null,
		place: detail.properties?.place ?? null,
		mmi: detail.properties?.mmi ?? null,
		time: detail.properties?.time ?? null,
		contours,
		shakeMapUrl: shakeMapEventUrl(id),
		productUpdated: sm.updateTime ?? null
	};
}
async function fetchShakeMapCandidatesInBounds(bounds, opts = {}) {
	const { minMag = 4.5, limit = 8, padDeg = 1.5, signal } = opts;
	const [[latMin, lonMin], [latMax, lonMax]] = bounds;
	const minlatitude = latMin - padDeg;
	const maxlatitude = latMax + padDeg;
	const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
	url.searchParams.set("format", "geojson");
	url.searchParams.set("producttype", "shakemap");
	url.searchParams.set("orderby", "magnitude");
	url.searchParams.set("limit", String(limit));
	url.searchParams.set("minmagnitude", String(minMag));
	url.searchParams.set("minlatitude", String(minlatitude));
	url.searchParams.set("maxlatitude", String(maxlatitude));
	if (lonMin > lonMax) {
		url.searchParams.set("minlongitude", "-180");
		url.searchParams.set("maxlongitude", "180");
	} else {
		url.searchParams.set("minlongitude", String(lonMin - padDeg));
		url.searchParams.set("maxlongitude", String(lonMax + padDeg));
	}
	const start = (/* @__PURE__ */ new Date(Date.now() - 720 * 3600 * 1e3)).toISOString();
	url.searchParams.set("starttime", start);
	const res = await fetch(url.toString(), {
		cache: "no-cache",
		signal
	});
	if (!res.ok) throw new Error(`ComCat shakemap catalog ${res.status}`);
	return ((await res.json()).features ?? []).filter((f) => {
		const [lon, lat] = f.geometry.coordinates;
		return pointInBounds(lat, lon, bounds, padDeg);
	});
}
function pickFocusShakeMapCandidate(features, bounds, minMag = 4.5, padDeg = 1.25) {
	const pool = features.filter((f) => {
		if ((f.properties.mag ?? 0) < minMag || !f.id) return false;
		const [lon, lat] = f.geometry.coordinates;
		return pointInBounds(lat, lon, bounds, padDeg);
	});
	if (!pool.length) return null;
	return [...pool].sort((a, b) => {
		const aSm = (hasShakeMapProduct(a.properties.types) ? 2 : 0) + (a.properties.mmi != null ? 1 : 0);
		const bSm = (hasShakeMapProduct(b.properties.types) ? 2 : 0) + (b.properties.mmi != null ? 1 : 0);
		if (bSm !== aSm) return bSm - aSm;
		const dMag = (b.properties.mag ?? 0) - (a.properties.mag ?? 0);
		if (Math.abs(dMag) > .05) return dMag;
		return (b.properties.time ?? 0) - (a.properties.time ?? 0);
	})[0] ?? null;
}
async function resolveFocusMmiEvent(feedFeatures, bounds, signal) {
	const fromFeed = pickFocusShakeMapCandidate(feedFeatures, bounds, 4.5, 1.25);
	if (fromFeed && (hasShakeMapProduct(fromFeed.properties.types) || fromFeed.properties.mmi != null)) return fromFeed;
	try {
		const catalog = await fetchShakeMapCandidatesInBounds(bounds, {
			minMag: 4.5,
			limit: 10,
			padDeg: 1.5,
			signal
		});
		if (catalog.length) return catalog[0] ?? null;
	} catch {}
	return fromFeed;
}
var EMPTY_FOCUS_MMI = {
	status: "idle",
	eventId: null,
	place: null,
	mag: null,
	mmi: null,
	shakeMapUrl: null,
	contours: null,
	error: null,
	dismissed: false
};
function filteredEq(features, minMag, maxMag = 10) {
	if (!features?.length) return [];
	return features.filter((f) => {
		const m = f.properties.mag ?? 0;
		return m >= minMag && m <= maxMag;
	});
}
function loadMode() {
	try {
		const m = localStorage.getItem("wolfwatch_mode");
		if (m === "lite" || m === "standard" || m === "full") return m;
		const def = defaultPerformanceMode();
		try {
			localStorage.setItem("wolfwatch_mode", def);
			localStorage.setItem("wolfwatch_first_open", isMobileViewport() ? "mobile" : "desktop");
		} catch {}
		return def;
	} catch {}
	return defaultPerformanceMode();
}
function loadBool(key, fallback) {
	try {
		const v = localStorage.getItem(key);
		if (v === "1" || v === "true") return true;
		if (v === "0" || v === "false") return false;
	} catch {}
	return fallback;
}
function loadNum(key, fallback, min, max) {
	try {
		const raw = localStorage.getItem(key);
		if (raw == null) return fallback;
		const n = parseFloat(raw);
		if (!Number.isFinite(n)) return fallback;
		return Math.min(max, Math.max(min, n));
	} catch {
		return fallback;
	}
}
function saveNum(key, v) {
	try {
		localStorage.setItem(key, String(v));
	} catch {}
}
function safeHistory() {
	if (typeof window === "undefined") return [];
	return getHistory("dij", historyCap());
}
function safeAttentionHistory() {
	if (typeof window === "undefined") return [];
	return getHistory("attn", historyCap());
}
function buildSolarAssessmentFromState(s) {
	const long = longChannelXrays(s.xray);
	const latest = long.length ? long[long.length - 1] : null;
	const flux = latest ? latest.flux || latest.observed_flux || 0 : 0;
	const kpVal = s.kp.length ? Number(s.kp[s.kp.length - 1].Kp) : null;
	return interpretSolar({
		scales: s.scales,
		wind: s.solarWind,
		kp: kpVal,
		xClass: latest ? fluxToClass(flux) : "—",
		xray: s.xray,
		cmes: s.donki?.cmes ?? [],
		flares: s.donki?.flares ?? [],
		protons: s.protons,
		enlilTimeHint: s.enlil?.timeHint,
		shuffleN: s.mode === "lite" ? 40 : 60
	});
}
var seenEqIds = /* @__PURE__ */ new Set();
var mmiAbort = null;
/** Bound hung network so one slow feed cannot freeze lastUpdate forever. */
function withTimeout(p, ms, label) {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(/* @__PURE__ */ new Error(`${label} timeout (${ms}ms)`)), ms);
		p.then((v) => {
			clearTimeout(t);
			resolve(v);
		}, (e) => {
			clearTimeout(t);
			reject(e);
		});
	});
}
var useObservatory = create((set, get) => ({
	mode: "standard",
	tab: "live",
	mobileSheet: "closed",
	mapView: "2d",
	timeWindow: "day",
	minMag: 3.5,
	maxMag: 10,
	autoRefresh: true,
	loading: false,
	lastUpdate: null,
	newestEventAgeMs: null,
	livePulseAt: null,
	error: null,
	focusNodeId: null,
	focusMmi: { ...EMPTY_FOCUS_MMI },
	mapFlyTo: null,
	globeAntipode: null,
	pickedEvent: null,
	basemapStyle: "satellite",
	overlays: {
		quakes: true,
		heatmap: false,
		nodes: true,
		volcanoes: true,
		corridors: true,
		depthColor: true,
		timeDecay: true,
		mmiContours: true,
		plates: true,
		significant: false,
		globalActivity: false
	},
	useGeofon: false,
	audioAlerts: false,
	globeAutoSpin: true,
	globeStemScale: .16,
	globeMarkerScale: 1.2,
	globeSpinSpeed: 1,
	globeMarkerOpacity: .82,
	eq: null,
	volc: null,
	usgsVolcAlerts: [],
	volcWatchNodes: [],
	volcWatchTransitions: [],
	volcWatchPins: [],
	volcWatchMutes: [],
	globalSeismic: null,
	liveStatus: "polling",
	liveStatusDetail: null,
	kp: [],
	xray: [],
	solarWind: null,
	scales: null,
	alerts: [],
	flux10cm: null,
	protons: [],
	forecast: null,
	enlil: null,
	ovation: null,
	donki: null,
	kpForecast: [],
	solarAssessment: null,
	attentionHistory: [],
	resonance: null,
	reading: "",
	dijHistory: [],
	setMode: (m) => {
		try {
			localStorage.setItem("wolfwatch_mode", m);
		} catch {}
		const prevMin = MODES[get().mode].minMag;
		const patch = { mode: m };
		if (get().minMag === prevMin) patch.minMag = MODES[m].minMag;
		if (m !== "full" && get().mapView === "3d") patch.mapView = "2d";
		if (m === "lite") patch.mapView = "2d";
		set(patch);
		if (m === "lite") try {
			pruneCache(true);
		} catch {}
		get().refresh(true);
	},
	setTab: (t) => set({
		tab: t,
		mobileSheet: "closed"
	}),
	setMobileSheet: (mobileSheet) => set({ mobileSheet }),
	setMapView: (v) => set({ mapView: v }),
	setTimeWindow: (w) => {
		set({ timeWindow: w });
		get().refresh(true);
	},
	setMinMag: (m) => set({ minMag: m }),
	setMaxMag: (m) => set({ maxMag: m }),
	setAutoRefresh: (v) => set({ autoRefresh: v }),
	setFocusNode: (id) => {
		if (mmiAbort) {
			mmiAbort.abort();
			mmiAbort = null;
		}
		set({
			focusNodeId: id,
			mapView: id ? "2d" : get().mapView,
			tab: "live",
			mobileSheet: "closed",
			focusMmi: { ...EMPTY_FOCUS_MMI },
			pickedEvent: null
		});
		if (id) get().loadFocusMmi();
	},
	flyMapTo: (lat, lon, zoom = 6, id) => {
		set({
			tab: "live",
			mobileSheet: "closed",
			mapView: "2d",
			mapFlyTo: {
				lat,
				lon,
				zoom,
				id
			}
		});
	},
	clearMapFlyTo: () => set({ mapFlyTo: null }),
	antipodeOf: (lat, lon) => {
		const aLat = -lat;
		let aLon = lon + 180;
		if (aLon > 180) aLon -= 360;
		if (aLon < -180) aLon += 360;
		const full = get().mode === "full";
		set({
			tab: "live",
			mobileSheet: "closed",
			mapView: full ? "3d" : "2d",
			globeAntipode: full ? {
				lat: aLat,
				lon: aLon
			} : null,
			mapFlyTo: full ? null : {
				lat: aLat,
				lon: aLon,
				zoom: 3
			}
		});
	},
	clearGlobeAntipode: () => set({ globeAntipode: null }),
	pickEvent: (ev) => set({ pickedEvent: ev }),
	setBasemapStyle: (id) => {
		try {
			localStorage.setItem("wolfwatch_basemap", id);
		} catch {}
		set({ basemapStyle: id });
	},
	setOverlay: (id, on) => {
		const overlays = {
			...get().overlays,
			[id]: on
		};
		try {
			localStorage.setItem("wolfwatch_overlays", JSON.stringify(overlays));
		} catch {}
		set({ overlays });
	},
	setOverlaysBulk: (next) => {
		const overlays = { ...next };
		try {
			localStorage.setItem("wolfwatch_overlays", JSON.stringify(overlays));
		} catch {}
		set({ overlays });
	},
	setLiveStatus: (liveStatus, detail = null) => set({
		liveStatus,
		liveStatusDetail: detail ?? null
	}),
	rebuildVolcWatch: () => {
		const pins = new Set(get().volcWatchPins);
		const mutes = new Set(get().volcWatchMutes);
		set({ volcWatchNodes: buildWatchNodes(get().usgsVolcAlerts, pins, mutes) });
	},
	pinVolcWatch: (key) => {
		const pins = new Set(get().volcWatchPins);
		pins.add(key);
		const mutes = new Set(get().volcWatchMutes);
		mutes.delete(key);
		savePins(pins);
		saveMutes(mutes);
		set({
			volcWatchPins: [...pins],
			volcWatchMutes: [...mutes],
			volcWatchNodes: buildWatchNodes(get().usgsVolcAlerts, pins, mutes)
		});
	},
	unpinVolcWatch: (key) => {
		const pins = new Set(get().volcWatchPins);
		pins.delete(key);
		savePins(pins);
		set({
			volcWatchPins: [...pins],
			volcWatchNodes: buildWatchNodes(get().usgsVolcAlerts, pins, new Set(get().volcWatchMutes))
		});
	},
	muteVolcWatch: (key) => {
		const mutes = new Set(get().volcWatchMutes);
		mutes.add(key);
		const pins = new Set(get().volcWatchPins);
		pins.delete(key);
		saveMutes(mutes);
		savePins(pins);
		const focus = get().focusNodeId;
		const nodeId = `usgs-volc-${key}`;
		set({
			volcWatchMutes: [...mutes],
			volcWatchPins: [...pins],
			volcWatchNodes: buildWatchNodes(get().usgsVolcAlerts, pins, mutes),
			focusNodeId: focus === nodeId ? null : focus
		});
	},
	unmuteVolcWatch: (key) => {
		const mutes = new Set(get().volcWatchMutes);
		mutes.delete(key);
		saveMutes(mutes);
		set({
			volcWatchMutes: [...mutes],
			volcWatchNodes: buildWatchNodes(get().usgsVolcAlerts, new Set(get().volcWatchPins), mutes)
		});
	},
	setUseGeofon: (v) => {
		try {
			localStorage.setItem("wolfwatch_geofon", v ? "1" : "0");
		} catch {}
		set({ useGeofon: v });
		get().refresh(true);
	},
	setAudioAlerts: (v) => {
		try {
			localStorage.setItem("wolfwatch_audio", v ? "1" : "0");
		} catch {}
		set({ audioAlerts: v });
	},
	setGlobeAutoSpin: (v) => {
		try {
			localStorage.setItem("wolfwatch_globe_spin", v ? "1" : "0");
		} catch {}
		set({ globeAutoSpin: v });
	},
	setGlobeStemScale: (v) => {
		const n = Math.min(.42, Math.max(.04, v));
		saveNum("wolfwatch_globe_stem", n);
		set({ globeStemScale: n });
	},
	setGlobeMarkerScale: (v) => {
		const n = Math.min(3.5, Math.max(.4, v));
		saveNum("wolfwatch_globe_hex", n);
		set({ globeMarkerScale: n });
	},
	setGlobeSpinSpeed: (v) => {
		const n = Math.min(3, Math.max(.1, v));
		saveNum("wolfwatch_globe_spd", n);
		set({ globeSpinSpeed: n });
	},
	setGlobeMarkerOpacity: (v) => {
		const n = Math.min(1, Math.max(.2, v));
		saveNum("wolfwatch_globe_opac", n);
		set({ globeMarkerOpacity: n });
	},
	dismissFocusMmi: () => set({ focusMmi: {
		...get().focusMmi,
		dismissed: true
	} }),
	loadFocusMmi: async () => {
		const nodeId = get().focusNodeId;
		if (!nodeId) return;
		const node = DRAGON_NODES.find((n) => n.id === nodeId);
		if (!node || node.kind === "volcano") {
			set({ focusMmi: {
				...EMPTY_FOCUS_MMI,
				status: "empty",
				error: "No seismic focus for MMI"
			} });
			return;
		}
		if (!get().overlays.mmiContours) return;
		if (mmiAbort) mmiAbort.abort();
		const ac = new AbortController();
		mmiAbort = ac;
		const signal = ac.signal;
		set({ focusMmi: {
			...EMPTY_FOCUS_MMI,
			status: "loading"
		} });
		try {
			const candidate = await resolveFocusMmiEvent(get().eq?.features ?? [], node.bounds, signal);
			if (signal.aborted) return;
			if (!candidate?.id) {
				set({ focusMmi: {
					...EMPTY_FOCUS_MMI,
					status: "empty",
					error: "No suitable event for ShakeMap MMI"
				} });
				return;
			}
			const result = await fetchMmiContours(String(candidate.id), signal);
			if (signal.aborted) return;
			if (!result) {
				set({ focusMmi: {
					...EMPTY_FOCUS_MMI,
					status: "empty",
					eventId: String(candidate.id),
					place: candidate.properties.place,
					mag: candidate.properties.mag,
					mmi: candidate.properties.mmi ?? null,
					error: "No cont_mmi product for this event"
				} });
				return;
			}
			set({ focusMmi: {
				status: "ready",
				eventId: result.eventId,
				place: result.place,
				mag: result.mag,
				mmi: result.mmi,
				shakeMapUrl: result.shakeMapUrl,
				contours: result.contours,
				error: null,
				dismissed: false
			} });
		} catch (e) {
			if (signal.aborted) return;
			set({ focusMmi: {
				...EMPTY_FOCUS_MMI,
				status: "error",
				error: e instanceof Error ? e.message : "MMI fetch failed"
			} });
		}
	},
	refresh: async (force = false) => {
		const { mode, timeWindow, loading, useGeofon, audioAlerts } = get();
		if (loading && !force) return;
		const cfg = MODES[mode];
		try {
			pruneCache(false);
		} catch {}
		set({
			loading: true,
			error: null
		});
		try {
			let eq = force ? null : getCache("eq", cfg.refreshMs);
			let kp = force ? null : getCache("kp", cfg.refreshMs);
			let xray = force ? null : getCache("xray", cfg.refreshMs * 2);
			let solarWind = force ? null : getCache("sw", cfg.refreshMs);
			let scales = force ? null : getCache("scales", 18e4);
			let alerts = force ? null : getCache("alerts", 12e4);
			let flux10cm = force ? null : getCache("flux10", 3e5);
			let protons = force ? null : getCache("protons", 18e4);
			let forecast = force ? null : getCache("forecast", 6e5);
			let enlil = force ? null : getCache("enlil", 6e5);
			let ovation = force ? null : getCache("ovation", 3e5);
			let donki = force ? null : getCache("donki", 6e5);
			let kpForecast = force ? null : getCache("kp_fc", 6e5);
			let volc = force ? null : getCache("volc", 3e5);
			let usgsVolcAlerts = force ? null : getCache("usgs_volc_alerts", 3e5);
			const tasks = [];
			let pulse = null;
			let geofon = null;
			if (!eq) tasks.push(withTimeout(fetchEarthquakes(timeWindow), 2e4, "usgs-eq").then((d) => {
				eq = d;
				setCache("eq", d);
			}).catch(() => {}));
			tasks.push(withTimeout(fetchRealtimePulse(), 12e3, "usgs-pulse").then((d) => {
				pulse = d;
				setCache("eq_pulse", d);
			}).catch(() => {
				pulse = getCache("eq_pulse", 12e4);
			}));
			if (useGeofon) tasks.push(withTimeout(fetchGeofonWeek(Math.min(cfg.minMag, 2.5)), 18e3, "geofon").then((d) => {
				geofon = d;
				setCache("geofon", d);
			}).catch(() => {
				geofon = getCache("geofon", 3e5);
			}));
			if (cfg.loadSolarWind && (!kp?.length || !solarWind || !scales || !forecast || !flux10cm || force)) tasks.push(withTimeout(fetchSolarCore({ data: { heavy: cfg.loadChart || cfg.loadImage } }), 28e3, "solar-core").then((d) => {
				kp = d.kp;
				xray = d.xray;
				solarWind = d.solarWind;
				scales = d.scales;
				alerts = d.alerts;
				flux10cm = d.flux10cm;
				forecast = d.forecast;
				enlil = d.enlil;
				ovation = d.ovation;
				protons = d.protons;
				kpForecast = d.kpForecast;
				setCache("kp", d.kp);
				if (d.xray.length) setCache("xray", d.xray);
				setCache("sw", d.solarWind);
				if (d.scales) setCache("scales", d.scales);
				setCache("alerts", d.alerts);
				setCache("flux10", d.flux10cm);
				setCache("forecast", d.forecast);
				if (d.enlil) setCache("enlil", d.enlil);
				if (d.ovation) setCache("ovation", d.ovation);
				if (d.protons.length) setCache("protons", d.protons);
				if (d.kpForecast?.length) setCache("kp_fc", d.kpForecast);
			}).catch(() => {}));
			else {
				if (!kp) tasks.push(withTimeout(fetchKp(), 15e3, "kp").then((d) => {
					kp = d;
					setCache("kp", d);
				}).catch(() => {}));
				if (cfg.loadChart && !xray) tasks.push(withTimeout(fetchXrays(), 15e3, "xray").then((d) => {
					xray = d;
					setCache("xray", d);
				}).catch(() => {}));
				if (!alerts) tasks.push(withTimeout(fetchAlerts(), 12e3, "alerts").then((d) => {
					alerts = d;
					setCache("alerts", d);
				}).catch(() => {}));
			}
			if (cfg.loadSolarWind && mode !== "lite" && !donki) tasks.push(withTimeout(fetchDonkiBundle(), 25e3, "donki").then((d) => {
				donki = d;
				setCache("donki", d);
			}).catch(() => {}));
			if (cfg.loadVolc && !volc) tasks.push(withTimeout(fetchVolcanoes(), 18e3, "volc").then((d) => {
				volc = d;
				if (d) setCache("volc", d);
			}).catch(() => {}));
			if (!usgsVolcAlerts) tasks.push(withTimeout(fetchUsgsElevatedVolcanoes(), 18e3, "usgs-volc").then((d) => {
				usgsVolcAlerts = d;
				setCache("usgs_volc_alerts", d);
			}).catch(() => {}));
			let globalSeismic = force ? null : getCache("global_seismic", 18e4);
			if (!globalSeismic) tasks.push(withTimeout(fetchGlobalSeismic(), 2e4, "global-seismic").then((d) => {
				globalSeismic = d;
				setCache("global_seismic", d);
			}).catch(() => {}));
			await Promise.allSettled(tasks);
			let eqFinal = mergeEqCollections(eq ?? get().eq, pulse);
			if (useGeofon && geofon) eqFinal = mergeEqCollections(eqFinal, geofon);
			if (eqFinal?.features && eqFinal.features.length > cfg.maxMarkers) eqFinal = {
				...eqFinal,
				features: capFeaturesForMode(eqFinal.features, cfg.maxMarkers, priorityNodeBounds(get().volcWatchNodes))
			};
			const newestEventAgeMs = latestEventAgeMs(eqFinal?.features);
			if (eqFinal?.features) seenEqIds = alertNewEvents(eqFinal.features, seenEqIds, {
				enabled: audioAlerts,
				minMag: 4.5
			});
			let resonance = get().resonance;
			let reading = get().reading;
			let dijHistory = get().dijHistory;
			if (eqFinal?.features?.length) {
				const score = resonanceScore(interEventSeconds(eqFinal.features.map((f) => f.properties.time).filter((t) => typeof t === "number")), cfg.shuffleN);
				resonance = score;
				reading = readingSummary(score);
				dijHistory = pushHistory("dij", {
					t: Date.now(),
					d_ij: score.d_ij,
					n: score.n,
					z: score.z
				}, historyCap());
			}
			const kpFinal = kp ?? get().kp;
			const xrayFinal = xray ?? get().xray;
			const swFinal = solarWind ?? get().solarWind;
			const scalesFinal = scales ?? get().scales;
			const protonsFinal = protons ?? get().protons;
			const donkiFinal = donki ?? get().donki;
			const enlilFinal = enlil ?? get().enlil;
			const solarAssessment = buildSolarAssessmentFromState({
				scales: scalesFinal,
				solarWind: swFinal,
				kp: kpFinal,
				xray: xrayFinal,
				donki: donkiFinal,
				protons: protonsFinal,
				enlil: enlilFinal,
				mode
			});
			let attentionHistory = get().attentionHistory;
			if (solarAssessment) attentionHistory = pushHistory("attn", {
				t: Date.now(),
				attention: solarAssessment.attention,
				level: solarAssessment.impact.level,
				kp: kpFinal.length ? Number(kpFinal[kpFinal.length - 1].Kp) : null
			}, historyCap());
			set({
				eq: eqFinal,
				volc: volc ?? get().volc,
				usgsVolcAlerts: usgsVolcAlerts ?? get().usgsVolcAlerts,
				globalSeismic: globalSeismic ?? get().globalSeismic,
				volcWatchNodes: (() => {
					return buildWatchNodes(usgsVolcAlerts ?? get().usgsVolcAlerts, new Set(get().volcWatchPins), new Set(get().volcWatchMutes));
				})(),
				volcWatchTransitions: (() => {
					const prev = get().usgsVolcAlerts;
					const next = usgsVolcAlerts ?? prev;
					if (usgsVolcAlerts == null) return get().volcWatchTransitions;
					const hadPrev = prev.length > 0 || get().volcWatchNodes.length > 0;
					const deltas = diffVolcWatch(prev, next);
					if (!deltas.length) return get().volcWatchTransitions;
					return [...!hadPrev && prev.length === 0 ? deltas.filter((d) => d.kind === "elevated") : deltas, ...get().volcWatchTransitions].slice(0, 24);
				})(),
				kp: kpFinal,
				xray: xrayFinal,
				solarWind: swFinal,
				scales: scalesFinal,
				alerts: alerts ?? get().alerts,
				flux10cm: flux10cm ?? get().flux10cm,
				protons: protonsFinal,
				forecast: forecast ?? get().forecast,
				enlil: enlilFinal,
				ovation: ovation ?? get().ovation,
				donki: donkiFinal,
				kpForecast: kpForecast ?? get().kpForecast,
				solarAssessment,
				attentionHistory,
				resonance,
				reading,
				dijHistory,
				loading: false,
				lastUpdate: Date.now(),
				newestEventAgeMs,
				livePulseAt: pulse ? Date.now() : get().livePulseAt,
				error: null
			});
			if (get().focusNodeId && get().overlays.mmiContours) get().loadFocusMmi();
		} catch (e) {
			set({
				loading: false,
				error: e instanceof Error ? e.message : "Refresh failed"
			});
		} finally {
			if (get().loading) set({ loading: false });
		}
	},
	bootstrapClientDefaults: () => {
		if (typeof window === "undefined") return;
		try {
			const patch = {
				basemapStyle: loadBasemapStyle(),
				overlays: loadOverlays(),
				useGeofon: loadBool("wolfwatch_geofon", false),
				audioAlerts: loadBool("wolfwatch_audio", false),
				globeAutoSpin: loadBool("wolfwatch_globe_spin", true),
				globeStemScale: loadNum("wolfwatch_globe_stem", .16, .04, .42),
				globeMarkerScale: loadNum("wolfwatch_globe_hex", 1.2, .4, 3.5),
				globeSpinSpeed: loadNum("wolfwatch_globe_spd", 1, .1, 3),
				globeMarkerOpacity: loadNum("wolfwatch_globe_opac", .82, .2, 1),
				dijHistory: safeHistory(),
				attentionHistory: safeAttentionHistory(),
				volcWatchPins: [...loadPins()],
				volcWatchMutes: [...loadMutes()]
			};
			const m = loadMode();
			const saved = localStorage.getItem("wolfwatch_mode");
			if (saved === "lite" || saved === "standard" || saved === "full") {
				patch.mode = m;
				patch.minMag = MODES[m].minMag;
				if (m !== "full") patch.mapView = "2d";
			} else if (isMobileViewport()) {
				try {
					localStorage.setItem("wolfwatch_mode", "lite");
					localStorage.setItem("wolfwatch_first_open", "mobile");
				} catch {}
				patch.mode = "lite";
				patch.minMag = MODES.lite.minMag;
				patch.mapView = "2d";
			}
			set(patch);
		} catch {}
	},
	pulseRealtime: async (kind = "hour") => {
		try {
			const pulse = kind === "significant" ? await fetchSignificantPulse().catch(() => fetchRealtimePulse()) : await fetchRealtimePulse();
			setCache("eq_pulse", pulse);
			let eqFinal = mergeEqCollections(get().eq, pulse);
			if (get().useGeofon) {
				const g = getCache("geofon", 6e5);
				if (g) eqFinal = mergeEqCollections(eqFinal, g);
			}
			const cfg = MODES[get().mode];
			if (eqFinal?.features && eqFinal.features.length > cfg.maxMarkers) eqFinal = {
				...eqFinal,
				features: capFeaturesForMode(eqFinal.features, cfg.maxMarkers, priorityNodeBounds(get().volcWatchNodes))
			};
			if (eqFinal?.features) seenEqIds = alertNewEvents(eqFinal.features, seenEqIds, {
				enabled: get().audioAlerts,
				minMag: 4.5
			});
			set({
				eq: eqFinal,
				livePulseAt: Date.now(),
				newestEventAgeMs: latestEventAgeMs(eqFinal?.features)
			});
		} catch {}
	}
}));
function getFocusNode(id) {
	if (!id) return null;
	return useObservatory.getState().volcWatchNodes.find((n) => n.id === id) ?? DRAGON_NODES.find((n) => n.id === id) ?? null;
}
/** Static corridors + live USGS elevated volcano watches. */
function getAllFocusNodes() {
	const dynamic = useObservatory.getState().volcWatchNodes;
	const staticIds = new Set(DRAGON_NODES.map((n) => n.id));
	return [...dynamic.filter((n) => !staticIds.has(n.id)), ...DRAGON_NODES];
}
function viewEvents(features, minMag, focusNodeId, maxMag = 10) {
	let list = filteredEq(features, minMag, maxMag);
	const node = getFocusNode(focusNodeId);
	if (node) list = list.filter((f) => {
		const [lon, lat] = f.geometry.coordinates;
		return pointInBounds(lat, lon, node.bounds);
	});
	return list;
}
//#endregion
export { heatWeight as A, probe as B, fetchSoloFrame as C, getFocusNode as D, getAllFocusNodes as E, mobileLeanOverlays as F, viewEvents as G, resonanceVerdict as H, nodeEventStats as I, nodeIdForAlert as L, isMobileViewport as M, magColor as N, halfLifeForWindow as O, mmiContourColor as P, nodeStatus as R, eventPageUrl as S, formatMmi as T, shakeMapEventUrl as U, resonanceScore as V, useObservatory as W, buildImpactBrief as _, DRAGON_NODES as a, depthColor as b, OVERLAY_META as c, SUPT_ANCHORS as d, SUPT_COPYRIGHT as f, boundsToLeafletRects as g, bandPlainLabel as h, DEPTH_LEGEND as i, interEventSeconds as j, hasShakeMapProduct as k, SHAKEMAP_NOTES as l, alertKey as m, AVIATION_LABEL as n, FOCUSED_MONITORS as o, SUPT_SEED as p, BASEMAP_STYLES as r, MODES as s, AVIATION_COLOR as t, SUPT_ALPHA as u, colorCodeHex as v, filteredEq as w, eqDepthKm as x, createSsrRpc as y, pointInBounds as z };
