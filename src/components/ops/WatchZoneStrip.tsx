/**
 * Pattern look-zones — one chip row. Not a warning product.
 */

import { useEffect, useMemo, useState } from "react";
import { useObservatory } from "@/store/observatory";
import { buildLookZones, type LookZonesReport } from "@/lib/ops/watchZones";
import { fetchMonthM45 } from "@/lib/ops/fieldCoupling";
import type { EqFeature } from "@/lib/feeds/usgs";
import { Eye } from "lucide-react";

export function useLookZones(): LookZonesReport {
  const eq = useObservatory((s) => s.eq);
  const donki = useObservatory((s) => s.donki);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const [month, setMonth] = useState<EqFeature[]>([]);

  useEffect(() => {
    let live = true;
    void fetchMonthM45().then((f) => {
      if (live) setMonth(f);
    });
    return () => {
      live = false;
    };
  }, []);

  return useMemo(
    () =>
      buildLookZones({
        features: eq?.features ?? [],
        wideFeatures: month,
        flares: donki?.flares ?? [],
        timeWindow,
      }),
    [eq, donki, timeWindow, month],
  );
}

export function WatchZoneStrip({ compact = false }: { compact?: boolean }) {
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const setTab = useObservatory((s) => s.setTab);
  const report = useLookZones();

  if (!report.looks.length) {
    if (compact) return null;
    return (
      <p className="px-1 text-[0.58rem] text-dim">Look · no pattern zones in this window</p>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="inline-flex shrink-0 items-center gap-0.5 text-[0.58rem] font-semibold uppercase tracking-wider text-warn">
        <Eye className="h-3 w-3" />
        Look
      </span>
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto scroll-thin">
        {report.looks.map((z) => (
          <button
            key={z.id}
            type="button"
            title={`${z.name} · ${z.why} · pattern this window, not a forecast`}
            className="shrink-0 rounded border border-warn/50 bg-warn/15 px-1.5 py-0.5 text-left text-[0.58rem] text-fg"
            onClick={() => {
              setFocusNode(z.id);
              flyMapTo(z.lat, z.lon, 5);
              setTab("live");
            }}
          >
            <span className="font-medium">{z.name.split(/[–/]/)[0]!.trim()}</span>
            <span className="text-dim">
              {" "}
              · {z.why}
              {z.strength >= 2 ? ` · ${z.strength} signals` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
