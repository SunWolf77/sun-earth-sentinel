import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, LayoutGrid } from "lucide-react";
import {
  IMAGERY_WALL,
  OFFICIAL_MODEL_LINKS,
  type ImageryWallItem,
} from "@/lib/feeds/solarMedia";
import type { PerformanceMode } from "@/lib/feeds/modes";
import { isMobileViewport } from "@/lib/device";

const OPEN_KEY = "wolfwatch_imagery_wall_open";

/**
 * Opt-in dense still wall (SDO/LASCO/SWPC images + official links).
 * - Collapsed by default — zero extra image requests until opened
 * - Lite callers should not mount this at all
 * - Full-only tiles (aurora PNG wall, etc.) gated
 */
export function SolarImageryWall({
  mode,
  bust,
}: {
  mode: PerformanceMode;
  bust: number;
}) {
  const mobile = typeof window !== "undefined" && isMobileViewport();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {
      setOpen(false);
    }
  }, []);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(OPEN_KEY, next ? "1" : "0");
      } catch {
        /* */
      }
      return next;
    });
  };

  const size: 512 | 1024 = mobile ? 512 : 512;
  const items = useMemo(
    () => IMAGERY_WALL.filter((it) => (it.fullOnly ? mode === "full" : true)),
    [mode],
  );

  const groups = useMemo(() => {
    const order: ImageryWallItem["group"][] = ["sdo", "maps", "corona", "swpc"];
    return order
      .map((g) => ({
        id: g,
        label:
          g === "sdo"
            ? "SDO AIA & HMI"
            : g === "maps"
              ? "Active region / charts"
              : g === "corona"
                ? "Coronagraphs"
                : "SWPC stills",
        rows: items.filter((i) => i.group === g),
      }))
      .filter((g) => g.rows.length);
  }, [items]);

  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <LayoutGrid className="h-4 w-4 shrink-0 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-fg">Imagery wall</h3>
            <p className="text-[0.65rem] text-dim">
              SDO grid · charmap · LASCO · optional SWPC stills — loads only when open
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          {open ? (
            <>
              Hide <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-4 border-t border-border/70 pt-3">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="mb-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-dim">
                {g.label}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {g.rows.map((it) => (
                  <WallCard key={it.id} item={it} bust={bust} size={size} />
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="mb-1.5 text-[0.65rem] font-medium uppercase tracking-wider text-dim">
              Official models & plots (links only)
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {OFFICIAL_MODEL_LINKS.map((l) => (
                <li key={l.id}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-10 items-start justify-between gap-2 rounded-lg border border-border bg-bg/50 px-2.5 py-2 text-left hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span>
                      <span className="block text-[0.72rem] font-semibold text-fg">
                        {l.title}
                      </span>
                      <span className="block text-[0.6rem] text-dim">{l.blurb}</span>
                    </span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-dim" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[0.6rem] leading-relaxed text-dim">
            Images are hotlinked from NASA SDO, SOHO, STEREO, solen.info, and NOAA SWPC — we do not
            re-host. Expand only when you need the wall; core gauges stay on Solar without this.
          </p>
        </div>
      )}
    </section>
  );
}

function WallCard({
  item,
  bust,
  size,
}: {
  item: ImageryWallItem;
  bust: number;
  size: 512 | 1024;
}) {
  const [broken, setBroken] = useState(false);
  const src = item.src(bust, size);

  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-lg border border-border bg-bg/60 transition hover:border-primary/45"
    >
      <div className="flex items-center justify-between gap-1 border-b border-border/60 px-1.5 py-1">
        <span className="truncate text-[0.62rem] font-semibold text-muted group-hover:text-primary">
          {item.title}
        </span>
        <ExternalLink className="h-3 w-3 shrink-0 text-dim" />
      </div>
      <div className="relative aspect-square bg-[#070b12]">
        {src && !broken ? (
          <img
            src={src}
            alt={item.title}
            className="h-full w-full object-contain"
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-[0.6rem] text-dim">
            Unavailable
            <br />
            Open source ↗
          </div>
        )}
      </div>
      {item.caption && (
        <div className="px-1.5 py-0.5 text-[0.55rem] text-dim">{item.caption}</div>
      )}
    </a>
  );
}
