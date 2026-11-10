/**
 * Mode honesty chip — device-tolerance made visible.
 * Only mounts when Full and/or phone 3D (or user opened deep dive).
 * Quiet Standard+2D: nothing — zero chrome cost.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const showWarn = liveMap ? full || warn3d : mobile && (full || warn3d);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!deep) return;
    const place = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      setBox({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    const onPointer = (e: PointerEvent) => {
      const n = e.target as Node;
      if (rootRef.current?.contains(n) || panelRef.current?.contains(n)) return;
      setDeep(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeep(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [deep]);

  if (!showWarn && !deep) return null;

  const bits: string[] = [];
  if (full) bits.push("Full");
  if (warn3d) bits.push("3D");
  const title = bits.join("+");

  return (
    <div className={`relative shrink-0 ${className}`} ref={rootRef}>
      <div
        className="flex h-8 max-w-[16rem] items-center gap-1 whitespace-nowrap rounded-md border border-warn/35 bg-warn/8 px-1.5 text-[0.6rem] text-warn"
        role="status"
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
          className="min-w-0 truncate text-left"
          onClick={() => setDeep((v) => !v)}
          title="Mode details — load, pin cap, shuffle cost"
          aria-expanded={deep}
        >
          <span className="font-semibold text-fg">{title}</span>
          <span className="text-muted"> · {profile.pressureLabel}</span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          {full && (
            <button
              type="button"
              onClick={() => setMode("standard")}
              className="inline-flex h-6 items-center rounded border border-border bg-bg/90 px-1.5 text-[0.58rem] font-semibold text-fg hover:bg-elevated"
              title={MODES.standard.description}
            >
              Std
            </button>
          )}
          {warn3d && (
            <button
              type="button"
              onClick={() => setMapView("2d")}
              className="inline-flex h-6 items-center gap-0.5 rounded border border-border bg-bg/90 px-1.5 text-[0.58rem] font-semibold text-fg hover:bg-elevated"
              title="2D map"
            >
              <MapIcon className="h-3 w-3" aria-hidden />
              2D
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeep((v) => !v)}
            className="inline-flex h-6 items-center rounded border border-border bg-bg/90 px-1.5 text-[0.58rem] font-semibold text-fg hover:bg-elevated"
            aria-label="Mode details"
          >
            ···
          </button>
        </div>
      </div>
      {deep &&
        box &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[5000] w-[min(24rem,calc(100vw-1rem))] max-h-[min(70vh,24rem)] overflow-y-auto rounded-md shadow-xl"
            style={{ top: box.top, right: box.right }}
          >
            <ModeDeepDive defaultOpen />
          </div>,
          document.body,
        )}
    </div>
  );
}

/** @deprecated Lite merged into Standard */
export function LiteModeChip(props: { className?: string } = {}) {
  return <ModeHonestyChip className={props.className} liveMap />;
}
