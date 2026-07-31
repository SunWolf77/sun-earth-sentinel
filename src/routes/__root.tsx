import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { ShareMeta } from "@/components/seo/ShareMeta";
import { SITE, absoluteUrl, getSiteOrigin, ogImageUrl } from "@/lib/site";
import appCss from "../styles.css?url";
import { useEffect } from "react";
import { registerShellServiceWorker } from "@/lib/sw/register";
import { Analytics } from "@vercel/analytics/react";

const origin = getSiteOrigin();
const pageUrl = absoluteUrl("/");
const imageUrl = ogImageUrl();
const twitterDomain = (() => {
  try {
    return new URL(origin).hostname;
  } catch {
    return "sun-earth-sentinel.grok.me";
  }
})();

/**
 * Always-on critical CSS (inline). Survives if /assets/*.css 404s after a deploy
 * or a stale SW serves the wrong document — stops the "white skeleton + Llite" look.
 */
const CRITICAL_CSS = `
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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE.name },
      { name: "description", content: SITE.description },
      { name: "theme-color", content: SITE.themeColor },
      { name: "application-name", content: SITE.shortName },
      { name: "author", content: "SunWolf (@Sunwolf77)" },
      {
        name: "keywords",
        content:
          "earthquake, space weather, NOAA SWPC, USGS, volcano, plate tectonics, Sun-Earth Sentinel, SolWatch, SUPT, Sentinel",
      },
      { name: "robots", content: "index,follow,max-image-preview:large" },

      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE.shortName },
      { property: "og:title", content: SITE.name },
      { property: "og:description", content: SITE.description },
      { property: "og:url", content: pageUrl },
      { property: "og:image", content: imageUrl },
      { property: "og:image:secure_url", content: imageUrl },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Sun-Earth Sentinel live observatory",
      },
      { property: "og:locale", content: "en_US" },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: SITE.twitter },
      { name: "twitter:creator", content: SITE.twitterCreator },
      { name: "twitter:title", content: SITE.name },
      { name: "twitter:description", content: SITE.description },
      { name: "twitter:image", content: imageUrl },
      { name: "twitter:image:alt", content: "Sun-Earth Sentinel live observatory" },
      { name: "twitter:url", content: pageUrl },
      { name: "twitter:domain", content: twitterDomain },
    ],
    links: [
      // Full design system — hashed asset from build
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/og.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "canonical", href: pageUrl },
      { rel: "image_src", href: imageUrl },
    ],
    styles: [{ children: CRITICAL_CSS }],
  }),
  component: RootShell,
});

function RootShell() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Belt-and-suspenders: some deploy edges omit head.styles from stream */}
        <style
          id="ww-critical"
          dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }}
        />
        <HeadContent />
      </head>
      <body className="bg-bg text-fg antialiased">
        <AuthProvider>
          <SwRegister />
          <AssetHealthGuard cssHref={appCss} />
          <ShareMeta />
          <Outlet />
          <Scripts />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}

function SwRegister() {
  useEffect(() => {
    registerShellServiceWorker();
  }, []);
  return null;
}

function AssetHealthGuard({ cssHref }: { cssHref: string }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const fail = () => {
      if (document.getElementById("ww-css-fail-banner")) return;
      const el = document.createElement("div");
      el.id = "ww-css-fail-banner";
      el.className = "ww-css-fail";
      el.innerHTML =
        "Styles failed to load (stale cache or deploy edge). <button type='button'>Reload clean</button>";
      el.querySelector("button")?.addEventListener("click", () => {
        try {
          const u = new URL(window.location.href);
          if (u.searchParams.has("wwbust")) {
            u.searchParams.delete("wwbust");
          }
          u.searchParams.set("wwbust", String(Date.now()));
          window.location.replace(u.toString());
        } catch {
          window.location.reload();
        }
      });
      document.body.appendChild(el);
    };
    // Heuristic: if Tailwind utility classes never applied
    const probe = document.createElement("div");
    probe.className = "hidden";
    document.body.appendChild(probe);
    const hidden = getComputedStyle(probe).display === "none";
    probe.remove();
    if (!hidden) fail();
    // Also try fetching the CSS URL
    if (cssHref) {
      fetch(cssHref, { method: "HEAD", cache: "no-store" }).catch(() => fail());
    }
  }, [cssHref]);
  return null;
}
