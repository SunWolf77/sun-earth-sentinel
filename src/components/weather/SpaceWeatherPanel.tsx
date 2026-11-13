import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useObservatory } from "@/store/observatory";
import {
  fluxToClass,
  peakFlare,
  longChannelXrays,
  forecastHighlights,
  type NoaaScales,
  type SolarWind,
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
import { CollapsibleTabs } from "@/components/ops/CollapsibleTabs";
import { ActiveRegionDesk } from "@/components/weather/ActiveRegionDesk";
import { FarSideWatchDesk } from "@/components/weather/FarSideWatch";
import { RegionContinuityDesk } from "@/components/weather/RegionContinuity";
import { FlareOutlookDesk } from "@/components/weather/FlareOutlookDesk";
import { FlareAtlasDesk } from "@/components/weather/FlareAtlasDesk";
import { MagnetoPanel } from "@/components/magneto/MagnetoPanel";
import { EcdoTestDesk } from "@/components/magneto/EcdoTestDesk";
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
import { GoesLiveFeeds } from "@/components/weather/GoesLiveFeeds";
import { SolarCycleStrip } from "@/components/weather/SolarCycleStrip";
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Play,
  Radio,
  Satellite,
  Sun,
  Wind,
  Zap,
  Orbit,
  Eye,
  Atom,
} from "lucide-react";

type MediaTab = "disk" | "corona" | "farside" | "models";
/** Top-level Solar IA — one job per view (stops the wall of mixed jargon). */
type SolarView = "now" | "xray" | "images" | "catalogs" | "magneto" | "pole" | "context";

const SOLAR_VIEWS: { id: SolarView; label: string; hint: string }[] = [
  { id: "now", label: "Now", hint: "The dashboard" },
  { id: "xray", label: "X-ray", hint: "The flare chart" },
  { id: "images", label: "Images", hint: "Pictures of the Sun" },
  { id: "catalogs", label: "Catalogs", hint: "Lists of events" },
  { id: "magneto", label: "Magneto", hint: "Magnets on the ground" },
  { id: "pole", label: "Pole", hint: "Where Earth's pole is drifting" },
  { id: "context", label: "Context", hint: "How the pieces connect" },
];

export function SpaceWeatherPanel({ compact = false }: { compact?: boolean }) {
  const kp = useObservatory((s) => s.kp);
  const xray = useObservatory((s) => s.xray);
  const solarWind = useObservatory((s) => s.solarWind);
  const scales = useObservatory((s) => s.scales);
  const flux10cm = useObservatory((s) => s.flux10cm);
  const activeRegions = useObservatory((s) => s.activeRegions);
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
  const [closer, setCloser] = useState(false);
  const [solarView, setSolarView] = useState<SolarView>(() => {
    if (typeof window === "undefined") return "now";
    try {
      const q = new URLSearchParams(window.location.search);
      const v = q.get("solar");
      if (v === "images" || v === "catalogs" || v === "context" || v === "now" || v === "magneto" || v === "xray" || v === "pole") return v;
      const raw = localStorage.getItem("ww_solar_view");
      if (raw === "images" || raw === "catalogs" || raw === "context" || raw === "now" || raw === "magneto" || raw === "xray" || raw === "pole") return raw;
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
    if (t.anchor === "field-coupling") selectSolarView("context");
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

  return (
    <div className="ww-solar-shell mx-auto w-full max-w-[90rem] space-y-3">
      <header>
        <CollapsibleTabs
          label="Solar"
          storageKey="ww_solar_tabs_open"
          value={solarView}
          onChange={(id) => selectSolarView(id as SolarView)}
          tabs={SOLAR_VIEWS.map((v) => ({ id: v.id, label: v.label, hint: v.hint }))}
        />
      </header>

      {solarView === "now" && (
        <div className="ww-solar-now">
          <p className="ww-solar-now__intro text-[0.95rem] leading-snug text-fg">
            <span className="font-semibold">{impact.title}.</span>{" "}
            <span className="text-muted">{impact.summary}</span>
          </p>

          <div className="ww-solar-now__chain">
          <NowBoard
            kpVal={kpVal}
            kpTime={latestKp?.time_tag ?? null}
            xClass={xClass}
            highKp={highKp}
            highX={highX}
            wind={solarWind}
            southBz={southBz}
            scales={scales}
            flux={flux10cm?.flux ?? null}
            onOpenXray={() => selectSolarView("xray")}
          />
          </div>

          <div className="ww-solar-now__flare space-y-2">
              <FlareOutlookDesk />
              <FarSideWatchDesk />
              <FlareAtlasDesk compact onOpenXray={() => selectSolarView("xray")} />
              {!closer && (
                <button
                  type="button"
                  onClick={() => setCloser(true)}
                  className="w-full rounded-lg border border-border bg-panel/70 px-2.5 py-1 text-left text-[0.68rem] font-semibold text-primary"
                >
                  Closer look
                  <span className="ml-2 font-normal text-dim">chart · pictures · outlook</span>
                </button>
              )}
            </div>
            <div className="ww-solar-now__spots">
            <ActiveRegionDesk
              regions={activeRegions}
              observed={activeRegions[0]?.observed ?? null}
            />
            <RegionContinuityDesk />
            </div>
            {closer && (
              <div className="ww-solar-now__closer space-y-2">
                <button
                  type="button"
                  onClick={() => setCloser(false)}
                  className="text-[0.68rem] font-semibold text-primary"
                >
                  Close closer look
                </button>
                <div className="ww-solar-sub rounded-xl border border-border bg-panel/80 p-3">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <AttentionSparkline showLabel height={22} className="min-w-0" />
                  {kpUpcoming.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[0.72rem] text-muted">
                      <span className="font-semibold uppercase tracking-wide text-dim">Kp next</span>
                      {kpUpcoming.slice(0, 6).map((p) => {
                        const k = p.kp;
                        const tone = k >= 5 ? "text-danger" : k >= 4 ? "text-warn" : "text-fg";
                        const lab = p.time_tag.slice(5, 13).replace("T", " ");
                        return (
                          <span key={p.time_tag} className={`font-mono text-sm font-semibold tabular-nums ${tone}`} title={p.time_tag}>
                            {lab}·{k.toFixed(1)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p id="ses-solar-protons" className="scroll-mt-20 text-[0.7rem] text-muted">
                  Protons{" "}
                  <span className={assessment.protons.sLike ? "font-mono text-warn" : "font-mono text-fg"}>
                    ≥10 {assessment.protons.p10 != null ? assessment.protons.p10.toFixed(2) : "—"}
                  </span>
                  <span className="text-dim"> · </span>
                  <span className="font-mono text-fg">
                    ≥50 {assessment.protons.p50 != null ? assessment.protons.p50.toFixed(3) : "—"}
                  </span>
                  <span className="text-dim"> · </span>
                  <span className="font-mono text-fg">
                    ≥100 {assessment.protons.p100 != null ? assessment.protons.p100.toFixed(3) : "—"}
                  </span>
                  <span className="text-dim"> pfu</span>
                  {peak && (
                    <>
                      <span className="text-dim"> · </span>
                      24 h peak{" "}
                      <strong className={peak.class.startsWith("M") || peak.class.startsWith("X") ? "text-danger" : "text-gold"}>
                        {peak.class}
                      </strong>
                    </>
                  )}
                </p>
                <GoesXrayDesk compact onOpenFull={() => selectSolarView("xray")} />
              </div>
              <div className="min-w-0 space-y-3">
                {showImages && (
                  <GoesLiveFeeds compact onOpenImages={() => selectSolarView("images")} />
                )}
                {(highlights.length > 0 || forecast?.issued) && (
                  <section className="rounded-xl border border-border bg-panel p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-[0.7rem] font-medium uppercase tracking-wider text-primary">
                        Next 3 days
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
                  </section>
                )}
                <SwpcStormWarnings />
                <SolarCycleStrip />
                <EclipseWatch />
              </div>
            </div>
              </div>
            )}
        </div>
      )}

      {solarView === "xray" && (
        <div className="space-y-3">
          <FlareAtlasDesk />
          <GoesXrayDesk />
        </div>
      )}

      {solarView === "images" && showImages && (
        <div className="space-y-3">
          <GoesLiveFeeds />
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

      {solarView === "pole" && <EcdoTestDesk />}

      {solarView === "context" && (
        <div className="space-y-3">
          <FieldCouplingDesk />
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

      <footer className="border-t border-border/60 pb-2 pt-2 text-[0.62rem] leading-relaxed text-dim sm:hidden">
        Free feeds · observation desk · not an official forecast product.
      </footer>
    </div>
  );
}

function utcStamp(raw: string | null | undefined): string {
  if (!raw) return "—";
  const iso = /Z$|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw.replace(" ", "T")}Z`;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return raw.slice(0, 16).replace("T", " ");
  const ageMin = Math.max(0, Math.round((Date.now() - t) / 60_000));
  const clock = new Date(t).toISOString().slice(11, 16);
  return ageMin < 180 ? `${clock} UTC · ${ageMin} min` : `${clock} UTC`;
}

function fmtTemp(k: number | null | undefined): string {
  if (k == null || !Number.isFinite(k)) return "—";
  if (k >= 100_000) return `${(k / 1_000).toFixed(0)}k`;
  return Math.round(k).toLocaleString();
}

function NowBoard({
  kpVal,
  kpTime,
  xClass,
  highKp,
  highX,
  wind,
  southBz,
  scales,
  flux,
  onOpenXray,
}: {
  kpVal: number | null;
  kpTime: string | null;
  xClass: string;
  highKp: boolean;
  highX: boolean;
  wind: SolarWind | null;
  southBz: boolean;
  scales: NoaaScales | null;
  flux: number | null;
  onOpenXray: () => void;
}) {
  const [windOpen, setWindOpen] = useState(false);
  const kpTone =
    kpVal != null && kpVal >= 7
      ? "text-danger"
      : kpVal != null && kpVal >= 5
        ? "text-warn"
        : kpVal != null && kpVal >= 4
          ? "text-gold"
          : "text-fg";
  const plasma = utcStamp(wind?.plasmaTime ?? wind?.time);
  const mag = utcStamp(wind?.magTime);
  const sameClock = !wind?.magTime || wind.magTime.slice(0, 16) === (wind.plasmaTime ?? "").slice(0, 16);
  const openWind = () => setWindOpen(true);

  return (
    <section id="ses-solar-geo" className="scroll-mt-20 space-y-2">
      <div className="overflow-hidden rounded-xl border border-border bg-panel">
        <div className="ww-chain divide-x divide-y divide-border/80">
          <ChainCell
            label="X-ray"
            value={xClass}
            hint="flare on the Sun"
            tone={highX ? "text-danger" : "text-fg"}
            hot={highX}
            onClick={onOpenXray}
          />
          <ChainLink text="8 min" />
          <ChainCell
            label="Wind"
            value={wind?.speed != null ? String(Math.round(wind.speed)) : "—"}
            hint="km/s, already here"
            onClick={openWind}
          />
          <ChainCell
            label="Bz"
            value={wind?.bz != null ? wind.bz.toFixed(1) : "—"}
            hint={southBz ? "south, opens Earth" : "north or quiet"}
            tone={southBz ? "text-warn" : "text-fg"}
            hot={southBz}
            onClick={openWind}
          />
          <ChainLink text="lifts" />
          <ChainCell
            label="Kp"
            value={kpVal != null ? kpVal.toFixed(1) : "—"}
            hint={
              kpVal == null
                ? "at Earth"
                : `${kpVal >= 5 ? "storm" : kpVal >= 4 ? "active" : "quiet"} · ${utcStamp(kpTime)}`
            }
            tone={kpTone}
            hot={highKp}
            onClick={openWind}
          />
        </div>
        <p className="border-t border-border/70 px-3 py-1.5 text-[0.65rem] leading-snug text-dim">
          X-ray is the flare, seen in about 8 minutes. Wind and Bz are the same stream, already at Earth. A southward Bz is what lifts Kp.
        </p>
      </div>

      {scales && (
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["R", scales.R, "Radio"],
              ["S", scales.S, "Radiation"],
              ["G", scales.G, "Geomagnetic"],
            ] as const
          ).map(([letter, value, name]) => {
            const n = parseInt(value, 10) || 0;
            const tone =
              n >= 3 ? "border-danger/40 text-danger" : n >= 1 ? "border-warn/40 text-warn" : "border-border text-fg";
            return (
              <span
                key={letter}
                title={name}
                className={`inline-flex items-baseline gap-1 rounded-md border bg-panel px-2 py-1 font-mono text-sm font-semibold ${tone}`}
              >
                {letter}
                {value}
                <span className="font-sans text-[0.58rem] font-medium uppercase tracking-wide text-dim">{name}</span>
              </span>
            );
          })}
        </div>
      )}

      <details
        className="rounded-xl border border-border bg-panel px-3 py-2"
        open={windOpen}
        onToggle={(e) => setWindOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          Wind detail
          <span className="ml-2 font-normal normal-case tracking-normal text-dim">
            {wind?.source ? wind.source : "solar wind"}
            {flux != null ? ` · radio flux ${Math.round(flux)}` : ""}
          </span>
        </summary>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Mini label="Density" value={wind?.density != null ? wind.density.toFixed(1) : "—"} unit="/cm³" />
          <Mini label="Temp" value={fmtTemp(wind?.temperature)} unit="K" />
          <Mini label="Bt" value={wind?.bt != null ? wind.bt.toFixed(1) : "—"} unit="nT" />
          <Mini label="By" value={wind?.by != null ? wind.by.toFixed(1) : "—"} unit="nT" />
          <Mini label="Bx" value={wind?.bx != null ? wind.bx.toFixed(1) : "—"} unit="nT" />
          <Mini label="φ" value={wind?.phi != null ? wind.phi.toFixed(0) : "—"} unit="°" />
        </div>
        <p className="mt-2 text-[0.62rem] text-dim">
          Plasma {plasma}
          {sameClock ? "" : ` · B ${mag}`}
          {" · observation, not a forecast"}
        </p>
      </details>
    </section>
  );
}

function ChainLink({ text }: { text: string }) {
  return (
    <div className="hidden items-center px-1 text-[0.58rem] uppercase tracking-wide text-dim lg:flex" aria-hidden>
      {text}
      <span className="ml-1 text-primary">→</span>
    </div>
  );
}

function ChainCell({
  label,
  value,
  hint,
  tone = "text-fg",
  hot = false,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
  hot?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 px-3 py-2.5 text-left hover:bg-elevated/60 ${hot ? "bg-warn/5" : ""}`}
    >
      <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-dim">{label}</div>
      <div className={`font-mono text-3xl font-bold leading-none tabular-nums ${tone}`}>{value}</div>
      <div className="mt-1 truncate text-[0.62rem] text-dim">{hint}</div>
    </button>
  );
}

function Mini({
  label,
  value,
  unit,
  alert,
}: {
  label: string;
  value: string;
  unit: string;
  alert?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[0.6rem] uppercase tracking-wide text-dim">{label}</div>
      <div className={`font-mono text-lg font-semibold tabular-nums leading-tight ${alert ? "text-warn" : "text-fg"}`}>
        {value}
      </div>
      <div className="text-[0.58rem] text-dim">{unit}</div>
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
