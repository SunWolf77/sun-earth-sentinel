/**
 * Live visible-light Sun with each active region labeled.
 * East is left, west is right, center faces Earth. SWPC positions, not a flare forecast.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ActiveRegion } from "@/lib/feeds/solarRegions";
import { haleRank } from "@/lib/feeds/solarRegions";
import { sdoStill } from "@/lib/feeds/solarMedia";

function tone(r: ActiveRegion): string {
  if (haleRank(r.hale) >= 4) return "text-danger";
  if (haleRank(r.hale) >= 3) return "text-warn";
  if (haleRank(r.hale) >= 2) return "text-primary";
  return "text-muted";
}

const CX = 100;
const CY = 100;
const R = 94;

const MARK = ["#fb7185", "#22d3ee", "#fbbf24", "#a3e635", "#c084fc", "#fb923c", "#38bdf8", "#f472b6"];

function markColor(i: number): string {
  return MARK[i % MARK.length]!;
}

function place(r: ActiveRegion): { x: number; y: number } | null {
  if (r.lon > 90 || r.lon < -90) return null;
  const lon = (r.lon * Math.PI) / 180;
  const lat = (r.lat * Math.PI) / 180;
  const x = CX - Math.sin(lon) * Math.cos(lat) * R;
  const y = CY - Math.sin(lat) * R;
  return { x, y };
}

function clampDisk(x: number, y: number, limit: number): { x: number; y: number } {
  const dx = x - CX;
  const dy = y - CY;
  const len = Math.hypot(dx, dy);
  if (len <= limit || len === 0) return { x, y };
  return { x: CX + (dx / len) * limit, y: CY + (dy / len) * limit };
}

function badgeSpot(
  marks: { p: { x: number; y: number } }[],
): { x: number; y: number }[] {
  const keep = R - 8;
  const out = marks.map(({ p }) => {
    const dx = p.x - CX;
    const dy = p.y - CY;
    const len = Math.hypot(dx, dy) || 1;
    const dir = len > R - 22 ? -1 : 1;
    return clampDisk(p.x + (dx / len) * 13 * dir, p.y + (dy / len) * 13 * dir, keep);
  });
  for (let n = 0; n < 8; n++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = out[i]!;
        const b = out[j]!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= 16) continue;
        const push = (16 - dist) / 2;
        const ax = a.x + (dx / dist) * push;
        const ay = a.y + (dy / dist) * push;
        const bx = b.x - (dx / dist) * push;
        const by = b.y - (dy / dist) * push;
        const ca = clampDisk(ax, ay, keep);
        const cb = clampDisk(bx, by, keep);
        a.x = ca.x;
        a.y = ca.y;
        b.x = cb.x;
        b.y = cb.y;
      }
    }
  }
  return out;
}

function SunDisk({
  regions,
  active,
  onHover,
  onPick,
  large,
}: {
  regions: ActiveRegion[];
  active: number | null;
  onHover: (id: number | null) => void;
  onPick: (id: number) => void;
  large?: boolean;
}) {
  const [photo, setPhoto] = useState(true);
  const marks = regions
    .map((r, i) => ({ r, i, p: place(r) }))
    .filter((m): m is { r: ActiveRegion; i: number; p: { x: number; y: number } } => m.p != null);
  const badges = badgeSpot(marks);

  return (
    <div className={large ? "h-full w-full" : "w-full"}>
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
          {marks.map(({ r, i, p }, n) => {
            const on = active == null || active === r.region;
            const color = markColor(i);
            const b = badges[n]!;
            return (
              <g
                key={r.region}
                opacity={on ? 1 : 0.28}
                className="cursor-pointer"
                onMouseEnter={() => onHover(r.region)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onPick(r.region)}
              >
                <circle cx={p.x} cy={p.y} r={active === r.region ? 5.4 : 3.4} fill={color} stroke="#0b0b0f" strokeWidth="1.1" />
                <circle cx={b.x} cy={b.y} r="12" fill="transparent" />
                <circle cx={b.x} cy={b.y} r="7" fill="rgba(8,8,12,0.92)" stroke={color} strokeWidth="1.2" />
                <text
                  x={b.x}
                  y={b.y + (large ? 4 : 3.2)}
                  textAnchor="middle"
                  fill={color}
                  fontSize={large ? "11" : "9"}
                  fontWeight="700"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className={`mt-1 text-center text-[0.58rem] leading-tight text-dim ${large ? "hidden" : "hidden sm:block"}`}>
        Numbers match the list
      </p>
    </div>
  );
}

export function ActiveRegionDesk({ regions, observed }: { regions: ActiveRegion[]; observed?: string | null }) {
  const listed = regions
    .filter((r) => r.lon <= 90 && r.lon >= -90 && (haleRank(r.hale) > 0 || r.cProb > 0 || r.mProb > 0 || r.xProb > 0))
    .sort((a, b) => b.xProb - a.xProb || b.mProb - a.mProb || b.cProb - a.cProb || haleRank(b.hale) - haleRank(a.hale));
  const shown = listed.slice(0, 8);
  const lead = shown[0];
  const [hot, setHot] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  const focus = listed.find((r) => r.region === (picked ?? hot)) ?? null;

  return (
    <>
      <section className="ww-ar-card rounded-xl border border-border bg-panel px-3 py-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">
            Sunspots aimed at Earth
          </h2>
          <span className="ml-auto text-[0.58rem] uppercase tracking-wide text-dim">NOAA next day</span>
          <button
            type="button"
            onClick={() => setFull(true)}
            className="rounded-md border border-border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-primary"
          >
            Full
          </button>
        </div>
        <div className="ww-ar-card-grid">
          <div className="ww-ar-card-disk">
            <SunDisk regions={shown} active={hot ?? picked} onHover={setHot} onPick={setPicked} />
          </div>
          <RegionList
            regions={shown}
            hot={hot ?? picked}
            onHover={setHot}
            onPick={setPicked}
            leadNote={lead?.reachedDelta ? `AR${lead.region} just reached delta.` : null}
            foot={`The number on the Sun is the same number in the list.${observed ? ` Report ${observed}.` : ""}`}
          />
        </div>
      </section>
      {full &&
        createPortal(
          <div className="ww-ar-full">
            <div className="ww-ar-full__bar">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Sunspots aimed at Earth</h2>
              <button
                type="button"
                onClick={() => setFull(false)}
                className="rounded-md border border-border bg-panel px-3 py-1 text-xs font-semibold text-fg"
              >
                Exit full
              </button>
            </div>
            <div className="ww-ar-stage">
              <div className="ww-ar-disk-cell">
                <div className="ww-ar-disk">
                  <SunDisk regions={listed.slice(0, 12)} active={picked ?? hot} onHover={setHot} onPick={setPicked} large />
                </div>
              </div>
              <div className="ww-ar-side">
                <div className="shrink-0">
                  <RegionDossier region={focus} />
                </div>
                <RegionList
                  regions={listed.slice(0, 12)}
                  hot={picked ?? hot}
                  onHover={setHot}
                  onPick={setPicked}
                  leadNote={null}
                  foot="Click a number to pin that region. Escape leaves full screen."
                  follow
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function RegionList({
  regions,
  hot,
  onHover,
  onPick,
  leadNote,
  foot,
  follow = false,
}: {
  regions: ActiveRegion[];
  hot: number | null;
  onHover: (id: number | null) => void;
  onPick: (id: number) => void;
  leadNote: string | null;
  foot: string;
  follow?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!follow || hot == null) return;
    const box = scroller.current;
    if (!box) return;
    const row = box.querySelector(`[data-region="${hot}"]`);
    if (!(row instanceof HTMLElement)) return;
    const top = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    const bottom = top + row.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = Math.max(0, top - 4);
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 4;
  }, [hot, follow, regions]);
  return (
    <div ref={follow ? scroller : undefined} className={follow ? "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" : "min-w-0"}>
      {leadNote && <p className="mb-1.5 text-[0.72rem] text-danger">{leadNote}</p>}
      {regions.length === 0 ? (
        <p className="text-[0.85rem] text-muted">No classified sunspot on the latest SWPC report.</p>
      ) : (
        <ul className="space-y-0.5">
          {regions.map((r, i) => (
            <li key={r.region} data-region={r.region}>
              <button
                type="button"
                className={`ww-ar-row flex w-full items-start gap-1 rounded px-0.5 py-1 text-left ${hot === r.region ? "bg-elevated/80" : ""}`}
                onMouseEnter={() => onHover(r.region)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onPick(r.region)}
              >
                <span className="w-4 shrink-0 pt-0.5 font-mono text-[0.72rem] font-bold tabular-nums" style={{ color: markColor(i) }}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`font-semibold ${tone(r)}`}>AR{r.region}</span>
                    <span className="shrink-0 font-mono text-[0.62rem] tabular-nums">
                      <span className="text-dim">C </span>
                      {Math.round(r.cProb)}
                      <span className="text-dim"> M </span>
                      <span className={r.mProb >= 15 ? "text-warn" : "text-fg"}>{Math.round(r.mProb)}</span>
                      <span className="text-dim"> X </span>
                      <span className={r.xProb >= 5 ? "text-danger" : "text-fg"}>{Math.round(r.xProb)}</span>
                    </span>
                  </span>
                  <span className="block truncate text-[0.62rem] text-muted">
                    {r.haleLabel} · {r.phaseLabel}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[0.58rem] text-dim">{foot}</p>
    </div>
  );
}

function RegionDossier({ region }: { region: ActiveRegion | null }) {
  if (!region) {
    return (
      <p className="rounded-xl border border-border bg-panel px-3 py-3 text-[0.75rem] text-muted">
        Click a number. The region’s class, place, and flare odds open here.
      </p>
    );
  }
  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-3">
      <p className={`text-[0.95rem] font-semibold leading-snug ${tone(region)}`}>{region.sentence}</p>
      <dl className="ww-ar-stats mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.72rem]">
        <Stat k="Place" v={region.location} />
        <Stat k="Phase" v={region.phaseLabel} />
        <Stat k="Class" v={region.haleLabel} />
        <Stat k="Spots" v={region.spotClass ? `${region.spotClass}${region.spots != null ? ` · ${region.spots}` : ""}` : "—"} />
        <Stat k="Area" v={region.area != null ? String(region.area) : "—"} />
        <Stat k="C / M / X" v={`${Math.round(region.cProb)} / ${Math.round(region.mProb)} / ${Math.round(region.xProb)}`} />
        <Stat k="Flares seen" v={`C${region.cEvents} M${region.mEvents} X${region.xEvents}`} />
        <Stat k="Change" v={region.reachedDelta ? "Reached delta" : region.growing ? "Complexity growing" : "Steady"} />
      </dl>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[0.58rem] uppercase tracking-wide text-dim">{k}</dt>
      <dd className="text-fg">{v}</dd>
    </div>
  );
}
