import { useEffect, useMemo, useState } from "react";
import { Settings2, Sun, Wind } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  buildPulseTape,
  loadTapeToggles,
  saveTapeToggles,
  type TapeKind,
  type TapeToggles,
} from "@/lib/ops/pulseTape";

const KINDS: { id: TapeKind; label: string }[] = [
  { id: "quake", label: "Quakes" },
  { id: "solar", label: "Solar" },
  { id: "volcano", label: "Volcanoes" },
];

export function PulseTape() {
  const eq = useObservatory((s) => s.eq);
  const kp = useObservatory((s) => s.kp);
  const solarWind = useObservatory((s) => s.solarWind);
  const scales = useObservatory((s) => s.scales);
  const xray = useObservatory((s) => s.xray);
  const volcanoes = useObservatory((s) => s.usgsVolcAlerts);
  const transitions = useObservatory((s) => s.volcWatchTransitions);
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const [toggles, setToggles] = useState<TapeToggles>(TAPE_FALLBACK);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setToggles(loadTapeToggles());
  }, []);

  const items = useMemo(
    () =>
      buildPulseTape({
        features: eq?.features,
        kp,
        solarWind,
        scales,
        xray,
        volcanoes,
        transitions,
        toggles,
      }),
    [eq?.features, kp, solarWind, scales, xray, volcanoes, transitions, toggles],
  );

  const setKind = (id: TapeKind, on: boolean) => {
    setToggles((prev) => {
      const next = { ...prev, [id]: on };
      saveTapeToggles(next);
      return next;
    });
  };

  const duration = `${Math.max(48, items.length * 14)}s`;

  return (
    <div className="ww-tape pointer-events-auto relative z-[1200] flex h-8 items-stretch overflow-visible rounded-md border border-border/80 bg-bg/90 text-[0.68rem]">
      <button
        type="button"
        className="flex shrink-0 items-center gap-1 border-r border-border/70 px-2 font-semibold uppercase tracking-wide text-primary"
        aria-expanded={menu}
        onClick={() => setMenu((v) => !v)}
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
        Pulse
      </button>
      <div className="min-w-0 flex-1 overflow-hidden">
        {items.length === 0 ? (
          <p className="flex h-full items-center px-2 text-dim">
            Tape quiet. Majors still break through.
          </p>
        ) : (
          <div className="ww-tape-track h-full items-center" style={{ animationDuration: duration }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex h-full items-center" aria-hidden={copy === 1}>
                {items.map((item) => (
                  <button
                    key={`${copy}-${item.id}`}
                    type="button"
                    className={`mx-6 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium ${
                      item.major ? "text-warn" : "text-fg"
                    }`}
                    title={item.major ? "Major — shown even if this feed is off" : item.kind}
                    onClick={() => {
                      if (item.lat == null || item.lon == null) return;
                      flyMapTo(item.lat, item.lon, item.kind === "quake" ? 5 : 6);
                    }}
                  >
                    {item.major ? "● " : ""}
                    <TapeMark item={item} />
                    {item.text}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {menu && (
        <div className="absolute left-0 top-full z-[80] mt-1 w-56 rounded-md border border-border bg-bg p-2 text-[0.68rem] shadow-xl">
          <p className="mb-1 text-[0.58rem] uppercase tracking-wide text-dim">Include</p>
          {KINDS.map((k) => (
            <label key={k.id} className="flex cursor-pointer items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={toggles[k.id]}
                onChange={(e) => setKind(k.id, e.target.checked)}
              />
              <span>{k.label}</span>
            </label>
          ))}
          <p className="mt-1 leading-snug text-dim">
            Quakes: M5+ anywhere, or M4+ on a monitored node. Volcanoes: notices from the last 7 days, newest first. OS notices for these lines are in Controls. Always on the tape: M6+, Kp ≥ 5, R/S/G ≥ 3, X-class, Warning or Red.
          </p>
        </div>
      )}
    </div>
  );
}

const TAPE_FALLBACK: TapeToggles = { quake: true, solar: true, volcano: true };

function TapeMark({ item }: { item: { id: string; kind: TapeKind } }) {
  if (item.kind === "quake") return <FractureIcon />;
  if (item.kind === "volcano") {
    return (
      <span className="text-[0.85rem] leading-none" aria-hidden>
        🌋
      </span>
    );
  }
  if (item.id === "wind") return <Wind className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  return <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden />;
}

function FractureIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path
        d="M2 2.5 6.2 7.2 4.4 8.2 8.6 14M6.2 7.2 10.4 5.6 8.2 10.4M10.4 5.6 14 3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
