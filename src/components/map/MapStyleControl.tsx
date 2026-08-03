import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Flame,
  Layers,
  Layers2,
  Mountain,
  Radar,
  Square,
  Waves,
  Timer,
  ChevronDown,
  ChevronUp,
  Globe2,
  X,
  Zap,
  Sparkles,
  Filter,
  List,
  Satellite,
  Orbit,
  Rocket,
} from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  BASEMAP_STYLES,
  OVERLAY_META,
  mobileLeanOverlays,
  type BasemapStyleId,
  type MapOverlayId,
} from "@/lib/feeds/mapStyles";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  DESKTOP_QUICK_LAYERS,
  LAYER_GROUPS,
  MOBILE_QUICK_LAYERS,
  emitMapChrome,
  onMapChrome,
} from "@/lib/map/mobileChrome";

const OVERLAY_ICONS: Record<MapOverlayId, typeof Activity> = {
  quakes: Activity,
  heatmap: Flame,
  significant: Zap,
  globalActivity: Globe2,
  depthColor: Waves,
  timeDecay: Timer,
  plates: Globe2,
  mmiContours: Layers2,
  nodes: Radar,
  volcanoes: Mountain,
  globalVolcanoes: Globe2,
  corridors: Square,
  iss: Satellite,
  aurora: Sparkles,
  wildfires: Flame,
  neos: Orbit,
};

export function MapStyleControl() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const basemapStyle = useObservatory((s) => s.basemapStyle);
  const overlays = useObservatory((s) => s.overlays);
  const setBasemapStyle = useObservatory((s) => s.setBasemapStyle);
  const setOverlay = useObservatory((s) => s.setOverlay);
  const setOverlaysBulk = useObservatory((s) => s.setOverlaysBulk);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const mobile = useIsMobile();
  const mobileSheet = useObservatory((s) => s.mobileSheet);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);

  const quickIds = mobile ? MOBILE_QUICK_LAYERS : DESKTOP_QUICK_LAYERS;

  const onCount = useMemo(
    () => OVERLAY_META.filter(({ id }) => overlays[id]).length,
    [overlays],
  );

  const setOpenSafe = (next: boolean | ((v: boolean) => boolean)) => {
    setOpen((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      if (v) emitMapChrome({ type: "open-layers" });
      else emitMapChrome({ type: "close-layers" });
      return v;
    });
  };

  useEffect(() => {
    return onMapChrome((msg) => {
      if (msg.type === "open-legend") setOpen(false);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenSafe(false);
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t)) setOpenSafe(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("touchstart", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("touchstart", onDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applySimpleMap = () => {
    const lean = mobileLeanOverlays();
    if (setOverlaysBulk) {
      setOverlaysBulk(lean);
    } else {
      for (const id of Object.keys(lean) as MapOverlayId[]) {
        setOverlay(id, lean[id]!);
      }
    }
    setOpenSafe(false);
  };

  return (
    <div
      ref={panelRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex flex-col items-stretch gap-1.5 p-2 sm:items-end sm:gap-2 sm:p-3"
    >
      {open && (
        <div
          id="map-style-layers"
          className={`ww-style-panel pointer-events-auto w-full self-center sm:max-w-sm sm:self-end ${
            mobile ? "ww-style-panel--sheet" : ""
          }`}
          role="dialog"
          aria-label="Map layers and basemap"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-dim">
                Map layers
              </div>
              <p className="text-[0.6rem] text-dim">
                {onCount} on · map stays interactive
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="ww-btn min-h-8 px-2 text-[0.62rem]"
                onClick={applySimpleMap}
                title="Minimal map — quakes + nodes only"
              >
                <Sparkles className="h-3 w-3" />
                Minimal
              </button>
              <button
                type="button"
                className="ww-btn ww-btn--icon h-9 w-9 min-h-0"
                aria-label="Close layer panel"
                onClick={() => setOpenSafe(false)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="ww-style-panel__scroll">
            <div className="ww-style-panel__label">Basemap</div>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(BASEMAP_STYLES) as BasemapStyleId[]).map((id) => {
                const s = BASEMAP_STYLES[id];
                const active = basemapStyle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBasemapStyle(id)}
                    className={`ww-style-chip ${active ? "ww-style-chip--on" : ""}`}
                  >
                    <div className="font-medium">{s.short}</div>
                  </button>
                );
              })}
            </div>

            {LAYER_GROUPS.map((g) => (
              <div key={g.id} className="mt-3">
                <div className="ww-style-panel__label">{g.label}</div>
                <ul className="space-y-1">
                  {g.ids.map((id) => {
                    const meta = OVERLAY_META.find((m) => m.id === id);
                    if (!meta) return null;
                    const Icon = OVERLAY_ICONS[id as MapOverlayId];
                    const on = overlays[id as MapOverlayId];
                    const focusOnly = id === "mmiContours";
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => setOverlay(id as MapOverlayId, !on)}
                          className={`ww-layer-row ${on ? "ww-layer-row--on" : ""} ${
                            focusOnly && !focusNodeId ? "opacity-70" : ""
                          }`}
                          disabled={focusOnly && !focusNodeId}
                          title={
                            focusOnly && !focusNodeId
                              ? "Select a focus node first"
                              : meta.hint
                          }
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 flex-1 text-left">
                            <span className="block text-[0.72rem] font-medium">
                              {meta.label}
                            </span>
                            <span className="block text-[0.58rem] text-dim">
                              {meta.hint}
                            </span>
                          </span>
                          <span
                            className={`ww-layer-state ${on ? "ww-layer-state--on" : "ww-layer-state--off"}`}
                            aria-hidden
                          >
                            {on ? "ON" : "OFF"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile: 3 actions only (Filters · Events · More). Desktop: layer chips + More. */}
      <div
        className={`ww-toggle-bar pointer-events-auto mx-auto sm:mx-0 ${
          mobile ? "ww-toggle-bar--mobile ww-toggle-bar--dock3" : ""
        }`}
      >
        {quickIds.map((id) => {
          const meta = OVERLAY_META.find((m) => m.id === id)!;
          const Icon = OVERLAY_ICONS[id as MapOverlayId];
          const on = overlays[id as MapOverlayId];
          return (
            <button
              key={id}
              type="button"
              title={`${meta.label}: ${on ? "ON — click to turn off" : "OFF — click to turn on"}. ${meta.hint}`}
              aria-pressed={on}
              aria-label={`${meta.label} ${on ? "on" : "off"}`}
              onClick={() => setOverlay(id as MapOverlayId, !on)}
              className={`ww-toggle ${on ? "ww-toggle--on" : "ww-toggle--off"} ${
                on && id === "heatmap" ? "ww-toggle--heat" : ""
              } ${on && (id as string) === "plates" ? "ww-toggle--plates" : ""} ${
                on && id === "significant" ? "ww-toggle--mmi" : ""
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{meta.short}</span>
              <span className="ww-toggle-state" aria-hidden>
                {on ? "ON" : "OFF"}
              </span>
            </button>
          );
        })}
        {mobile && (
          <>
            <button
              type="button"
              className={`ww-toggle ww-toggle--dock ${
                mobileSheet === "filters" ? "ww-toggle--style" : ""
              }`}
              aria-pressed={mobileSheet === "filters"}
              aria-label="Filters"
              title="Filters"
              onClick={() => {
                setOpenSafe(false);
                setMobileSheet(mobileSheet === "filters" ? "closed" : "filters");
              }}
            >
              <Filter className="h-4 w-4 shrink-0" aria-hidden />
              <span>Filters</span>
            </button>
            <button
              type="button"
              className={`ww-toggle ww-toggle--dock ${
                mobileSheet === "events" ? "ww-toggle--style" : ""
              }`}
              aria-pressed={mobileSheet === "events"}
              aria-label="Events"
              title="Events"
              onClick={() => {
                setOpenSafe(false);
                setMobileSheet(mobileSheet === "events" ? "closed" : "events");
              }}
            >
              <List className="h-4 w-4 shrink-0" aria-hidden />
              <span>Events</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileSheet("closed");
                setOpenSafe((v) => !v);
              }}
              className={`ww-toggle ww-toggle--dock ${open ? "ww-toggle--style" : ""}`}
              aria-expanded={open}
              aria-controls="map-style-layers"
              aria-label="Layers and basemap"
              title={open ? "Close layers" : "Layers & basemap"}
            >
              <Layers className="h-4 w-4" aria-hidden />
              <span>Layers</span>
              {onCount > 0 && <span className="ww-toggle-badge">{onCount}</span>}
            </button>
          </>
        )}
        {!mobile && (
          <>
            <span className="ww-toggle-sep" aria-hidden />
            <button
              type="button"
              onClick={() => setOpenSafe((v) => !v)}
              className={`ww-toggle ${open ? "ww-toggle--style" : ""}`}
              aria-expanded={open}
              aria-controls="map-style-layers"
              title={open ? "Close layers (Esc)" : "Basemap & all layers"}
            >
              <Layers className="h-3.5 w-3.5" aria-hidden />
              <span>{BASEMAP_STYLES[basemapStyle].short}</span>
              {open ? (
                <ChevronDown className="h-3 w-3 opacity-70" />
              ) : (
                <ChevronUp className="h-3 w-3 opacity-70" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
