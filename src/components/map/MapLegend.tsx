import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { DEPTH_LEGEND } from "@/lib/feeds/usgs";
import {
  decaySwatch,
  halfLifeLabel,
  timeDecayLegendRows,
} from "@/lib/seismology/reference";
import { BOUNDARY_COLORS, BOUNDARY_LABELS } from "@/lib/tectonics/plates";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { emitMapChrome, onMapChrome } from "@/lib/map/mobileChrome";

const LEGEND_OPEN_KEY = "wolfwatch_map_legend_open";

/**
 * Map legend — top-left.
 * Mobile strategy:
 *  - Collapsed by default (Key chip + mini swatches)
 *  - Never auto-opens when plates/depth enabled (user opt-in)
 *  - Closes when Layers sheet opens (mutual exclusion)
 *  - Accordion: one section expanded at a time on mobile
 */
export function MapLegend() {
  const overlays = useObservatory((s) => s.overlays);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const mobile = useIsMobile();

  const showDepth = overlays.quakes && overlays.depthColor;
  const showDecay = overlays.heatmap && overlays.timeDecay;
  const showPlates = overlays.plates;
  const hasContent = showDepth || showDecay || showPlates;

  const [open, setOpen] = useState(false);
  /** Mobile accordion: which block is expanded inside the panel */
  const [section, setSection] = useState<"plates" | "depth" | "decay" | null>(null);

  useEffect(() => {
    if (!hasContent) {
      setOpen(false);
      return;
    }
    if (!mobile) {
      setOpen(true);
      setSection(null);
      return;
    }
    // Mobile: only expand if user previously chose to keep it open
    try {
      setOpen(localStorage.getItem(LEGEND_OPEN_KEY) === "1");
    } catch {
      setOpen(false);
    }
  }, [mobile, hasContent]);

  // Default accordion target when opening
  useEffect(() => {
    if (!open || !mobile) return;
    if (section) return;
    if (showPlates) setSection("plates");
    else if (showDepth) setSection("depth");
    else if (showDecay) setSection("decay");
  }, [open, mobile, showPlates, showDepth, showDecay, section]);

  useEffect(() => {
    return onMapChrome((msg) => {
      if (msg.type === "open-layers" && mobile) {
        setOpen(false);
      }
    });
  }, [mobile]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (mobile) {
        try {
          localStorage.setItem(LEGEND_OPEN_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
        if (next) emitMapChrome({ type: "open-legend" });
        else emitMapChrome({ type: "close-legend" });
      }
      return next;
    });
  };

  if (!hasContent) return null;

  const decayRows = timeDecayLegendRows(timeWindow);
  const hl = halfLifeLabel(timeWindow);
  const topClass = focusNodeId ? "top-14 sm:top-16" : "top-2 sm:top-3";

  const miniSwatches: { color: string; title: string }[] = [];
  if (showPlates) {
    miniSwatches.push(
      { color: BOUNDARY_COLORS.convergent, title: "Convergent" },
      { color: BOUNDARY_COLORS.divergent, title: "Divergent" },
      { color: BOUNDARY_COLORS.transform, title: "Transform" },
    );
  }
  if (showDepth) {
    for (const d of DEPTH_LEGEND.slice(0, 4)) {
      miniSwatches.push({ color: d.color, title: d.label });
    }
  }

  if (mobile && !open) {
    return (
      <div className={`pointer-events-auto absolute left-2 z-[450] ${topClass}`}>
        <button
          type="button"
          className="inline-flex min-h-9 max-w-[11rem] items-center gap-1.5 rounded-full border border-border bg-bg/92 px-2.5 py-1.5 text-[0.65rem] font-semibold text-muted shadow-md backdrop-blur hover:text-fg"
          onClick={toggle}
          aria-expanded={false}
          aria-label="Show map legend"
        >
          <Info className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span>Key</span>
          {miniSwatches.length > 0 && (
            <span className="flex items-center gap-0.5" aria-hidden>
              {miniSwatches.slice(0, 6).map((s, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full border border-black/20"
                  style={{ background: s.color }}
                  title={s.title}
                />
              ))}
            </span>
          )}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        </button>
      </div>
    );
  }

  const showSection = (id: "plates" | "depth" | "decay") => {
    if (!mobile) return true;
    return section === id;
  };

  const sectionHeader = (
    id: "plates" | "depth" | "decay",
    label: string,
  ) => {
    if (!mobile) {
      return (
        <div className="mb-1 text-[0.58rem] font-semibold uppercase tracking-wider text-dim">
          {label}
        </div>
      );
    }
    const isOn = section === id;
    return (
      <button
        type="button"
        className="mb-1 flex w-full items-center justify-between text-left text-[0.58rem] font-semibold uppercase tracking-wider text-dim"
        onClick={() => setSection(isOn ? null : id)}
        aria-expanded={isOn}
      >
        {label}
        {isOn ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
    );
  };

  return (
    <div
      className={`ww-map-legend absolute left-2 z-[450] max-w-[11.5rem] space-y-1.5 sm:left-3 ${topClass} ${
        mobile ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {mobile && (
        <button
          type="button"
          className="pointer-events-auto mb-0.5 inline-flex min-h-8 w-full items-center justify-between gap-1 rounded-lg border border-border bg-bg/95 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-dim shadow-md backdrop-blur"
          onClick={toggle}
          aria-expanded
          aria-label="Hide map legend"
        >
          Map key
          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}

      {showPlates && (
        <div className="rounded-lg border border-border bg-bg/92 px-2 py-1.5 shadow-md backdrop-blur">
          {sectionHeader("plates", "Plates")}
          {showSection("plates") && (
            <>
              <ul className="space-y-0.5">
                {(["convergent", "divergent", "transform"] as const).map((k) => (
                  <li
                    key={k}
                    className="flex items-center gap-1.5 text-[0.62rem] text-muted"
                  >
                    <span
                      className="h-0.5 w-3 shrink-0 rounded-full"
                      style={{ background: BOUNDARY_COLORS[k] }}
                    />
                    {BOUNDARY_LABELS[k]}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[0.52rem] leading-snug text-dim">
                Arrows = relative mm/yr · PB2002
              </p>
            </>
          )}
        </div>
      )}

      {showDepth && (
        <div className="rounded-lg border border-border bg-bg/92 px-2 py-1.5 shadow-md backdrop-blur">
          {sectionHeader("depth", "Depth")}
          {showSection("depth") && (
            <ul className="space-y-0.5">
              {DEPTH_LEGEND.map((d) => (
                <li
                  key={d.band}
                  className="flex items-center gap-1.5 text-[0.62rem] text-muted"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full border border-black/20"
                    style={{ background: d.color }}
                  />
                  {d.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showDecay && (
        <div className="rounded-lg border border-border bg-bg/92 px-2 py-1.5 shadow-md backdrop-blur">
          {sectionHeader("decay", "Heat decay")}
          {showSection("decay") && (
            <>
              <div className="mb-0.5 flex items-baseline justify-between gap-1">
                <span className="font-mono text-[0.55rem] text-primary">
                  t½ = {hl}
                </span>
              </div>
              <p className="mb-1 text-[0.55rem] leading-snug text-dim">
                w = ½^(age / t½) · {timeWindow}
              </p>
              <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #22d3ee66 0%, #fbbf24 45%, #fb923c 70%, #f43f5e 100%)",
                  }}
                />
              </div>
              <table className="w-full text-[0.58rem] text-muted">
                <tbody>
                  {decayRows.map((r) => (
                    <tr key={r.ageLabel}>
                      <td className="py-px">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ background: decaySwatch(r.weight) }}
                          />
                          {r.ageLabel}
                        </span>
                      </td>
                      <td className="py-px text-right font-mono tabular-nums text-fg/90">
                        {r.pct}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
