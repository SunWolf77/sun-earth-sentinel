import { useMemo } from "react";
import { useObservatory } from "@/store/observatory";
import { clusterWatch } from "@/lib/solar/clusterWatch";

/** Flare rate, new region numbers, and the daily X-ray peak. Not a Rossby-wave detector. */
export function ClusterWatchCard() {
  const xra = useObservatory((s) => s.xraFlares);
  const regions = useObservatory((s) => s.activeRegions);
  const fluxDays = useObservatory((s) => s.fluxDays);
  const watch = useMemo(
    () => clusterWatch({ xra, regions, fluxDays }),
    [xra, regions, fluxDays],
  );

  return (
    <section className="ww-solar-now__cluster rounded-lg border border-border bg-panel/80 px-3 py-2">
      <h2 className={`text-sm font-semibold ${watch.level === "cluster" ? "text-warn" : "text-fg"}`}>
        Activity cluster
      </h2>
      <p className="mt-1 text-[0.75rem] leading-snug text-fg">{watch.line}</p>
      <details className="mt-1">
        <summary className="cursor-pointer text-[0.62rem] text-dim">What this count is</summary>
        <p className="mt-1 text-[0.62rem] leading-snug text-dim">{watch.note}</p>
      </details>
    </section>
  );
}
