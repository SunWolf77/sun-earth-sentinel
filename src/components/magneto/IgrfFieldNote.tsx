import { useState } from "react";
import { Compass, ExternalLink, Info } from "lucide-react";
import { FIELD_MODELS, type FieldModel } from "@/lib/solar/fieldModels";
import { ModelAccuracyDisclaimer } from "@/components/ops/ModelAccuracyDisclaimer";

function kindLabel(kind: FieldModel["kind"]): string {
  switch (kind) {
    case "main-field":
      return "Main field";
    case "world-magnetic":
      return "Operational nav";
    case "high-res":
      return "Research";
    default:
      return kind;
  }
}

/**
 * Secular variation / main-field model explorer.
 * No live core telemetry — literacy + official links only.
 */
export function IgrfFieldNote({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeId, setActiveId] = useState("igrf14");
  const active = FIELD_MODELS.find((m) => m.id === activeId) ?? FIELD_MODELS[0]!;

  return (
    <div className="rounded-lg border border-border/90 bg-bg/35 px-3 py-2.5">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-start gap-1.5">
          <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            <span className="block text-[0.72rem] font-semibold text-fg">
              Secular variation models
            </span>
            <span className="mt-0.5 block text-[0.65rem] text-dim">
              IGRF-14 · WMM2025 · CHAOS-class — slow field change, not a storm feed
            </span>
          </span>
        </span>
        <span className="shrink-0 text-[0.62rem] text-primary">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2.5 border-t border-border/60 pt-2 text-[0.72rem] leading-relaxed text-muted">
          <p>
            <strong className="text-fg">Secular variation (SV)</strong> is the slow change of
            Earth’s main magnetic field (typically nT/year). Storm-time disturbances ride on top of
            that background. SES Magneto shows short-period ground series; these models describe the
            multi-year baseline.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {FIELD_MODELS.map((m) => {
              const on = m.id === active.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveId(m.id)}
                  className={`rounded-full border px-2.5 py-1 text-[0.65rem] transition ${
                    on
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-bg/40 text-muted hover:text-fg"
                  }`}
                >
                  {m.short}
                </button>
              );
            })}
          </div>

          <article className="space-y-1.5 rounded-md border border-border/70 bg-panel/50 px-2.5 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[0.78rem] font-semibold text-fg">{active.name}</h4>
              <span className="rounded-full border border-border px-1.5 py-0.5 text-[0.58rem] text-dim">
                {kindLabel(active.kind)}
              </span>
            </div>
            <p className="font-mono text-[0.62rem] text-dim">
              Epoch {active.epoch} · SV {active.svWindow}
            </p>
            <p>{active.blurb}</p>
            <p>
              <strong className="text-fg">Use · </strong>
              {active.use}
            </p>
            <p className="rounded border border-gold/25 bg-gold/5 px-2 py-1.5 text-[0.68rem] text-muted">
              <strong className="text-gold">Accuracy · </strong>
              {active.accuracy}
            </p>
            <a
              href={active.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
            >
              Official product page
              <ExternalLink className="h-3 w-3" />
            </a>
            {active.doi && (
              <a
                href={`https://doi.org/${active.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 font-mono text-[0.65rem] text-primary hover:underline"
              >
                doi:{active.doi}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </article>

          <div className="flex items-start gap-1.5 rounded-md border border-border/70 bg-panel/60 px-2 py-1.5 text-[0.65rem] text-dim">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span>
              Outer-core flow papers and ECDO-style deep-Earth framing are multi-year research
              context. They do not replace IGRF/WMM calculators or SWPC storm products.
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <a
              href="https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml?useFullSite=true"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
            >
              NCEI field calculator
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://geomag.bgs.ac.uk/data_service/models_compass/igrf_calc.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
            >
              BGS IGRF calculator
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <ModelAccuracyDisclaimer compact />
        </div>
      )}
    </div>
  );
}
