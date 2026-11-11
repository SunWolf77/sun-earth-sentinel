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
    <div className="mx-auto w-full max-w-[16rem]">
      <div className="relative aspect-square">
        {photo ? (
          <img
            src={sdoStill("HMIIC", 512)}
            alt="The Sun in visible light, SDO HMI"
            className="h-full w-full rounded-full object-cover"
            onError={() => setPhoto(false)}
          />
        ) : (
          <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_50%_46%,#fde68a,#f59e0b_62%,#9a3412_100%)]" />
        )}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" role="img" aria-label="Active regions on the Sun">
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeDasharray="2 2" />
          {marks.map(({ r, p }, i) => {
            const hot = haleRank(r.hale) >= 3;
            const label = `AR${r.region}`;
            const width = label.length * 9.2 + 10;
            const leftSide = p.x > CX + 18;
            let lx = leftSide ? p.x - width - 8 : p.x + 8;
            lx = Math.max(2, Math.min(198 - width, lx));
            const ly = Math.min(CY + R - 18, Math.max(CY - R + 18, p.y - 2 + (i % 2) * 18));
            return (
              <g key={r.region}>
                <circle cx={p.x} cy={p.y} r={hot ? 5.5 : 3.6} fill={fill(r)} stroke="#0b0b0f" strokeWidth="1.2" />
                <rect x={lx} y={ly - 9} width={width} height={18} rx="3" fill="rgba(8,8,12,0.92)" />
                <text x={lx + 5} y={ly + 4} fill={fill(r)} fontSize="13" fontWeight="700">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-1 text-center text-[0.58rem] text-dim">SDO visible light · center faces Earth</p>
    </div>
  );
}

export function ActiveRegionDesk({ regions, observed }: { regions: ActiveRegion[]; observed?: string | null }) {
  const headlines = regions.filter((r) => haleRank(r.hale) > 0).slice(0, 4);
  const lead = headlines[0];

  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">
          Sunspots aimed at Earth
        </h2>
      </div>
      <div className="grid items-center gap-3 md:grid-cols-[16rem_1fr]">
        <SunDisk regions={regions} />
        <div className="min-w-0 space-y-2">
          {lead ? (
            <p className={`text-[0.95rem] font-semibold leading-snug ${tone(lead)}`}>{lead.sentence}</p>
          ) : (
            <p className="text-[0.85rem] text-muted">No classified sunspot on the latest SWPC report.</p>
          )}
          {lead?.reachedDelta && (
            <p className="text-[0.72rem] text-danger">Complexity just reached delta.</p>
          )}
          {lead && !lead.reachedDelta && lead.growing && (
            <p className="text-[0.72rem] text-warn">Magnetic complexity is growing.</p>
          )}
          <ul className="space-y-1">
            {headlines.slice(0, 3).map((r) => (
              <li key={r.region} className="text-[0.72rem] leading-snug text-fg">
                <span className={`font-semibold ${tone(r)}`}>AR{r.region}</span>
                <span className="text-muted"> · {r.haleLabel}</span>
                <span className="text-muted"> · {r.phaseLabel}</span>
              </li>
            ))}
          </ul>
          <details>
            <summary className="cursor-pointer text-[0.65rem] text-dim">What the disk means</summary>
            <p className="mt-1 text-[0.6rem] leading-snug text-dim">
              Center faces Earth. East is left, west is right. Delta is the complex class most often tied to stronger flares.
              {observed ? ` NOAA report ${observed}.` : ""} Not a flare forecast.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
