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

/** Rule-based multi-domain pulse (Map / Live). */
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
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Warm NEO/ISS lightly for chips
    void useObservatory.getState().ensureAmbientLayers(true);
  }, []);

  const chips = useMemo(() => {
    const feats = filteredEq(eq?.features, minMag, maxMag);
    let maxM: number | null = null;
    for (const f of feats) {
      const m = f.properties.mag;
      if (m != null && (maxM == null || m > maxM)) maxM = m;
    }
    return buildCrossFeed({
      scales,
      kp: latestKp(kp),
      seismic: resonance,
      eqCount: feats.length,
      maxMag: maxM,
      volcAlerts,
      iss,
      lunar: computeLunarPhase(),
      wildfires,
      neos,
    });
  }, [scales, kp, resonance, eq, minMag, maxMag, volcAlerts, iss, wildfires, neos]);

  const onChip = (id: string) => {
    if (id === "iss") {
      setOverlay("iss", true);
      setTab("live");
    } else if (id === "fire") {
      setOverlay("wildfires", true);
      setTab("live");
    } else if (id === "neo") setTab("solar");
    else if (id === "timing") setTab("resonance");
    else if (id === "volc" || id === "eq-strong" || id === "eq-busy") setTab("live");
    else if (id.startsWith("geo") || id === "radio" || id === "radiation") setTab("solar");
    else if (id === "lunar") setTab("resonance");
  };

  if (!open) {
    return (
      <button
        type="button"
        className={`pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border bg-bg/90 px-2 py-1 text-[0.6rem] font-medium text-muted shadow backdrop-blur ${className}`}
        onClick={() => setOpen(true)}
      >
        <Radio className="h-3 w-3 text-primary" />
        Cross-feed
      </button>
    );
  }

  return (
    <div
      className={`pointer-events-auto max-w-[min(100vw-1rem,28rem)] rounded-lg border border-border/80 bg-bg/90 p-1.5 shadow-lg backdrop-blur ${className}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
        <span className="inline-flex items-center gap-1 text-[0.58rem] font-semibold uppercase tracking-wider text-dim">
          <Radio className="h-3 w-3 text-primary" />
          Cross-feed
        </span>
        <button
          type="button"
          className="text-[0.58rem] text-dim hover:text-fg"
          onClick={() => setOpen(false)}
        >
          Hide
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.detail}
            onClick={() => onChip(c.id)}
            className={`rounded-md border px-1.5 py-0.5 text-left text-[0.62rem] font-medium ${TONE[c.tone]}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
