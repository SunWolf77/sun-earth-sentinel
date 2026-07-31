//#region node_modules/.nitro/vite/services/ssr/assets/register-DPsco08d.js
/**
* Public site identity for Open Graph / X (Twitter) cards.
*
* X caches cards per exact URL. Bump `ogImageVersion` when the image or
* copy changes so scrapers fetch a new image. For a full card re-scrape of
* the *page*, post a new URL variant (e.g. ?v=8) or /share.html.
*/
/** Live production origin (no trailing slash). */
var PRODUCTION_ORIGIN = "https://sun-earth-sentinel.vercel.app";
var ENV_CANDIDATES = () => {
	return [
		(() => {
			try {
				return;
			} catch {
				return;
			}
		})(),
		typeof process !== "undefined" ? process.env.VITE_SITE_URL || process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL : void 0,
		PRODUCTION_ORIGIN
	].filter(Boolean);
};
function normalizeOrigin(raw) {
	let s = (raw || "").trim();
	if (!s) return "";
	if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
	return s.replace(/\/$/, "");
}
function getSiteOrigin() {
	for (const c of ENV_CANDIDATES()) {
		const n = normalizeOrigin(c);
		if (n) return n;
	}
	return PRODUCTION_ORIGIN;
}
function resolveShareOrigin() {
	return getSiteOrigin();
}
var SITE = {
	name: "Sun Earth Sentinel",
	shortName: "Sun Earth Sentinel",
	description: "Free Sun Earth observatory: live earthquakes, plate boundaries, volcano watches, space weather and SUPT continuum. By SunWolf (@Sunwolf77).",
	twitter: "@Sunwolf77",
	twitterCreator: "@Sunwolf77",
	ogImagePath: "/og.png",
	/** Bump when og.png changes — forces X image CDN re-fetch */
	ogImageVersion: "8",
	/** Post this if root URL card is stuck in X cache */
	sharePath: "/share.html",
	themeColor: "#070b12"
};
/** Known X (Twitter) profiles credited in-app — open in new tab. */
var X_PROFILES = {
	sunwolf: {
		name: "SunWolf",
		handle: "Sunwolf77",
		url: "https://x.com/Sunwolf77",
		role: "Primary technical lineage · Sun Earth Sentinel"
	},
	sheppard: {
		name: "Paul Sheppard",
		handle: "PaulSheppard_CO",
		url: "https://x.com/PaulSheppard_CO",
		role: "SUPT & resonance probe"
	},
	dutchsinse: {
		name: "Dutchsinse",
		handle: "RealDutchsinse",
		url: "https://x.com/RealDutchsinse",
		role: "Free public seismic globe (inspiration)"
	},
	cordaro: {
		name: "Richard Cordaro",
		handle: "rrichcord",
		url: "https://x.com/rrichcord",
		role: "Magnetic anomaly / INTERMAGNET public tool (drmagneto)"
	}
};
function xProfileUrl(handle) {
	const h = handle.replace(/^@/, "");
	return `https://x.com/${encodeURIComponent(h)}`;
}
function ogImageUrl(origin = getSiteOrigin()) {
	return `${origin}${SITE.ogImagePath}?v=${SITE.ogImageVersion}`;
}
function absoluteUrl(path = "/", origin = getSiteOrigin()) {
	return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
function shareCardUrl(origin = getSiteOrigin()) {
	return `${origin}${SITE.sharePath}`;
}
/** Checklist for debugging X card scrapes (human + About panel). */
function xCardDebugReport(origin = getSiteOrigin()) {
	return {
		origin,
		pageUrl: absoluteUrl("/", origin),
		shareUrl: shareCardUrl(origin),
		imageUrl: ogImageUrl(origin),
		card: "summary_large_image",
		notes: [
			"X caches cards per exact URL — old tweets keep old scrapes forever.",
			"Post a NEW tweet with a new URL (?v=8 or /share.html) to force re-scrape.",
			"Root HTTPS returns full twitter:* + og:* tags to Twitterbot (verified).",
			"og.png is 1200x630 PNG — within X limits.",
			"Always share https:// links."
		]
	};
}
/**
* Register shell service worker (production + secure contexts).
* Skips in Vite HMR dev when SW would fight the dev server — opt-in via flag.
*
* Deploy safety: SW never caches HTML (hashed asset map). On SW update we reload
* once so open tabs pick the new document + matching /assets/*.
*/
var SW_PATH = "/sw.js";
function markReloaded() {
	try {
		if (sessionStorage.getItem("ww_sw_reloaded") === "1") return false;
		sessionStorage.setItem("ww_sw_reloaded", "1");
		return true;
	} catch {
		return true;
	}
}
async function registerShellServiceWorker(opts) {
	if (typeof window === "undefined" || !("serviceWorker" in navigator)) return { status: "unsupported" };
	if (typeof import.meta !== "undefined" && Boolean(false) && !opts?.allowDev) return { status: "skipped" };
	try {
		const hadController = Boolean(navigator.serviceWorker.controller);
		navigator.serviceWorker.addEventListener("message", (ev) => {
			if (ev.data?.type !== "WW_SW_ACTIVATED") return;
			if (!hadController) return;
			if (!markReloaded()) return;
			window.location.reload();
		});
		navigator.serviceWorker.addEventListener("controllerchange", () => {
			if (!hadController) return;
			if (!markReloaded()) return;
			window.location.reload();
		});
		const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
		await reg.update().catch(() => void 0);
		if (reg.waiting) reg.waiting.postMessage?.({ type: "SKIP_WAITING" });
		const mobile = window.matchMedia("(max-width: 768px)").matches || typeof navigator !== "undefined" && navigator.maxTouchPoints > 1 && window.innerWidth < 900;
		const postProfile = (sw) => {
			sw?.postMessage?.({
				type: "SET_PROFILE",
				mobile
			});
			if (mobile) sw?.postMessage?.({ type: "TRIM" });
		};
		postProfile(reg.active);
		postProfile(navigator.serviceWorker.controller);
		navigator.serviceWorker.ready.then((r) => postProfile(r.active)).catch(() => void 0);
		return { status: "ready" };
	} catch (e) {
		return {
			status: "error",
			error: e instanceof Error ? e.message : "SW register failed"
		};
	}
}
async function unregisterShellServiceWorker() {
	if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
	const regs = await navigator.serviceWorker.getRegistrations();
	await Promise.all(regs.map((r) => r.unregister()));
	if ("caches" in window) {
		const keys = await caches.keys();
		await Promise.all(keys.filter((k) => k.startsWith("ww-shell") || k.startsWith("ww-runtime") || k.startsWith("ww-")).map((k) => caches.delete(k)));
	}
	return true;
}
//#endregion
export { ogImageUrl as a, shareCardUrl as c, xProfileUrl as d, getSiteOrigin as i, unregisterShellServiceWorker as l, X_PROFILES as n, registerShellServiceWorker as o, absoluteUrl as r, resolveShareOrigin as s, SITE as t, xCardDebugReport as u };
