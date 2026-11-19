import { useEffect, useState } from "react";
import { fetchPfss } from "@/lib/feeds/pfss";

const LINES = [
  ["Green", "Open, pointing out. The wind can leave."],
  ["Red", "Open, pointing in. The wind can leave."],
  ["Blue", "Tall closed loops."],
  ["Yellow", "Closed loops over an active region."],
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
    <section className="ww-field-lines rounded-xl border border-border bg-panel px-3 py-2.5">
      <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">Field lines</h2>
      <p className="mt-1 text-[0.75rem] leading-snug text-muted">
        These are not a photo. GONG traces them from the surface magnetogram and makes them radial at 2.5 solar radii. Open lines leave with the wind. Closed lines can snap open in a flare or a CME.
      </p>
      <ul className="mt-1.5 grid gap-0.5 sm:grid-cols-2">
        {LINES.map(([color, line]) => (
          <li key={color} className="text-[0.7rem] leading-snug text-fg">
            <span className="font-semibold">{color}.</span> <span className="text-muted">{line}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`min-h-8 rounded-md border px-2 text-[0.68rem] ${which === "disk" ? "border-primary text-primary" : "border-border text-muted"}`}
          onClick={() => {
            setWhich("disk");
            setBroken(false);
          }}
        >
          As seen from Earth
        </button>
        <button
          type="button"
          className={`min-h-8 rounded-md border px-2 text-[0.68rem] ${which === "earth" ? "border-primary text-primary" : "border-border text-muted"}`}
          onClick={() => {
            setWhich("earth");
            setBroken(false);
          }}
        >
          Lines that can reach Earth
        </button>
      </div>
      {shown && !broken ? (
        <img
          src={shown}
          alt={which === "earth" ? "GONG field lines in the ecliptic" : "GONG field lines as seen from Earth"}
          className="mt-2 w-full rounded-md bg-white object-contain"
          onError={() => setBroken(true)}
        />
      ) : (
        <p className="mt-2 text-[0.72rem] leading-snug text-dim">
          The traced plot did not load here. Open it at GONG.
        </p>
      )}
      <p className="mt-1.5 text-[0.62rem] leading-snug text-dim">
        <a className="text-primary hover:underline" href="https://gong.nso.edu/data/magmap/mod4.html" target="_blank" rel="noopener noreferrer">
          Disk plot
        </a>
        {" · "}
        <a className="text-primary hover:underline" href="https://gong.nso.edu/data/magmap/mod6.html" target="_blank" rel="noopener noreferrer">
          Ecliptic plot
        </a>
        . White on the grey map is outward field. Black is inward. The HMI frame under Same place is the measurement. This is the model built from a synoptic map, not from that one frame.
      </p>
    </section>
  );
}
