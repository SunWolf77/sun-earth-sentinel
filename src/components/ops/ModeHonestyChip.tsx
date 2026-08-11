/**
 * Mode honesty chip — device-tolerance made visible.
 * Full catalog and/or 3D globe can push phones past thermal/memory limits.
 * One-tap escape to Standard / 2D. Expand for deep dive.
 */

import { useState } from "react";
import { Gauge, Globe2, Map as MapIcon, Zap } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { MODES, runtimeLoadProfile } from "@/lib/feeds/modes";
import { ModeDeepDive } from "@/components/ops/ModeDeepDive";

type Props = {
  className?: string;
  /** When true, only warn on 3D if this is the live map surface */
  liveMap?: boolean;
};

export function ModeHonestyChip({ className = "", liveMap = true }: Props) {
  const [deep, setDeep] = useState(false);
  const mode = useObservatory((s) => s.mode);
  const mapView = useObservatory((s) => s.mapView);
  const setMode = useObservatory((s) => s.setMode);
  const setMapView = useObservatory((s) => s.setMapView);
  const mobile = useIsMobile();
  const profile = runtimeLoadProfile({ mode, mapView, mobile });

  const full = mode === "full";
  const globe = mapView === "3d";
  const warn3d = globe && mobile;

  // Always offer deep dive collapsed row when load is moderate+ OR user opened it
  const showWarn = full || warn3d;
  if (!showWarn && !deep) {
    // Quiet path: small "Mode" link only on live so mobile can still open deep dive
    if (!liveMap) return null;
    return (
      <div className={className}>
        <ModeDeepDive />
      </div>
    );
  }

  if (deep) {
    return (
      <div className={`space-y-1 ${className}`}>
        <ModeDeepDive defaultOpen />
        <button
          type="button"
          className="text-[0.58rem] text-dim underline-offset-2 hover:underline"
          onClick={() => setDeep(false)}
        >
          Collapse mode deep dive
        </button>
      </div>
    );
  }

  if (!showWarn) return null;

  const bits: string[] = [];
  if (full) bits.push("Full density");
  if (warn3d) bits.push("3D globe");
  const title = bits.join(" + ");

  const risk =
    full && warn3d
      ? "dense catalog + WebGL — may lag or heat"
      : full
        ? `M${MODES.full.minMag}+ · up to ${MODES.full.maxMarkers} pins — heavier on phones`
        : "WebGL can heat phones on long sessions";

  return (
    <div
      className={`flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-warn/40 bg-warn/10 px-2 py-1 text-[0.62rem] text-warn sm:min-h-9 sm:text-[0.65rem] ${className}`}
      role="status"
      aria-live="polite"
    >
      {full && warn3d ? (
        <Zap className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      ) : full ? (
        <Gauge className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      ) : (
        <Globe2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      )}
      <button
        type="button"
        className="min-w-0 flex-1 text-left leading-snug"
        onClick={() => setDeep(true)}
        title="Open mode deep dive"
      >
        <span className="font-semibold text-fg">{title}</span>
        <span className="text-muted">
          {" "}
          · {risk} · load {profile.pressureLabel}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {full && (
          <button
            type="button"
            onClick={() => setMode("standard")}
            className="inline-flex min-h-9 min-w-[4.5rem] items-center justify-center rounded-md border border-border bg-bg/90 px-2 text-[0.62rem] font-semibold text-fg hover:bg-elevated sm:min-h-8"
            title={MODES.standard.description}
          >
            Standard
          </button>
        )}
        {warn3d && (
          <button
            type="button"
            onClick={() => setMapView("2d")}
            className="inline-flex min-h-9 min-w-[3.25rem] items-center justify-center gap-0.5 rounded-md border border-border bg-bg/90 px-2 text-[0.62rem] font-semibold text-fg hover:bg-elevated sm:min-h-8"
            title="Switch to 2D map (lighter on device)"
          >
            <MapIcon className="h-3 w-3" aria-hidden />
            2D
          </button>
        )}
        <button
          type="button"
          onClick={() => setDeep(true)}
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-bg/90 px-2 text-[0.62rem] font-semibold text-fg hover:bg-elevated sm:min-h-8"
        >
          Details
        </button>
      </div>
    </div>
  );
}

/** @deprecated use ModeHonestyChip — Lite was merged into Standard */
export function LiteModeChip(props: { className?: string } = {}) {
  return <ModeHonestyChip className={props.className} liveMap />;
}
