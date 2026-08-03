/**
 * SWPC OVATION N/S stills — shown when aurora layer is on + official map mode.
 * Not georeferenced polar plates (would misalign on equirectangular map);
 * compact chrome card instead of Kp oval.
 */

import { useObservatory } from "@/store/observatory";
import { ExternalLink, Sparkles } from "lucide-react";

const SWPC_AURORA =
  "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast";

export function AuroraOfficialPanel({ className = "" }: { className?: string }) {
  const overlays = useObservatory((s) => s.overlays);
  const official = useObservatory((s) => s.auroraOfficial);
  const bundle = useObservatory((s) => s.ovationBundle);
  const setAuroraOfficial = useObservatory((s) => s.setAuroraOfficial);
  const setOverlay = useObservatory((s) => s.setOverlay);

  if (!overlays.aurora) return null;

  const north = bundle?.north;
  const south = bundle?.south;
  const stamp = north?.time_tag || south?.time_tag;

  return (
    <div
      className={`pointer-events-auto max-w-[min(96vw,18rem)] rounded-lg border border-emerald-500/30 bg-bg/92 p-1.5 shadow-lg backdrop-blur ${className}`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1 px-0.5">
        <Sparkles className="h-3 w-3 text-emerald-400" />
        <span className="text-[0.55rem] font-semibold uppercase tracking-wide text-dim">
          Aurora
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            className={`rounded px-1.5 py-0.5 text-[0.55rem] font-medium ${
              !official
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-dim hover:text-fg"
            }`}
            onClick={() => setAuroraOfficial(false)}
            title="Kp approximate oval on map"
          >
            Kp oval
          </button>
          <button
            type="button"
            className={`rounded px-1.5 py-0.5 text-[0.55rem] font-medium ${
              official
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-dim hover:text-fg"
            }`}
            onClick={() => setAuroraOfficial(true)}
            title="SWPC OVATION stills (official)"
          >
            Official
          </button>
          <button
            type="button"
            className="rounded px-1 text-[0.55rem] text-dim hover:text-fg"
            onClick={() => setOverlay("aurora", false)}
            aria-label="Hide aurora layer"
          >
            ×
          </button>
        </div>
      </div>

      {official ? (
        <div className="grid grid-cols-2 gap-1">
          <figure className="min-w-0">
            <div className="mb-0.5 text-center text-[0.5rem] font-medium text-muted">N</div>
            {north?.url ? (
              <img
                src={north.url}
                alt="OVATION north"
                className="aspect-square w-full rounded border border-border object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded border border-dashed border-border text-[0.55rem] text-dim">
                …
              </div>
            )}
          </figure>
          <figure className="min-w-0">
            <div className="mb-0.5 text-center text-[0.5rem] font-medium text-muted">S</div>
            {south?.url ? (
              <img
                src={south.url}
                alt="OVATION south"
                className="aspect-square w-full rounded border border-border object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded border border-dashed border-border text-[0.55rem] text-dim">
                …
              </div>
            )}
          </figure>
          <p className="col-span-2 flex items-center justify-between gap-1 px-0.5 text-[0.5rem] text-dim">
            <span>
              SWPC OVATION
              {stamp
                ? ` · ${new Date(stamp).toISOString().slice(0, 16).replace("T", " ")}Z`
                : ""}
            </span>
            <a
              href={SWPC_AURORA}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              SWPC
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </p>
        </div>
      ) : (
        <p className="px-0.5 text-[0.55rem] leading-snug text-dim">
          Kp oval on map (approx). Switch to Official for SWPC N/S forecast stills.
        </p>
      )}
    </div>
  );
}
