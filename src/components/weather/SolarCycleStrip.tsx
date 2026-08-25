import { useEffect, useMemo, useState } from "react";
import { fetchSolarCycleFn } from "@/lib/feeds/solarProxy";
import {
  PHASE_LABEL,
  type SolarCycleBundle,
} from "@/lib/feeds/solarCycle";
import { Activity } from "lucide-react";

type Props = {
  compact?: boolean;
};

let cache: { at: number; bundle: SolarCycleBundle } | null = null;
const TTL = 6 * 60 * 60_000; // cycle data is monthly — long TTL

function Sparkline({ series }: { series: SolarCycleBundle["series"] }) {
  const pts = useMemo(() => {
    const vals = series
      .map((s) => s.ssn)
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (vals.length < 4) return null;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(max - min, 1);
    const w = 120;
    const h = 28;
    const step = w / Math.max(vals.length - 1, 1);
    const path = vals
      .map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / span) * (h - 4) - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    const peakIdx = vals.indexOf(max);
    const peakX = peakIdx * step;
    const peakY = h - ((max - min) / span) * (h - 4) - 2;
    return { path, w, h, peakX, peakY };
  }, [series]);

  if (!pts) return null;
  return (
    <svg
      width={pts.w}
      height={pts.h}
      viewBox={`0 0 ${pts.w} ${pts.h}`}
      className="shrink-0 text-gold/80"
      aria-hidden
    >
      <path d={pts.path} fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx={pts.peakX} cy={pts.peakY} r={2.2} fill="#fbbf24" />
    </svg>
  );
}

export function SolarCycleStrip({ compact = false }: Props) {
  const [bundle, setBundle] = useState<SolarCycleBundle | null>(
    cache && Date.now() - cache.at < TTL ? cache.bundle : null,
  );

  useEffect(() => {
    if (cache && Date.now() - cache.at < TTL) {
      setBundle(cache.bundle);
      return;
    }
    let live = true;
    void (async () => {
      try {
        const b = await fetchSolarCycleFn();
        if (!live) return;
        cache = { at: Date.now(), bundle: b };
        setBundle(b);
      } catch {
        /* strip is additive */
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!bundle) return null;

  const peakLabel = bundle.peak
    ? `${bundle.peak.timeTag} · SSN ${Math.round(bundle.peak.smoothedSsn)}`
    : "—";
  const pred = bundle.predictedNow;
  const obs = bundle.latestObserved;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-border/70 bg-bg/30 px-2 py-1.5 text-[0.65rem] text-muted">
        <Activity className="h-3 w-3 text-gold" />
        <span className="font-semibold text-fg">SC25</span>
        <span>{PHASE_LABEL[bundle.phase]}</span>
        <span className="text-dim">peak {peakLabel}</span>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Activity className="h-4 w-4 text-gold" />
            Solar Cycle 25
          </h3>
          <p className="mt-0.5 text-[0.62rem] text-dim">
            Progression envelope · SWPC + SILSO — not a flare forecast
          </p>
        </div>
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[0.72rem] font-semibold text-gold">
          {PHASE_LABEL[bundle.phase]}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Sparkline series={bundle.series} />
        <div className="min-w-0 flex-1 space-y-0.5 text-[0.7rem]">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span>
              Peak{" "}
              <strong className="font-mono text-fg">{peakLabel}</strong>
            </span>
            {obs?.ssn != null && (
              <span>
                Latest monthly{" "}
                <span className="font-mono text-fg">{Math.round(obs.ssn)}</span>
                <span className="text-dim"> · {obs.timeTag}</span>
              </span>
            )}
          </div>
          {pred && (
            <div className="text-muted">
              SWPC track {pred.timeTag}: SSN{" "}
              <span className="font-mono text-fg">{Math.round(pred.ssn)}</span>
              <span className="text-dim">
                {" "}
                (range {Math.round(pred.lowSsn)}–{Math.round(pred.highSsn)})
              </span>
              {pred.f107 > 0 && (
                <span>
                  {" "}
                  · F10.7 <span className="font-mono text-fg">{Math.round(pred.f107)}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-[0.6rem] leading-snug text-dim">{bundle.honesty}</p>
    </section>
  );
}
