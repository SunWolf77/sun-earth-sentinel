/**
 * Edge dock for map/globe chrome — out of the way of the Earth.
 * 2D/3D · window chip · home · prior · tilt · immersive · spin.
 */

import {
  ChevronDown,
  ChevronUp,
  Expand,
  Globe2,
  Home,
  Map as MapIcon,
  Minimize2,
  Undo2,
} from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { timeWindowChip, timeWindowTitle, TIME_WINDOWS } from "@/lib/map/timeWindowLabel";

type TiltPreset = "equator" | "north" | "oblique";

type Props = {
  /** Optional: restore previous globe camera (3D only) */
  onPriorView?: (() => void) | null;
  canPriorView?: boolean;
  /** Optional: recenter / home on globe */
  onHomeView?: (() => void) | null;
  /** Nudge camera tilt (3D) */
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

  const home = () => {
    exitToHomeView();
    onHomeView?.();
  };

  const showTilt = mapView === "3d" && (onTiltUp || onTiltDown || onTiltPreset);

  return (
    <div
      className={`ww-map-dock pointer-events-auto flex flex-col gap-1.5 ${className}`}
      role="toolbar"
      aria-label="Map controls"
    >
      {/* Projection */}
      <div className="ww-map-view-toggle flex overflow-hidden rounded-lg border border-border bg-surface/95 shadow-lg backdrop-blur">
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

      {/* Time window — same catalog on both views */}
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

      {/* 3D tilt controls */}
      {showTilt && (
        <div
          className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface/95 p-1 shadow-md backdrop-blur"
          role="group"
          aria-label="Globe tilt"
        >
          <button
            type="button"
            className="ww-map-dock__icon-btn"
            title="Tilt up (more polar) · ↑ / W"
            onClick={() => onTiltUp?.()}
          >
            <ChevronUp className="h-3.5 w-3.5" />
            <span className="ww-map-dock__label">Tilt</span>
          </button>
          <button
            type="button"
            className="ww-map-dock__icon-btn"
            title="Tilt down (more equator) · ↓ / S"
            onClick={() => onTiltDown?.()}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="ww-map-dock__icon-btn"
            title="Equator view · E"
            onClick={() => onTiltPreset?.("equator")}
          >
            <span className="ww-map-dock__label">Eq</span>
          </button>
          <button
            type="button"
            className="ww-map-dock__icon-btn"
            title="North oblique · N"
            onClick={() => onTiltPreset?.("north")}
          >
            <span className="ww-map-dock__label">N</span>
          </button>
          <button
            type="button"
            className="ww-map-dock__icon-btn"
            title="Default oblique · O"
            onClick={() => onTiltPreset?.("oblique")}
          >
            <span className="ww-map-dock__label">O</span>
          </button>
        </div>
      )}

      {/* View actions */}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="ww-map-dock__icon-btn"
          title="Home view — clear focus, world framing"
          onClick={home}
        >
          <Home className="h-3.5 w-3.5" />
          <span className="ww-map-dock__label">Home</span>
        </button>
        {mapView === "3d" && (
          <button
            type="button"
            className="ww-map-dock__icon-btn"
            title="Prior camera view"
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
          title={mapImmersive ? "Exit fullscreen map" : "Fullscreen map / globe"}
          onClick={() => setMapImmersive(!mapImmersive)}
        >
          {mapImmersive ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Expand className="h-3.5 w-3.5" />
          )}
          <span className="ww-map-dock__label">{mapImmersive ? "Exit" : "Full"}</span>
        </button>
        {mapView === "3d" && (
          <button
            type="button"
            className={`ww-map-dock__icon-btn ${globeAutoSpin ? "ww-map-dock__icon-btn--on" : ""}`}
            title={
              globeAutoSpin
                ? "Spin ON — pauses ~0.4–0.9s after focus/drag, then resumes · click to stop"
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
