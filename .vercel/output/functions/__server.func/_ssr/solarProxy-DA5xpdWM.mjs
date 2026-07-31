import { n as createServerFn } from "./ssr.mjs";
import { D as soloScreenshotUrl, _ as fetchXrays, a as daysAgoIso, b as isoDate, c as fetchAlerts, d as fetchKp, f as fetchKpForecast, g as fetchSolarWind, h as fetchProtons, l as fetchEnlilLatest, m as fetchOvationLatest, p as fetchNoaaScales, s as fetch10cmFlux, t as HELIOVIEWER, u as fetchForecastBundle } from "./solarMedia-BbNb_6Ei.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/solarProxy-DA5xpdWM.js
var DONKI = "https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get";
async function getJson(url) {
	const res = await fetch(url, { headers: { Accept: "application/json" } });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return await res.json();
}
/** DONKI is Origin-blocked in browsers — always pull server-side. */
var fetchDonkiBundle_createServerFn_handler = createServerRpc({
	id: "47232bcf19be7d1ced74947b83b745cda4ca3a1ec60090437c62dd20d33441cb",
	name: "fetchDonkiBundle",
	filename: "src/lib/feeds/solarProxy.ts"
}, (opts) => fetchDonkiBundle.__executeServer(opts));
var fetchDonkiBundle = createServerFn({ method: "GET" }).handler(fetchDonkiBundle_createServerFn_handler, async () => {
	const start = daysAgoIso(7);
	const end = isoDate();
	try {
		const [cmes, flares] = await Promise.all([getJson(`${DONKI}/CME?startDate=${start}&endDate=${end}`).catch(() => []), getJson(`${DONKI}/FLR?startDate=${start}&endDate=${end}`).catch(() => [])]);
		const sortedCmes = [...cmes].sort((a, b) => (b.startTime || "").localeCompare(a.startTime || ""));
		const sortedFlares = [...flares].sort((a, b) => (b.peakTime || b.beginTime || "").localeCompare(a.peakTime || a.beginTime || ""));
		return {
			cmes: sortedCmes.slice(0, 24),
			flares: sortedFlares.slice(0, 24),
			fetchedAt: Date.now()
		};
	} catch (e) {
		return {
			cmes: [],
			flares: [],
			fetchedAt: Date.now(),
			error: e instanceof Error ? e.message : "DONKI unavailable"
		};
	}
});
var fetchSolarCore_createServerFn_handler = createServerRpc({
	id: "043f84134b4e664d87fa6393d0fd0c4fa5512144ecc6ab91f79f70cb062b67c7",
	name: "fetchSolarCore",
	filename: "src/lib/feeds/solarProxy.ts"
}, (opts) => fetchSolarCore.__executeServer(opts));
var fetchSolarCore = createServerFn({ method: "POST" }).inputValidator((input) => ({ heavy: input?.heavy !== false })).handler(fetchSolarCore_createServerFn_handler, async ({ data }) => {
	const heavy = data.heavy;
	const [kp, xray, solarWind, scales, alerts, flux10cm, forecast, enlil, ovation, protons, kpForecast] = await Promise.all([
		fetchKp().catch(() => []),
		heavy ? fetchXrays().catch(() => []) : Promise.resolve([]),
		fetchSolarWind(),
		fetchNoaaScales(),
		fetchAlerts(),
		fetch10cmFlux(),
		fetchForecastBundle(),
		heavy ? fetchEnlilLatest() : Promise.resolve(null),
		heavy ? fetchOvationLatest() : Promise.resolve(null),
		heavy ? fetchProtons().catch(() => []) : Promise.resolve([]),
		fetchKpForecast().catch(() => [])
	]);
	return {
		kp,
		xray,
		solarWind,
		scales,
		alerts,
		flux10cm,
		forecast,
		enlil,
		ovation,
		protons,
		kpForecast
	};
});
var fetchSoloFrame_createServerFn_handler = createServerRpc({
	id: "43746247c6dcf09095a24008d7c8d9b46d53caa3f48dcacb83ac3b3b7655588a",
	name: "fetchSoloFrame",
	filename: "src/lib/feeds/solarProxy.ts"
}, (opts) => fetchSoloFrame.__executeServer(opts));
var fetchSoloFrame = createServerFn({ method: "GET" }).handler(fetchSoloFrame_createServerFn_handler, async () => {
	try {
		const now = (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
		const res = await fetch(`${HELIOVIEWER}/getClosestImage/?date=${encodeURIComponent(now)}&sourceId=84`);
		if (!res.ok) return {
			url: null,
			meta: `Helioviewer ${res.status}`,
			date: null
		};
		const d = await res.json();
		if (!d.date) return {
			url: null,
			meta: "No Solo EUI frame indexed",
			date: null
		};
		const iso = d.date.includes("T") ? d.date : `${d.date.replace(" ", "T")}Z`;
		const lagDays = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 864e5));
		const meta = `${d.name || "EUI FSI 174"} · ${new Date(iso).toUTCString().replace("GMT", "UTC")}${lagDays > 2 ? ` · ~${lagDays}d lag (downlink)` : ""}`;
		return {
			url: soloScreenshotUrl(iso, "174"),
			meta,
			date: iso
		};
	} catch (e) {
		return {
			url: null,
			meta: e instanceof Error ? e.message : "Solo unavailable",
			date: null
		};
	}
});
//#endregion
export { fetchDonkiBundle_createServerFn_handler, fetchSolarCore_createServerFn_handler, fetchSoloFrame_createServerFn_handler };
