//#region node_modules/.nitro/vite/services/ssr/assets/solarMedia-BbNb_6Ei.js
var SWPC = "https://services.swpc.noaa.gov";
function fluxToClass(flux) {
	if (flux >= 1e-4) return "X" + (flux / 1e-4).toFixed(1);
	if (flux >= 1e-5) return "M" + (flux / 1e-5).toFixed(1);
	if (flux >= 1e-6) return "C" + (flux / 1e-6).toFixed(1);
	if (flux >= 1e-7) return "B" + (flux / 1e-7).toFixed(1);
	return "A" + (Math.max(flux, 1e-9) / 1e-8).toFixed(1);
}
async function fetchKp() {
	const res = await fetch(`${SWPC}/products/noaa-planetary-k-index.json`);
	if (!res.ok) throw new Error(`Kp ${res.status}`);
	const raw = await res.json();
	if (!Array.isArray(raw) || raw.length === 0) return [];
	if (typeof raw[0] === "object" && raw[0] !== null && "Kp" in raw[0]) return raw.map((r) => ({
		...r,
		Kp: Number(r.Kp) || 0
	}));
	return raw.slice(1).map((r) => ({
		time_tag: String(r[0]),
		Kp: parseFloat(String(r[1])) || 0
	}));
}
async function fetchXrays() {
	const res = await fetch(`${SWPC}/json/goes/primary/xrays-1-day.json`);
	if (!res.ok) throw new Error(`X-ray ${res.status}`);
	return await res.json();
}
async function fetchSolarWind() {
	const out = {
		speed: null,
		density: null,
		bz: null,
		bt: null,
		time: null
	};
	try {
		const [spRes, magRes] = await Promise.all([fetch(`${SWPC}/products/summary/solar-wind-speed.json`), fetch(`${SWPC}/products/summary/solar-wind-mag-field.json`)]);
		if (spRes.ok) {
			const sp = await spRes.json();
			const latest = Array.isArray(sp) ? sp[sp.length - 1] : sp;
			if (latest) {
				out.speed = parseFloat(latest.proton_speed ?? latest.speed) || null;
				out.density = parseFloat(latest.proton_density ?? latest.density) || null;
				out.time = latest.time_tag ?? latest.time ?? null;
			}
		}
		if (magRes.ok) {
			const mag = await magRes.json();
			const latest = Array.isArray(mag) ? mag[mag.length - 1] : mag;
			if (latest) {
				out.bz = parseFloat(latest.bz_gsm ?? latest.bz) || null;
				out.bt = parseFloat(latest.bt) || null;
				if (!out.time) out.time = latest.time_tag ?? latest.time ?? null;
			}
		}
	} catch {}
	return out;
}
async function fetchNoaaScales() {
	try {
		const res = await fetch(`${SWPC}/products/noaa-scales.json`);
		if (!res.ok) return null;
		const data = await res.json();
		const now = data["0"] ?? data[0];
		const d1 = data["1"] ?? data[1];
		const d2 = data["2"] ?? data[2];
		const d3 = data["3"] ?? data[3];
		if (!now) return null;
		return {
			R: String(now.R?.Scale ?? "—"),
			S: String(now.S?.Scale ?? "—"),
			G: String(now.G?.Scale ?? "—"),
			RText: now.R?.Text ?? void 0,
			SText: now.S?.Text ?? void 0,
			GText: now.G?.Text ?? void 0,
			G1: d1?.G?.Scale != null ? String(d1.G.Scale) : void 0,
			G2: d2?.G?.Scale != null ? String(d2.G.Scale) : d3?.G?.Scale != null ? String(d3.G.Scale) : void 0,
			RMinorProb: d1?.R?.MinorProb != null ? String(d1.R.MinorProb) : void 0,
			RMajorProb: d1?.R?.MajorProb != null ? String(d1.R.MajorProb) : void 0,
			SProb: d1?.S?.Prob != null ? String(d1.S.Prob) : void 0
		};
	} catch {
		return null;
	}
}
async function fetchAlerts() {
	try {
		const res = await fetch(`${SWPC}/products/alerts.json`);
		if (!res.ok) return [];
		const data = await res.json();
		return Array.isArray(data) ? data.slice(0, 12) : [];
	} catch {
		return [];
	}
}
async function fetch10cmFlux() {
	try {
		const res = await fetch(`${SWPC}/products/summary/10cm-flux.json`);
		if (!res.ok) return {
			flux: null,
			time: null
		};
		const data = await res.json();
		const latest = Array.isArray(data) ? data[data.length - 1] : data;
		return {
			flux: latest ? parseFloat(latest.flux ?? latest.Flux) || null : null,
			time: latest?.time_tag ?? latest?.time ?? null
		};
	} catch {
		return {
			flux: null,
			time: null
		};
	}
}
/** Latest high-energy GOES proton channel (for S-scale context). */
async function fetchProtons() {
	try {
		const res = await fetch(`${SWPC}/json/goes/primary/integral-protons-1-day.json`);
		if (!res.ok) return [];
		const data = await res.json();
		const p10 = data.filter((d) => />=?10|>=10|10 MeV/i.test(d.energy || ""));
		return p10.length ? p10 : data;
	} catch {
		return [];
	}
}
async function fetchForecastBundle() {
	const out = {
		threeDay: "",
		discussion: "",
		issued: null
	};
	try {
		const [fRes, dRes] = await Promise.all([fetch(`${SWPC}/text/3-day-forecast.txt`), fetch(`${SWPC}/text/discussion.txt`)]);
		if (fRes.ok) {
			out.threeDay = await fRes.text();
			const m = out.threeDay.match(/:Issued:\s*(.+)/i);
			if (m) out.issued = m[1].trim();
		}
		if (dRes.ok) out.discussion = await dRes.text();
	} catch {}
	return out;
}
/** Latest WSA-ENLIL model frame (Earth-directed solar wind / CME propagation). */
async function fetchEnlilLatest() {
	try {
		const res = await fetch(`${SWPC}/products/animations/enlil.json`);
		if (!res.ok) return null;
		const frames = await res.json();
		if (!Array.isArray(frames) || !frames.length) return null;
		const last = frames[frames.length - 1];
		return {
			url: last.url.startsWith("http") ? last.url : `${SWPC}${last.url}`,
			timeHint: last.url.match(/(\d{8}T\d{6})/)?.[1] ?? null
		};
	} catch {
		return null;
	}
}
async function fetchOvationLatest() {
	try {
		const res = await fetch(`${SWPC}/products/animations/ovation_north_24h.json`);
		if (!res.ok) return null;
		const frames = await res.json();
		if (!Array.isArray(frames) || !frames.length) return null;
		const last = frames[frames.length - 1];
		return {
			url: last.url.startsWith("http") ? last.url : `${SWPC}${last.url}`,
			time_tag: last.time_tag ?? null
		};
	} catch {
		return null;
	}
}
/** NOAA Kp observed + forecast series (3h steps). */
async function fetchKpForecast() {
	try {
		const res = await fetch(`${SWPC}/products/noaa-planetary-k-index-forecast.json`);
		if (!res.ok) return [];
		const raw = await res.json();
		if (!Array.isArray(raw)) return [];
		return raw.map((r) => ({
			time_tag: String(r.time_tag ?? ""),
			kp: Number(r.kp) || 0,
			observed: r.observed != null ? String(r.observed) : null,
			noaa_scale: r.noaa_scale != null ? String(r.noaa_scale) : null
		})).filter((r) => r.time_tag);
	} catch {
		return [];
	}
}
/** Upcoming forecast-only points (not yet observed). */
function upcomingKpForecast(points, limit = 8) {
	const now = Date.now();
	return points.filter((p) => {
		const t = Date.parse(p.time_tag);
		if (!Number.isFinite(t)) return false;
		return (p.observed || "").toLowerCase() === "forecast" || t > now || t >= now - 3 * 36e5;
	}).slice(0, limit);
}
function longChannelXrays(data) {
	const long = data.filter((d) => d.energy && d.energy.includes("0.1-0.8"));
	return long.length ? long : data;
}
function peakFlare(series) {
	let maxFlux = 0;
	let maxTime = null;
	for (const d of series) {
		const f = d.flux || d.observed_flux || 0;
		if (f > maxFlux) {
			maxFlux = f;
			maxTime = d.time_tag || null;
		}
	}
	return {
		class: fluxToClass(maxFlux),
		time: maxTime,
		flux: maxFlux
	};
}
/** Extract short human lines from 3-day forecast. */
function forecastHighlights(text) {
	if (!text) return [];
	const lines = [];
	const geo = text.match(/Rationale:\s*([^\n]+(?:\n(?![A-Z]\.|NOAA)[^\n]+)*)/i);
	if (geo) lines.push(geo[1].replace(/\s+/g, " ").trim().slice(0, 280));
	const kp = text.match(/greatest expected 3 hr Kp[^\n]+/i);
	if (kp) lines.push(kp[0].trim());
	const rad = text.match(/Solar Radiation Storm Forecast[\s\S]{0,200}?Rationale:\s*([^\n]+)/i);
	if (rad) lines.push(rad[1].replace(/\s+/g, " ").trim().slice(0, 200));
	return lines.filter(Boolean).slice(0, 4);
}
function bestCmeAnalysis(cme) {
	const list = cme.cmeAnalyses ?? [];
	if (!list.length) return null;
	return list.find((a) => a.isMostAccurate) ?? list[0] ?? null;
}
function earthDirectedCmes(cmes) {
	return cmes.filter((c) => {
		const en = bestCmeAnalysis(c)?.enlilList?.[0];
		return !!(en?.isEarthGB || en?.isEarthMinorImpact || en?.estimatedShockArrivalTime);
	});
}
function cmeImpactSummary(cme) {
	const a = bestCmeAnalysis(cme);
	const en = a?.enlilList?.[0];
	const kps = [
		en?.kp_18,
		en?.kp_90,
		en?.kp_135,
		en?.kp_180
	].filter((k) => typeof k === "number" && Number.isFinite(k));
	return {
		speed: a?.speed ?? null,
		eta: en?.estimatedShockArrivalTime ?? null,
		earth: !!(en?.isEarthGB || en?.isEarthMinorImpact || en?.estimatedShockArrivalTime),
		kpHint: kps.length ? Math.max(...kps) : null
	};
}
function isoDate(d = /* @__PURE__ */ new Date()) {
	return d.toISOString().slice(0, 10);
}
function daysAgoIso(n) {
	const d = /* @__PURE__ */ new Date();
	d.setUTCDate(d.getUTCDate() - n);
	return isoDate(d);
}
/** Public solar imagery / movie URLs — stills first, movies opt-in. */
var SDO_BASE = "https://sdo.gsfc.nasa.gov/assets/img/latest";
var SDO_MPEG = "https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg";
var SOHO_RT = "https://soho.nascom.nasa.gov/data/realtime";
var SOHO_LATEST = "https://soho.nascom.nasa.gov/data/LATEST";
var STEREO_BEACON = "https://stereo-ssc.nascom.nasa.gov/beacon";
var HELIOVIEWER = "https://api.helioviewer.org/v2";
var SDO_CHANNELS = [
	{
		id: "0193",
		label: "AIA 193",
		hint: "Corona · active regions",
		storm: true
	},
	{
		id: "0171",
		label: "AIA 171",
		hint: "Quiet corona / loops",
		storm: false
	},
	{
		id: "0304",
		label: "AIA 304",
		hint: "Chromosphere · filaments",
		storm: true
	},
	{
		id: "0211",
		label: "AIA 211",
		hint: "Active corona",
		storm: true
	},
	{
		id: "0094",
		label: "AIA 94",
		hint: "Hot flares",
		storm: true
	},
	{
		id: "HMIB",
		label: "HMI B",
		hint: "Magnetogram",
		storm: false
	},
	{
		id: "HMIIC",
		label: "HMI IC",
		hint: "Continuum · spots",
		storm: false
	}
];
function sdoStill(channel, size = 512, bust = 0) {
	return `${SDO_BASE}/latest_${size}_${channel}.jpg?t=${bust}`;
}
function sdoMovie(channel, size = 512, bust = 0) {
	return `${SDO_MPEG}/latest_${size}_${channel}.mp4?t=${bust}`;
}
function lascoStill(cam, size = 512, bust = 0) {
	return `${SOHO_RT}/${cam}/${size}/latest.jpg?t=${bust}`;
}
function lascoMovie(cam, small = true, bust = 0) {
	return `${SOHO_LATEST}/${small ? `current_${cam}small.mp4` : `current_${cam}.mp4`}?t=${bust}`;
}
/** STEREO-A beacon — off-Earth / limb / far-longitude EUV + coronagraph. */
function stereoEuvi(wave = "195", size = 512, bust = 0) {
	return `${STEREO_BEACON}/latest_${size}/ahead_euvi_${wave}_latest.jpg?t=${bust}`;
}
function stereoCor2(size = 512, bust = 0) {
	return `${STEREO_BEACON}/latest_${size}/ahead_cor2_latest.jpg?t=${bust}`;
}
/** Heliographic STEREO map (shows longitude coverage vs Earth). */
function stereoHeliographic(bust = 0) {
	return `${STEREO_BEACON}/euvi_195_heliographic.gif?t=${bust}`;
}
/** Direct PNG screenshot of Solar Orbiter EUI (Helioviewer). */
function soloScreenshotUrl(dateIso, layer = "174") {
	return `${HELIOVIEWER}/takeScreenshot/?${new URLSearchParams({
		imageScale: "4.8",
		layers: layer === "174" ? "[SOLO,EUI,FSI,174,1,100]" : "[SOLO,EUI,FSI,304,1,100]",
		events: "",
		eventLabels: "false",
		scale: "false",
		date: dateIso,
		x1: "-1400",
		x2: "1400",
		y1: "-1400",
		y2: "1400",
		display: "true",
		watermark: "true"
	}).toString()}`;
}
//#endregion
export { stereoHeliographic as A, longChannelXrays as C, soloScreenshotUrl as D, sdoStill as E, stereoCor2 as O, lascoStill as S, sdoMovie as T, fetchXrays as _, daysAgoIso as a, isoDate as b, fetchAlerts as c, fetchKp as d, fetchKpForecast as f, fetchSolarWind as g, fetchProtons as h, cmeImpactSummary as i, upcomingKpForecast as j, stereoEuvi as k, fetchEnlilLatest as l, fetchOvationLatest as m, SDO_CHANNELS as n, earthDirectedCmes as o, fetchNoaaScales as p, bestCmeAnalysis as r, fetch10cmFlux as s, HELIOVIEWER as t, fetchForecastBundle as u, fluxToClass as v, peakFlare as w, lascoMovie as x, forecastHighlights as y };
