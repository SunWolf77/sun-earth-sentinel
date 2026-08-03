/**
 * Edge dock — compact on mobile, clear labels for tilt & help.
 */

import { useEffect, useState } from "react";
import {
  Expand,
  Globe2,
  HelpCircle,
  Home,
  Map as MapIcon,
  Minimize2,
  Settings2,
  Undo2,
  X,
  History,
} from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { timeWindowChip, timeWindowTitle, TIME_WINDOWS } from "@/lib/map/timeWindowLabel";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { HelpGuide } from "@/components/ops/HelpGuide";

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
  const setReplayActive = useObservatory((s) => s.setReplayActive);
  const replayActive = useObservatory((s) => s.replayActive);
  const mobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!mobile) setExpanded(true);
    else setExpanded(false);
  }, [mobile, mapView, mapImmersive]);

  const home = () => {
    exitToHomeView();
    onHomeView?.();
  };

  const showTilt = mapView === "3d" && (onTiltUp || onTiltDown || onTiltPreset);

  // Mobile collapsed — single bar, no mystery tilt glyphs
  if (mobile && !expanded) {
    return (
      <div
        className={`ww-map-dock ww-map-dock--compact pointer-events-auto flex flex-col items-end gap-1 ${className}`}
        role="toolbar"
        aria-label="Map controls"
      >
        <div className="flex max-w-[min(100vw-0.75rem,22rem)] flex-wrap items-center justify-end gap-1 rounded-xl border border-border bg-surface/95 p-1 shadow-lg backdrop-blur">
          <div className="ww-map-view-toggle flex overflow-hidden rounded-lg border border-border/80">
            <button
              type="button"
              className={`ww-map-view-toggle__btn ww-map-view-toggle__btn--sm ${mapView === "2d" ? "ww-map-view-toggle__btn--on" : ""}`}
              onClick={() => setMapView("2d")}
              title="2D map"
              aria-pressed={mapView === "2d"}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span className="text-[0.58rem] font-bold">2D</span>
            </button>
            <button
              type="button"
              className={`ww-map-view-toggle__btn ww-map-view-toggle__btn--sm ${mapView === "3d" ? "ww-map-view-toggle__btn--on" : ""}`}
              onClick={() => setMapView("3d")}
              title="3D globe"
              aria-pressed={mapView === "3d"}
            >
              <Globe2 className="h-3.5 w-3.5" />
              <span className="text-[0.58rem] font-bold">3D</span>
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
          <button
            type="button"
            className={`ww-map-dock__icon-btn ww-map-dock__icon-btn--sm ${mapImmersive ? "ww-map-dock__icon-btn--on" : ""}`}
            title={mapImmersive ? "Exit fullscreen" : "Fullscreen"}
            onClick={() => setMapImmersive(!mapImmersive)}
          >
            {mapImmersive ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            className="ww-map-dock__icon-btn ww-map-dock__icon-btn--sm"
            title="More controls (replay, home, help)"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} compact className="hidden" />
      </div>
    );
  }

  return (
    <div
      className={`ww-map-dock pointer-events-auto flex flex-col gap-1.5 ${mobile ? "ww-map-dock--expanded max-h-[min(50dvh,20rem)] overflow-y-auto overscroll-contain" : ""} ${className}`}
      role="toolbar"
      aria-label="Map controls"
    >
      {mobile && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-dim">
            Controls
          </span>
          <button
            type="button"
            className="ww-map-dock__icon-btn ww-map-dock__icon-btn--sm"
            onClick={() => setExpanded(false)}
            title="Collapse"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="ww-map-view-toggle flex w-full overflow-hidden rounded-lg border border-border bg-surface/95 shadow-lg backdrop-blur">
        <button
          type="button"
          className={`ww-map-view-toggle__btn ${mapView === "2d" ? "ww-map-view-toggle__btn--on" : ""}`}
          onClick={() => setMapView("2d")}
          aria-pressed={mapView === "2d"}
        >
          <MapIcon className="h-3.5 w-3.5 shrink-0" />
          <span>2D Map</span>
        </button>
        <button
          type="button"
          className={`ww-map-view-toggle__btn ${mapView === "3d" ? "ww-map-view-toggle__btn--on" : ""}`}
          onClick={() => setMapView("3d")}
          aria-pressed={mapView === "3d"}
        >
          <Globe2 className="h-3.5 w-3.5 shrink-0" />
          <span>3D Globe</span>
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
          className="rounded-lg border border-border bg-surface/95 p-1.5 shadow-md backdrop-blur"
          role="group"
          aria-label="Camera tilt — viewing angle"
        >
          <div className="mb-1 px-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-dim">
            View angle (camera tilt)
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              className="ww-map-dock__icon-btn justify-center"
              title="Tilt camera toward north pole view"
              onClick={() => onTiltUp?.()}
            >
              <span className="text-[0.65rem] font-bold">North ↑</span>
            </button>
            <button
              type="button"
              className="ww-map-dock__icon-btn justify-center"
              title="Tilt camera toward equator edge-on"
              onClick={() => onTiltDown?.()}
            >
              <span className="text-[0.65rem] font-bold">South ↓</span>
            </button>
            <button
              type="button"
              className="ww-map-dock__icon-btn justify-center"
              title="Face the equator"
              onClick={() => onTiltPreset?.("equator")}
            >
              <span className="text-[0.62rem] font-semibold">Equator</span>
            </button>
            <button
              type="button"
              className="ww-map-dock__icon-btn justify-center"
              title="Default oblique framing"
              onClick={() => onTiltPreset?.("oblique")}
            >
              <span className="text-[0.62rem] font-semibold">Oblique</span>
            </button>
          </div>
          <p className="mt-1 px-0.5 text-[0.55rem] leading-snug text-dim">
            Moves your camera, not the planet’s axis. Drag still rotates freely.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {mobile && !replayActive && (
          <button
            type="button"
            className="ww-map-dock__icon-btn"
            title="Replay events"
            onClick={() => setReplayActive(true)}
          >
            <History className="h-3.5 w-3.5" />
            <span className="ww-map-dock__label">Replay</span>
          </button>
        )}
        <button type="button" className="ww-map-dock__icon-btn" title="World home view" onClick={home}>
          <Home className="h-3.5 w-3.5" />
          <span className="ww-map-dock__label">Home</span>
        </button>
        {mapView === "3d" && (
          <button
            type="button"
            className="ww-map-dock__icon-btn"
            title="Undo last camera focus"
            disabled={!canPriorView}
            onClick={() => onPriorView?.()}
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span className="ww-map-dock__label">Back</span>
          </button>
        )}
        <button
          type="button"
          className={`ww-map-dock__icon-btn ${mapImmersive ? "ww-map-dock__icon-btn--on" : ""}`}
          title={mapImmersive ? "Exit fullscreen" : "Fullscreen map"}
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
                ? "Auto-spin ON (west→east) — pauses on focus, then resumes"
                : "Start auto-spin"
            }
            onClick={() => setGlobeAutoSpin(!globeAutoSpin)}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span className="ww-map-dock__label">{globeAutoSpin ? "Spin" : "Still"}</span>
          </button>
        )}
        <button
          type="button"
          className="ww-map-dock__icon-btn"
          title="How to use"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="ww-map-dock__label">Help</span>
        </button>
      </div>

      <div className="px-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-dim">
        Catalog · {timeWindowChip(timeWindow)}
      </div>

      <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} compact className="hidden" />
    </div>
  );
}
