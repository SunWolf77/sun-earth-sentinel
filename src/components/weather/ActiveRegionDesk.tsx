/**
 * Live visible-light Sun with each active region labeled.
 * East is left, west is right, center faces Earth. SWPC positions, not a flare forecast.
 */

import { useState } from "react";
import type { ActiveRegion } from "@/lib/feeds/solarRegions";
import { haleRank } from "@/lib/feeds/solarRegions";
import { sdoStill } from "@/lib/feeds/solarMedia";

function tone(r: ActiveRegion): string {
  if (haleRank(r.hale) >= 4) return "text-danger";
  if (haleRank(r.hale) >= 3) return "text-warn";
  if (haleRank(r.hale) >= 2) return "text-primary";
  return "text-muted";
}

function fill(r: ActiveRegion): string {
  if (haleRank(r.hale) >= 4) return "#fb7185";
  if (haleRank(r.hale) >= 3) return "#fbbf24";
  if (haleRank(r.hale) >= 2) return "#22d3ee";
  return "#e2e8f0";
}

const CX = 100;
const CY = 100;
const R = 94;

function place(r: ActiveRegion): { x: number; y: number } | null {
  if (r.lon > 90 || r.lon < -90) return null;
  const lon = (r.lon * Math.PI) / 180;
  const lat = (r.lat * Math.PI) / 180;
  const x = CX - Math.sin(lon) * Math.cos(lat) * R;
  const y = CY - Math.sin(lat) * R;
  return { x, y };
}

function SunDisk({ regions }: { regions: ActiveRegion[] }) {
  const [photo, setPhoto] = useState(true);
  const marks = regions
    .map((r) => ({ r, p: place(r) }))
    .filter((m): m is { r: ActiveRegion; p: { x: number; y: number } } => m.p != null);

  return (
    <div className="mx-auto w-full max-w-[11rem]">
      <div className="relative aspect-square">
        {photo ? (
          <img
            src={sdoStill("HMIIC", 512)}
            alt="The Sun in visible light, SDO HMI"
            className="h-full w-full scale-[1.08] rounded-full object-cover"
            onError={() => setPhoto(false)}
          />
        ) : (
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_50%_46%,#fde68a,#f59e0b_62%,#9a3412_100%)]" />
        )}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" role="img" aria-label="Active regions on the Sun">
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeDasharray="2 2" />
          {marks.map(({ r, p }) => {
            const rank = haleRank(r.hale);
            return (
              <circle
                key={r.region}
                cx={p.x}
                cy={p.y}
                r={rank >= 4 ? 5.2 : rank >= 2 ? 3.6 : 2.6}
                fill={fill(r)}
                stroke="#0b0b0f"
                strokeWidth="1.1"
              />
            );
          })}
        </svg>
      </div>
      <p className="mt-1 text-center text-[0.58rem] text-dim">SDO visible light · center faces Earth</p>
    </div>
  );
}

export function ActiveRegionDesk({ regions, observed }: { regions: ActiveRegion[]; observed?: string | null }) {
  const listed = regions
    .filter((r) => r.lon <= 90 && r.lon >= -90 && (haleRank(r.hale) > 0 || r.cProb > 0 || r.mProb > 0 || r.xProb > 0))
    .sort((a, b) => b.xProb - a.xProb || b.mProb - a.mProb || b.cProb - a.cProb || haleRank(b.hale) - haleRank(a.hale));
  const lead = listed[0];

  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">
          Sunspots aimed at Earth
        </h2>
        <span className="text-[0.58rem] uppercase tracking-wide text-dim">NOAA chance, next day</span>
      </div>
      <div className="grid items-start gap-3 md:grid-cols-[11rem_1fr]">
        <SunDisk regions={listed} />
        <div className="min-w-0">
          {lead?.reachedDelta && (
            <p className="mb-1.5 text-[0.72rem] text-danger">AR{lead.region} just reached delta.</p>
          )}
          {listed.length === 0 ? (
            <p className="text-[0.85rem] text-muted">No classified sunspot on the latest SWPC report.</p>
          ) : (
            <ul className="space-y-1">
              {listed.slice(0, 8).map((r) => (
                <li key={r.region} className="grid grid-cols-[4.4rem_1fr] items-baseline gap-x-2 text-[0.72rem] leading-snug sm:grid-cols-[4.4rem_1fr_auto]">
                  <span className={`font-semibold ${tone(r)}`}>AR{r.region}</span>
                  <span className="truncate text-muted">
                    {r.haleLabel} · {r.phaseLabel}
                  </span>
                  <span className="font-mono text-[0.68rem] tabular-nums sm:text-right">
                    <span className="text-dim">C </span>
                    {Math.round(r.cProb)}
                    <span className="text-dim"> M </span>
                    <span className={r.mProb >= 15 ? "text-warn" : "text-fg"}>{Math.round(r.mProb)}</span>
                    <span className="text-dim"> X </span>
                    <span className={r.xProb >= 5 ? "text-danger" : "text-fg"}>{Math.round(r.xProb)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[0.58rem] text-dim">
            Dots match the list. Percentages are NOAA’s own C, M, and X odds, not a new forecast.
            {observed ? ` Report ${observed}.` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
