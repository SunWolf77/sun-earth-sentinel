import { i as __toESM } from "../_runtime.mjs";
import { N as require_react, c as HeadContent, d as Outlet, f as lazyRouteComponent, h as require_jsx_runtime, m as createRootRoute, p as createFileRoute, s as Scripts, u as createRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as ogImageUrl, i as getSiteOrigin, o as registerShellServiceWorker, r as absoluteUrl, s as resolveShareOrigin, t as SITE } from "./register-DPsco08d.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-Br-zcCk1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Keeps absolute og/twitter image URLs aligned with the live origin.
*/
function ShareMeta() {
	(0, import_react.useEffect)(() => {
		const origin = resolveShareOrigin();
		const image = ogImageUrl(origin);
		const page = absoluteUrl("/", origin);
		const upsert = (attr, key, content) => {
			let el = document.head.querySelector(`meta[${attr}="${key}"]`);
			if (!el) {
				el = document.createElement("meta");
				el.setAttribute(attr, key);
				document.head.appendChild(el);
			}
			el.setAttribute("content", content);
		};
		upsert("property", "og:url", page);
		upsert("property", "og:image", image);
		upsert("property", "og:image:secure_url", image);
		upsert("name", "twitter:image", image);
		upsert("name", "twitter:url", page);
		let canon = document.head.querySelector("link[rel=\"canonical\"]");
		if (!canon) {
			canon = document.createElement("link");
			canon.rel = "canonical";
			document.head.appendChild(canon);
		}
		canon.href = page;
		const id = "ww-jsonld";
		let script = document.getElementById(id);
		if (!script) {
			script = document.createElement("script");
			script.id = id;
			script.type = "application/ld+json";
			document.head.appendChild(script);
		}
		script.textContent = JSON.stringify({
			"@context": "https://schema.org",
			"@type": "WebApplication",
			name: SITE.name,
			url: page,
			description: SITE.description,
			applicationCategory: "ScienceApplication",
			operatingSystem: "Web",
			image,
			author: {
				"@type": "Person",
				name: "SunWolf",
				url: "https://x.com/Sunwolf77"
			}
		});
	}, []);
	return null;
}
var styles_default = "/assets/styles-D6-H0UQQ.css";
getSiteOrigin();
var pageUrl = absoluteUrl("/");
var imageUrl = ogImageUrl();
/**
* Always-on critical CSS (inline). Survives if /assets/*.css 404s after a deploy
* or a stale SW serves the wrong document — stops the "white skeleton + Llite" look.
*/
var CRITICAL_CSS = `
html,body,#root{height:100%;height:100dvh;max-height:100dvh;margin:0;overflow:hidden;background:#070b12;color:#e2e8f0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}
.ww-shell{display:flex;flex-direction:column;height:100%;max-height:100dvh;overflow:hidden;background:#070b12;color:#e2e8f0}
.ww-header{flex-shrink:0;border-bottom:1px solid #1e293b;background:rgba(7,11,18,.95)}
.ww-tablist{display:flex;gap:2px;overflow-x:auto;padding:4px 8px 8px;-webkit-overflow-scrolling:touch}
.ww-tab{display:inline-flex;align-items:center;gap:4px;padding:8px 10px;border-radius:8px;border:1px solid #1e293b;background:#111827;color:#94a3b8;font-size:12px;white-space:nowrap}
.ww-tab--active{border-color:#22d3ee;color:#22d3ee;background:rgba(34,211,238,.08)}
.ww-seg{display:inline-flex;border-radius:8px;border:1px solid #1e293b;overflow:hidden}
.ww-seg__btn{padding:6px 10px;background:#111827;color:#94a3b8;border:0;font-size:12px;text-transform:capitalize}
.ww-seg__btn--on{background:rgba(34,211,238,.15);color:#22d3ee}
.ww-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-height:36px;padding:6px 10px;border-radius:8px;border:1px solid #1e293b;background:#111827;color:#e2e8f0;font-size:12px}
.ww-btn--icon{min-width:36px;padding:6px}
.ww-btn--compact{min-height:32px}
.ww-btn--active{border-color:#22d3ee;color:#22d3ee}
/* Responsive dual labels without Tailwind — fixes Llite / MapMap when CSS fails */
.ww-only-sm{display:inline}
.ww-only-lg{display:none}
@media (min-width:640px){
  .ww-only-sm{display:none}
  .ww-only-lg{display:inline}
}
.ww-css-fail{position:fixed;inset:auto 12px 12px 12px;z-index:9999;padding:12px 14px;border-radius:12px;background:#7f1d1d;color:#fecaca;font-size:13px;line-height:1.4;box-shadow:0 8px 30px rgba(0,0,0,.45)}
.ww-css-fail button{margin-top:8px;background:#fecaca;color:#7f1d1d;border:0;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer}
`.trim();
var Route$1 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: SITE.name },
			{
				name: "description",
				content: SITE.description
			},
			{
				name: "theme-color",
				content: SITE.themeColor
			},
			{
				name: "application-name",
				content: SITE.shortName
			},
			{
				name: "author",
				content: "SunWolf (@Sunwolf77)"
			},
			{
				name: "keywords",
				content: "earthquake, space weather, NOAA SWPC, USGS, volcano, plate tectonics, WolfWatch, SolWatch, SUPT, Sentinel"
			},
			{
				name: "robots",
				content: "index,follow,max-image-preview:large"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				property: "og:site_name",
				content: SITE.shortName
			},
			{
				property: "og:title",
				content: SITE.name
			},
			{
				property: "og:description",
				content: SITE.description
			},
			{
				property: "og:url",
				content: pageUrl
			},
			{
				property: "og:image",
				content: imageUrl
			},
			{
				property: "og:image:secure_url",
				content: imageUrl
			},
			{
				property: "og:image:type",
				content: "image/png"
			},
			{
				property: "og:image:width",
				content: "1200"
			},
			{
				property: "og:image:height",
				content: "630"
			},
			{
				property: "og:image:alt",
				content: "Sol-Earth WolfWatch Sentinel live observatory"
			},
			{
				property: "og:locale",
				content: "en_US"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:site",
				content: SITE.twitter
			},
			{
				name: "twitter:creator",
				content: SITE.twitterCreator
			},
			{
				name: "twitter:title",
				content: SITE.name
			},
			{
				name: "twitter:description",
				content: SITE.description
			},
			{
				name: "twitter:image",
				content: imageUrl
			},
			{
				name: "twitter:image:alt",
				content: "Sol-Earth WolfWatch Sentinel live observatory"
			},
			{
				name: "twitter:url",
				content: pageUrl
			},
			{
				name: "twitter:domain",
				content: "sol-earth-wolfwatch-sentinel.grok.me"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
			},
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml"
			},
			{
				rel: "apple-touch-icon",
				href: "/og.png"
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest"
			},
			{
				rel: "canonical",
				href: pageUrl
			},
			{
				rel: "image_src",
				href: imageUrl
			}
		],
		styles: [{ children: CRITICAL_CSS }]
	}),
	component: RootShell
});
function RootShell() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("head", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", {
			id: "ww-critical",
			dangerouslySetInnerHTML: { __html: CRITICAL_CSS }
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "bg-bg text-fg antialiased",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthProvider, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwRegister, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssetHealthGuard, { cssHref: styles_default }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShareMeta, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})]
		})]
	});
}
function SwRegister() {
	(0, import_react.useEffect)(() => {
		registerShellServiceWorker();
	}, []);
	return null;
}
/**
* Detect failed /assets CSS (white page + dual labels) and recover once:
* unregister SW, clear caches, hard reload.
*/
function AssetHealthGuard({ cssHref }) {
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		try {
			const u = new URL(window.location.href);
			if (u.searchParams.has("wwbust")) {
				u.searchParams.delete("wwbust");
				window.history.replaceState({}, "", u.pathname + u.search + u.hash);
			}
		} catch {}
		const run = async () => {
			await new Promise((r) => setTimeout(r, 3500));
			if (cancelled) return;
			if (stylesLookApplied()) {
				try {
					sessionStorage.removeItem("ww_css_recovery");
				} catch {}
				return;
			}
			if (await stylesheetLoads(cssHref) || cancelled) return;
			let already = false;
			try {
				already = sessionStorage.getItem("ww_css_recovery") === "1";
			} catch {}
			if (!already) {
				try {
					sessionStorage.setItem("ww_css_recovery", "1");
				} catch {}
				try {
					if ("serviceWorker" in navigator) {
						const regs = await navigator.serviceWorker.getRegistrations();
						await Promise.all(regs.map((r) => r.unregister()));
					}
					if ("caches" in window) {
						const keys = await caches.keys();
						await Promise.all(keys.filter((k) => k.startsWith("ww-")).map((k) => caches.delete(k)));
					}
				} catch {}
				const url = new URL(window.location.href);
				url.searchParams.set("wwbust", String(Date.now()));
				window.location.replace(url.toString());
				return;
			}
			if (document.getElementById("ww-css-fail")) return;
			const el = document.createElement("div");
			el.id = "ww-css-fail";
			el.className = "ww-css-fail";
			el.innerHTML = "<strong>Styles failed to load</strong> (stale cache after a deploy). Tap recover to clear and reload.<br/><button type='button' id='ww-css-fail-btn'>Recover & reload</button>";
			document.body.appendChild(el);
			document.getElementById("ww-css-fail-btn")?.addEventListener("click", async () => {
				try {
					sessionStorage.removeItem("ww_css_recovery");
					if ("serviceWorker" in navigator) {
						const regs = await navigator.serviceWorker.getRegistrations();
						await Promise.all(regs.map((r) => r.unregister()));
					}
					if ("caches" in window) {
						const keys = await caches.keys();
						await Promise.all(keys.map((k) => caches.delete(k)));
					}
				} catch {}
				window.location.href = "/?wwbust=" + Date.now();
			});
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [cssHref]);
	return null;
}
function stylesLookApplied() {
	try {
		const bg = getComputedStyle(document.body).backgroundColor;
		if (bg === "rgb(7, 11, 18)" || bg === "rgba(7, 11, 18, 1)") return true;
		const shell = document.querySelector(".ww-shell");
		if (shell) {
			const sbg = getComputedStyle(shell).backgroundColor;
			if (sbg === "rgb(7, 11, 18)" || sbg.includes("7, 11, 18")) return true;
		}
		if (bg === "rgba(0, 0, 0, 0)" || bg === "rgb(255, 255, 255)" || bg === "transparent") return false;
		return bg !== "rgb(255, 255, 255)";
	} catch {
		return true;
	}
}
async function stylesheetLoads(href) {
	try {
		const match = Array.from(document.querySelectorAll("link[rel=\"stylesheet\"]")).find((l) => {
			const h = l.getAttribute("href") || "";
			return h === href || h.endsWith(href) || href.includes("/assets/") && h.includes("/assets/");
		});
		if (match) try {
			if (match.sheet && match.sheet.cssRules && match.sheet.cssRules.length > 0) return true;
		} catch {
			if (match.sheet) return true;
		}
		const res = await fetch(href, {
			cache: "no-store",
			method: "GET"
		});
		if (!res.ok) return false;
		const ct = (res.headers.get("content-type") || "").toLowerCase();
		if (ct.includes("text/html")) return false;
		if (ct && !ct.includes("css") && !ct.includes("text/plain")) return false;
		const text = await res.text();
		return text.includes("tailwind") || text.includes("--color-bg") || text.length > 1e3;
	} catch {
		return false;
	}
}
var $$splitComponentImporter = () => import("./routes-DpTgkeYY.mjs");
var rootRouteChildren = { IndexRoute: createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") }).update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$1
}) };
var routeTree = Route$1._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({ routeTree });
}
//#endregion
export { getRouter };
