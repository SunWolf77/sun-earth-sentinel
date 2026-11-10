import { useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
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
        toggles,
      }),
    [eq?.features, kp, solarWind, scales, xray, volcanoes, toggles],
  );

  const setKind = (id: TapeKind, on: boolean) => {
    setToggles((prev) => {
      const next = { ...prev, [id]: on };
      saveTapeToggles(next);
      return next;
    });
  };

  const duration = `${Math.max(28, items.length * 7)}s`;

  return (
    <div className="ww-tape pointer-events-auto absolute inset-x-2 top-2 z-[1100] flex h-8 items-stretch overflow-visible rounded-md border border-border/80 bg-bg/90 text-[0.68rem] shadow-md backdrop-blur">
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
                    className={`mx-3 shrink-0 whitespace-nowrap font-medium ${
                      item.major ? "text-warn" : "text-fg"
                    }`}
                    title={item.major ? "Major — shown even if this feed is off" : item.kind}
                    onClick={() => {
                      if (item.lat == null || item.lon == null) return;
                      flyMapTo(item.lat, item.lon, item.kind === "quake" ? 5 : 6);
                    }}
                  >
                    {item.major ? "● " : ""}
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
            Always on: M6+, Kp ≥ 5, R/S/G ≥ 3, X-class, Warning or Red volcanoes.
          </p>
        </div>
      )}
    </div>
  );
}

const TAPE_FALLBACK: TapeToggles = { quake: true, solar: true, volcano: true };
