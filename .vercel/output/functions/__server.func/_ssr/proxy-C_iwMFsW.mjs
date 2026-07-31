import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/proxy-C_iwMFsW.js
/**
* Server proxy → Richard Cordaro public tool (drmagneto.appspot.com).
* Browser CORS / rate limits make direct calls unreliable.
*/
var BASE = "https://drmagneto.appspot.com";
var fetchDrmagnetoChart_createServerFn_handler = createServerRpc({
	id: "741e55f7d66b43aabecab66a3098a5c3d8116009a23c5bdeca3f968e5d11f7b9",
	name: "fetchDrmagnetoChart",
	filename: "src/lib/magneto/proxy.ts"
}, (opts) => fetchDrmagnetoChart.__executeServer(opts));
var fetchDrmagnetoChart = createServerFn({ method: "POST" }).inputValidator((input) => ({
	station: String(input.station || "HYB").toUpperCase().slice(0, 6),
	threshold: typeof input.threshold === "number" ? input.threshold : .4,
	date: input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null
})).handler(fetchDrmagnetoChart_createServerFn_handler, async ({ data }) => {
	const { station, threshold, date } = data;
	const path = date ? `/get_selected_date_data/${station}?selected_date=${date}&threshold=${threshold}` : `/get_chart_data/${station}?threshold=${threshold}`;
	try {
		const res = await fetch(`${BASE}${path}`, { headers: {
			Accept: "application/json",
			"User-Agent": "WolfWatch-Sentinel/1.0 (research; credits @rrichcord)"
		} });
		if (!res.ok) {
			let err = `HTTP ${res.status}`;
			try {
				const j = await res.json();
				if (j.error) err = j.error;
			} catch {}
			return {
				station_code: station,
				station_name: station,
				data_source: "",
				processed_data: [],
				raw_data: [],
				error: err,
				fetchedAt: Date.now()
			};
		}
		const j = await res.json();
		return {
			station_code: j.station_code || station,
			station_name: j.station_name || station,
			data_source: j.data_source || "H",
			processed_data: (j.processed_data || []).map((v) => Number(v) || 0),
			raw_data: (j.raw_data || []).map((v) => Number(v) || 0),
			fetchedAt: Date.now()
		};
	} catch (e) {
		return {
			station_code: station,
			station_name: station,
			data_source: "",
			processed_data: [],
			raw_data: [],
			error: e instanceof Error ? e.message : "drmagneto unavailable",
			fetchedAt: Date.now()
		};
	}
});
//#endregion
export { fetchDrmagnetoChart_createServerFn_handler };
