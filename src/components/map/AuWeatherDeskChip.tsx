import { useEffect, useState } from "react";
import type L from "leaflet";
import { ExternalLink } from "lucide-react";
import { BOM_WARNINGS_URL, isOverAustralia, METCENTRE_URL } from "@/lib/feeds/openMeteo";

/**
 * AU-only external desk handoff (MetCentre / BoM) — no scrape, link-out only.
 * Shows when the 2D map centre is over Australia.
 */
export function AuWeatherDeskChip({ map }: { map: L.Map | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!map) {
      setShow(false);
      return;
    }
    const check = () => {
      const c = map.getCenter();
      setShow(isOverAustralia(c.lat, c.lng));
    };
    check();
    map.on("moveend", check);
    return () => {
      map.off("moveend", check);
    };
  }, [map]);

  if (!show) return null;

  return (
    <div className="pointer-events-auto absolute right-2 top-14 z-[446] flex max-w-[11rem] flex-col gap-1 sm:right-3 sm:top-16">
      <div className="rounded-lg border border-amber-500/35 bg-bg/95 px-2 py-1.5 shadow-lg backdrop-blur">
        <div className="mb-1 text-[0.58rem] font-semibold uppercase tracking-wider text-amber-200/90">
          AU weather desk
        </div>
        <p className="mb-1.5 text-[0.55rem] leading-snug text-dim">
          Official BoM context · MetCentre is external (not embedded).
        </p>
        <div className="flex flex-col gap-1">
          <a
            href={METCENTRE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between gap-1 rounded-md border border-border bg-elevated/80 px-1.5 py-1 text-[0.62rem] font-medium text-fg hover:border-primary/40"
          >
            MetCentre
            <ExternalLink className="h-3 w-3 shrink-0 text-dim" />
          </a>
          <a
            href={BOM_WARNINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between gap-1 rounded-md border border-border bg-elevated/80 px-1.5 py-1 text-[0.62rem] font-medium text-fg hover:border-primary/40"
          >
            BoM warnings
            <ExternalLink className="h-3 w-3 shrink-0 text-dim" />
          </a>
        </div>
      </div>
    </div>
  );
}
