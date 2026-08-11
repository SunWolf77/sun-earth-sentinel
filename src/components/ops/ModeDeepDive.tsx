/**
 * Mode deep dive — what Standard vs Full actually changes, plus map view
 * as a separate axis. No marketing; density math only.
 */

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, Gauge, Globe2, Map as MapIcon, X } from "lucide-react";
import {
  MODE_ORDER,
  MODES,
  modeComparisonRows,
  runtimeLoadProfile,
  type PerformanceMode,
} from "@/lib/feeds/modes";
import { useObservatory } from "@/store/observatory";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

type Props = {
  className?: string;
  /** Start expanded (e.g. from honesty chip) */
  defaultOpen?: boolean;
};

export function ModeDeepDive({ className = "", defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [showTable, setShowTable] = useState(false);
  const panelId = useId();
  const mode = useObservatory((s) => s.mode);
  const mapView = useObservatory((s) => s.mapView);
  const minMag = useObservatory((s) => s.minMag);
  const setMode = useObservatory((s) => s.setMode);
  const setMapView = useObservatory((s) => s.setMapView);
  const setMinMag = useObservatory((s) => s.setMinMag);
  const mobile = useIsMobile();
  const profile = runtimeLoadProfile({ mode, mapView, mobile });
  const cfg = MODES[mode];
  const rows = modeComparisonRows();
  const magCustom = Math.abs(minMag - cfg.minMag) > 0.05;

  const applyMode = (m: PerformanceMode) => {
    const prevDefault = MODES[mode].minMag;
    setMode(m);
    // If user was on mode default floor (or previous default), follow new mode
    if (Math.abs(minMag - prevDefault) < 0.05) {
      setMinMag(MODES[m].minMag);
    }
  };

  return (
    <div
      className={`rounded-md border border-border/80 bg-panel/90 text-[0.65rem] text-muted ${className}`}
    >
      <button
        type="button"
        className="flex min-h-10 w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-elevated/50"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Gauge className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-fg">Mode · {cfg.label}</span>
          <span className="text-dim">
            {" "}
            · {mapView === "3d" ? "3D" : "2D"} · load {profile.pressureLabel}
          </span>
          {magCustom && (
            <span className="text-warn"> · mag floor M{minMag.toFixed(1)} (custom)</span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
      </button>

      {open && (
        <div id={panelId} className="space-y-2 border-t border-border/60 px-2 py-2">
          <div
            className={`rounded border px-2 py-1.5 ${
              profile.pressureLabel === "high"
                ? "border-warn/40 bg-warn/10 text-warn"
                : profile.pressureLabel === "moderate"
                  ? "border-primary/30 bg-primary/8 text-primary"
                  : "border-border bg-bg/50 text-muted"
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-semibold uppercase tracking-wide">
                Device load · {profile.pressureLabel}
              </span>
              <span className="tabular-nums text-dim">{profile.pressure}/100</span>
            </div>
            <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-bg/80">
              <div
                className={`h-full rounded-full transition-[width] ${
                  profile.pressureLabel === "high"
                    ? "bg-warn"
                    : profile.pressureLabel === "moderate"
                      ? "bg-primary"
                      : "bg-ok"
                }`}
                style={{ width: `${profile.pressure}%` }}
              />
            </div>
            <ul className="list-inside list-disc space-y-0.5 text-[0.62rem] leading-snug text-fg/90">
              {profile.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-dim">
                Performance (catalog)
              </p>
              <div className="flex gap-1" role="group" aria-label="Performance mode">
                {MODE_ORDER.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => applyMode(m)}
                    className={`min-h-9 flex-1 rounded-md border px-2 py-1 font-semibold capitalize sm:min-h-8 ${
                      mode === m
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-bg/60 text-fg hover:bg-elevated"
                    }`}
                    title={MODES[m].description}
                  >
                    {MODES[m].label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[0.6rem] leading-snug text-dim">{cfg.deviceNote}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-dim">
                Map view (render)
              </p>
              <div className="flex gap-1" role="group" aria-label="Map view">
                <button
                  type="button"
                  onClick={() => setMapView("2d")}
                  className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 font-semibold sm:min-h-8 ${
                    mapView === "2d"
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-bg/60 text-fg hover:bg-elevated"
                  }`}
                >
                  <MapIcon className="h-3 w-3" aria-hidden />
                  2D
                </button>
                <button
                  type="button"
                  onClick={() => setMapView("3d")}
                  className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 font-semibold sm:min-h-8 ${
                    mapView === "3d"
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-bg/60 text-fg hover:bg-elevated"
                  }`}
                >
                  <Globe2 className="h-3 w-3" aria-hidden />
                  3D
                </button>
              </div>
              <p className="mt-1 text-[0.6rem] leading-snug text-dim">
                Orthogonal to Full/Standard. 3D uses a mobile-safe WebGL profile on phones; still
                heavier than 2D.
              </p>
            </div>
          </div>

          {!showTable ? (
            <button
              type="button"
              className="text-[0.6rem] font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => setShowTable(true)}
            >
              Show Standard vs Full table
            </button>
          ) : (
            <div className="overflow-x-auto">
              <button
                type="button"
                className="mb-1 inline-flex items-center gap-0.5 text-[0.58rem] text-dim hover:text-fg"
                onClick={() => setShowTable(false)}
              >
                <X className="h-3 w-3" aria-hidden />
                Hide table
              </button>
              <table className="w-full min-w-[18rem] border-collapse text-left text-[0.6rem]">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="py-1 pr-2 font-semibold">Aspect</th>
                    <th className="py-1 pr-2 font-semibold">Standard</th>
                    <th className="py-1 pr-2 font-semibold">Full</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.aspect} className="border-b border-border/50 align-top">
                      <td className="py-1 pr-2 text-fg">
                        {r.aspect}
                        <div className="text-[0.55rem] font-normal text-dim">{r.notes}</div>
                      </td>
                      <td
                        className={`py-1 pr-2 tabular-nums ${
                          mode === "standard" ? "font-semibold text-primary" : ""
                        }`}
                      >
                        {r.standard}
                      </td>
                      <td
                        className={`py-1 pr-2 tabular-nums ${
                          mode === "full" ? "font-semibold text-primary" : ""
                        }`}
                      >
                        {r.full}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-[0.58rem] text-dim">
                Mag floor only auto-follows mode if you left it on the mode default. Hand-set min
                mag stays until you change it.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
