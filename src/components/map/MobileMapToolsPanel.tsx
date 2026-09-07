/**
 * Mobile Map tools sheet body — 2D/3D, catalog window, home, fullscreen, help.
 * Lives inside the bottom dock sheet (not free-floating over the map).
 */

import {
  Expand,
  Globe2,
  HelpCircle,
  History,
  Home,
  Map as MapIcon,
  Minimize2,
  PanelTop,
  Scan,
} from "lucide-react";
import { useState } from "react";
import { useObservatory } from "@/store/observatory";
import { TIME_WINDOWS, timeWindowTitle } from "@/lib/map/timeWindowLabel";
import { HelpGuide } from "@/components/ops/HelpGuide";
import { useMapChrome } from "@/lib/hooks/useMapChrome";

export function MobileMapToolsPanel() {
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
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);
  const { isMap, setChrome } = useMapChrome();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="space-y-3 p-3">
      <div>
        <div className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-wider text-dim">
          Projection
        </div>
        <div className="ww-map-view-toggle flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            className={`ww-map-view-toggle__btn flex-1 ${mapView === "2d" ? "ww-map-view-toggle__btn--on" : ""}`}
            onClick={() => setMapView("2d")}
            aria-pressed={mapView === "2d"}
          >
            <MapIcon className="h-4 w-4 shrink-0" />
            <span>2D Map</span>
          </button>
          <button
            type="button"
            className={`ww-map-view-toggle__btn flex-1 ${mapView === "3d" ? "ww-map-view-toggle__btn--on" : ""}`}
            onClick={() => setMapView("3d")}
            aria-pressed={mapView === "3d"}
          >
            <Globe2 className="h-4 w-4 shrink-0" />
            <span>3D Globe</span>
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-wider text-dim">
          Catalog window
        </div>
        <div
          className="flex overflow-hidden rounded-lg border border-border"
          title={timeWindowTitle(timeWindow)}
        >
          {TIME_WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`ww-map-dock__chip flex-1 ${timeWindow === w.id ? "ww-map-dock__chip--on" : ""}`}
              onClick={() => setTimeWindow(w.id)}
              title={w.title}
            >
              {w.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[0.55rem] text-dim">
          Same EQ window on 2D and 3D · not a forecast filter
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className="ww-map-dock__icon-btn min-h-11 justify-center"
          onClick={() => {
            exitToHomeView();
            setMobileSheet("closed");
          }}
        >
          <Home className="h-4 w-4" />
          <span>World home</span>
        </button>
        <button
          type="button"
          className={`ww-map-dock__icon-btn min-h-11 justify-center ${isMap ? "ww-map-dock__icon-btn--on" : ""}`}
          onClick={() => {
            setChrome(isMap ? "desk" : "map");
            setMobileSheet("closed");
          }}
        >
          {isMap ? <PanelTop className="h-4 w-4" /> : <Scan className="h-4 w-4" />}
          <span>{isMap ? "Show desk" : "Map screen"}</span>
        </button>
        <button
          type="button"
          className={`ww-map-dock__icon-btn min-h-11 justify-center ${mapImmersive ? "ww-map-dock__icon-btn--on" : ""}`}
          onClick={() => {
            setMapImmersive(!mapImmersive);
            setMobileSheet("closed");
          }}
        >
          {mapImmersive ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          <span>{mapImmersive ? "Exit full" : "Fullscreen"}</span>
        </button>
        {!replayActive && (
          <button
            type="button"
            className="ww-map-dock__icon-btn min-h-11 justify-center"
            onClick={() => {
              setReplayActive(true);
              setMobileSheet("closed");
            }}
          >
            <History className="h-4 w-4" />
            <span>Replay</span>
          </button>
        )}
        {mapView === "3d" && (
          <button
            type="button"
            className={`ww-map-dock__icon-btn min-h-11 justify-center ${globeAutoSpin ? "ww-map-dock__icon-btn--on" : ""}`}
            onClick={() => setGlobeAutoSpin(!globeAutoSpin)}
          >
            <Globe2 className="h-4 w-4" />
            <span>{globeAutoSpin ? "Spin on" : "Spin off"}</span>
          </button>
        )}
        <button
          type="button"
          className="ww-map-dock__icon-btn min-h-11 justify-center"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle className="h-4 w-4" />
          <span>Help</span>
        </button>
      </div>
      <p className="text-[0.55rem] leading-snug text-dim">
        Map screen hides the title and desks — bottom tabs stay. Fullscreen hides those too.
      </p>

      <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} compact className="hidden" />
    </div>
  );
}
