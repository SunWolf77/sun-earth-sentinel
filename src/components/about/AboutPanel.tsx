import { HelpGuide } from "@/components/ops/HelpGuide";
import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { PERF_TIPS } from "@/lib/map/perfSnippets";
import { probeGpu, type GpuCapabilities, LEAFLET_VERSION } from "@/lib/map/gpuProbe";
import {
  ATTENUATION_NOTES,
  EEW_NOTES,
  DECAY_HALF_LIFE_H,
  halfLifeLabel,
  timeDecayLegendRows,
} from "@/lib/seismology/reference";
import { SHAKEMAP_NOTES } from "@/lib/seismology/shakemap";
import {
  MORVEL_NOTES,
  EULER_CALC_NOTES,
  listKnownPoles,
  tongaPacificDemo,
} from "@/lib/tectonics/morvel";
import { SITE, APP_VERSION, ogImageUrl, shareCardUrl, absoluteUrl, xCardDebugReport } from "@/lib/site";
import { XHandle, XPerson, XProfileChips } from "@/components/ui/XProfileLink";
import { SuptMathSection } from "@/components/supt/SuptMathSection";
import { CacheAndSwpcDocs } from "@/components/about/CacheAndSwpcDocs";

export function AboutPanel() {
  const [gpu, setGpu] = useState<GpuCapabilities | null>(null);
  const [showTechDocs, setShowTechDocs] = useState(false);
  const poles = listKnownPoles();
  const demo = tongaPacificDemo();
  const card = xCardDebugReport();

  useEffect(() => {
    setGpu(probeGpu());
  }, []);

  const dayRows = timeDecayLegendRows("day");

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 text-sm leading-relaxed text-muted md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
        <div className="min-w-0 text-sm text-muted">
          <strong className="text-fg">New to the map or globe?</strong> Open the How-to guide anytime from the header <span className="text-primary">?</span> or map Help.
        </div>
        <HelpGuide />
      </div>

      <header>
        <h2 className="text-xl font-semibold text-gold">Sun-Earth Sentinel</h2>
        <p className="mt-1 text-[0.65rem] font-mono text-dim">
          Release v{APP_VERSION} · production ship
        </p>
        <p className="mt-2">
          Free Sun-Earth observatory by{" "}
          <XPerson profile="sunwolf" /> — live seismic map, volcano watches, space weather, and
          event-timing patterns. Optional method credit:{" "}
          <strong className="text-fg">SUPT</strong> (Sheppard) by{" "}
          <XPerson profile="sheppard" /> — technical depth when you open it.
        </p>
        <div className="mt-3">
          <p className="mb-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-dim">
            Primary on X
          </p>
          <XProfileChips profiles={["sunwolf", "sheppard"]} />
        </div>
      </header>

      <Section title="What this is">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-fg">Map</strong> — USGS / optional GEOFON quakes, plates, nodes,
            volcano alerts, global context layers
          </li>
          <li>
            <strong className="text-fg">Solar</strong> — NOAA SWPC space weather + SDO imagery, plus
            optional timing patterns on flares / CMEs, Historical Storm Desk (Carrington → 2024), and
            GIC literacy + IGRF field-model note under Magneto
          </li>
          <li>
            <strong className="text-fg">Rhythm</strong> — earthquake spacing over time (ordinary vs
            unusual); quiet is a real status
          </li>
          <li>
            <strong className="text-fg">Not a forecast</strong> — educational monitoring; official
            products stay at USGS / NOAA / local agencies
          </li>
        </ul>
        <p className="mt-2 text-xs text-dim">
          Published SES focus boards:{" "}
          <a
            href="https://tonga-kermadec-monitor.vercel.app/?from=ses&sesNode=tonga"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Tonga–Kermadec (#1)
          </a>
          {" · "}
          <a
            href="https://campi-flegrei-monitor.vercel.app/?from=ses&sesNode=mediterranean"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Campi Flegrei (#2)
          </a>
          . Deep-link back with{" "}
          <code className="text-primary">?tab=live&node=tonga</code> or{" "}
          <code className="text-primary">node=mediterranean</code> (aliases: campi, cf) or{" "}
          <code className="text-primary">node=iceland</code> (IS · IMO).
        </p>
      </Section>

      <Section title="Timing patterns (method: SUPT)">
        <p>
          Default UI talks about <strong className="text-fg">event spacing</strong> — clustered,
          mixed, even, or quiet — on both Earth (Rhythm) and solar channels. Size/intensity
          (magnitude, R/S/G) stay separate. The shared strip is a plain “timing overview.”
        </p>
        <p className="mt-2 text-sm text-muted">
          Under the hood, the fixed method is <strong className="text-fg">SUPT</strong> (Sheppard’s
          Universal Proxy Theory): same probe on ordered gaps. Full symbols and math are in the
          section below and under “Technical detail” on Rhythm / Solar.
        </p>
      </Section>

      <SuptMathSection />

      <Section title="Key data layers">
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          <li>
            <strong className="text-fg">USGS HANS + INGV/PC + KVERT</strong> — elevated volcano alerts (aviation +
            ground level); notices remain authoritative
          </li>
          <li>
            <strong className="text-fg">Magnetic anomalies</strong> — INTERMAGNET-oriented processing
            following the public tool by{" "}
            <XPerson profile="cordaro">Richard Cordaro</XPerson> (
            <a
              className="text-primary hover:underline"
              href="https://drmagneto.appspot.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              drmagneto
            </a>
            ); exploratory only, not a proven quake warning
          </li>
          <li>
            <strong className="text-fg">NOAA SWPC</strong> — Kp, X-ray, solar wind, scales, GOES
            magnetometer
          </li>
          <li>
            <strong className="text-fg">Realtime pulse</strong> — adaptive USGS HTTP (no public
            WebSocket); LIVE badge = healthy pull, not a private feed
          </li>
        </ul>
      </Section>

      <Section title="Share on X">
        <p className="mb-2 text-xs">
          Cards use Open Graph + large image. X caches the first scrape of a URL — use a versioned
          link if an old card sticks.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={shareCardUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            Static share page
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href={ogImageUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-3 py-2 text-xs font-semibold text-fg hover:bg-elevated"
          >
            OG image
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(
              `${SITE.name}\n${absoluteUrl(`/?v=${SITE.ogImageVersion}`)}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/20"
          >
            Compose tweet
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="mt-2 text-[0.62rem] text-dim">
          Image: <span className="text-primary">{card.imageUrl}</span>
        </p>
      </Section>

      <div className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setShowTechDocs((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
          aria-expanded={showTechDocs}
        >
          <div>
            <h3 className="text-sm font-semibold text-primary">Technical appendices</h3>
            <p className="text-[0.68rem] text-dim">
              Cache · SWPC · plates · ShakeMap · GPU — expand only if needed
            </p>
          </div>
          <span className="text-xs font-medium text-primary">{showTechDocs ? "Hide" : "Show"}</span>
        </button>
        {showTechDocs && (
          <div className="mt-3 space-y-4 border-t border-border/70 pt-3">
            <Section title="Cache · service worker · SWPC APIs">
              <CacheAndSwpcDocs />
            </Section>

            <Section title={MORVEL_NOTES.title}>
              <p className="mb-2">{MORVEL_NOTES.oneLiner}</p>
              <ul className="mb-3 list-disc space-y-1.5 pl-5 text-xs">
                {MORVEL_NOTES.points.map((p) => (
                  <li key={p.slice(0, 40)}>{p}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {MORVEL_NOTES.citations.map((c) => (
                  <a
                    key={c.url}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-bg/60 px-2 py-1 text-[0.65rem] text-primary hover:bg-elevated"
                  >
                    {c.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </Section>

            <Section title={EULER_CALC_NOTES.title}>
              <p className="mb-2 text-xs">
                Finite rotation of a rigid plate about an Euler pole (map arrows).
              </p>
              {demo.v && (
                <p className="mb-3 rounded-md border border-primary/25 bg-primary/5 px-2.5 py-2 text-xs">
                  <strong className="text-primary">Demo — Pacific at Tonga trench</strong>
                  <br />
                  Site {demo.lat}°, {demo.lon}° · |v| ≈ {demo.v.speed.toFixed(0)} mm/yr · bearing{" "}
                  {demo.v.bearing.toFixed(0)}°
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-dim">
                      <th className="py-1 pr-2 font-medium">Plate</th>
                      <th className="py-1 pr-2 font-medium">Code</th>
                      <th className="py-1 pr-2 font-medium">Pole lat</th>
                      <th className="py-1 pr-2 font-medium">Pole lon</th>
                      <th className="py-1 font-medium">ω °/Myr</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted">
                    {poles.map((p) => (
                      <tr key={p.code} className="border-b border-border/50">
                        <td className="py-1 pr-2 text-fg">{p.name}</td>
                        <td className="py-1 pr-2 font-mono text-primary">{p.code}</td>
                        <td className="py-1 pr-2 font-mono">{p.pole.lat.toFixed(1)}°</td>
                        <td className="py-1 pr-2 font-mono">{p.pole.lon.toFixed(1)}°</td>
                        <td className="py-1 font-mono">{p.pole.omega.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title={SHAKEMAP_NOTES.title}>
              <p className="mb-2">{SHAKEMAP_NOTES.oneLiner}</p>
              <p className="rounded-md border border-primary/25 bg-primary/5 px-2.5 py-2 text-xs text-dim">
                <strong className="text-primary">Stance:</strong> {SHAKEMAP_NOTES.stance}
              </p>
            </Section>

            <Section title="Heat time-decay">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-dim">
                      <th className="py-1 pr-2 font-medium">Window</th>
                      <th className="py-1 pr-2 font-medium">Half-life t½</th>
                      <th className="py-1 font-medium">Example (day)</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted">
                    {(Object.keys(DECAY_HALF_LIFE_H) as (keyof typeof DECAY_HALF_LIFE_H)[]).map(
                      (w) => (
                        <tr key={w} className="border-b border-border/50">
                          <td className="py-1.5 pr-2 text-fg">{w}</td>
                          <td className="py-1.5 pr-2 font-mono text-primary">{halfLifeLabel(w)}</td>
                          <td className="py-1.5 font-mono text-[0.7rem]">
                            {w === "day"
                              ? dayRows.map((r) => `${r.ageLabel}=${r.pct}`).join(" · ")
                              : "—"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title={ATTENUATION_NOTES.title}>
              <p className="mb-2">{ATTENUATION_NOTES.summary}</p>
            </Section>

            <Section title={EEW_NOTES.title}>
              <p className="rounded-md border border-danger/30 bg-danger/10 px-2.5 py-2 text-xs text-danger/90">
                <strong>Not an early-warning product.</strong> {EEW_NOTES.sentinelStance}
              </p>
            </Section>

            <Section title="Map stack & GPU">
              <ul className="space-y-1 text-xs">
                <li>
                  <strong className="text-fg">Leaflet</strong>{" "}
                  <code className="text-primary">{LEAFLET_VERSION}</code> · 2D
                </li>
                <li>
                  <strong className="text-fg">three.js</strong> · Full-mode 3D globe
                </li>
                <li>
                  <strong className="text-fg">Plates</strong> PB2002 + Euler arrows
                </li>
                <li>
                  Basemaps OSM · CARTO · Esri · OpenTopoMap (corner attribution)
                </li>
              </ul>
              {gpu && (
                <div className="mt-3 rounded-lg border border-border bg-bg/50 p-3 font-mono text-[0.68rem] text-muted">
                  WebGL {gpu.webgl ? "yes" : "no"}
                  {gpu.webgl2 ? " · WebGL2" : ""}
                  {gpu.instancing ? " · instancing" : ""} · WebGPU{" "}
                  {gpu.webgpu ? "available" : "n/a"}
                </div>
              )}
            </Section>

            <Section title="Map performance snippets">
              <div className="space-y-4">
                {PERF_TIPS.map((tip) => (
                  <SnippetCard
                    key={tip.id}
                    title={tip.title}
                    body={tip.body}
                    snippet={tip.snippet}
                  />
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>

      <Section title="Credits & data">
        <div className="space-y-3 text-xs leading-relaxed">
          <div>
            <p className="font-semibold text-fg">Lineage</p>
            <p>
              <XPerson profile="sunwolf" /> — SolWatch continuum → node monitors → this Sentinel
              observatory.
            </p>
            <p className="mt-1">
              <XPerson profile="sheppard" /> — SUPT and the frozen resonance probe (Rhythm / Solar
              interpreter).
            </p>
          </div>

          <div>
            <p className="font-semibold text-fg">Live public data</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>
                <strong className="text-fg">USGS</strong> — earthquakes, volcano HANS, ShakeMap
              </li>
              <li>
                <strong className="text-fg">NOAA SWPC</strong> — Kp, X-ray, solar wind, scales
              </li>
              <li>
                <strong className="text-fg">NASA SDO</strong> — AIA imagery
              </li>
              <li>
                <strong className="text-fg">GFZ GEOFON</strong> — optional multi-agency merge
              </li>
              <li>
                <strong className="text-fg">INTERMAGNET</strong> / NOAA GOES — magnetic series (via
                Cordaro public endpoints where used)
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-fg">Tectonics (educational)</p>
            <p>
              Bird (2003) PB2002 · DeMets et al. MORVEL / NNR-MORVEL56 — model credit with those
              authors; community GeoJSON packaging only.
            </p>
          </div>

          <div>
            <p className="font-semibold text-fg">Public seismic globe (inspiration only)</p>
            <p>
              Optional globe / multi-agency patterns were inspired by the free public seismic tool
              released by <XHandle profile="dutchsinse" /> for community use — thank you. Rebuilt
              inside the Sun-Earth Sentinel stack (not a fork or UI clone).
            </p>
            <a
              href="https://www.dutchsinse.com/beta-test-new-earthquake-program-for-public-use/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg/60 px-2.5 py-1.5 text-[0.68rem] text-primary hover:bg-elevated"
            >
              Public download page
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <p className="font-semibold text-fg">Deep Earth (context only)</p>
            <p>
              Core-flow / geodynamo research and ECDO-style deep-Earth frameworks are educational
              curiosity (Ethical Skeptic and literature as inspiration) — not a live hazard feed.
              SES monitors the magnetic field’s surface effects (Kp/G, Magneto), not outer-core
              velocity in real time.
            </p>
          </div>

          <div>
            <p className="font-semibold text-fg">Libraries & basemaps</p>
            <p>
              Leaflet, three.js, React, Vite, TanStack · tiles OSM / CARTO / Esri / OpenTopoMap ·
              NASA Blue Marble–style globe texture where used.
            </p>
          </div>

          <div>
            <p className="font-semibold text-fg">Build assist</p>
            <p>
              Implementation help via <strong className="text-fg">Grok Build (xAI)</strong>. Product
              design and IP remain the SunWolf / Sheppard continuum.
            </p>
          </div>
        </div>
      </Section>

      <p className="text-xs text-dim">
        Independent and free. Cross-check critical events with USGS / NOAA / local agencies.
        Metrics are educational overlays — not official forecasts or early warning.
      </p>
    </div>
  );
}

function SnippetCard({
  title,
  body,
  snippet,
}: {
  title: string;
  body: string;
  snippet: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-bg/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-fg">{title}</h4>
          <p className="mt-0.5 text-xs text-dim">{body}</p>
        </div>
        <button
          type="button"
          className="ww-btn ww-btn--ghost shrink-0 text-[0.65rem]"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(snippet);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-ok" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="scroll-thin mt-2 max-h-48 overflow-auto rounded-md border border-border bg-panel p-2.5 font-mono text-[0.62rem] leading-relaxed text-primary/90">
        {snippet}
      </pre>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">{title}</h3>
      {children}
    </section>
  );
}
