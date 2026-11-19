import { useMemo } from "react";
import { Sun } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { buildSolarPulse } from "@/lib/ops/pulseTape";
import { liveChartPeriod } from "@/lib/solar/flareOutlook";

/** Scrolling solar-only tape. The map Pulse still mixes quakes and volcanoes. */
export function SolarPulse() {
  const kp = useObservatory((s) => s.kp);
  const solarWind = useObservatory((s) => s.solarWind);
  const scales = useObservatory((s) => s.scales);
  const xray = useObservatory((s) => s.xray);
  const regions = useObservatory((s) => s.activeRegions);
  const xra = useObservatory((s) => s.xraFlares);
  const flareChance = useObservatory((s) => s.flareChance);

  const items = useMemo(() => {
    const rows = buildSolarPulse({ kp, solarWind, scales, xray, regions, xra, flareChance });
    const period = liveChartPeriod(xray).period;
    if (period != null) {
      rows.push({
        id: `period-${period}`,
        kind: "solar",
        text: "repeat in the last 90 min of the X-ray chart",
        mark: `${period} min`,
        major: false,
      });
    }
    return rows;
  }, [kp, solarWind, scales, xray, regions, xra, flareChance]);

  const duration = `${Math.max(36, items.length * 9)}s`;

  return (
    <div className="ww-solar-pulse flex h-8 items-stretch overflow-hidden rounded-md border border-border/80 bg-bg/90 text-[0.68rem]">
      <span className="flex shrink-0 items-center gap-1 border-r border-border/70 px-2 font-semibold uppercase tracking-wide text-primary">
        <Sun className="h-3.5 w-3.5" aria-hidden />
        Pulse
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        {items.length === 0 ? (
          <p className="flex h-full items-center px-2 text-dim">Waiting on the solar feeds.</p>
        ) : (
          <div className="ww-tape-track h-full items-center" style={{ animationDuration: duration }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex h-full items-center" aria-hidden={copy === 1}>
                {items.map((item) => (
                  <span
                    key={`${copy}-${item.id}`}
                    className={`mx-5 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-medium ${
                      item.major ? "text-warn" : "text-fg"
                    }`}
                  >
                    {item.mark && (
                      <span className="rounded bg-primary/15 px-1 py-0.5 font-mono text-[0.62rem] font-bold leading-none text-primary">
                        {item.mark}
                      </span>
                    )}
                    {item.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
