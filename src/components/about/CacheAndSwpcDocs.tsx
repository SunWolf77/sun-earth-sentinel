import { useEffect, useState } from "react";
import { Check, Copy, Radio, HardDrive, Smartphone, Layers } from "lucide-react";
import { SWPC_ENDPOINTS, SWPC_BASE } from "@/lib/feeds/swpcCatalog";
import {
  registerShellServiceWorker,
  unregisterShellServiceWorker,
  type SwStatus,
} from "@/lib/sw/register";
import { CACHE_SNIPPETS } from "@/lib/cache/snippets";
import { MANIFEST_FIELD_NOTES } from "@/lib/pwa/manifestMeta";
import { APP_SHORTCUTS } from "@/lib/pwa/shortcuts";
import { probeCacheQuota, formatBytes, type QuotaSnapshot } from "@/lib/sw/cacheQuota";
import { classifyAssetUrl, swrStrategyFor } from "@/lib/sw/lru";
import { CACHE_BENCH_RESULTS } from "@/lib/cache/benchResults";

export function CacheAndSwpcDocs() {
  const [sw, setSw] = useState<SwStatus | "idle">("idle");
  const [swErr, setSwErr] = useState<string | null>(null);
  const [quotaSnap, setQuotaSnap] = useState<QuotaSnapshot | null>(null);

  useEffect(() => {
    void registerShellServiceWorker().then((r) => {
      setSw(r.status);
      setSwErr(r.error ?? null);
    });
    void probeCacheQuota().then(setQuotaSnap);
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
          <HardDrive className="h-4 w-4" />
          Service worker (shell)
        </h3>
        <p className="mb-2 text-[0.72rem] leading-relaxed text-muted">
          Shell SW v6 — true LRU + classed SWR + Cache-Control + eviction policies. Precaches shell only. <strong className="text-fg">Never</strong> caches live SWPC /
          USGS / DONKI JSON — stale storm data is worse than offline. Status:{" "}
          <span className="font-mono text-fg">{sw}</span>
          {swErr && <span className="text-warn"> · {swErr}</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ww-btn min-h-9 text-[0.68rem]"
            onClick={() =>
              void registerShellServiceWorker({ allowDev: true }).then((r) => {
                setSw(r.status);
                setSwErr(r.error ?? null);
              })
            }
          >
            Register / update SW
          </button>
          <button
            type="button"
            className="ww-btn min-h-9 text-[0.68rem]"
            onClick={() =>
              void unregisterShellServiceWorker().then(() => {
                setSw("skipped");
                setSwErr(null);
              })
            }
          >
            Unregister SW
          </button>
          <button
            type="button"
            className="ww-btn min-h-9 text-[0.68rem]"
            onClick={() => {
              navigator.serviceWorker?.controller?.postMessage({ type: "TRIM" });
            }}
          >
            TRIM runtime cache
          </button>
          <button
            type="button"
            className="ww-btn min-h-9 text-[0.68rem]"
            onClick={() => {
              navigator.serviceWorker?.controller?.postMessage({ type: "FLUSH_LRU" });
            }}
          >
            Flush LRU meta
          </button>
        </div>
        <CodeBlock title="install + activate handlers" code={CACHE_SNIPPETS.swInstallHandler} />
        <CodeBlock title="True LRU (Map + debounce)" code={CACHE_SNIPPETS.swLruEviction} />
        <CodeBlock title="SW performance tactics" code={CACHE_SNIPPETS.swPerf} />
        <CodeBlock title="SW policy summary" code={CACHE_SNIPPETS.serviceWorkerPolicy} />
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Layers className="h-4 w-4" />
          Cache eviction strategies
        </h3>
        <ul className="mb-2 list-disc space-y-1.5 pl-4 text-[0.72rem] leading-relaxed text-muted">
          <li>
            <strong className="text-fg">True LRU (runtime, max 48)</strong> — in-memory{" "}
            <code className="text-primary">Map</code> (insertion order = LRU→MRU); delete+set moves
            to MRU. Overflow deletes oldest key. Meta flushed debounced (800 ms) to{" "}
            <code className="text-primary">/__ww_lru_meta__</code>. Static assets use SWR
            (cache-first + background revalidate).
          </li>
          <li>
            <strong className="text-fg">Versioned FIFO</strong> — bump{" "}
            <code className="text-primary">ww-shell-vN</code> /{" "}
            <code className="text-primary">ww-runtime-vN</code>; activate hard-deletes unknown names.
          </li>
          <li>
            <strong className="text-fg">Not LFU</strong> — least-frequently-used needs hit counters and
            cold-start thrash; worse for hashed immutable assets.
          </li>
          <li>
            <strong className="text-fg">Not TTL on assets</strong> — content-hashed files are immutable;
            shell uses network-first instead of time expiry.
          </li>
          <li>
            <strong className="text-fg">Bypass list</strong> — SWPC/USGS/DONKI/SDO never enter Cache
            Storage (stale storm data is unsafe).
          </li>
          <li>
            <strong className="text-fg">localStorage soft limit</strong> — feed layer (~2.4 MB
            mobile / ~4.5 MB desktop) with ranked prune on <code className="text-primary">ww_*</code>{" "}
            keys.
          </li>
          <li>
            <strong className="text-fg">IndexedDB (idbCache)</strong> — dual-write for fat keys
            (eq windows, densify catalogs, solar series). Soft budget ~28 MB mobile / ~96 MB desktop;
            prefs and visit baseline stay on localStorage.
          </li>
        </ul>
        <CodeBlock title="True LRU + algorithm notes" code={CACHE_SNIPPETS.swLruEviction} />
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Layers className="h-4 w-4" />
          Cache prune micro-benchmarks
        </h3>
        <p className="mb-2 text-[0.72rem] leading-relaxed text-muted">
          Node CPU benches for atomic IDB victim selection (not browser IDB I/O). Re-run{" "}
          <code className="text-primary">npm run bench:cache</code>. Captured{" "}
          <span className="font-mono text-fg">
            {CACHE_BENCH_RESULTS.generatedAt.slice(0, 19).replace("T", " ")}Z
          </span>
          {" · "}
          {String(CACHE_BENCH_RESULTS.env.cpuModel)} · Node{" "}
          {String(CACHE_BENCH_RESULTS.env.node)}.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-left text-[0.65rem]">
            <thead>
              <tr className="border-b border-border text-dim">
                <th className="py-1 pr-2 font-medium">Bench</th>
                <th className="py-1 pr-2 font-medium">µs/op</th>
                <th className="py-1 pr-2 font-medium">ops/s</th>
                <th className="py-1 font-medium">iters</th>
              </tr>
            </thead>
            <tbody>
              {CACHE_BENCH_RESULTS.benches
                .filter((b) => b.perOpUs != null)
                .map((b) => (
                  <tr key={b.name} className="border-b border-border/50 text-muted">
                    <td className="py-1 pr-2 font-mono text-fg">{b.name}</td>
                    <td className="py-1 pr-2 tabular-nums">{b.perOpUs?.toFixed(2)}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {b.opsPerSec?.toLocaleString() ?? "—"}
                    </td>
                    <td className="py-1 tabular-nums">{b.iters ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {(() => {
          const ratio = CACHE_BENCH_RESULTS.benches.find(
            (b) => b.name === "atomic_batch_vs_multi_ratio",
          );
          if (!ratio) return null;
          return (
            <p className="mt-2 text-[0.65rem] leading-snug text-dim">
              Atomic batch vs multi-delete CPU ratio{" "}
              <strong className="text-fg">{ratio.ratio?.toFixed(2)}×</strong> on{" "}
              {ratio.victimCount} victims — real IDB win is{" "}
              <strong className="text-fg">1 commit vs N</strong>, not sort cost. Sample slimmed
              EQ×400 JSON ≈{" "}
              {CACHE_BENCH_RESULTS.samplePayloadBytes
                ? `${(CACHE_BENCH_RESULTS.samplePayloadBytes / 1024).toFixed(1)} KB`
                : "—"}
              .
            </p>
          );
        })()}
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-primary">SWR invalidation strategies</h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          Stale-while-revalidate is not one policy — WolfWatch picks by URL class (SW v6).
        </p>
        <ul className="mb-2 space-y-1.5 text-[0.72rem] text-muted">
          {(
            [
              "/assets/app-Ab12Cd.js",
              "/",
              "/favicon.svg",
              "/_server/fn",
            ] as const
          ).map((path) => {
            const kind = classifyAssetUrl(path);
            const s = swrStrategyFor(kind);
            return (
              <li key={path} className="rounded-md border border-border/70 bg-bg/40 px-2.5 py-1.5">
                <span className="font-mono text-[0.65rem] text-primary">{path}</span>
                <span className="ml-2 text-fg">{kind}</span>
                <p className="text-[0.65rem] text-dim">{s.note}</p>
              </li>
            );
          })}
        </ul>
        <CodeBlock title="SWR strategy matrix" code={CACHE_SNIPPETS.swrInvalidation} />
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-primary">HTTP Cache-Control</h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          SW honors response headers when deciding store vs revalidate (RFC 9111 subset).
        </p>
        <ul className="mb-2 list-disc space-y-1 pl-4 text-[0.72rem] text-muted">
          <li>
            <code className="text-primary">no-store</code> — never write to Cache Storage
          </li>
          <li>
            <code className="text-primary">no-cache</code> /{" "}
            <code className="text-primary">must-revalidate</code> — revalidate before trust
          </li>
          <li>
            <code className="text-primary">immutable</code> / content-hash — cache-first, no
            revalidate
          </li>
          <li>
            <code className="text-primary">max-age</code> +{" "}
            <code className="text-primary">stale-while-revalidate</code> — freshness windows
          </li>
          <li>
            <code className="text-primary">ETag</code> — conditional{" "}
            <code className="text-primary">If-None-Match</code> (304 keeps body)
          </li>
        </ul>
        <CodeBlock title="parseCacheControl + decideStore" code={CACHE_SNIPPETS.httpCacheControl} />
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-primary">Cache Storage eviction policies</h3>
        <ul className="mb-2 list-disc space-y-1.5 pl-4 text-[0.72rem] text-muted">
          <li>
            <strong className="text-fg">Soft cap 48</strong> — runtime entries; LRU primary
          </li>
          <li>
            <strong className="text-fg">Pressure 24</strong> — TRIM / QuotaExceededError hard trim
          </li>
          <li>
            <strong className="text-fg">Prefer victims</strong> — stale mutable (over 7d) before
            content-hashed immutables
          </li>
          <li>
            <strong className="text-fg">Shell precache-only</strong> — single '/' snapshot +
            icons/manifest
          </li>
          <li>
            <strong className="text-fg">Never hosts</strong> — SWPC, USGS, DONKI, SDO, SOHO,
            Helioviewer
          </li>
        </ul>
        <CodeBlock title="EVICTION_POLICY" code={CACHE_SNIPPETS.evictionPolicy} />
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-primary">Cache Storage quotas</h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          Browser origin quota via <code className="text-primary">navigator.storage.estimate()</code>.
          Live space-weather JSON is never stored in Cache Storage.
        </p>
        {quotaSnap ? (
          <div className="mb-2 space-y-1 rounded-md border border-border/70 bg-bg/40 px-2.5 py-2 text-[0.72rem] text-muted">
            <p>
              Usage <strong className="text-fg">{formatBytes(quotaSnap.usage)}</strong>
              {" / "}
              quota <strong className="text-fg">{formatBytes(quotaSnap.quota)}</strong>
              {quotaSnap.persisted != null && (
                <span className="text-dim"> · persisted={String(quotaSnap.persisted)}</span>
              )}
            </p>
            <p className="text-[0.65rem] text-dim">{quotaSnap.note}</p>
            <button
              type="button"
              className="ww-btn min-h-8 text-[0.65rem]"
              onClick={() => void probeCacheQuota().then(setQuotaSnap)}
            >
              Refresh estimate
            </button>
          </div>
        ) : (
          <p className="text-[0.72rem] text-dim">Probing storage…</p>
        )}
        <CodeBlock title="Quota probe notes" code={CACHE_SNIPPETS.cacheQuota} />
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-primary">LRU unit tests</h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          Pure Map-order LRU + URL classifier — no browser required.
        </p>
        <pre className="mb-2 overflow-x-auto rounded-md border border-border bg-[#0a0c10] p-2.5 font-mono text-[0.65rem] text-[#c8d0e0]">
{`npm run test:lru
# → node scripts/lru-unit-test.mjs  (20 assertions)`}
        </pre>
        <CodeBlock title="TrueLru.touch example" code={CACHE_SNIPPETS.swLruEviction} />
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
          Web App shortcuts
        </h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          Long-press the installed icon (Android / supported desktop) for jump targets. Each shortcut
          opens <code className="text-primary">?tab=…</code>; the app syncs the address bar when you
          change tabs so links stay shareable.
        </p>
        <ul className="mb-2 space-y-1.5">
          {APP_SHORTCUTS.map((s) => (
            <li
              key={s.tab}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-bg/40 px-2.5 py-1.5 text-[0.72rem]"
            >
              <span>
                <strong className="text-fg">{s.name}</strong>
                <span className="text-dim"> — {s.description}</span>
              </span>
              <a
                href={s.url}
                className="font-mono text-[0.62rem] text-primary hover:underline"
              >
                {s.url}
              </a>
            </li>
          ))}
        </ul>
        <CodeBlock title="Shortcuts implementation" code={CACHE_SNIPPETS.shortcutsImpl} />
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Smartphone className="h-4 w-4" />
          Web App Manifest
        </h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          Served at{" "}
          <a className="text-primary hover:underline" href="/manifest.webmanifest" target="_blank" rel="noopener noreferrer">
            /manifest.webmanifest
          </a>
          . Installable shell; live data still needs network.
        </p>
        <div className="scroll-thin max-h-56 space-y-2 overflow-y-auto">
          {MANIFEST_FIELD_NOTES.map((n) => (
            <div key={n.field} className="rounded-md border border-border/70 bg-bg/40 px-2.5 py-2">
              <div className="font-mono text-[0.65rem] text-primary">{n.field}</div>
              <div className="text-[0.68rem] font-medium text-fg">{n.value}</div>
              <p className="mt-0.5 text-[0.65rem] text-dim">{n.why}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
          localStorage cache
        </h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          Versioned <code className="text-primary">ww_*</code> keys, soft size prune, mobile-tighter
          history (24 vs 48). Feed JSON is short-TTL; prefs use{" "}
          <code className="text-primary">wolfwatch_*</code>.
        </p>
        <CodeBlock title="getCache / setCache / prune" code={CACHE_SNIPPETS.localCacheCore} />
        <CodeBlock title="pushHistory (dedupe + cap)" code={CACHE_SNIPPETS.history} />
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-primary">Offline banner</h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          When <code className="text-primary">refresh</code> fails but scales or quakes remain in
          memory/cache, <code className="text-primary">OfflineBanner</code> shows age + Retry.
          Hard errors without cache still use the red alert strip.
        </p>
        <pre className="scroll-thin overflow-x-auto rounded-md border border-border bg-[#0a0c10] p-2.5 font-mono text-[0.62rem] text-[#c8d0e0]">{`// components/ops/OfflineBanner.tsx
if (!error) return null;
if (!(scales || eq?.features?.length)) return null; // need cached ops data
// show warn strip: "showing last known data (~Nm old)" + Retry → refresh(true)`}</pre>
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-primary">INTERMAGNET formats & SSC</h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          Formats: IAGA-2002 (ASCII exchange), ImagCDF (definitive CDF), IAF/IMF (legacy), WDC classic.
          Live path uses Cordaro drmagneto processed H (~30s). SSC/SI watch = step scan on ground/tool
          series + GOES Hp (SWPC) — not an official Kyoto/ISGI SSC list.
        </p>
        <p className="text-[0.65rem] text-dim">
          Credits: INTERMAGNET · IAGA/NCEI · <span className="text-primary">@rrichcord</span> · NOAA SWPC GOES
        </p>
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-primary">SWPC Kp forecast sources</h3>
        <ul className="mb-2 list-disc space-y-1 pl-4 text-[0.72rem] text-muted">
          <li>
            <code className="text-primary">/products/noaa-planetary-k-index.json</code> — observed Kp
          </li>
          <li>
            <code className="text-primary">/products/noaa-planetary-k-index-forecast.json</code> —
            3h observed + forecast steps (wired as Kp fc strip)
          </li>
          <li>
            <code className="text-primary">/text/3-day-forecast.txt</code> — narrative + greatest
            expected Kp
          </li>
          <li>
            <code className="text-primary">/products/noaa-scales.json</code> — G scale now / day+1 /
            day+2
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 text-sm font-semibold text-primary">Seismic visualization stack</h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          We stay on <strong className="text-fg">Leaflet</strong> (2D) +{" "}
          <strong className="text-fg">Three.js</strong> (3D globe) — free tiles, full control, no
          Mapbox token. Alternatives considered:
        </p>
        <ul className="list-disc space-y-1 pl-4 text-[0.72rem] text-muted">
          <li>
            <strong className="text-fg">MapLibre GL</strong> — great vector style, heavier bundle,
            more WebGL battery cost on mobile Lite
          </li>
          <li>
            <strong className="text-fg">deck.gl</strong> — excellent for huge point clouds; overkill
            for capped USGS feeds
          </li>
          <li>
            <strong className="text-fg">Cesium</strong> — full globe terrain; large payload vs our
            focused hex/stem globe
          </li>
          <li>
            <strong className="text-fg">kepler.gl</strong> — analytics notebook vibe, not ops HUD
          </li>
        </ul>
        <p className="mt-2 text-[0.68rem] text-dim">
          Decision: keep Leaflet + Three; invest in magneto/SUPT layers rather than re-platforming
          the map.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Radio className="h-4 w-4" />
          NOAA SWPC data APIs
        </h3>
        <p className="mb-2 text-[0.72rem] text-muted">
          Base:{" "}
          <a
            className="text-primary hover:underline"
            href={SWPC_BASE}
            target="_blank"
            rel="noopener noreferrer"
          >
            {SWPC_BASE}
          </a>{" "}
          · free · no key. App uses a server batch for reliability; Lite skips heavy products.
        </p>
        <div className="scroll-thin max-h-64 overflow-y-auto">
          <table className="w-full min-w-[18rem] text-left text-[0.68rem]">
            <thead>
              <tr className="border-b border-border text-dim">
                <th className="py-1 pr-2">Product</th>
                <th className="py-1 pr-2">In app</th>
                <th className="py-1">Role</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              {SWPC_ENDPOINTS.map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="py-1.5 pr-2 font-mono text-[0.62rem] text-fg">
                    <a
                      href={`${SWPC_BASE}${e.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      {e.path.replace("/products/", "").replace("/json/", "")}
                    </a>
                    {e.heavy && <span className="ml-1 text-dim">· heavy</span>}
                  </td>
                  <td className="py-1.5 pr-2">{e.usedInApp ? "yes" : "—"}</td>
                  <td className="py-1.5">{e.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeBlock title="Lite vs heavy solar core" code={CACHE_SNIPPETS.solarCoreHeavy} />
      </section>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-2 overflow-hidden rounded-lg border border-border bg-[#0a0c10]">
      <div className="flex items-center justify-between gap-2 border-b border-border/80 px-2.5 py-1.5">
        <span className="truncate font-mono text-[0.62rem] text-dim">{title}</span>
        <button
          type="button"
          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-panel px-2 text-[0.62rem] text-fg"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-ok" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="scroll-thin max-h-48 overflow-auto p-2.5 text-[0.62rem] leading-relaxed text-[#c8d0e0] sm:text-[0.68rem]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
