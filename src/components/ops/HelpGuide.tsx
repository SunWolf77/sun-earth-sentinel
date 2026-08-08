/**
 * Integrated How-to guide — map, globe, time window, layers.
 * Open from header ? or dock Help; first-visit soft tip optional.
 */

import { useEffect, useState } from "react";
import { BookOpen, HelpCircle, X } from "lucide-react";
import { useObservatory } from "@/store/observatory";

const SEEN_KEY = "wolfwatch_howto_seen_v1";

type Props = {
  /** Controlled open from parent */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Compact icon button only */
  compact?: boolean;
  className?: string;
};

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "map",
    title: "2D map",
    body: [
      "Drag to pan · pinch or scroll to zoom · double-tap to zoom in.",
      "Tap a quake pin for assessment links (USGS / JMA / agency).",
      "Number badges are clusters — zoom or tap to expand.",
      "Nodes & volcanoes show why they are marked; tap to focus that zone.",
    ],
  },
  {
    id: "globe",
    title: "3D globe",
    body: [
      "Drag to rotate the Earth · pinch to zoom.",
      "Tilt controls change your viewing angle (not Earth’s axis):",
      "  · North / ↑ — look more from above the poles",
      "  · South / ↓ — look more toward the equator edge-on",
      "  · Equator · Oblique — quick framing presets",
      "Spin ON auto-rotates west→east; pauses while you focus, then resumes.",
      "Home returns to world view · Prior undoes the last camera jump.",
      "Full expands the map to the whole screen (Exit full or Esc to leave).",
    ],
  },
  {
    id: "time",
    title: "Time window & filters",
    body: [
      "24h · 7d · 30d filters the earthquake catalog on both 2D and 3D.",
      "Default is 7 days. Same window applies when you switch Map ↔ Globe.",
      "Layers (plates, heat, nodes…) open from the map layers control.",
    ],
  },
  {
    id: "data",
    title: "What you are looking at",
    body: [
      "Yellow/orange pins = earthquakes (size ~ magnitude).",
      "Cluster badge with a number = several nearby events.",
      "SES / volcano labels = watch nodes — observational, not forecasts.",
      "Tap any marker for detail; tap another to switch without closing first.",
      "Share copies a deep link to the focused event, node, or view.",
    ],
  },
  {
    id: "timing",
    title: "Rhythm & timing",
    body: [
      "Rhythm answers: are quakes spaced oddly in time, or like a random mix?",
      "It does not measure size or location — only gaps between events.",
      "Quiet / ordinary spacing is normal and valid — not a broken feed.",
      "Solar has the same idea for flares and CMEs. Not a forecast.",
      "Want the research name? Expand “Technical detail” or Method & credit (SUPT / Sheppard).",
      "Sky context shows lunar phase computed locally — compare with timing only; not a forecast.",
      "Ground magnetic series stay on Solar → Magneto (Cordaro / INTERMAGNET).",
    ],
  },
  {
    id: "keys",
    title: "Keyboard shortcuts",
    body: [
      "1–5 — Views: Live Map · Solar · Rhythm · Charts · About.",
      "H · 0 · Home — SES world (clear node focus, no reload).",
      "T · C · J · K — Focus Tonga · Campi · Japan · Kamchatka (same key again = home).",
      "Esc — leave full-screen map, or clear focus / close sheet.",
      "? — open this how-to. Shortcuts ignore keys while typing in fields.",
      "Header layout: brand/tools → Views (tabs) → Nodes (SES + published hops + Back).",
    ],
  },
  {
    id: "modes",
    title: "Layers: ISS · Aurora · Fires",
    body: [
      "ISS: live station position + short track (opt-in).",
      "Aurora: Kp oval (approx) or Official SWPC N/S OVATION stills — toggle on layer chip.",
      "Fires: NASA EONET open wildfires (opt-in ambient).",
      "NEOs: Solar tab list of today’s approaches (NASA NeoWs).",
      "Cross-feed chips: rule-based multi-domain pulse (not AI).",
    ],
  },
  {
    id: "modes",
    title: "Modes S · F",

    body: [
      "Standard / Full change catalog density and refresh rate — not a paywall.",
      "Mobile 3D uses a safe WebGL profile; Full loads denser quakes (M3.5+) and a faster live pulse.",
    ],
  },
];

export function HelpGuide({ open: openProp, onOpenChange, compact, className = "" }: Props) {
  const [internal, setInternal] = useState(false);
  const open = openProp ?? internal;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setInternal(v);
  };
  const setTab = useObservatory((s) => s.setTab);

  useEffect(() => {
    // Soft first-visit: do not auto-block; only mark when user opens help once
    void SEEN_KEY;
  }, []);

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <button
        type="button"
        className={
          compact
            ? `ww-map-dock__icon-btn ww-map-dock__icon-btn--sm ${className}`
            : `ww-btn ww-btn--icon ww-btn--compact ${className}`
        }
        title="How to use Sun-Earth Sentinel"
        aria-label="How to use"
        onClick={() => {
          markSeen();
          setOpen(true);
        }}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {!compact && <span className="sr-only">Help</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[920] flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ww-howto-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[min(88dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-bg shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
              <div className="min-w-0">
                <h2
                  id="ww-howto-title"
                  className="flex items-center gap-1.5 text-sm font-semibold text-fg"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                  How to use Sentinel
                </h2>
                <p className="mt-0.5 text-[0.65rem] text-dim">
                  Quick guide — observational tools, not forecasts
                </p>
              </div>
              <button
                type="button"
                className="ww-btn ww-btn--icon ww-btn--compact shrink-0"
                onClick={() => setOpen(false)}
                aria-label="Close help"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
              <div className="space-y-3">
                {SECTIONS.map((s) => (
                  <section key={s.id} className="rounded-lg border border-border/80 bg-panel/80 px-2.5 py-2">
                    <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
                      {s.title}
                    </h3>
                    <ul className="mt-1.5 space-y-1 text-[0.72rem] leading-snug text-muted">
                      {s.body.map((line) => (
                        <li key={line} className="pl-0.5">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-3 py-2.5 sm:px-4">
              <button
                type="button"
                className="ww-btn flex-1 justify-center text-[0.7rem]"
                onClick={() => {
                  setTab("about");
                  setOpen(false);
                }}
              >
                About & sources
              </button>
              <button
                type="button"
                className="ww-btn flex-1 justify-center border-primary/40 bg-primary/15 text-[0.7rem] text-primary"
                onClick={() => setOpen(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** First-session tip strip under map chrome (dismissible). */
export function HelpTipBanner() {
  const [show, setShow] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
      if (localStorage.getItem("wolfwatch_howto_tip_v1") === "1") return;
      setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!show && !helpOpen) {
    return helpOpen ? <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} compact /> : null;
  }

  return (
    <>
      {show && (
        <div className="pointer-events-auto absolute inset-x-2 top-2 z-[540] sm:inset-x-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
          <div className="flex items-start gap-2 rounded-lg border border-primary/35 bg-bg/95 px-2.5 py-2 shadow-lg backdrop-blur">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1 text-[0.68rem] leading-snug text-muted">
              <strong className="text-fg">New here?</strong> Drag the globe, tap pins for detail,
              use <span className="text-primary">24h / 7d / 30d</span> for the catalog.{" "}
              <button
                type="button"
                className="font-semibold text-primary underline"
                onClick={() => {
                  setHelpOpen(true);
                  try {
                    localStorage.setItem("wolfwatch_howto_tip_v1", "1");
                  } catch {
                    /* */
                  }
                  setShow(false);
                }}
              >
                Open How-to
              </button>
            </div>
            <button
              type="button"
              className="shrink-0 text-dim hover:text-fg"
              aria-label="Dismiss tip"
              onClick={() => {
                setShow(false);
                try {
                  localStorage.setItem("wolfwatch_howto_tip_v1", "1");
                } catch {
                  /* */
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      <HelpGuide open={helpOpen} onOpenChange={setHelpOpen} compact className="hidden" />
    </>
  );
}
