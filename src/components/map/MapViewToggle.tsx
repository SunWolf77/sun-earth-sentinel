/**
 * High-visibility 2D Map / 3D Globe switch — floats on the map surface.
 */

import { Globe2, Map as MapIcon } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { timeWindowChip, timeWindowTitle } from "@/lib/map/timeWindowLabel";

type Props = {
  /** Placement class (absolute positioning parent must be relative) */
  className?: string;
  /** Show active catalog window chip next to toggle */
  showWindow?: boolean;
};

export function MapViewToggle({ className = "", showWindow = true }: Props) {
  const mapView = useObservatory((s) => s.mapView);
  const setMapView = useObservatory((s) => s.setMapView);
  const timeWindow = useObservatory((s) => s.timeWindow);

  return (
    <div
      className={`pointer-events-auto flex flex-col items-end gap-1 ${className}`}
      role="group"
      aria-label="Map projection"
    >
      <div className="ww-map-view-toggle flex w-full overflow-hidden rounded-lg border border-border bg-surface/95 shadow-lg backdrop-blur">
        <button
          type="button"
          className={`ww-map-view-toggle__btn ${mapView === "2d" ? "ww-map-view-toggle__btn--on" : ""}`}
          onClick={() => setMapView("2d")}
          title="2D Leaflet map"
          aria-pressed={mapView === "2d"}
        >
          <MapIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>2D Map</span>
        </button>
        <button
          type="button"
          className={`ww-map-view-toggle__btn ${mapView === "3d" ? "ww-map-view-toggle__btn--on" : ""}`}
          onClick={() => setMapView("3d")}
          title="3D globe — same earthquake time window as 2D"
          aria-pressed={mapView === "3d"}
        >
          <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>3D Globe</span>
        </button>
      </div>
      {showWindow && (
        <div
          className="rounded-md border border-border bg-surface/90 px-2 py-0.5 text-[0.6rem] font-semibold tabular-nums text-primary shadow"
          title={timeWindowTitle(timeWindow)}
        >
          EQ window · {timeWindowChip(timeWindow)}
        </div>
      )}
    </div>
  );
}
