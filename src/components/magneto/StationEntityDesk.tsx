/**
 * Separate processing entity: INTERMAGNET geometry vs catalog origins.
 * Read-only. Does not merge into the seismic field catalog.
 */

import { useMemo } from "react";
import { Mountain, Radio } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  reportForEvent,
  reportsForCatalog,
  STATION_ENTITY_NOTE,
} from "@/lib/magneto/stationEntity";
import type { EqFeature } from "@/lib/feeds/usgs";

function magLabel(m: number | null): string {
  return m != null && Number.isFinite(m) ? `M${m.toFixed(1)}` : "M–";
}

function az(d: number): string {
  const x = ((d % 360) + 360) % 360;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(x / 45) % 8]!;
}

export function StationEntityDesk() {
  const features = useObservatory((s) => s.eq?.features);
  const picked = useObservatory((s) => s.pickedEvent);
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const setTab = useObservatory((s) => s.setTab);

  const pickedFeature = useMemo((): EqFeature | null => {
    if (!picked || !features?.length) return null;
    return features.find((f) => String(f.id) === picked.id) ?? null;
  }, [picked, features]);

  const focus = useMemo(() => {
    if (pickedFeature) return reportForEvent(pickedFeature, { max: 6 });
    return null;
  }, [pickedFeature]);

  const recent = useMemo(
    () => reportsForCatalog(features ?? [], { minMag: 5, maxEvents: 3, maxStations: 4 }),
    [features],
  );

  const rows = focus ? [focus] : recent;

  return (
    <section className="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2.5">
      <h4 className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-accent">
        <Radio className="h-3.5 w-3.5" />
        IMO station entity
      </h4>
      <p className="mt-0.5 text-[0.62rem] leading-snug text-dim">{STATION_ENTITY_NOTE}</p>

      {!rows.length && (
        <p className="mt-2 text-[0.68rem] text-muted">
          No M5+ in this window — pick an event on the map to see nearest IMOs.
        </p>
      )}

      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.eventId} className="rounded-md border border-border/70 bg-bg/50 px-2 py-1.5">
            <button
              type="button"
              className="w-full text-left text-[0.7rem]"
              onClick={() => {
                flyMapTo(r.lat, r.lon, 5, r.eventId);
                setTab("live");
              }}
            >
              <span className="font-semibold text-fg">
                {magLabel(r.mag)} · {r.place}
              </span>
              <span className="ml-1 font-mono text-[0.58rem] text-dim">
                z {r.depthKm.toFixed(0)} km
              </span>
            </button>
            <ul className="mt-1 space-y-0.5">
              {r.links.map((l) => (
                <li
                  key={l.station.code}
                  className="flex flex-wrap items-baseline gap-x-2 text-[0.62rem] text-muted"
                >
                  <span className="font-mono font-semibold text-accent">{l.station.code}</span>
                  <span className="text-dim">{l.band}</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Mountain className="h-2.5 w-2.5" aria-hidden />
                    {l.station.elevationM != null ? `${l.station.elevationM} m` : "elev —"}
                  </span>
                  <span className="font-mono">
                    {Math.round(l.surfaceKm)} km · slant {Math.round(l.slantKm)} km
                  </span>
                  <span className="text-dim">
                    az {az(l.azimuthDeg)} {Math.round(((l.azimuthDeg % 360) + 360) % 360)}°
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
