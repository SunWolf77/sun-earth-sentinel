import { useEffect, useState } from "react";
import { fetchPfss } from "@/lib/feeds/pfss";

const LINES = [
  ["#22c55e", "Open, out"],
  ["#ef4444", "Open, in"],
  ["#3b82f6", "Tall closed"],
  ["#eab308", "Closed over a region"],
] as const;

/** GONG potential-field source-surface lines. A model of the corona, not a photograph. */
export function FieldLines() {
  const [src, setSrc] = useState<string | null>(null);
  const [earth, setEarth] = useState<string | null>(null);
  const [which, setWhich] = useState<"disk" | "earth">("disk");
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetchPfss()
      .then((v) => {
        if (cancel) return;
        setSrc(v.los);
        setEarth(v.earth);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  const shown = which === "earth" ? earth : src;

  return (
    <section className="ww-field-lines grid gap-2 rounded-xl border border-border bg-panel p-2 sm:grid-cols-[minmax(0,1fr)_11.5rem]">
      <div className="min-w-0">
        {shown && !broken ? (
          <img
            src={shown}
            alt={which === "earth" ? "GONG field lines in the ecliptic" : "GONG field lines as seen from Earth"}
            className="max-h-72 w-full rounded-md bg-white object-contain"
            onError={() => setBroken(true)}
          />
        ) : (
          <p className="flex min-h-24 items-center text-[0.72rem] leading-snug text-dim">
            The traced plot did not load.{" "}
            <a className="text-primary hover:underline" href="https://gong.nso.edu/data/magmap/mod4.html" target="_blank" rel="noopener noreferrer">
              Open GONG
            </a>
            .
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">Field lines</h2>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className={`min-h-8 rounded-md border px-2 text-left text-[0.68rem] ${which === "disk" ? "border-primary text-primary" : "border-border text-muted"}`}
            onClick={() => {
              setWhich("disk");
              setBroken(false);
            }}
          >
            From Earth
          </button>
          <button
            type="button"
            className={`min-h-8 rounded-md border px-2 text-left text-[0.68rem] ${which === "earth" ? "border-primary text-primary" : "border-border text-muted"}`}
            onClick={() => {
              setWhich("earth");
              setBroken(false);
            }}
          >
            Toward Earth
          </button>
        </div>
        <ul className="space-y-0.5">
          {LINES.map(([color, line]) => (
            <li key={line} className="flex items-center gap-1.5 text-[0.65rem] leading-tight text-muted">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />
              {line}
            </li>
          ))}
        </ul>
        <p className="text-[0.6rem] leading-snug text-dim">
          GONG model, radial at 2.5 radii. Not a photo.{" "}
          <a className="text-primary hover:underline" href={which === "earth" ? "https://gong.nso.edu/data/magmap/mod6.html" : "https://gong.nso.edu/data/magmap/mod4.html"} target="_blank" rel="noopener noreferrer">
            Source
          </a>
        </p>
      </div>
    </section>
  );
}
