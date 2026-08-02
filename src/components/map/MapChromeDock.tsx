/**
 * Edge dock for map/globe chrome — out of the way of the Earth.
 * Mobile: compact strip that expands; desktop: full controls.
 */

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Expand,
  Globe2,
  Home,
  Map as MapIcon,
  Minimize2,
  Settings2,
  Undo2,
  X,
} from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { timeWindowChip, timeWindowTitle, TIME_WINDOWS } from "@/lib/map/timeWindowLabel";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

type TiltPreset = "equator" | "north" | "oblique";

type Props = {
  onPriorView?: (() => void) | null;
  canPriorView?: boolean;
  onHomeView?: (() => void) | null;
  onTiltUp?: (() => void) | null;
  onTiltDown?: (() => void) | null;
  onTiltPreset?: ((kind: TiltPreset) => void) | null;
  className?: string;
};

export function MapChromeDock({
  onPriorView,
  canPriorView = false,
  onHomeView,
  onTiltUp,
  onTiltDown,
  onTiltPreset,
  className = "",
}: Props) {
  const mapView = useObservatory((s) => s.mapView);
  const setMapView = useObservatory((s) => s.setMapView);
  const mapImmersive = useObservatory((s) => s.mapImmersive);
  const setMapImmersive = useObservatory((s) => s.setMapImmersive);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const setTimeWindow = useObservatory((s) => s.setTimeWindow);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const globeAutoSpin = useObservatory((s) => s.globeAutoSpin);
  const setGlobeAutoSpin = useObservatory((s) => s.setGlobeAutoSpin);
  const mobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  // Collapse when leaving 3d or exiting immersive
  useEffect(() => {
    if (!mobile) setExpanded(true);
    else setExpanded(false);
  }, [mobile, mapView, mapImmersive]);

  const home = () => {
    exitToHomeView();
    onHomeView?.();
  };

  const showTilt = mapView === "3d" && (onTiltUp || onTiltDown || onTiltPreset);

  // Mobile collapsed: one tight row — 2D/3D · window · expand · full
  if (mobile && !expanded) {
    return (
      <div
        className={`ww-map-dock ww-map-dock--compact pointer-events-auto flex flex-col items-end gap-1 ${className}`}
        role="toolbar"
        aria-label="Map controls"
      >
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface/95 p-1 shadow-lg backdrop-blur">
          <div className="ww-map-view-toggle flex overflow-hidden rounded-lg border border-border/80">
            <button
              type="button"
              className={`ww-map-view-toggle__btn ww-map-view-toggle__btn--sm ${mapView === "2d" ? "ww-map-view-toggle__btn--on" : ""}`}
              onClick={() => setMapView("2d")}
              title="2D map"
              aria-pressed={mapView === "2d"}
            >
              <MapIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={`ww-map-view-toggle__btn ww-map-view-toggle__btn--sm ${mapView === "3d" ? "ww-map-view-toggle__btn--on" : ""}`}
              onClick={() => setMapView("3d")}
              title="3D globe"
              aria-pressed={mapView === "3d"}
            >
              <Globe2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-border/80">
            {TIME_WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`ww-map-dock__chip ww-map-dock__chip--sm ${timeWindow === w.id ? "ww-map-dock__chip--on" : ""}`}
                onClick={() => setTimeWindow(w.id)}
                title={w.title}
              >
                {w.label}
              </button>
            ))}
          </div>
          {mapView === "3d" && (
            <button
              type="button"
              className={`ww-map-dock__icon-btn ww-map-dock__icon-btn--sm ${globeAutoSpin ? "ww-map-dock__icon-btn--on" : ""}`}
              title={globeAutoSpin ? "Spin ON" : "Spin OFF"}
              onClick={() => setGlobeAutoSpin(!globeAutoSpin)}
            >
              <Globe2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            className={`ww-map-dock__icon-btn ww-map-dock__icon-btn--sm ${mapImmersive ? "ww-map-dock__icon-btn--on" : ""}`}
            title={mapImmersive ? "Exit full" : "Fullscreen"}
            onClick={() => setMapImmersive(!mapImmersive)}
          >
            {mapImmersive ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            className="ww-map-dock__icon-btn ww-map-dock__icon-btn--sm"
            title="More controls"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ww-map-dock pointer-events-auto flex flex-col gap-1.5 ${mobile ? "ww-map-dock--expanded max-h-[min(55dvh,22rem)] overflow-y-auto overscroll-contain" : ""} ${className}`}
      role="toolbar"
      aria-label="Map controls"
    >
      {mobile && (
        <div className="flex justify-end">
          <button
            type="button"
            className="ww-map-dock__icon-btn ww-map-dock__icon-btn--sm"
            onClick={() => setExpanded(false)}
            title="Collapse controls"
          >
            <X className="h-3.5 w-3.5" />
            <span className="ww-map-dock__label">Close</span>
          </button>
        </div>
      )}

      <div className="ww-map-view-toggle flex w-full overflow-hidden rounded-lg border border-border bg-surface/95 shadow-lg backdrop-blur">
        <button
          type="button"
          className={`ww-map-view-toggle__btn ${mapView === "2d" ? "ww-map-view-toggle__btn--on" : ""}`}
          onClick={() => setMapView("2d")}
          title="2D map"
          aria-pressed={mapView === "2d"}
        >
          <MapIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="ww-map-dock__label">2D</span>
        </button>
        <button
          type="button"
          className={`ww-map-view-toggle__btn ${mapView === "3d" ? "ww-map-view-toggle__btn--on" : ""}`}
          onClick={() => setMapView("3d")}
          title="3D globe"
          aria-pressed={mapView === "3d"}
        >
          <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="ww-map-dock__label">3D</span>
        </button>
      </div>

      <div
        className="flex overflow-hidden rounded-lg border border-border bg-surface/95 shadow-md backdrop-blur"
        title={timeWindowTitle(timeWindow)}
      >
        {TIME_WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            className={`ww-map-dock__chip ${timeWindow === w.id ? "ww-map-dock__chip--on" : ""}`}
            onClick={() => setTimeWindow(w.id)}
            title={w.title}
          >
            {w.label}
          </button>
        ))}
      </div>

      {showTilt && (
        <div
          className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface/95 p-1 shadow-md backdrop-blur"
          role="group"
          aria-label="Globe tilt"
        >
          <button type="button" className="ww-map-dock__icon-btn" title="Tilt up · ↑" onClick={() => onTiltUp?.()}>
            <ChevronUp className="h-3.5 w-3.5" />
            <span className="ww-map-dock__label">Tilt</span>
          </button>
          <button type="button" className="ww-map-dock__icon-btn" title="Tilt down · ↓" onClick={() => onTiltDown?.()}>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="ww-map-dock__icon-btn" title="Equator · E" onClick={() => onTiltPreset?.("equator")}>
            <span className="ww-map-dock__label">Eq</span>
          </button>
          <button type="button" className="ww-map-dock__icon-btn" title="North · N" onClick={() => onTiltPreset?.("north")}>
            <span className="ww-map-dock__label">N</span>
          </button>
          <button type="button" className="ww-map-dock__icon-btn" title="Oblique · O" onClick={() => onTiltPreset?.("oblique")}>
            <span className="ww-map-dock__label">O</span>
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <button type="button" className="ww-map-dock__icon-btn" title="Home view" onClick={home}>
          <Home className="h-3.5 w-3.5" />
          <span className="ww-map-dock__label">Home</span>
        </button>
        {mapView === "3d" && (
          <button
            type="button"
            className="ww-map-dock__icon-btn"
            title="Prior camera"
            disabled={!canPriorView}
            onClick={() => onPriorView?.()}
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span className="ww-map-dock__label">Prior</span>
          </button>
        )}
        <button
          type="button"
          className={`ww-map-dock__icon-btn ${mapImmersive ? "ww-map-dock__icon-btn--on" : ""}`}
          title={mapImmersive ? "Exit fullscreen" : "Fullscreen"}
          onClick={() => setMapImmersive(!mapImmersive)}
        >
          {mapImmersive ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
          <span className="ww-map-dock__label">{mapImmersive ? "Exit" : "Full"}</span>
        </button>
        {mapView === "3d" && (
          <button
            type="button"
            className={`ww-map-dock__icon-btn ${globeAutoSpin ? "ww-map-dock__icon-btn--on" : ""}`}
            title={
              globeAutoSpin
                ? "Spin ON — pauses after focus/drag, then resumes"
                : "Start auto-spin west→east"
            }
            onClick={() => setGlobeAutoSpin(!globeAutoSpin)}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span className="ww-map-dock__label">{globeAutoSpin ? "Spin" : "Still"}</span>
          </button>
        )}
      </div>

      <div className="px-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-dim">
        EQ · {timeWindowChip(timeWindow)}
        {mapView === "3d" ? " · ↑↓ tilt" : ""}
      </div>
    </div>
  );
}
