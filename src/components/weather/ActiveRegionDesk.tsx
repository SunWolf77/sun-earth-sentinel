/**
 * HMI continuum (visible light). Dark spots are the sunspots.
 * UV would mark the bright plage around them, which is not the spot.
 * Positions are the NOAA active-region locations projected onto that disk.
 * East is left, west is right. The chip sits on the spot unless it would cover another AR.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ActiveRegion } from "@/lib/feeds/solarRegions";
import { haleLabel, haleRank } from "@/lib/feeds/solarRegions";
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

function spotColor(r: ActiveRegion): string {
  if (haleRank(r.hale) >= 4) return "#fb7185";
  if (haleRank(r.hale) >= 3) return "#fbbf24";
  if (haleRank(r.hale) >= 2) return "#22d3ee";
  return "#94a3b8";
}

/** NOAA lat/lon onto the HMI frame. The disk nearly fills the square, so no extra zoom. */
function place(r: ActiveRegion): { x: number; y: number } | null {
  if (r.lon > 90 || r.lon < -90) return null;
  const lon = (r.lon * Math.PI) / 180;
  const lat = (r.lat * Math.PI) / 180;
  const x = CX - Math.sin(lon) * Math.cos(lat) * R;
  const y = CY - Math.sin(lat) * R;
  return { x, y };
}

/** Chip starts on its spot. It slides only far enough to clear another chip. */
function labelSpot(
  marks: { p: { x: number; y: number } }[],
  chip: { w: number; h: number },
): { x: number; y: number }[] {
  const home = marks.map((m) => m.p);
  const hw = chip.w / 2;
  const hh = chip.h / 2;
  const out = home.map((p) => clampLabel(p.x, p.y, hw, hh));
  for (let n = 0; n < 14; n++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = 0; j < i; j++) {
        const a = out[i]!;
        const b = out[j]!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const overlapX = chip.w - Math.abs(dx);
        const overlapY = chip.h - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapX < overlapY) {
          const push = overlapX / 2 + 0.5;
          const sign = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
          a.x += sign * push;
          b.x -= sign * push;
        } else {
          const push = overlapY / 2 + 0.5;
          const sign = dy === 0 ? 1 : Math.sign(dy);
          a.y += sign * push;
          b.y -= sign * push;
        }
      }
    }
    for (let i = 0; i < out.length; i++) {
      let x = out[i]!.x;
      let y = out[i]!.y;
      const h = home[i]!;
      for (let j = 0; j < home.length; j++) {
        if (j === i) continue;
        const o = home[j]!;
        const nx = h.x - o.x;
        const ny = h.y - o.y;
        const mx = (h.x + o.x) / 2;
        const my = (h.y + o.y) / 2;
        const len2 = nx * nx + ny * ny || 1;
        const dot = (x - mx) * nx + (y - my) * ny;
        if (dot < 4) {
          const need = (4 - dot) / len2;
          x += nx * need;
          y += ny * need;
        }
      }
      out[i] = clampLabel(x, y, hw, hh);
    }
  }
  return out;
}

function clampLabel(x: number, y: number, hw: number, hh: number): { x: number; y: number } {
  return {
    x: Math.max(hw + 1, Math.min(199 - hw, x)),
    y: Math.max(hh + 1, Math.min(199 - hh, y)),
  };
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
  const frame = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState(0);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const read = () => setPx(el.clientWidth);
    read();
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  const marks = regions
    .map((r) => ({ r, p: place(r) }))
    .filter((m): m is { r: ActiveRegion; p: { x: number; y: number } } => m.p != null);
  const chipPx = large ? 48 : 42;
  const chipHpx = large ? 18 : 16;
  const unit = px > 0 ? 200 / px : 0.8;
  const badges = labelSpot(marks, { w: chipPx * unit, h: chipHpx * unit });
  const showAll = large || px >= 260;

  return (
    <div className={large ? "h-full w-full" : "w-full"}>
      <div ref={frame} className="relative aspect-square">
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
        <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-0 h-full w-full" role="img" aria-label="Active regions on the Sun">
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" strokeDasharray="2 2" />
          {marks.map(({ r, p }, n) => {
            const on = active == null || active === r.region;
            const color = spotColor(r);
            const b = badges[n]!;
            const show = showAll || active === r.region;
            return (
              <g key={r.region} opacity={on ? 1 : 0.35}>
                <circle cx={p.x} cy={p.y} r={active === r.region ? 4.2 : 2.8} fill={color} stroke="#0b0b0f" strokeWidth="0.8" />
                {show && Math.hypot(b.x - p.x, b.y - p.y) > 5 && (
                  <line x1={p.x} y1={p.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="0.7" />
                )}
              </g>
            );
          })}
        </svg>
        {marks.map(({ r, p }, n) => {
          const show = showAll || active === r.region;
          if (!show) return null;
          const b = badges[n]!;
          const color = spotColor(r);
          const on = active == null || active === r.region;
          return (
            <button
              key={r.region}
              type="button"
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded px-1 py-0.5 font-mono font-bold leading-none"
              style={{
                left: `${(b.x / 200) * 100}%`,
                top: `${(b.y / 200) * 100}%`,
                color,
                background: "rgba(8,8,12,0.92)",
                border: `1px solid ${color}`,
                fontSize: large ? 13 : 11,
                opacity: on ? 1 : 0.72,
              }}
              onMouseEnter={() => onHover(r.region)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onPick(r.region)}
            >
              {r.region}
            </button>
          );
        })}
        {marks.map(({ r, p }) => (
          <button
            key={`spot-${r.region}`}
            type="button"
            aria-label={`AR${r.region}`}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${(p.x / 200) * 100}%`, top: `${(p.y / 200) * 100}%`, width: 16, height: 16 }}
            onMouseEnter={() => onHover(r.region)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onPick(r.region)}
          />
        ))}
      </div>
      <p className={`mt-1 text-center text-[0.58rem] leading-tight text-dim ${large ? "hidden" : "hidden sm:block"}`}>
        NOAA AR numbers
      </p>
    </div>
  );
}

export function ActiveRegionDesk({ regions, observed }: { regions: ActiveRegion[]; observed?: string | null }) {
  const listed = regions
    .filter((r) => r.lon <= 90 && r.lon >= -90 && (haleRank(r.hale) > 0 || r.cProb > 0 || r.mProb > 0 || r.xProb > 0))
    .sort((a, b) => a.region - b.region);
  const shown = listed.slice(0, 12);
  const delta = shown.find((r) => r.reachedDelta);
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
            leadNote={delta ? `AR${delta.region} just reached delta.` : null}
            foot={observed ? `Report ${observed}.` : "Click an AR for its spots, area, and flares."}
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
                <SunDisk regions={shown} active={picked ?? hot} onHover={setHot} onPick={setPicked} large />
                </div>
              </div>
              <div className="ww-ar-side">
                <div className="ww-ar-detail">
                  <RegionDossier region={focus} />
                </div>
                <RegionList
                  regions={shown}
                  hot={picked ?? hot}
                  onHover={setHot}
                  onPick={setPicked}
                  leadNote={null}
                  foot="Click an AR to pin it. Escape leaves full screen."
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
    <div ref={follow ? scroller : undefined} className={follow ? "ww-ar-list" : "min-w-0"}>
      {leadNote && <p className="mb-1.5 text-[0.72rem] text-danger">{leadNote}</p>}
      {regions.length === 0 ? (
        <p className="text-[0.85rem] text-muted">No classified sunspot on the latest SWPC report.</p>
      ) : (
        <ul className="ww-ar-rows">
          {regions.map((r) => (
            <li key={r.region} data-region={r.region}>
              <button
                type="button"
                className={`ww-ar-row ${hot === r.region ? "bg-elevated/80" : ""}`}
                onMouseEnter={() => onHover(r.region)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onPick(r.region)}
              >
                <span className="min-w-0">
                  <span className={`font-semibold ${tone(r)}`}>AR{r.region}</span>
                  <span className="block truncate text-[0.62rem] text-muted">
                    {r.haleLabel} · {r.phaseLabel}
                  </span>
                </span>
                <span className="font-mono text-[0.62rem] tabular-nums">
                  <span className="text-dim">C </span>
                  {Math.round(r.cProb)}
                  <span className="text-dim"> M </span>
                  <span className={r.mProb >= 15 ? "text-warn" : "text-fg"}>{Math.round(r.mProb)}</span>
                  <span className="text-dim"> X </span>
                  <span className={r.xProb >= 5 ? "text-danger" : "text-fg"}>{Math.round(r.xProb)}</span>
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
        Click an AR. Its spots, area, and flares open here.
      </p>
    );
  }
  const path = region.haleTrail
    .map((h) => haleLabel(h))
    .filter((s, i, all) => s !== "unclassified" && s !== all[i - 1]);
  const change = region.reachedDelta
    ? "Just reached delta"
    : region.growing
      ? "Class is getting more complex"
      : "Class unchanged";
  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-3">
      <p className={`text-[0.95rem] font-semibold leading-snug ${tone(region)}`}>
        AR{region.region}
        <span className="ml-2 font-mono text-[0.8rem] font-normal text-fg">{region.location}</span>
      </p>
      <dl className="ww-ar-stats mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.72rem]">
        <Stat k="Spots" v={region.spotClass ? `${region.spotClass}${region.spots != null ? ` · ${region.spots}` : ""}` : "—"} />
        <Stat k="Area" v={region.area != null ? `${region.area} millionths` : "—"} />
        <Stat k="Flares seen" v={`C${region.cEvents} M${region.mEvents} X${region.xEvents}`} />
        <Stat k="Since yesterday" v={change} />
      </dl>
      {path.length > 1 && (
        <p className="mt-1.5 text-[0.68rem] text-muted">Class ran {path.join(" → ")}</p>
      )}
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
