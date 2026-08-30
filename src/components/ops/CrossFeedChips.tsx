import { useEffect, useMemo, useState } from "react";
import { useObservatory, filteredEq } from "@/store/observatory";
import { buildCrossFeed } from "@/lib/ops/crossFeed";
import { latestKp } from "@/lib/feeds/auroraOval";
import { computeLunarPhase } from "@/lib/astro/lunar";
import { Radio } from "lucide-react";

const TONE: Record<string, string> = {
  quiet: "border-border bg-panel text-muted",
  info: "border-primary/30 bg-primary/10 text-primary",
  watch: "border-warn/35 bg-warn/10 text-warn",
  alert: "border-danger/40 bg-danger/10 text-danger",
};

/** Short labels for chrome (not map overlay). */
const SHORT: Record<string, string> = {
  "geo-storm": "G-storm",
  "geo-watch": "G-watch",
  radio: "R",
  radiation: "S",
  "eq-strong": "M6+",
  "eq-busy": "Busy EQ",
  timing: "Timing",
  volc: "Volc",
  lunar: "Moon",
  iss: "ISS",
  fire: "Fires",
  neo: "NEO",
  quiet: "Quiet",
};

/**
 * Rule-based multi-domain pulse — lives in page chrome, never over the map/globe.
 */
export function CrossFeedChips({ className = "" }: { className?: string }) {
  const scales = useObservatory((s) => s.scales);
  const kp = useObservatory((s) => s.kp);
  const resonance = useObservatory((s) => s.resonance);
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const volcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const iss = useObservatory((s) => s.issPosition);
  const wildfires = useObservatory((s) => s.wildfires);
  const neos = useObservatory((s) => s.neos);
  const setTab = useObservatory((s) => s.setTab);
  const setOverlay = useObservatory((s) => s.setOverlay);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    void useObservatory.getState().ensureAmbientLayers(true);
  }, []);

  const chipsRaw = useMemo(() => {
    const feats = filteredEq(eq?.features, minMag, maxMag);
    let maxM: number | null = null;
    let maxMTime: number | null = null;
    for (const f of feats) {
      const m = f.properties.mag;
      if (m != null && (maxM == null || m > maxM)) {
        maxM = m;
        maxMTime = typeof f.properties.time === "number" ? f.properties.time : null;
      }
    }
    return buildCrossFeed({
      scales,
      kp: latestKp(kp),
      seismic: resonance,
      eqCount: feats.length,
      maxMag: maxM,
      maxMagTime: maxMTime,
      timeWindow,
      volcAlerts,
      iss,
      lunar: computeLunarPhase(),
      wildfires,
      neos,
    });
  }, [scales, kp, resonance, eq, minMag, maxMag, volcAlerts, iss, wildfires, neos, timeWindow]);

  const chips = chipsRaw.filter((c) => c.id !== "iss" && c.id !== "aurora");

  const onChip = (id: string) => {
    if (id === "iss") {
      // ISS removed from product map
      return;
    } else if (id === "fire") {
      setOverlay("wildfires", true);
      setTab("live");
    } else if (id === "neo") setTab("solar");
    else if (id === "timing" || id === "lunar") setTab("resonance");
    else if (id === "volc" || id === "eq-strong" || id === "eq-busy") setTab("live");
    else if (id.startsWith("geo") || id === "radio" || id === "radiation") setTab("solar");
  };

  if (!open) {
    return (
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-[0.6rem] font-medium text-muted hover:text-fg ${className}`}
        onClick={() => setOpen(true)}
        title="Show cross-feed"
      >
        <Radio className="h-3 w-3 text-primary" />
        Feed
        <span className="tabular-nums text-dim">{chips.length}</span>
      </button>
    );
  }

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-1 ${className}`}
      role="status"
      aria-label="Cross-feed"
    >
      <span className="inline-flex items-center gap-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-dim">
        <Radio className="h-3 w-3 text-primary" />
        Feed
      </span>
      {chips.map((c) => {
        const short =
          c.id === "eq-strong" && c.label.match(/M[\d.]+/)
            ? c.label.replace("Strong quake ", "")
            : c.id === "volc" && c.label.match(/\d+/)
              ? c.label
                  .replace(" volcano orange/red", " volc")
                  .replace(" volcano advisory", " volc")
                  .replace(" volcano alerts", " volc")
                  .replace(" volcano alert", " volc")
              : c.id === "fire" && c.label.match(/\d+/)
                ? c.label.replace(" open wildfires", " fires")
                : SHORT[c.id] || c.label;
        return (
          <button
            key={c.id}
            type="button"
            title={c.detail}
            onClick={() => onChip(c.id)}
            className={`rounded border px-1.5 py-0.5 text-[0.6rem] font-medium leading-tight ${TONE[c.tone]}`}
          >
            {short}
          </button>
        );
      })}
      <button
        type="button"
        className="text-[0.55rem] text-dim hover:text-fg"
        onClick={() => setOpen(false)}
        aria-label="Hide cross-feed"
      >
        ×
      </button>
    </div>
  );
}
