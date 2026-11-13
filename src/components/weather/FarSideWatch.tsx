/**
 * What can see a flare on the side of the Sun that GOES cannot.
 * The number is coverage, not a flare probability.
 */

import { useEffect, useState } from "react";
import { fetchFarSideWatchFn } from "@/lib/feeds/solarProxy";
import { stereoEuvi } from "@/lib/feeds/solarMedia";
import type { FarSideWatch } from "@/lib/solar/farSideWatch";

export function FarSideWatchDesk() {
  const [watch, setWatch] = useState<FarSideWatch | null>(null);

  useEffect(() => {
    let dead = false;
    void fetchFarSideWatchFn()
      .then((w) => {
        if (!dead) setWatch(w);
      })
      .catch(() => {
        if (!dead) setWatch(null);
      });
    return () => {
      dead = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-2.5">
      <div className="flex items-start gap-2">
        <img
          src={stereoEuvi("195", 256)}
          alt="STEREO-A extreme ultraviolet view, off the Earth line"
          className="h-14 w-14 shrink-0 rounded-md bg-[#070b12] object-cover"
        />
        <div className="min-w-0">
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">Far-side flare watch</h2>
          <p className="mt-1 text-[0.75rem] leading-snug text-muted">
            {watch?.line ?? "Checking who can see past the limb."}
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[0.62rem] text-dim">
        {watch?.asOf ? `Places for ${watch.asOf}. ` : ""}
        Seismic map of the hidden side:{" "}
        <a href="https://farside.nso.edu/" className="text-primary" target="_blank" rel="noreferrer">
          GONG far side
        </a>
        .
      </p>
    </section>
  );
}
