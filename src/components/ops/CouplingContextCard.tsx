/**
 * Context vs shuffle — pair-rate and frozen SUPT clocks. Not a forecast.
 */

import { useMemo } from "react";
import { bandPlainLabel } from "@/lib/supt/probe";
import { selfTestCouplingContext, type CouplingContextReport } from "@/lib/ops/couplingContext";
import { XHandle } from "@/components/ui/XProfileLink";

export function CouplingContextCard({ report }: { report: CouplingContextReport }) {
  const self = useMemo(() => selfTestCouplingContext(), []);
  return (
    <details className="mt-3 text-[0.62rem] text-dim">
      <summary className="cursor-pointer font-semibold text-muted">Context vs shuffle</summary>
      <div className="mt-1.5 space-y-1.5">
        <p className="text-[0.72rem] font-medium text-fg">{report.headline}</p>
        <p>{report.stance}</p>
        {report.rates.map((r) => (
          <p key={r.id} className="font-mono">
            {r.label} · {r.observed} vs shuffle {r.nullMean.toFixed(1)}
            {r.nullSd ? ` ± ${r.nullSd.toFixed(1)}` : ""}
            {r.z != null ? ` · z ${r.z >= 0 ? "+" : ""}${r.z.toFixed(1)}` : ""}
            <span className="text-muted"> — {r.reading}</span>
          </p>
        ))}
        {report.clocks.length > 0 && (
          <ul className="space-y-0.5">
            {report.clocks.map((c) => (
              <li key={c.id}>
                {c.label} · n={c.n} · {bandPlainLabel(c.score.band)}
                {c.score.d_ij != null ? ` · d ${c.score.d_ij.toFixed(2)}` : ""}
                {c.score.separated ? " · unusual vs own shuffle" : ""}
              </li>
            ))}
          </ul>
        )}
        <p className="text-dim">
          Frozen SUPT probe · <XHandle profile="sheppard" /> · H via{" "}
          <XHandle profile="cordaro" /> · same events, destroyed order · {report.windowDays} d
        </p>
        <p className={self.ok ? "text-ok" : "text-warn"}>{self.note}</p>
      </div>
    </details>
  );
}
