import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useObservatory } from "@/store/observatory";
import {
  fluxToClass,
  peakFlare,
  longChannelXrays,
  forecastHighlights,
} from "@/lib/feeds/swpc";
import { MODES } from "@/lib/feeds/modes";
import {
  cmeImpactSummary,
  earthDirectedCmes,
} from "@/lib/feeds/donki";
import {
  SDO_CHANNELS,
  sdoStill,
  sdoMovie,
  lascoStill,
  lascoMovie,
  stereoEuvi,
  stereoCor2,
  stereoHeliographic,
  type SdoChannelId,
} from "@/lib/feeds/solarMedia";
import { fetchSoloFrame } from "@/lib/feeds/solarProxy";
import { buildImpactBrief } from "@/lib/solar/impact";
import { SuptSolarAgent } from "@/components/weather/SuptSolarAgent";
import { isMobileViewport } from "@/lib/device";
import { SuptContinuumStrip } from "@/components/supt/SuptContinuumStrip";
import { RecommendationsPanel } from "@/components/ops/RecommendationsPanel";
import {
  applyFocusScroll,
  peekPendingFocus,
  subscribeFocus,
  takePendingFocus,
  type FocusTarget,
} from "@/lib/ops/focusNav";
import { AttentionSparkline } from "@/components/ops/AttentionSparkline";
import { MagnetoPanel } from "@/components/magneto/MagnetoPanel";
import { upcomingKpForecast } from "@/lib/feeds/swpc";
import { SolarImageryWall } from "@/components/weather/SolarImageryWall";
import { HistoricalStormDesk } from "@/components/weather/HistoricalStormDesk";
import { DeepEarthContextCard } from "@/components/weather/DeepEarthContextCard";
import { SwpcStormWarnings } from "@/components/weather/SwpcStormWarnings";
import { ModelAccuracyDisclaimer } from "@/components/ops/ModelAccuracyDisclaimer";
import { KIndexScalesPanel } from "@/components/weather/KIndexScalesPanel";
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Play,
  Radio,
  Satellite,
  Shield,
  Sun,
  Wind,
  Zap,
  Orbit,
  Eye,
  Atom,
} from "lucide-react";

type MediaTab = "disk" | "corona" | "farside" | "models";

export function SpaceWeatherPanel({ compact = false }: { compact?: boolean }) {
  const kp = useObservatory((s) => s.kp);
  const xray = useObservatory((s) => s.xray);
  const solarWind = useObservatory((s) => s.solarWind);
  const scales = useObservatory((s) => s.scales);
  const flux10cm = useObservatory((s) => s.flux10cm);
  const forecast = useObservatory((s) => s.forecast);
  const enlil = useObservatory((s) => s.enlil);
  const ovation = useObservatory((s) => s.ovation);
  const ovationBundle = useObservatory((s) => s.ovationBundle);
  const donki = useObservatory((s) => s.donki);
  const protons = useObservatory((s) => s.protons);
  const solarAssessment = useObservatory((s) => s.solarAssessment);
  const mode = useObservatory((s) => s.mode);
  const neos = useObservatory((s) => s.neos);
  const ensureAmbient = useObservatory((s) => s.ensureAmbientLayers);
  const setOverlay = useObservatory((s) => s.setOverlay);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const kpForecast = useObservatory((s) => s.kpForecast);
  const [channel, setChannel] = useState<SdoChannelId>("0193");
  const [mediaTab, setMediaTab] = useState<MediaTab>("disk");
  const [imgBroken, setImgBroken] = useState(false);
  const [playSdo, setPlaySdo] = useState(false);
  const [playLasco, setPlayLasco] = useState<"c2" | "c3" | null>(null);
  const [soloUrl, setSoloUrl] = useState<string | null>(null);
  const [soloMeta, setSoloMeta] = useState<string | null>(null);
  const [soloLoading, setSoloLoading] = useState(false);
  const [deepOpen, setDeepOpen] = useState<{
    farside: boolean;
    models: boolean;
    alerts: boolean;
    catalogs: boolean;
  }>(() => {
    const mobile = typeof window !== "undefined" && isMobileViewport();
    const base = { farside: false, models: false, alerts: false, catalogs: !mobile };
    if (typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem("wolfwatch_solar_deep");
      if (raw) return { ...base, ...JSON.parse(raw) };
    } catch { /* */ }
    return base;
  });
  const toggleDeep = (key: "farside" | "models" | "alerts" | "catalogs") => {
    setDeepOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("wolfwatch_solar_deep", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  const openDeep = (key: "farside" | "models" | "alerts" | "catalogs") => {
    setDeepOpen((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true };
      try { localStorage.setItem("wolfwatch_solar_deep", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  const applySolarFocus = (t: FocusTarget) => {
    if (t.tab !== "solar") return;
    if (t.solarDeep) openDeep(t.solarDeep);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => applyFocusScroll(t), 80);
      window.setTimeout(() => applyFocusScroll(t), 320);
    });
  };

  useEffect(() => {
    const pending = peekPendingFocus() ?? takePendingFocus();
    if (pending) applySolarFocus(pending);
    return subscribeFocus((t) => {
      if (t.tab === "solar") applySolarFocus(t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + focus bus only
  }, []);

  const latestKp = kp.length ? kp[kp.length - 1] : null;
  const kpVal = latestKp ? Number(latestKp.Kp) : null;
  const long = longChannelXrays(xray);
  const latestX = long.length ? long[long.length - 1] : null;
  const flux = latestX ? latestX.flux || latestX.observed_flux || 0 : 0;
  const xClass = latestX ? fluxToClass(flux) : "—";
  const kpUpcoming = useMemo(() => upcomingKpForecast(kpForecast, 8), [kpForecast]);
  const peak = long.length ? peakFlare(long) : null;
  const highKp = kpVal !== null && kpVal >= 5;
  const highX = xClass.startsWith("M") || xClass.startsWith("X");
  const southBz = solarWind?.bz != null && solarWind.bz <= -5;
  const cfg = MODES[mode];
  const showImages = cfg.loadImage && !compact;
  const bust = lastUpdate ?? 0;
  const cmes = donki?.cmes ?? [];
  const flares = donki?.flares ?? [];
  const earthCmes = useMemo(() => earthDirectedCmes(cmes), [cmes]);

  const impact = useMemo(
    () =>
      buildImpactBrief({
        scales,
        wind: solarWind,
        kp: kpVal,
        xClass,
        cmes,
      }),
    [scales, solarWind, kpVal, xClass, cmes],
  );

  const assessment = useMemo(() => {
    if (solarAssessment) return solarAssessment;
    // Fallback before first refresh completes
    return {
      generatedAt: 0,
      impact,
      channels: [],
      headline: impact.title,
      observations: [],
      interpretation: [impact.summary],
      watchItems: impact.bullets,
      caveats: [],
      attention: 0,
      protons: { p10: null, p50: null, p100: null, time: null, sLike: false },
      enlilNote: "",
    };
  }, [solarAssessment, impact]);

  const highlights = useMemo(
    () => forecastHighlights(forecast?.threeDay ?? ""),
    [forecast?.threeDay],
  );

  const heroSrc = useMemo(() => sdoStill(channel, 512, bust), [channel, bust]);

  // Load Solar Orbiter EUI when far-side tab opens (server proxy)
  useEffect(() => {
    if (!showImages || mediaTab !== "farside" || soloUrl || soloLoading) return;
    let cancelled = false;
    setSoloLoading(true);
    void (async () => {
      try {
        const frame = await fetchSoloFrame();
        if (cancelled) return;
        setSoloUrl(frame.url);
        setSoloMeta(frame.meta);
      } finally {
        if (!cancelled) setSoloLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showImages, mediaTab, soloUrl, soloLoading]);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <Gauge icon={<Activity className="h-3 w-3" />} label="Kp" value={kpVal != null ? kpVal.toFixed(1) : "—"} alert={highKp} />
          <Gauge icon={<Sun className="h-3 w-3" />} label="X-ray" value={xClass} alert={highX} />
          <Gauge icon={<Wind className="h-3 w-3" />} label="SW" value={solarWind?.speed != null ? String(Math.round(solarWind.speed)) : "—"} />
          <Gauge icon={<Zap className="h-3 w-3" />} label="Bz" value={solarWind?.bz != null ? solarWind.bz.toFixed(1) : "—"} alert={southBz} />
        </div>
        {scales && (
          <p className="text-center text-[0.65rem] text-muted">
            R{scales.R} · S{scales.S} · G{scales.G}
            {earthCmes.length > 0 && (
              <span className="text-warn"> · {earthCmes.length} Earth CME</span>
            )}
          </p>
        )}
        <p
          className={`text-[0.65rem] leading-snug ${
            impact.color === "danger"
              ? "text-danger"
              : impact.color === "warn"
                ? "text-warn"
                : impact.color === "gold"
                  ? "text-gold"
                  : "text-dim"
          }`}
        >
          {impact.title}: {impact.summary}
        </p>
      </div>
    );
  }

  const levelBorder =
    impact.color === "danger"
      ? "border-danger/40 bg-danger/10"
      : impact.color === "warn"
        ? "border-warn/35 bg-warn/10"
        : impact.color === "gold"
          ? "border-gold/35 bg-gold/10"
          : impact.color === "primary"
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-panel";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-primary sm:text-xl">
            SunWolf Solar Observatory
          </h2>
          <p className="text-xs text-dim">
            Storm watch · Earth impact · disk → corona → far side · free public feeds only
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[0.62rem] text-dim">
          <span className="rounded-full border border-border px-2 py-0.5">NOAA SWPC</span>
          <span className="rounded-full border border-border px-2 py-0.5">NASA SDO</span>
          <span className="rounded-full border border-border px-2 py-0.5">SOHO LASCO</span>
          <span className="rounded-full border border-border px-2 py-0.5">STEREO-A</span>
          <span className="rounded-full border border-border px-2 py-0.5">Solar Orbiter</span>
          <span className="rounded-full border border-border px-2 py-0.5">DONKI</span>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-panel/80 px-2.5 py-1.5">
        <AttentionSparkline />
        {kpUpcoming.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[0.62rem] text-muted">
            <span className="font-semibold uppercase tracking-wide text-dim">Kp fc</span>
            {kpUpcoming.slice(0, 6).map((p) => {
              const k = p.kp;
              const tone =
                k >= 5 ? "text-danger" : k >= 4 ? "text-warn" : "text-fg";
              const lab = p.time_tag.slice(5, 13).replace("T", " ");
              return (
                <span key={p.time_tag} className={`font-mono tabular-nums ${tone}`} title={p.time_tag}>
                  {lab}·{k.toFixed(1)}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <SuptContinuumStrip compact />

      <MagnetoPanel />

      <HistoricalStormDesk />

      <KIndexScalesPanel />

      <Ladder title="1 · Ops brief" hint="Scales · wind · CME impact (official sizes)" />
      {/* Impact command card — ops brief from data */}
      <section className={`rounded-xl border p-3 sm:p-4 ${levelBorder}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-fg">{impact.title}</h3>
          <span className="rounded-full border border-border bg-bg/50 px-2 py-0.5 text-[0.62rem] uppercase tracking-wide text-dim">
            {impact.level}
          </span>
        </div>
        <p className="text-sm text-muted">{impact.summary}</p>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
          {impact.bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <Ladder title="2 · Live instruments" hint="Gauges · protons · scales · forecast" />
      {/* Live gauges */}
      <div
        id="ses-solar-geo"
        className="grid scroll-mt-20 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      >
        <Gauge icon={<Activity className="h-3.5 w-3.5" />} label="Kp now" value={kpVal != null ? kpVal.toFixed(1) : "—"} alert={highKp} />
        <Gauge icon={<Sun className="h-3.5 w-3.5" />} label="X-ray" value={xClass} alert={highX} />
        <Gauge icon={<Wind className="h-3.5 w-3.5" />} label="SW km/s" value={solarWind?.speed != null ? String(Math.round(solarWind.speed)) : "—"} />
        <Gauge icon={<Zap className="h-3.5 w-3.5" />} label="Bz nT" value={solarWind?.bz != null ? solarWind.bz.toFixed(1) : "—"} alert={southBz} />
        <Gauge icon={<Radio className="h-3.5 w-3.5" />} label="10.7 cm" value={flux10cm?.flux != null ? String(Math.round(flux10cm.flux)) : "—"} />
        <Gauge
          icon={<Orbit className="h-3.5 w-3.5" />}
          label="Bt nT"
          value={solarWind?.bt != null ? solarWind.bt.toFixed(1) : "—"}
        />
      </div>

      {/* Real-time proton flux */}
      <div id="ses-solar-protons" className="grid scroll-mt-20 grid-cols-3 gap-2">
        <Gauge
          icon={<Atom className="h-3.5 w-3.5" />}
          label="p ≥10 MeV"
          value={
            assessment.protons.p10 != null
              ? assessment.protons.p10 >= 10
                ? assessment.protons.p10.toFixed(1)
                : assessment.protons.p10.toFixed(2)
              : "—"
          }
          alert={assessment.protons.sLike}
        />
        <Gauge
          icon={<Atom className="h-3.5 w-3.5" />}
          label="p ≥50 MeV"
          value={
            assessment.protons.p50 != null ? assessment.protons.p50.toFixed(3) : "—"
          }
          alert={assessment.protons.p50 != null && assessment.protons.p50 >= 1}
        />
        <Gauge
          icon={<Atom className="h-3.5 w-3.5" />}
          label="p ≥100 MeV"
          value={
            assessment.protons.p100 != null ? assessment.protons.p100.toFixed(3) : "—"
          }
          alert={assessment.protons.p100 != null && assessment.protons.p100 >= 1}
        />
      </div>
      {assessment.protons.time && (
        <p className="text-center text-[0.62rem] text-dim">
          GOES integral protons (pfu) · {new Date(assessment.protons.time).toUTCString().replace("GMT", "UTC")}
          {assessment.protons.sLike ? " · ≥10 MeV in S1-class range" : ""}
        </p>
      )}

      {peak && (
        <p className="text-center text-xs text-muted">
          24 h flare peak:{" "}
          <strong className={peak.class.startsWith("M") || peak.class.startsWith("X") ? "text-danger" : "text-gold"}>
            {peak.class}
          </strong>
          {peak.time && (
            <span className="text-dim">
              {" "}
              · {new Date(peak.time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} UTC
            </span>
          )}
        </p>
      )}

      {/* NOAA scales + forecast probs */}
      {scales && (
        <div className="grid gap-2 sm:grid-cols-3">
          <ScaleCard letter="R" name="Radio blackout" value={scales.R} text={scales.RText} />
          <ScaleCard letter="S" name="Solar radiation" value={scales.S} text={scales.SText} />
          <ScaleCard letter="G" name="Geomagnetic" value={scales.G} text={scales.GText} />
        </div>
      )}

      {/* 3-day forecast highlights */}
      {(highlights.length > 0 || forecast?.issued) && (
        <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[0.7rem] font-medium uppercase tracking-wider text-primary">
              SWPC 3-day outlook
            </h3>
            {forecast?.issued && (
              <span className="text-[0.62rem] text-dim">Issued {forecast.issued}</span>
            )}
          </div>
          <ul className="space-y-1.5 text-xs text-muted">
            {highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          {scales?.RMinorProb && (
            <p className="mt-2 text-[0.68rem] text-dim">
              Day-1 probs · R minor {scales.RMinorProb}% · R major {scales.RMajorProb ?? "—"}% · S{" "}
              {scales.SProb ?? "—"}% · G {scales.G1 ?? "—"}
            </p>
          )}
        </section>
      )}

      <Ladder title="3 · Catalogs" hint="DONKI CME / flares">
        <button type="button" className="ww-btn min-h-8 text-[0.62rem]" onClick={() => toggleDeep("catalogs")}>
          {deepOpen.catalogs ? "Collapse" : "Expand"}
        </button>
      </Ladder>
      {deepOpen.catalogs && (
      <section
        id="ses-solar-cme"
        className="grid scroll-mt-20 gap-3 lg:grid-cols-2"
      >
        <div className="rounded-xl border border-border bg-panel p-3 sm:p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-primary">
            <AlertTriangle className="h-3.5 w-3.5" />
            Incoming CME watch (DONKI)
          </h3>
          {donki?.error && (
            <p className="mb-2 text-xs text-warn">Catalog: {donki.error}</p>
          )}
          <div className="scroll-thin max-h-56 space-y-2 overflow-y-auto">
            {(earthCmes.length ? earthCmes : cmes).slice(0, 8).map((c) => {
              const imp = cmeImpactSummary(c);
              return (
                <a
                  key={c.activityID}
                  href={c.link || "https://kauai.ccmc.gsfc.nasa.gov/DONKI/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-border/80 bg-bg/40 px-2.5 py-2 text-xs hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-fg">
                      {c.startTime?.replace("Z", " UTC") ?? "—"}
                    </span>
                    {imp.earth && (
                      <span className="rounded bg-warn/20 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase text-warn">
                        Earth
                      </span>
                    )}
                    {imp.speed != null && (
                      <span className="text-dim">{Math.round(imp.speed)} km/s</span>
                    )}
                  </div>
                  {imp.eta && (
                    <p className="mt-0.5 text-primary">
                      ETA {new Date(imp.eta).toUTCString().replace("GMT", "UTC")}
                      {imp.kpHint != null ? ` · Kp~${imp.kpHint}` : ""}
                    </p>
                  )}
                  <p className="mt-0.5 line-clamp-2 text-dim">
                    {c.sourceLocation ? `${c.sourceLocation} · ` : ""}
                    {(c.note || "CME").slice(0, 140)}
                  </p>
                </a>
              );
            })}
            {!cmes.length && (
              <p className="text-xs text-dim">No CMEs in the 7-day DONKI window (or still loading).</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panel p-3 sm:p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-primary">
            <Zap className="h-3.5 w-3.5" />
            Recent flares (DONKI)
          </h3>
          <div className="scroll-thin max-h-56 space-y-2 overflow-y-auto">
            {flares.slice(0, 10).map((f) => (
              <a
                key={f.flrID}
                href={f.link || "https://kauai.ccmc.gsfc.nasa.gov/DONKI/"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-2 rounded-lg border border-border/80 bg-bg/40 px-2.5 py-2 text-xs hover:border-primary/40"
              >
                <div className="min-w-0">
                  <span
                    className={`font-mono font-semibold ${
                      (f.classType || "").startsWith("X") || (f.classType || "").startsWith("M")
                        ? "text-danger"
                        : "text-fg"
                    }`}
                  >
                    {f.classType || "—"}
                  </span>
                  <span className="text-dim">
                    {" "}
                    · {f.sourceLocation || "—"}
                    {f.activeRegionNum ? ` · AR${f.activeRegionNum}` : ""}
                  </span>
                  <p className="text-dim">
                    {(f.peakTime || f.beginTime || "").replace("Z", " UTC")}
                  </p>
                </div>
                {f.linkedEvents && f.linkedEvents.length > 0 && (
                  <span className="shrink-0 text-[0.58rem] text-gold">
                    +{f.linkedEvents.length} linked
                  </span>
                )}
              </a>
            ))}
            {!flares.length && (
              <p className="text-xs text-dim">No cataloged flares in window (or still loading).</p>
            )}
          </div>
        </div>
      </section>

      )}

      <Ladder title="4 · Look" hint="Disk · corona · far side · models" />
      {/* Imagery stack */}
      {showImages && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Solar media">
            {(
              [
                { id: "disk" as const, label: "Earth-facing disk", Icon: Sun },
                { id: "corona" as const, label: "Corona / CME", Icon: Eye },
                { id: "farside" as const, label: "Far side / off-Earth", Icon: Satellite },
                { id: "models" as const, label: "Arrival models", Icon: Orbit },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mediaTab === id}
                onClick={() => setMediaTab(id)}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.7rem] font-medium ${
                  mediaTab === id
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-panel text-muted hover:bg-elevated"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {mediaTab === "disk" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1" role="tablist" aria-label="SDO channel">
                {SDO_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    title={ch.hint}
                    onClick={() => {
                      setChannel(ch.id);
                      setImgBroken(false);
                      setPlaySdo(false);
                    }}
                    className={`rounded-md border px-2 py-1 text-[0.65rem] font-medium ${
                      channel === ch.id
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border bg-panel text-muted hover:bg-elevated"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
              <div className="mx-auto w-full max-w-[min(100%,28rem)]">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-[#0a0a0c]">
                  {playSdo ? (
                    <video
                      key={sdoMovie(channel, 512, bust)}
                      className="absolute inset-0 h-full w-full object-contain"
                      src={sdoMovie(channel, 512, bust)}
                      controls
                      playsInline
                      autoPlay
                      poster={heroSrc}
                    />
                  ) : !imgBroken ? (
                    <img
                      key={heroSrc}
                      src={heroSrc}
                      alt={`SDO ${channel}`}
                      className="absolute inset-0 h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
                      onError={() => setImgBroken(true)}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-dim">
                      SDO image unavailable
                    </div>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[0.65rem] text-dim">
                  <span>
                    NASA SDO · {SDO_CHANNELS.find((c) => c.id === channel)?.hint}
                  </span>
                  {!String(channel).startsWith("HMI") ? (
                    <button
                      type="button"
                      className="ww-btn min-h-9 text-[0.68rem]"
                      onClick={() => setPlaySdo((v) => !v)}
                    >
                      <Play className="h-3 w-3" />
                      {playSdo ? "Show still" : "Play 48h movie"}
                    </button>
                  ) : (
                    <span className="text-[0.62rem] text-dim">Still only</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {mediaTab === "corona" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["c2", "c3"] as const).map((cam) => (
                <div key={cam} className="rounded-lg border border-border bg-panel p-2">
                  <div className="mb-1.5 flex items-center justify-between text-[0.68rem]">
                    <span className="font-medium text-fg">
                      SOHO LASCO {cam.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      className="ww-btn min-h-8 px-2 text-[0.62rem]"
                      onClick={() => setPlayLasco((p) => (p === cam ? null : cam))}
                    >
                      <Play className="h-3 w-3" />
                      {playLasco === cam ? "Still" : cam === "c2" ? "Movie ~1 MB" : "Movie ~9 MB"}
                    </button>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-md bg-[#0a0a0c]">
                    {playLasco === cam ? (
                      <video
                        key={lascoMovie(cam, true, bust)}
                        className="h-full w-full object-contain"
                        src={lascoMovie(cam, true, bust)}
                        controls
                        playsInline
                        autoPlay
                        poster={lascoStill(cam, 512, bust)}
                      />
                    ) : (
                      <img
                        src={lascoStill(cam, 512, bust)}
                        alt={`LASCO ${cam}`}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <p className="mt-1 text-[0.62rem] text-dim">
                    {cam === "c2"
                      ? "Near corona — CME launch structure"
                      : "Wide corona — CME expansion toward planets"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {mediaTab === "farside" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Earth only sees half the Sun. <strong className="text-fg">STEREO-A</strong> gives a
                different heliolongitude (beacon EUV + coronagraph).{" "}
                <strong className="text-fg">Solar Orbiter EUI</strong> is the true far-side / out-of-
                ecliptic view when data is downlinked (often laggy — we always show the newest frame
                Helioviewer has).
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <MediaTile
                  title="STEREO-A EUVI 195"
                  caption="Off-Earth EUV beacon"
                  src={stereoEuvi("195", 512, bust)}
                />
                <MediaTile
                  title="STEREO-A EUVI 304"
                  caption="Chromosphere / prominences"
                  src={stereoEuvi("304", 512, bust)}
                />
                <MediaTile
                  title="STEREO-A COR2"
                  caption="Coronagraph from A"
                  src={stereoCor2(512, bust)}
                />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-panel p-2">
                  <div className="mb-1 text-[0.68rem] font-medium text-fg">
                    STEREO heliographic map
                  </div>
                  <img
                    src={stereoHeliographic(bust)}
                    alt="STEREO heliographic"
                    className="w-full rounded-md border border-border"
                    loading="lazy"
                  />
                  <p className="mt-1 text-[0.62rem] text-dim">
                    Where STEREO-A sits in longitude vs Earth — context for “far side.”
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-panel p-2">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[0.68rem]">
                    <span className="font-medium text-fg">Solar Orbiter · EUI FSI 174</span>
                    <a
                      href="https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-dim hover:text-primary"
                    >
                      ESA
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-md bg-[#0a0a0c]">
                    {soloLoading && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-dim">
                        Fetching newest Solo frame…
                      </div>
                    )}
                    {soloUrl && (
                      <img
                        src={soloUrl}
                        alt="Solar Orbiter EUI"
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    )}
                    {!soloLoading && !soloUrl && (
                      <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-dim">
                        {soloMeta || "Unavailable"}
                      </div>
                    )}
                  </div>
                  {soloMeta && (
                    <p className="mt-1 text-[0.62rem] text-dim">{soloMeta}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {mediaTab === "models" && (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-panel p-2">
                <div className="mb-1 flex items-center justify-between text-[0.68rem]">
                  <span className="font-medium text-fg">WSA-ENLIL (SWPC)</span>
                  <a
                    href="https://www.swpc.noaa.gov/products/wsa-enlil-solar-wind-prediction"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-dim hover:text-primary"
                  >
                    About
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {enlil?.url ? (
                  <img
                    src={enlil.url}
                    alt="WSA-ENLIL latest"
                    className="w-full rounded-md border border-border"
                    loading="lazy"
                  />
                ) : (
                  <p className="py-8 text-center text-xs text-dim">ENLIL frame loading…</p>
                )}
                <p className="mt-1 text-[0.62rem] text-dim">
                  Heliospheric density / CME propagation toward Earth
                  {enlil?.timeHint ? ` · model ${enlil.timeHint}` : ""}. Latest frame only (~100 KB).
                </p>
              </div>
              <div className="rounded-lg border border-border bg-panel p-2 sm:col-span-2">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
                  <div className="text-[0.68rem] font-medium text-fg">OVATION aurora · N + S</div>
                  <a
                    href="https://www.swpc.noaa.gov/products/aurora-30-minute-forecast"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[0.58rem] text-primary hover:underline"
                  >
                    SWPC forecast
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <figure>
                    <div className="mb-0.5 text-[0.58rem] font-medium text-muted">North</div>
                    {(ovationBundle?.north?.url || ovation?.url) ? (
                      <img
                        src={ovationBundle?.north?.url || ovation?.url || ""}
                        alt="OVATION north"
                        className="w-full rounded-md border border-border"
                        loading="lazy"
                      />
                    ) : (
                      <p className="py-8 text-center text-xs text-dim">Loading…</p>
                    )}
                  </figure>
                  <figure>
                    <div className="mb-0.5 text-[0.58rem] font-medium text-muted">South</div>
                    {ovationBundle?.south?.url ? (
                      <img
                        src={ovationBundle.south.url}
                        alt="OVATION south"
                        className="w-full rounded-md border border-border"
                        loading="lazy"
                      />
                    ) : (
                      <p className="py-8 text-center text-xs text-dim">Loading…</p>
                    )}
                  </figure>
                </div>
                <p className="mt-1 text-[0.58rem] text-dim">
                  Short-term oval (SWPC OVATION)
                  {ovationBundle?.north?.time_tag || ovation?.time_tag
                    ? ` · ${new Date(ovationBundle?.north?.time_tag || ovation?.time_tag || "").toUTCString().replace("GMT", "UTC")}`
                    : ""}
                  {mode !== "full" ? " · protons stay in Full" : ""}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Dense still wall — opt-in only; no image GETs until expanded */}
      {showImages && !compact && (
        <SolarImageryWall mode={mode} bust={bust} />
      )}


      <Ladder title="4b · Near-Earth objects" hint="NASA NeoWs · today's approaches" />
      <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-primary">
            <Orbit className="h-3.5 w-3.5" />
            Near-Earth objects (today)
          </h3>
          <button
            type="button"
            className="ww-btn min-h-8 text-[0.62rem]"
            onClick={() => void ensureAmbient(true)}
          >
            Refresh NEOs
          </button>
        </div>
        <p className="mb-2 text-[0.65rem] text-dim">
          NASA NeoWs close approaches. Not impact predictions. PHA = potentially hazardous (size/orbit class).
        </p>
        <div className="scroll-thin max-h-56 space-y-1.5 overflow-y-auto">
          {neos.length === 0 ? (
            <p className="py-4 text-center text-xs text-dim">No NEO list yet — tap refresh (DEMO_KEY rate limits apply).</p>
          ) : (
            neos.slice(0, 12).map((n) => (
              <a
                key={n.id}
                href={n.neoUrl || "https://cneos.jpl.nasa.gov/"}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-border/80 bg-bg/40 px-2.5 py-2 text-xs hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-fg">{n.name}</span>
                  {n.hazardous && (
                    <span className="rounded bg-warn/20 px-1 py-0.5 text-[0.58rem] font-semibold text-warn">
                      PHA
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[0.62rem] text-muted">
                  {n.missKm != null ? `Miss ~${(n.missKm / 384400).toFixed(2)} LD · ${Math.round(n.missKm).toLocaleString()} km` : "Miss —"}
                  {n.velocityKms != null ? ` · ${n.velocityKms.toFixed(1)} km/s` : ""}
                  {n.diameterM != null ? ` · ~${Math.round(n.diameterM)} m` : ""}
                </div>
                {n.approachDate && (
                  <div className="text-[0.58rem] text-dim">{n.approachDate} UTC</div>
                )}
              </a>
            ))
          )}
        </div>
      </section>

      <Ladder title="5 · Timing read" hint="Spacing of flares / CMEs / peaks (optional depth)" />
      <SuptSolarAgent assessment={assessment} />

      <Ladder title="6 · Recommendations" hint="What to watch next" />
      <RecommendationsPanel />

      <Ladder title="7 · SWPC storm warnings" hint="Official watches · warnings · alerts" />
      <SwpcStormWarnings />

      <ModelAccuracyDisclaimer />

      <DeepEarthContextCard />

      <footer className="pb-2 text-[0.62rem] leading-relaxed text-dim">
        Free stack: NOAA SWPC (scales, L1 wind, GOES X-ray, 10.7 cm, 3-day forecast, ENLIL, OVATION,
        alerts) · NASA SDO stills/MPEG (+ opt-in imagery wall) · SOHO LASCO · STEREO-A beacons · Solar Orbiter EUI via
        Helioviewer · NASA CCMC DONKI (server proxy). Historical Storm Desk & field models are educational.
        Not an official forecast product — always
        verify with{" "}
        <a
          href="https://www.swpc.noaa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          SWPC
        </a>
        .
      </footer>
    </div>
  );
}

function Ladder({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <div>
        <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-primary">{title}</h3>
        {hint && <p className="text-[0.62rem] text-dim">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Gauge({
  icon,
  label,
  value,
  alert,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-panel px-2.5 py-2 text-center">
      <div className="mb-0.5 flex items-center justify-center gap-1 text-[0.65rem] uppercase tracking-wide text-dim">
        {icon}
        {label}
      </div>
      <div
        className={`font-mono text-lg font-semibold tabular-nums ${
          alert ? "text-danger" : "text-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ScaleCard({
  letter,
  name,
  value,
  text,
}: {
  letter: string;
  name: string;
  value: string;
  text?: string;
}) {
  const n = parseInt(value, 10) || 0;
  const tone =
    n >= 3 ? "text-danger border-danger/40" : n >= 1 ? "text-warn border-warn/35" : "text-fg border-border";
  return (
    <div className={`rounded-lg border bg-panel px-3 py-2.5 ${tone}`}>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-bold">
          {letter}
          {value}
        </span>
        <span className="text-[0.7rem] text-dim">{name}</span>
      </div>
      {text && <p className="mt-0.5 text-[0.65rem] capitalize text-muted">{text}</p>}
    </div>
  );
}

function MediaTile({
  title,
  caption,
  src,
}: {
  title: string;
  caption: string;
  src: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-2">
      <div className="mb-1 text-[0.68rem] font-medium text-fg">{title}</div>
      <div className="aspect-square overflow-hidden rounded-md bg-[#0a0a0c]">
        <img src={src} alt={title} className="h-full w-full object-contain" loading="lazy" />
      </div>
      <p className="mt-1 text-[0.62rem] text-dim">{caption}</p>
    </div>
  );
}
