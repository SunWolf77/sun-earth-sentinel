import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { CollapsibleTabs } from "@/components/ops/CollapsibleTabs";
import {
  SUVI_BANDS,
  ccorLatest,
  drapLatestStill,
  enlilLatestStill,
  geospaceLatestStill,
  ovationLatestStill,
  suviLatest,
  type SuviBandId,
} from "@/lib/feeds/solarMedia";

type Frame = {
  id: string;
  title: string;
  note: string;
  src: string;
  href: string;
};

/**
 * SWPC latest frames — GOES SUVI + CCOR-1, and the operational model stills.
 * These are the agency `latest` files (minutes), not a SES forecast.
 */
export function GoesLiveFeeds({
  compact = false,
  onOpenImages,
}: {
  compact?: boolean;
  onOpenImages?: () => void;
}) {
  const [band, setBand] = useState<SuviBandId>("195");
  const [bust, setBust] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setBust(Date.now()), 3 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  const goes: Frame[] = [
    {
      id: "suvi",
      title: `SUVI ${band} Å`,
      note: "GOES primary · EUV",
      src: suviLatest(band, bust),
      href: "https://www.swpc.noaa.gov/products/goes-solar-ultraviolet-imager-suvi",
    },
    {
      id: "ccor",
      title: "CCOR-1",
      note: "GOES coronagraph",
      src: ccorLatest(bust),
      href: "https://www.swpc.noaa.gov/products/coronagraph",
    },
  ];

  const models: Frame[] = [
    {
      id: "enlil",
      title: "WSA–ENLIL",
      note: "Solar-wind / CME model",
      src: enlilLatestStill(bust),
      href: "https://www.swpc.noaa.gov/products/wsa-enlil-solar-wind-prediction",
    },
    {
      id: "ovation-n",
      title: "OVATION N",
      note: "Aurora model · 30 min",
      src: ovationLatestStill("north", bust),
      href: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
    },
    ...(compact
      ? []
      : [
          {
            id: "ovation-s",
            title: "OVATION S",
            note: "Aurora model · 30 min",
            src: ovationLatestStill("south", bust),
            href: "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
          },
          {
            id: "geospace",
            title: "Geospace",
            note: "1-day ground ΔB",
            src: geospaceLatestStill(bust),
            href: "https://www.swpc.noaa.gov/products/geospace-ground-magnetic-perturbation-maps",
          },
          {
            id: "drap",
            title: "D-RAP",
            note: "HF absorption nowcast",
            src: drapLatestStill(bust),
            href: "https://www.swpc.noaa.gov/products/d-region-absorption-predictions-d-rap",
          },
        ]),
  ];

  return (
    <section className="space-y-2 rounded-xl border border-border bg-panel p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
            {compact ? "GOES · models" : "GOES imagery · model feeds"}
          </h3>
          <p className="text-[0.62rem] text-dim">
            SWPC latest frame · minutes · not a SES forecast
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border px-2 text-[0.62rem] text-muted hover:text-fg"
          onClick={() => setBust(Date.now())}
        >
          <RefreshCw className="h-3 w-3" />
          Reload
        </button>
      </div>

      {!compact && (
        <CollapsibleTabs
          label="SUVI band"
          storageKey="ww_suvi_band_open"
          value={band}
          onChange={(id) => setBand(id as SuviBandId)}
          tabs={SUVI_BANDS.map((b) => ({ id: b.id, label: `${b.label} Å`, hint: b.hint }))}
        />
      )}

      <div className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"}`}>
        {goes.map((f) => (
          <LiveFrame key={f.id} frame={f} tall={!compact} />
        ))}
        {compact && models.map((f) => <LiveFrame key={f.id} frame={f} />)}
      </div>

      {!compact && (
        <div>
          <div className="mb-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-dim">
            Model frames
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {models.map((f) => (
              <LiveFrame key={f.id} frame={f} />
            ))}
          </div>
        </div>
      )}

      {compact && onOpenImages && (
        <p className="text-center text-[0.62rem] text-dim">
          <button type="button" className="font-semibold text-primary hover:underline" onClick={onOpenImages}>
            All SUVI bands and model frames
          </button>
        </p>
      )}
    </section>
  );
}

function LiveFrame({ frame, tall = false }: { frame: Frame; tall?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <a
      href={frame.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-lg border border-border bg-[#070b12]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-2 py-1">
        <span className="min-w-0">
          <span className="block truncate text-[0.68rem] font-semibold text-fg group-hover:text-primary">
            {frame.title}
          </span>
          <span className="block truncate text-[0.58rem] text-dim">{frame.note}</span>
        </span>
        <ExternalLink className="h-3 w-3 shrink-0 text-dim" />
      </div>
      <div className={`flex items-center justify-center ${tall ? "min-h-48" : "aspect-video"}`}>
        {broken ? (
          <span className="px-2 text-center text-[0.62rem] text-dim">Frame unavailable</span>
        ) : (
          <img
            src={frame.src}
            alt={frame.title}
            loading="lazy"
            className={`w-full object-contain ${tall ? "max-h-72" : "max-h-36"}`}
            onError={() => setBroken(true)}
          />
        )}
      </div>
    </a>
  );
}
