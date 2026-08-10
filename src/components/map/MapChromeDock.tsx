/**
 * Edge dock — compact on mobile, clear labels for tilt & help.
 * Mobile: 3 levels — minimized FAB → compact (2D/3D + window) → full controls.
 * Auto-minimizes when an event is selected so the detail card stays readable.
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
  ChevronUp,
} from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { timeWindowChip, timeWindowTitle, TIME_WINDOWS } from "@/lib/map/timeWindowLabel";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { HelpGuide } from "@/components/ops/HelpGuide";

type TiltPreset = "equator" | "north" | "oblique";
/** Mobile chrome density */
type DockLevel = "min" | "compact" | "full";

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
  const pickedEvent = useObservatory((s) => s.pickedEvent);
  const mobile = useIsMobile();
  const [level, setLevel] = useState<DockLevel>("compact");
  const [helpOpen, setHelpOpen] = useState(false);

  // Mobile defaults: compact idle; collapse hard when reading an event
  useEffect(() => {
    if (!mobile) {
      setLevel("full");
      return;
    }
    if (pickedEvent) {
      setLevel("min");
      return;
    }
    setLevel((prev) => (prev === "full" ? "compact" : prev === "min" ? "min" : "compact"));
  }, [mobile, mapView, mapImmersive, pickedEvent?.id]);

  const home = () => {
    exitToHomeView();
    onHomeView?.();
  };

  const showTilt = mapView === "3d" && (onTiltUp || onTiltDown || onTiltPreset);
  const ViewIcon = mapView === "3d" ? Globe2 : MapIcon;

  // ── Mobile minimized: single FAB — frees the map / event card ──
  if (mobile && level === "min") {
    return (
      <div
        className={`ww-map-dock ww-map-dock--min pointer-events-auto flex flex-col items-end gap-1 ${className}`}
        role="toolbar"
        aria-label="Map controls collapsed"
      >
        <button
          type="button"
          className="ww-map-dock__fab"
          onClick={() => setLevel("compact")}
          title="Map controls — 2D/3D, catalog window"
          aria-expanded={false}
          aria-label={`Expand map controls (currently ${mapView === "3d" ? "3D globe" : "2D map"}, ${timeWindowChip(timeWindow)})`}
        >
          <ViewIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="ww-map-dock__fab-label">
            {mapView === "3d" ? "3D" : "2D"} · {timeWindowChip(timeWindow)}
          </span>
          <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </button>
        <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} compact className="hidden" />
      </div>
    );
  }

  // ── Mobile compact: 2D/3D + window + open full ──
  if (mobile && level === "compact") {
    return (
      <div
        className={`ww-map-dock ww-map-dock--compact pointer-events-auto flex flex-col items-end gap-1 ${className}`}
        role="toolbar"
        aria-label="Map controls"
      >
        <div className="flex max-w-[min(100vw-0.75rem,20rem)] flex-wrap items-center justify-end gap-1 rounded-xl border border-border bg-surface/95 p-1 shadow-lg backdrop-blur">
          <button
            type="button"
            className="ww-map-dock__icon-btn ww-map-dock__icon-btn--sm"
            title="Collapse controls"
            aria-label="Collapse map controls"
            onClick={() => setLevel("min")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
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
            onClick={() => setLevel("full")}
            aria-expanded={false}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} compact className="hidden" />
      </div>
    );
  }

  // ── Full (desktop always; mobile when expanded) ──
  return (
    <div
      className={`ww-map-dock pointer-events-auto flex flex-col gap-1.5 ${mobile ? "ww-map-dock--expanded max-h-[min(42dvh,18rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface/95 p-1.5 shadow-lg backdrop-blur" : ""} ${className}`}
      role="toolbar"
      aria-label="Map controls"
    >
      {mobile && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-dim">
            Controls
          </span>
          <button
            type="button"
            className="ww-map-dock__icon-btn ww-map-dock__icon-btn--sm"
            onClick={() => setLevel(pickedEvent ? "min" : "compact")}
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
