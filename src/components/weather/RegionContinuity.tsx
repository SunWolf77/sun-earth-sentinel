/**
 * A NOAA number is only the Earth-facing pass.
 * The chain is the same Carrington place coming back under a new number.
 */

import { useEffect, useState } from "react";
import { fetchHmiPolarityFn, fetchSolarContinuityFn } from "@/lib/feeds/solarProxy";
import { sdoStill } from "@/lib/feeds/solarMedia";
import type { HmiPoint } from "@/lib/solar/hmiPolarity";
import type { SolarContinuity } from "@/lib/solar/regionIdentity";

function hemi(lat: number): string {
  return lat >= 0 ? "north" : "south";
}

function CarringtonStrip({ data }: { data: SolarContinuity }) {
  const c = data.central;
  if (c == null) return null;
  const left = (c - 90 + 360) % 360;
  const facing = left + 180 <= 360
    ? [{ left: (left / 360) * 100, width: 50 }]
    : [
        { left: (left / 360) * 100, width: ((360 - left) / 360) * 100 },
        { left: 0, width: (((left + 180) % 360) / 360) * 100 },
      ];
  return (
    <div className="mt-2">
      <p className="text-[0.62rem] text-dim">
        Carrington rotation {data.rotation}. Central meridian {c}°. The bright band faces Earth. The rest is the far side.
      </p>
      <div className="relative mt-1 h-7 overflow-hidden rounded bg-[#070b12]">
        {facing.map((b, i) => (
          <div
            key={i}
            className="absolute inset-y-0 bg-primary/15"
            style={{ left: `${b.left}%`, width: `${b.width}%` }}
          />
        ))}
        <div className="absolute inset-y-0 w-px bg-primary" style={{ left: `${(c / 360) * 100}%` }} />
        {data.marks.map((m) => (
          <span
            key={m.id}
            title={`AR${m.id} · ${m.car}°`}
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg"
            style={{ left: `${(m.car / 360) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function signWord(sign: HmiPoint["sign"]): string {
  if (sign === "toward") return "toward Earth";
  if (sign === "away") return "away";
  if (sign === "mixed") return "mixed";
  if (sign === "limb") return "too near the limb";
  return "quiet";
}

function HmiDisk() {
  const [points, setPoints] = useState<HmiPoint[] | null>(null);
  useEffect(() => {
    let dead = false;
    void fetchHmiPolarityFn()
      .then((d) => {
        if (!dead) setPoints(d.points);
      })
      .catch(() => {
        if (!dead) setPoints([]);
      });
    return () => {
      dead = true;
    };
  }, []);
  return (
    <div className="mt-2">
      <div className="relative mx-auto aspect-square w-full max-w-[16rem]">
        <img
          src={sdoStill("HMIB", 512)}
          alt="SDO HMI magnetogram. White is magnetic field toward Earth, black is away."
          className="h-full w-full rounded-full object-cover"
        />
        {(points ?? []).map((p) => (
          <span
            key={p.id}
            title={`AR${p.id}: ${signWord(p.sign)}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-black/80 px-0.5 font-mono text-[9px] font-bold leading-none text-fg"
            style={{ left: `${(p.x / 200) * 100}%`, top: `${(p.y / 200) * 100}%` }}
          >
            {p.id}
          </span>
        ))}
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {(points ?? []).map((p) => (
          <li key={p.id} className="text-[0.72rem] text-fg">
            <span className="font-semibold">AR{p.id}</span>
            <span className="text-muted"> · {signWord(p.sign)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[0.62rem] leading-snug text-dim">
        White on the magnetogram is field toward Earth. Black is away. The word is the field at the NOAA point today, not the sign the region kept on the far side. Hinode only points at one region, so it is not this map.
      </p>
    </div>
  );
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
        NOAA renumbers a region when it is facing Earth again. The link is the Carrington place on the strip. The NOAA file still has no polarity sign.
      </p>
      {data && <CarringtonStrip data={data} />}
      <HmiDisk />
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
