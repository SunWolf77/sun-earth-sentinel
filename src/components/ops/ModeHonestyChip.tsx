/**
 * Mode honesty chip — device-tolerance made visible.
 * Only mounts when Full and/or phone 3D (or user opened deep dive).
 * Quiet Standard+2D: nothing — zero chrome cost.
 */

import { useState } from "react";
import { Gauge, Globe2, Map as MapIcon, Zap } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { MODES, runtimeLoadProfile } from "@/lib/feeds/modes";
import { ModeDeepDive } from "@/components/ops/ModeDeepDive";

type Props = {
  className?: string;
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
  const warn3d = mapView === "3d" && mobile;
  // Content tabs (non-live): desktop already has Standard|Full in header — only warn on phone
  const showWarn = liveMap
    ? full || warn3d
    : mobile && (full || warn3d);

  // Quiet path: no chrome at all (deep dive lives under header mode + Details when warned)
  if (!showWarn && !deep) return null;

  if (deep) {
    return (
      <div className={`space-y-0.5 ${className}`}>
        <ModeDeepDive defaultOpen />
        <button
          type="button"
          className="px-1 text-[0.55rem] text-dim underline-offset-2 hover:underline"
          onClick={() => setDeep(false)}
        >
          Collapse mode
        </button>
      </div>
    );
  }

  const bits: string[] = [];
  if (full) bits.push("Full");
  if (warn3d) bits.push("3D");
  const title = bits.join("+");

  const risk =
    full && warn3d
      ? "dense + WebGL — may lag/heat"
      : full
        ? `M${MODES.full.minMag}+ · ≤${MODES.full.maxMarkers} pins`
        : "WebGL may heat phone";

  return (
    <div
      className={`flex min-h-8 items-center gap-1 rounded-md border border-warn/35 bg-warn/8 px-1.5 py-0.5 text-[0.58rem] text-warn sm:min-h-8 sm:text-[0.6rem] ${className}`}
      role="status"
      aria-live="polite"
    >
      {full && warn3d ? (
        <Zap className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      ) : full ? (
        <Gauge className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      ) : (
        <Globe2 className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      )}
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left leading-tight"
        onClick={() => setDeep(true)}
        title="Mode deep dive — shuffle cost, pin caps, device load"
      >
        <span className="font-semibold text-fg">{title}</span>
        <span className="text-muted">
          {" "}
          · {risk} · {profile.pressureLabel}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        {full && (
          <button
            type="button"
            onClick={() => setMode("standard")}
            className="inline-flex min-h-7 items-center justify-center rounded border border-border bg-bg/90 px-1.5 text-[0.58rem] font-semibold text-fg hover:bg-elevated sm:min-h-7"
            title={MODES.standard.description}
          >
            Std
          </button>
        )}
        {warn3d && (
          <button
            type="button"
            onClick={() => setMapView("2d")}
            className="inline-flex min-h-7 items-center justify-center gap-0.5 rounded border border-border bg-bg/90 px-1.5 text-[0.58rem] font-semibold text-fg hover:bg-elevated sm:min-h-7"
            title="2D map"
          >
            <MapIcon className="h-3 w-3" aria-hidden />
            2D
          </button>
        )}
        <button
          type="button"
          onClick={() => setDeep(true)}
          className="inline-flex min-h-7 items-center justify-center rounded border border-border bg-bg/90 px-1.5 text-[0.58rem] font-semibold text-fg hover:bg-elevated sm:min-h-7"
        >
          ···
        </button>
      </div>
    </div>
  );
}

/** @deprecated Lite merged into Standard */
export function LiteModeChip(props: { className?: string } = {}) {
  return <ModeHonestyChip className={props.className} liveMap />;
}
