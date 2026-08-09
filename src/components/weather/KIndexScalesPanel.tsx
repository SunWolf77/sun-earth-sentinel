import { useMemo, useState } from "react";
import { Activity, Gauge } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { KP_BANDS, K_INDEX_NOTES, bandForKp, gFromKp } from "@/lib/solar/kIndexScales";

/**
 * Geomagnetic K / Kp scale explorer with live Kp highlight.
 */
export function KIndexScalesPanel({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const kpSeries = useObservatory((s) => s.kp);
  const scales = useObservatory((s) => s.scales);
  const latestKp = kpSeries.length ? Number(kpSeries[kpSeries.length - 1]?.Kp) : null;
  const liveBand = bandForKp(latestKp);
  const liveG = gFromKp(latestKp);
  const [open, setOpen] = useState(defaultOpen);

  const gNow = scales?.G != null ? Number(scales.G) : null;

  const highlight = useMemo(() => {
    if (latestKp == null || !Number.isFinite(latestKp)) return null;
    return Math.max(0, Math.min(9, Math.round(latestKp)));
  }, [latestKp]);

  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Gauge className="h-4 w-4 text-primary" />
            Geomagnetic K / Kp scales
          </h3>
          <p className="mt-0.5 text-[0.68rem] text-dim">
            Planetary Kp ladder · NOAA G mapping · live highlight
          </p>
        </div>
        <button
          type="button"
          className="ww-btn min-h-8 text-[0.62rem]"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.72rem]">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg/50 px-2 py-0.5 font-mono text-fg">
          <Activity className="h-3 w-3 text-primary" />
          Kp now {latestKp != null && Number.isFinite(latestKp) ? latestKp.toFixed(1) : "—"}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 text-muted">
          {liveBand.label}
        </span>
        {liveG != null && (
          <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-warn">
            ≈G{liveG}
          </span>
        )}
        {gNow != null && Number.isFinite(gNow) && (
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-dim">
            NOAA G{gNow}
          </span>
        )}
      </div>

      {open && (
        <>
          <div className="mt-3 grid grid-cols-5 gap-1 sm:grid-cols-10">
            {KP_BANDS.map((b) => {
              const on = highlight === b.kp;
              const storm = b.gScale != null;
              return (
                <div
                  key={b.kp}
                  className={`rounded-md border px-1 py-1.5 text-center ${
                    on
                      ? "border-primary bg-primary/20 text-primary"
                      : storm
                        ? "border-warn/30 bg-warn/5 text-muted"
                        : "border-border bg-bg/40 text-dim"
                  }`}
                  title={b.plain}
                >
                  <div className="font-mono text-sm font-bold">{b.kp}</div>
                  <div className="text-[0.55rem] leading-tight">
                    {b.gScale != null ? `G${b.gScale}` : "—"}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-lg border border-border/80 bg-bg/40 px-3 py-2">
            <p className="text-[0.78rem] font-semibold text-fg">
              Kp {highlight ?? "—"} · {liveBand.label}
            </p>
            <p className="mt-1 text-[0.72rem] text-muted">{liveBand.plain}</p>
            <p className="mt-1 text-[0.68rem] text-dim">
              <strong className="text-fg">Aurora · </strong>
              {liveBand.aurora}
            </p>
            <p className="mt-0.5 text-[0.68rem] text-dim">
              <strong className="text-fg">Tech · </strong>
              {liveBand.tech}
            </p>
          </div>

          <ul className="mt-2 list-disc space-y-1 pl-4 text-[0.65rem] text-dim">
            {K_INDEX_NOTES.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
