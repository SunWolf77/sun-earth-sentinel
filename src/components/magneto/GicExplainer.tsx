import { useState } from "react";
import { Cable, ExternalLink, Info, Zap } from "lucide-react";

/**
 * GIC literacy card — educational, non-predictive.
 * Links geomagnetic storms (G-scale) to grid / long-conductor risk.
 */
export function GicExplainer({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2.5">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-start gap-1.5">
          <Cable className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>
            <span className="block text-[0.72rem] font-semibold text-accent">
              Geomagnetically induced currents (GIC)
            </span>
            <span className="mt-0.5 block text-[0.65rem] text-dim">
              Why G-scale storms stress long metal — not a live outage forecast
            </span>
          </span>
        </span>
        <span className="shrink-0 text-[0.62rem] text-primary">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-t border-border/60 pt-2 text-[0.72rem] leading-relaxed text-muted">
          <p>
            Rapid changes in Earth’s magnetic field induce quasi-DC currents in long conductors —
            high-voltage lines, pipelines, some undersea cables. Those currents can half-cycle
            saturate transformers, raise reactive demand, and trip protection. People are not
            “shocked by the Sun”; infrastructure is the antenna.
          </p>

          <ul className="space-y-1.5">
            <li className="flex gap-2">
              <Zap className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
              <span>
                <strong className="text-fg">1989 Québec</strong> — modern proof a strong storm can
                collapse a regional grid in minutes (benchmark for GMD standards).
              </span>
            </li>
            <li className="flex gap-2">
              <Zap className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
              <span>
                <strong className="text-fg">Higher risk zones</strong> — high geomagnetic latitude +
                resistive geology + long east–west transmission. Mid/low latitudes are usually less
                stressed for the same Kp.
              </span>
            </li>
            <li className="flex gap-2">
              <Zap className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
              <span>
                <strong className="text-fg">SES role</strong> — surface G/Kp, solar wind, and ground
                magnetometer context so you can see storm intensity. We do{" "}
                <em className="text-fg">not</em> claim “your city loses power.”
              </span>
            </li>
          </ul>

          <div className="flex items-start gap-1.5 rounded-md border border-border/70 bg-bg/40 px-2 py-1.5 text-[0.65rem] text-dim">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span>
              Ring of Fire seismicity and GIC are different channels. A busy quake map is not a GIC
              red alert — and a G2 storm is not Carrington. Catch the signal; don’t invent the smoke.
            </span>
          </div>

          <a
            href="https://www.swpc.noaa.gov/impacts/electric-power-transmission"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
          >
            NOAA SWPC · power transmission impacts
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
