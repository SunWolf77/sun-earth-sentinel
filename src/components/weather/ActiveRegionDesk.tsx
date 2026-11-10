/**
 * Plain view of sunspot class and where the region sits relative to Earth.
 * East is left, west is right, center faces Earth. SWPC positions, not a flare forecast.
 */

import type { ActiveRegion } from "@/lib/feeds/solarRegions";
import { haleRank } from "@/lib/feeds/solarRegions";

function tone(r: ActiveRegion): string {
  if (haleRank(r.hale) >= 4) return "text-danger";
  if (haleRank(r.hale) >= 3) return "text-warn";
  if (haleRank(r.hale) >= 2) return "text-primary";
  return "text-muted";
}

function fill(r: ActiveRegion): string {
  if (haleRank(r.hale) >= 4) return "var(--color-danger, #f87171)";
  if (haleRank(r.hale) >= 3) return "var(--color-warn, #fbbf24)";
  if (haleRank(r.hale) >= 2) return "var(--color-primary, #22d3ee)";
  return "var(--color-muted, #94a3b8)";
}

function SunDisk({ regions }: { regions: ActiveRegion[] }) {
  const onDisk = regions.filter((r) => r.lon <= 95 && r.lon >= -95);
  return (
    <svg viewBox="0 0 200 210" className="mx-auto h-52 w-52" role="img" aria-label="Sun as seen from Earth">
      <circle cx="100" cy="96" r="78" fill="rgba(251,191,36,0.16)" stroke="rgba(253,230,138,0.55)" strokeWidth="1.5" />
      <rect x="87" y="18" width="26" height="156" fill="rgba(34,211,238,0.12)" />
      <line x1="100" y1="18" x2="100" y2="174" stroke="rgba(34,211,238,0.8)" strokeWidth="1" strokeDasharray="3 3" />
      <text x="100" y="14" textAnchor="middle" fill="currentColor" className="text-primary" fontSize="8">
        Earth
      </text>
      <text x="18" y="100" fill="currentColor" className="text-muted" fontSize="8">
        E
      </text>
      <text x="176" y="100" fill="currentColor" className="text-muted" fontSize="8">
        W
      </text>
      {onDisk.map((r) => {
        const x = 100 - (r.lon / 90) * 74;
        const y = 96 - (r.lat / 45) * 58;
        const hot = haleRank(r.hale) >= 3;
        return (
          <g key={r.region}>
            <circle cx={x} cy={y} r={hot ? 5.5 : 3.5} fill={fill(r)} />
            {hot && (
              <text x={x + 7} y={y + 3} fill="currentColor" className="text-fg" fontSize="8" fontWeight="600">
                {r.region}
              </text>
            )}
          </g>
        );
      })}
      <text x="100" y="202" textAnchor="middle" fill="currentColor" className="text-dim" fontSize="8">
        Center line faces Earth
      </text>
    </svg>
  );
}

export function ActiveRegionDesk({ regions, observed }: { regions: ActiveRegion[]; observed?: string | null }) {
  const headlines = regions.filter((r) => haleRank(r.hale) > 0).slice(0, 4);
  const lead = headlines[0];

  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">
          Sunspots facing Earth
        </h2>
        <p className="text-[0.6rem] text-dim">
          NOAA SWPC{observed ? ` · ${observed}` : ""} · not a flare forecast
        </p>
      </div>
      <div className="grid items-center gap-3 md:grid-cols-[13rem_1fr]">
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
          <ul className="space-y-1.5">
            {headlines.map((r) => (
              <li key={r.region} className="text-[0.72rem] leading-snug text-fg">
                <span className={`font-semibold ${tone(r)}`}>AR{r.region}</span>
                <span className="text-muted"> · {r.haleLabel}</span>
                <span className="text-muted"> · {r.phaseLabel}</span>
                <span className="text-dim"> · {r.location}</span>
                {r.mProb >= 10 && (
                  <span className="text-dim"> · SWPC M {r.mProb}%{r.xProb >= 5 ? ` · X ${r.xProb}%` : ""}</span>
                )}
                {r.growing && <span className="text-warn"> · growing</span>}
              </li>
            ))}
          </ul>
          <p className="text-[0.6rem] leading-snug text-dim">
            Delta (beta-delta or beta-gamma-delta) is the complex class most often tied to stronger flares.
            The shaded band is the Earth-direct window. East is left, west is right.
          </p>
        </div>
      </div>
    </section>
  );
}
