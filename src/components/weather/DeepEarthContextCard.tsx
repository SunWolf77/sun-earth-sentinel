import { useState } from "react";
import { Earth, ExternalLink, Info } from "lucide-react";

/**
 * Deep Earth / core-flow literacy — educational only.
 * Responds to public “core reversed” headlines without live hazard monitoring.
 * ECDO / deep-Earth frameworks stay inspirational context, not operational feeds.
 */
export function DeepEarthContextCard({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-border/90 bg-panel p-3 sm:p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-start gap-1.5">
          <Earth className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <span>
            <span className="block text-sm font-semibold text-fg">Deep Earth context</span>
            <span className="mt-0.5 block text-[0.68rem] text-dim">
              Core flow · geodynamo · magnetic shield — research domain, not a live SES alert feed
            </span>
          </span>
        </span>
        <span className="shrink-0 text-[0.62rem] text-primary">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2.5 border-t border-border/70 pt-3 text-[0.75rem] leading-relaxed text-muted">
          <p>
            Headlines about Earth’s core “suddenly reversing” usually describe{" "}
            <strong className="text-fg">regional outer-core fluid flow</strong> (or, in other papers,
            long-term changes in inner-core differential rotation) — processes on years-to-decades
            timescales. They are not hour-scale hazard switches like flares, CMEs, or M6+ quakes.
          </p>
          <p>
            Why it still belongs near Solar: the <strong className="text-fg">geodynamo</strong>{" "}
            sustains the magnetic field that shapes geomagnetic storms and auroral ovals. Core-flow
            research feeds long-term field models; it does not replace SWPC G/R/S or USGS feeds.
          </p>

          <div className="rounded-md border border-border bg-bg/40 px-2.5 py-2 text-[0.7rem]">
            <p className="font-semibold text-fg">SES stance</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>
                <strong className="text-fg">Do monitor:</strong> Kp/G, solar wind, GOES, ground
                magnetometers (Magneto), seismicity, volcano watches.
              </li>
              <li>
                <strong className="text-fg">Do not auto-alert:</strong> core-flow papers as
                “imminent catastrophe” — no public real-time core velocity product comparable to
                USGS/SWPC.
              </li>
              <li>
                <strong className="text-fg">Optional context:</strong> deep-Earth / ECDO-style
                frameworks stay educational or research-curiosity (Ethical Skeptic and others as
                inspiration), not a red-banner channel.
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-1.5 text-[0.65rem] text-dim">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span>
              Example 2026 reporting on equatorial Pacific outer-core flow shifting eastward (papers
              using satellite field data) is interesting geophysics. Authors typically note no
              direct public safety threat from the flow change itself. Always read the paper, not
              only the headline.
            </span>
          </div>

          <a
            href="https://www.ncei.noaa.gov/products/international-geomagnetic-reference-field"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[0.65rem] text-primary hover:underline"
          >
            NCEI · International Geomagnetic Reference Field
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </section>
  );
}
