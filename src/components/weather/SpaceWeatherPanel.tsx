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
import { EclipseWatch } from "@/components/weather/EclipseWatch";
import { FieldCouplingDesk } from "@/components/ops/FieldCouplingDesk";
import { GoesXrayDesk } from "@/components/weather/GoesXrayDesk";
import { SolarCycleStrip } from "@/components/weather/SolarCycleStrip";
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
/** Top-level Solar IA — one job per view (stops the wall of mixed jargon). */
type SolarView = "now" | "xray" | "images" | "catalogs" | "magneto" | "context";

const SOLAR_VIEWS: { id: SolarView; label: string; hint: string }[] = [
  { id: "now", label: "Now", hint: "Field pairing · impact · NOAA scales" },
  { id: "xray", label: "X-ray", hint: "GOES 18/19 log flux · A–X bands" },
  { id: "images", label: "Images", hint: "Disk · corona · models" },
  { id: "catalogs", label: "Catalogs", hint: "CMEs · flares · NEOs" },
  { id: "magneto", label: "Magneto", hint: "Cordaro INTERMAGNET · H × flare × EQ" },
  { id: "context", label: "Context", hint: "History · timing · education" },
];

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
  const [solarView, setSolarView] = useState<SolarView>(() => {
    if (typeof window === "undefined") return "now";
    try {
      const q = new URLSearchParams(window.location.search);
      const v = q.get("solar");
      if (v === "images" || v === "catalogs" || v === "context" || v === "now" || v === "magneto" || v === "xray") return v;
      const raw = localStorage.getItem("ww_solar_view");
      if (raw === "images" || raw === "catalogs" || raw === "context" || raw === "now" || raw === "magneto" || raw === "xray") return raw;
    } catch {
      /* */
    }
    return "now";
  });
  const selectSolarView = (v: SolarView) => {
    setSolarView(v);
    try {
      localStorage.setItem("ww_solar_view", v);
      const u = new URL(window.location.href);
      if (v === "now") u.searchParams.delete("solar");
      else u.searchParams.set("solar", v);
      window.history.replaceState({}, "", u.toString());
    } catch {
      /* */
    }
  };
  const [imgBroken, setImgBroken] = useState(false);
  const [playSdo, setPlaySdo] = useState(false);
  const [playLasco, setPlayLasco] = useState<"c2" | "c3" | null>(null);
  const [soloUrl, setSoloUrl] = useState<string | null>(null);
  const [soloMeta, setSoloMeta] = useState<string | null>(null);
  const [soloLoading, setSoloLoading] = useState(false);

  const applySolarFocus = (t: FocusTarget) => {
    if (t.tab !== "solar") return;
    if (t.anchor === "field-coupling") selectSolarView("now");
    else if (t.solarDeep === "catalogs") selectSolarView("catalogs");
    else if (t.solarDeep === "magneto") selectSolarView("magneto");
    else if (t.solarDeep === "xray") selectSolarView("xray");
    else if (t.solarDeep === "alerts") selectSolarView("now");
    else if (t.solarDeep === "farside" || t.solarDeep === "models") {
      selectSolarView("images");
      if (t.solarDeep === "farside") setMediaTab("farside");
      if (t.solarDeep === "models") setMediaTab("models");
    }
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
    <div className="mx-auto max-w-5xl space-y-3 sm:space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-primary sm:text-xl">Solar</h2>
            <p className="text-xs text-muted">
              Live NOAA SWPC + NASA ·{" "}
              <a
                href="https://www.swpc.noaa.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                SWPC
              </a>{" "}
              is authority
            </p>
          </div>
        </div>

        <div
          className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-panel/90 p-1"
          role="tablist"
          aria-label="Solar sections"
        >
          {SOLAR_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={solarView === v.id}
              title={v.hint}
              onClick={() => selectSolarView(v.id)}
              className={`min-h-10 min-w-[4.5rem] flex-1 rounded-md px-2.5 py-1.5 text-[0.72rem] font-semibold transition ${
                solarView === v.id
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted hover:bg-elevated hover:text-fg"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-[0.62rem] text-dim">{SOLAR_VIEWS.find((v) => v.id === solarView)?.hint}</p>
      </header>

      {solarView === "now" && (
        <div className="space-y-3">
          <FieldCouplingDesk />
          <SolarCycleStrip />
          <EclipseWatch />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-panel/80 px-2.5 py-1.5">
            <AttentionSparkline showLabel height={22} className="min-w-0" />
            {kpUpcoming.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-[0.62rem] text-muted">
                <span className="font-semibold uppercase tracking-wide text-dim">Kp next</span>
                {kpUpcoming.slice(0, 5).map((p) => {
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
              GOES protons (pfu) · {new Date(assessment.protons.time).toUTCString().replace("GMT", "UTC")}
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

          <GoesXrayDesk compact onOpenFull={() => selectSolarView("xray")} />

          {scales && (
            <div className="grid gap-2 sm:grid-cols-3">
              <ScaleCard letter="R" name="Radio blackout" value={scales.R} text={scales.RText} />
              <ScaleCard letter="S" name="Solar radiation" value={scales.S} text={scales.SText} />
              <ScaleCard letter="G" name="Geomagnetic" value={scales.G} text={scales.GText} />
            </div>
          )}

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

          <SwpcStormWarnings />

          <p className="text-center text-[0.65rem] text-dim">
            Need pictures or CME lists? Use{" "}
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => selectSolarView("images")}>
              Images
            </button>
            {" · "}
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => selectSolarView("catalogs")}>
              Catalogs
            </button>
            . Timing / history live under{" "}
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => selectSolarView("context")}>
              Context
            </button>
            .
          </p>
        </div>
      )}

      {solarView === "xray" && <GoesXrayDesk />}

      {solarView === "images" && showImages && (
        <div className="space-y-3">
          <p className="text-xs text-muted">Open Images sub-tabs for disk, corona, far side, and models.</p>
          <SolarImageryWall mode={mode} bust={bust} />
        </div>
      )}

      {solarView === "images" && !showImages && (
        <p className="rounded-lg border border-border bg-panel p-4 text-center text-sm text-muted">
          Imagery is off in this mode. Switch to Standard or Full to load NASA/SDO frames.
        </p>
      )}

      {solarView === "catalogs" && (
        <div className="space-y-3">
          <p className="text-xs text-muted">CME and flare catalogs load from DONKI · NEOs from NASA NeoWs.</p>
        </div>
      )}

      {solarView === "magneto" && (
        <div className="space-y-3">
          <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-[0.7rem] leading-relaxed text-muted">
            Richard Cordaro’s public INTERMAGNET processing — ground H, not a seismometer.
            Flare → H is often SSC. H → EQ is exploratory coincidence.
          </p>
          <MagnetoPanel />
        </div>
      )}

      {solarView === "context" && (
        <div className="space-y-3">
          <p className="rounded-lg border border-border/80 bg-panel/60 px-3 py-2 text-[0.7rem] leading-relaxed text-muted">
            Optional depth — expand only what you need. None of this is an official forecast.
          </p>
          <SolarCycleStrip compact />
          <EclipseWatch compact />
          <SuptContinuumStrip compact />
          <HistoricalStormDesk compact />
          <KIndexScalesPanel defaultOpen={false} />
          <SuptSolarAgent assessment={assessment} />
          <RecommendationsPanel />
          <ModelAccuracyDisclaimer />
          <DeepEarthContextCard />
        </div>
      )}

      <footer className="border-t border-border/60 pb-2 pt-2 text-[0.62rem] leading-relaxed text-dim">
        Free feeds · observation desk · not an official forecast product.
      </footer>
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
