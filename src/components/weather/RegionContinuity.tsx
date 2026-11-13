/**
 * A NOAA number is only the Earth-facing pass.
 * The chain is the same Carrington place coming back under a new number.
 */

import { useEffect, useState } from "react";
import { fetchSolarContinuityFn } from "@/lib/feeds/solarProxy";
import type { SolarContinuity } from "@/lib/solar/regionIdentity";

function hemi(lat: number): string {
  return lat >= 0 ? "north" : "south";
}

export function RegionContinuityDesk() {
  const [data, setData] = useState<SolarContinuity | null>(null);

  useEffect(() => {
    let dead = false;
    void fetchSolarContinuityFn()
      .then((d) => {
        if (!dead) setData(d);
      })
      .catch(() => {
        if (!dead) setData(null);
      });
    return () => {
      dead = true;
    };
  }, []);

  const chains = data?.chains ?? [];
  const returns = data?.windReturns ?? [];

  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-2.5">
      <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">Same place, new number</h2>
      {chains.length === 0 ? (
        <p className="mt-1 text-[0.75rem] leading-snug text-muted">
          No region in the public file has come back at the same Carrington place. NOAA only keeps about one rotation, so an older complex is already gone from this feed.
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {chains.map((c) => (
            <li key={c.ids.join("-")} className="text-[0.75rem] leading-snug text-fg">
              <span className="font-semibold">AR{c.ids[c.ids.length - 1]}</span>
              <span className="text-muted">
                {" "}
                was {c.ids.slice(0, -1).map((id) => `AR${id}`).join(", then ")}. Carrington {c.carrington}°, {hemi(c.lat)}.{" "}
                {c.days} days in this file.
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[0.62rem] leading-snug text-dim">
        NOAA renumbers a region when it is facing Earth again. The link is the place. The file has no polarity sign, so this is not a new reading of the field.
      </p>
      <h3 className="mt-2 text-[0.68rem] font-semibold uppercase tracking-wider text-primary">Coronal holes</h3>
      <p className="mt-1 text-[0.75rem] leading-snug text-muted">
        {data?.holeText ??
          "None named in today’s discussion. A hole can keep one polarity for more than a rotation. This text does not carry that sign, and there is no number that survives the far side."}
      </p>
      {returns.length > 0 && (
        <p className="mt-1 text-[0.72rem] leading-snug text-fg">
          The 27-day outlook repeats Kp {returns.map((r) => `${r.kp} on ${r.date.replace(/^\d{4} /, "")}`).join(", ")}. That is the previous rotation’s wind coming around, usually a coronal hole.
        </p>
      )}
    </section>
  );
}
