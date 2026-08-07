/* WolfWatch shell service worker (ww-shell-v8)
 *
 * Cache Storage eviction policies:
 *  - Soft cap (48 desk / 28 mobile); pressure trim (24 / 14)
 *  - True LRU (Map) + prefer-evict stale mutable over immutable-hash
 *  - Shell cache = icons/manifest only — NEVER cache HTML (deploy-safe)
 *  - QuotaExceededError → hard TRIM + flush
 *  - neverHosts / live APIs never stored
 *
 * HTTP Cache-Control:
 *  - no-store → do not put
 *  - no-cache / must-revalidate → revalidate before trusting
 *  - immutable or content-hash → cache-first, no revalidate
 *  - max-age + stale-while-revalidate windows (when present)
 *  - ETag conditional revalidate for mutable-static
 */
const SHELL_CACHE = "ww-shell-v8";
const RUNTIME_CACHE = "ww-runtime-v8";
const LRU_META_URL = "/__ww_lru_meta__";
let maxRuntimeEntries = 48;
let pressureTarget = 24;
/** Mobile profile: leaner runtime cache (images + assets pressure phones hard) */
let mobileProfile = false;
const MAX_RUNTIME_ENTRIES_DESK = 48;
const PRESSURE_TARGET_DESK = 24;
const MAX_RUNTIME_ENTRIES_MOBILE = 28;
const PRESSURE_TARGET_MOBILE = 14;
const MAX_IMAGE_BYTES = 120_000; // skip caching fat images on mobile

const META_FLUSH_MS = 800;
const MUTABLE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PRECACHE_CORE = ["/favicon.svg", "/manifest.webmanifest"];
const PRECACHE_DESK = ["/og.png"];
/** Build stamp — bump with shell version so clients drop stale HTML/asset maps */
const SW_BUILD = "v8-2026-08-07-eq-cache";

/** @type {Map<string, true>} */
let lru = new Map();
/** @type {Map<string, string>} */
const etags = new Map();
/** @type {Map<string, number>} url → storedAt ms */
const storedAt = new Map();
/** @type {Map<string, string>} url → cache-control */
const ccMap = new Map();
let metaTimer = 0;
let metaLoaded = false;
let metaLoadPromise = null;

function classify(pathname) {
  if (pathname.startsWith("/_server") || pathname.includes("DONKI")) return "bypass-live";
  if (/\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?)$/i.test(pathname)) return "immutable-hash";
  if (pathname === "/" || pathname.endsWith(".html") || pathname.endsWith("manifest.webmanifest"))
    return "shell";
  return "mutable-static";
}

function parseCC(header) {
  const o = {
    noStore: false,
    noCache: false,
    mustRevalidate: false,
    immutable: false,
    maxAge: null,
    swr: null,
  };
  if (!header) return o;
  for (const raw of header.split(",")) {
    const p = raw.trim().toLowerCase();
    if (p === "no-store") o.noStore = true;
    else if (p === "no-cache") o.noCache = true;
    else if (p === "must-revalidate") o.mustRevalidate = true;
    else if (p === "immutable") o.immutable = true;
    else if (p.startsWith("max-age=")) {
      const n = Number(p.slice(8));
      if (Number.isFinite(n)) o.maxAge = n;
    } else if (p.startsWith("stale-while-revalidate=")) {
      const n = Number(p.slice(23));
      if (Number.isFinite(n)) o.swr = n;
    }
  }
  return o;
}

function mayStoreResponse(res, kind, urlPath) {
  if (!res || !res.ok) return false;
  const cc = parseCC(res.headers.get("Cache-Control"));
  if (cc.noStore) return false;
  if (kind === "bypass-live") return false;
  // Mobile: never fill storage with large bitmaps (tiles already bypass; local images)
  if (mobileProfile && urlPath && /\.(?:png|jpe?g|webp|gif)$/i.test(urlPath)) {
    const len = Number(res.headers.get("Content-Length") || 0);
    if (len > MAX_IMAGE_BYTES) return false;
    // og / twitter cards are large marketing assets — skip on phone
    if (/og\.png|twitter-card/i.test(urlPath)) return false;
  }
  return true;
}

function isFresh(url) {
  const ccHeader = ccMap.get(url);
  const cc = parseCC(ccHeader);
  const t0 = storedAt.get(url);
  if (t0 == null || cc.maxAge == null) return true; // unknown → treat as usable + revalidate policy
  const age = (Date.now() - t0) / 1000;
  return age <= cc.maxAge;
}

function withinSwr(url) {
  const cc = parseCC(ccMap.get(url));
  const t0 = storedAt.get(url);
  if (t0 == null || cc.maxAge == null) return true;
  const age = (Date.now() - t0) / 1000;
  const swr = cc.swr ?? 0;
  return age <= cc.maxAge + swr;
}

function lruTouch(url) {
  if (lru.has(url)) lru.delete(url);
  lru.set(url, true);
  enforceCap(maxRuntimeEntries);
  scheduleMetaFlush();
}

function pickVictims(overBy) {
  if (overBy <= 0) return [];
  const order = [...lru.keys()]; // oldest first
  const scored = order.map((url, idx) => {
    const path = (() => {
      try {
        return new URL(url).pathname;
      } catch {
        return url;
      }
    })();
    const imm = classify(path) === "immutable-hash" || parseCC(ccMap.get(url)).immutable;
    const age = storedAt.has(url) ? Date.now() - storedAt.get(url) : 0;
    const staleMutable = !imm && age > MUTABLE_MAX_AGE_MS;
    // lower score = evict first
    const score = idx + (staleMutable ? -0.5 : 0) + (imm ? 1000 : 0);
    return { url, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, overBy).map((s) => s.url);
}

function enforceCap(max) {
  const over = lru.size - max;
  if (over <= 0) return;
  const victims = pickVictims(over);
  for (const victim of victims) {
    lru.delete(victim);
    etags.delete(victim);
    storedAt.delete(victim);
    ccMap.delete(victim);
    caches.open(RUNTIME_CACHE).then((c) => c.delete(victim)).catch(() => undefined);
  }
}

async function hardTrim(target) {
  await ensureLruLoaded();
  enforceCap(target);
  await flushMeta();
}

function scheduleMetaFlush() {
  if (metaTimer) clearTimeout(metaTimer);
  metaTimer = setTimeout(() => {
    metaTimer = 0;
    void flushMeta();
  }, META_FLUSH_MS);
}

async function flushMeta() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const body = JSON.stringify({
      order: [...lru.keys()],
      etags: Object.fromEntries(etags),
      storedAt: Object.fromEntries(storedAt),
      cc: Object.fromEntries(ccMap),
      t: Date.now(),
      v: 6,
    });
    await cache.put(
      LRU_META_URL,
      new Response(body, {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }),
    );
  } catch (e) {
    if (e && (e.name === "QuotaExceededError" || String(e).includes("Quota"))) {
      await hardTrim(pressureTarget);
    }
  }
}

async function ensureLruLoaded() {
  if (metaLoaded) return;
  if (metaLoadPromise) return metaLoadPromise;
  metaLoadPromise = (async () => {
    try {
      const cache = await caches.open(RUNTIME_CACHE);
      const res = await cache.match(LRU_META_URL);
      if (res) {
        const data = await res.json();
        lru = new Map();
        if (Array.isArray(data.order)) {
          for (const u of data.order) if (typeof u === "string") lru.set(u, true);
        }
        if (data.etags) for (const [k, v] of Object.entries(data.etags)) if (typeof v === "string") etags.set(k, v);
        if (data.storedAt) for (const [k, v] of Object.entries(data.storedAt)) if (typeof v === "number") storedAt.set(k, v);
        if (data.cc) for (const [k, v] of Object.entries(data.cc)) if (typeof v === "string") ccMap.set(k, v);
      }
    } catch {
      /* empty */
    } finally {
      metaLoaded = true;
    }
  })();
  return metaLoadPromise;
}

async function putRuntime(request, response) {
  await ensureLruLoaded();
  const pathname = new URL(request.url).pathname;
  const kind = classify(pathname);
  if (!mayStoreResponse(response, kind, pathname)) return;
  const cache = await caches.open(RUNTIME_CACHE);
  const url = request.url;
  try {
    await cache.put(request, response.clone());
  } catch (e) {
    if (e && (e.name === "QuotaExceededError" || String(e).includes("Quota"))) {
      await hardTrim(pressureTarget);
      try {
        await cache.put(request, response.clone());
      } catch {
        return;
      }
    } else {
      return;
    }
  }
  const et = response.headers.get("ETag");
  if (et) etags.set(url, et);
  const cc = response.headers.get("Cache-Control");
  if (cc) ccMap.set(url, cc);
  storedAt.set(url, Date.now());
  lruTouch(url);
}

async function revalidateConditional(request) {
  await ensureLruLoaded();
  const headers = new Headers();
  const et = etags.get(request.url);
  if (et) headers.set("If-None-Match", et);
  try {
    const res = await fetch(request, { headers, cache: "no-cache" });
    if (res.status === 304) {
      storedAt.set(request.url, Date.now());
      lruTouch(request.url);
      return null;
    }
    if (res.ok) {
      await putRuntime(request, res.clone());
      return res;
    }
  } catch {
    /* stale-if-error */
  }
  return null;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      const PRECACHE = mobileProfile
        ? PRECACHE_CORE
        : [...PRECACHE_CORE, ...PRECACHE_DESK];
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok && mayStoreResponse(res, "shell", url)) await cache.put(url, res);
          } catch {
            /* offline install */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop every previous shell/runtime (v1–v6) so no stale HTML/asset map remains
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("ww-shell") || k.startsWith("ww-runtime") || k.startsWith("ww-"))
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      // Also clear current shell of any accidental HTML entries from older builds
      try {
        const shell = await caches.open(SHELL_CACHE);
        const reqs = await shell.keys();
        await Promise.all(
          reqs
            .filter((r) => {
              try {
                const p = new URL(r.url).pathname;
                return p === "/" || p.endsWith(".html");
              } catch {
                return false;
              }
            })
            .map((r) => shell.delete(r)),
        );
      } catch {
        /* */
      }
      await ensureLruLoaded();
      try {
        if (self.registration.navigationPreload) {
          await self.registration.navigationPreload.enable();
        }
      } catch {
        /* */
      }
      await self.clients.claim();
      // Nudge open tabs to reload once so they pick matching hashed assets
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) {
        c.postMessage({ type: "WW_SW_ACTIVATED", build: SW_BUILD });
      }
    })(),
  );
});

function isLiveApi(url) {
  const h = url.hostname;
  return (
    h.includes("swpc.noaa.gov") ||
    h.includes("earthquake.usgs.gov") ||
    h.includes("ccmc.gsfc.nasa.gov") ||
    h.includes("sdo.gsfc.nasa.gov") ||
    h.includes("nascom.nasa.gov") ||
    h.includes("helioviewer.org") ||
    h.includes("stereo-ssc") ||
    url.pathname.startsWith("/_server") ||
    url.pathname.includes("DONKI")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (isLiveApi(url)) return;

  const kind = classify(url.pathname);

  // Navigations / HTML: ALWAYS network-first. Never cache HTML documents —
  // they embed hashed /assets/* names; a stale HTML after deploy → blank "skeleton"
  // (JS 404 MIME text/html). Offline: minimal text, not a stale shell.
  if (req.mode === "navigate" || kind === "shell" || url.pathname === "/" || url.pathname.endsWith(".html")) {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) return preload;
          const res = await fetch(req, { cache: "no-store" });
          return res;
        } catch {
          return new Response(
            `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>WolfWatch offline</title>
<body style="margin:0;background:#070b12;color:#e2e8f0;font:15px system-ui;display:grid;place-items:center;min-height:100dvh;padding:1.5rem;text-align:center">
<div><h1 style="font-size:1.1rem;margin:0 0 .5rem">WolfWatch is offline</h1>
<p style="color:#94a3b8;margin:0 0 1rem;line-height:1.4">Connect and refresh for the live observatory. We do not serve a cached app shell (avoids broken deploys).</p>
<button onclick="location.reload()" style="background:#22d3ee;color:#070b12;border:0;border-radius:8px;padding:.6rem 1rem;font-weight:600">Retry</button>
</div></body>`,
            {
              status: 503,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
              },
            },
          );
        }
      })(),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (!/\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ico|webmanifest)(?:\?|$)/i.test(url.pathname))
    return;

  event.respondWith(
    (async () => {
      await ensureLruLoaded();
      const cached =
        (await caches.match(req, { cacheName: RUNTIME_CACHE })) ||
        (await caches.match(req, { cacheName: SHELL_CACHE }));

      if (kind === "immutable-hash") {
        if (cached) {
          lruTouch(req.url);
          return cached;
        }
        try {
          const res = await fetch(req);
          if (res.ok) await putRuntime(req, res.clone());
          return res;
        } catch {
          return new Response("", { status: 504 });
        }
      }

      // mutable-static: respect Cache-Control no-cache / freshness
      const cc = parseCC(ccMap.get(req.url));
      if (cached && (cc.noCache || cc.mustRevalidate) && !isFresh(req.url)) {
        const fresh = await revalidateConditional(req);
        if (fresh) return fresh;
        // must-revalidate failed and stale — still return stale if within SWR window (ops UX)
        if (withinSwr(req.url)) {
          event.waitUntil(revalidateConditional(req));
          return cached;
        }
      }

      if (cached) {
        lruTouch(req.url);
        if (!isFresh(req.url) || withinSwr(req.url)) {
          event.waitUntil(revalidateConditional(req));
        }
        return cached;
      }

      try {
        const res = await fetch(req);
        if (res.ok) await putRuntime(req, res.clone());
        return res;
      } catch {
        return new Response("", { status: 504 });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "TRIM") {
    event.waitUntil(hardTrim(pressureTarget));
  }
  if (data.type === "TRIM_SOFT") {
    event.waitUntil(hardTrim(maxRuntimeEntries));
  }
  if (data.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
  if (data.type === "FLUSH_LRU") event.waitUntil(flushMeta());
  if (data.type === "SET_PROFILE") {
    mobileProfile = Boolean(data.mobile);
    maxRuntimeEntries = mobileProfile ? MAX_RUNTIME_ENTRIES_MOBILE : MAX_RUNTIME_ENTRIES_DESK;
    pressureTarget = mobileProfile ? PRESSURE_TARGET_MOBILE : PRESSURE_TARGET_DESK;
    event.waitUntil(hardTrim(maxRuntimeEntries));
  }
  if (data.type === "PURGE_ALL") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith("ww-")).map((k) => caches.delete(k)));
        lru = new Map();
        etags.clear();
        storedAt.clear();
        ccMap.clear();
      })(),
    );
  }
});
