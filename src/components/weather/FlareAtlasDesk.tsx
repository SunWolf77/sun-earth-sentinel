/**
 * Flares this week, placed on a time map. Click one for the chart read.
 * Source region is added only when DONKI names the same peak.
 */

import { useEffect, useState } from "react";
import { useObservatory } from "@/store/observatory";
import { fetchFlareAtlasFn } from "@/lib/feeds/solarProxy";
import type { FlareAtlas, FlareMark } from "@/lib/solar/flareAtlas";
import type { DonkiFlare } from "@/lib/feeds/donki";
import { earthPhase } from "@/lib/feeds/solarRegions";

function parseLoc(raw: string | null | undefined): { lat: number; lon: number; label: string } | null {
  const m = (raw ?? "").trim().toUpperCase().match(/^([NS])(\d{1,2})([EW])(\d{1,3})$/);
  if (!m) return null;
  const lat = (m[1] === "S" ? -1 : 1) * Number(m[2]);
  const lon = (m[3] === "W" ? -1 : 1) * Number(m[4]);
  if (Math.abs(lat) > 60 || Math.abs(lon) > 95) return null;
  return { lat, lon, label: (raw ?? "").trim() };
}

function matchDonki(mark: FlareMark, flares: DonkiFlare[]): DonkiFlare | null {
  const t = Date.parse(mark.peak);
  let best: DonkiFlare | null = null;
  let bestDt = 20 * 60_000;
  for (const f of flares) {
    const p = Date.parse(f.peakTime ?? f.beginTime ?? "");
    if (!Number.isFinite(p)) continue;
    const dt = Math.abs(p - t);
    if (dt < bestDt) {
      bestDt = dt;
      best = f;
    }
  }
  return best;
}

function tone(letter: FlareMark["letter"]): string {
  if (letter === "X") return "#fb7185";
  if (letter === "M") return "#fbbf24";
  return "#22d3ee";
}

export function FlareAtlasDesk({
  compact = false,
  onOpenXray,
}: {
  compact?: boolean;
  onOpenXray?: () => void;
}) {
  const donki = useObservatory((s) => s.donki);
  const regions = useObservatory((s) => s.activeRegions);
  const [atlas, setAtlas] = useState<FlareAtlas | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetchFlareAtlasFn()
      .then((a) => {
        if (!live) return;
        setAtlas(a);
        if (!compact && a.marks[0]) setPicked(a.marks[0].id);
      })
      .catch((e) => {
        if (!live) return;
        setErr(e instanceof Error ? e.message : "Flare map failed");
      });
    return () => {
      live = false;
    };
  }, [compact]);

  const marks = atlas?.marks ?? [];
  const selected = marks.find((m) => m.id === picked) ?? null;
  const t0 = marks.length ? Math.min(...marks.map((m) => Date.parse(m.peak))) : 0;
  const t1 = marks.length ? Math.max(...marks.map((m) => Date.parse(m.peak))) : 1;
  const span = Math.max(1, t1 - t0);
  const source = selected ? matchDonki(selected, donki?.flares ?? []) : null;
  const loc = parseLoc(source?.sourceLocation);
  const region = source?.activeRegionNum
    ? regions.find((r) => r.region === source.activeRegionNum) ?? null
    : null;
  const phase = loc ? earthPhase(loc.lon) : null;

  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-2.5">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">Flares this week</h2>
        {atlas && (
          <span className="text-[0.58rem] text-dim">
            {atlas.mCount} M · {atlas.xCount} X
            {atlas.liveHarmonicMin != null ? ` · live pulse ${atlas.liveHarmonicMin} min` : ""}
          </span>
        )}
      </div>
      {err && <p className="text-[0.72rem] text-danger">{err}</p>}
      {!atlas && !err && <p className="text-[0.72rem] text-muted">Placing flares on the X-ray chart…</p>}
      {atlas && (
        <>
          {atlas.phaseLine && <p className="mb-1 text-[0.65rem] text-muted">{atlas.phaseLine}</p>}
          {marks.length === 0 ? (
            <p className="text-[0.75rem] text-muted">No C, M, or X flare on the 7-day chart.</p>
          ) : (
            <svg viewBox="0 0 300 46" className="h-12 w-full" role="img" aria-label="Flares across the last week">
              <line x1="8" y1="32" x2="292" y2="32" stroke="rgba(148,163,184,0.45)" strokeWidth="1" />
              {marks.map((m) => {
                const x = 8 + ((Date.parse(m.peak) - t0) / span) * 284;
                const r = m.letter === "X" ? 6 : m.letter === "M" ? 4.5 : 3;
                const on = m.id === picked;
                return (
                  <g key={m.id} className="cursor-pointer" onClick={() => setPicked(on && compact ? null : m.id)}>
                    <circle cx={x} cy={22} r={on ? r + 2 : r} fill={tone(m.letter)} stroke={on ? "#f8fafc" : "#0b0b0f"} strokeWidth="1" />
                  </g>
                );
              })}
              <text x="8" y="44" fill="currentColor" className="text-dim" fontSize="7">
                older
              </text>
              <text x="292" y="44" textAnchor="end" fill="currentColor" className="text-dim" fontSize="7">
                latest
              </text>
            </svg>
          )}
          {selected && (
            <div className="mt-1 space-y-1.5">
              <p className="text-[0.85rem] font-semibold text-fg">
                <span style={{ color: tone(selected.letter) }}>{selected.klass}</span>
                <span className="ml-2 font-normal text-muted">{selected.steps[0]?.text.split(".")[0]}</span>
              </p>
              <ol className="space-y-1">
                {selected.steps.map((s) => (
                  <li key={s.title} className="text-[0.68rem] leading-snug text-muted">
                    <span className="font-semibold text-fg">{s.title}. </span>
                    {s.text}
                  </li>
                ))}
                <li className="text-[0.68rem] leading-snug text-muted">
                  <span className="font-semibold text-fg">Source. </span>
                  {source?.activeRegionNum
                    ? `DONKI links this peak to AR${source.activeRegionNum}${loc ? ` at ${loc.label}` : ""}${phase ? `, ${phase.clause}` : ""}.`
                    : "GOES times the flare. DONKI has not named a sunspot for this peak."}
                  {region ? ` That region is on the sunspot desk as ${region.haleLabel}, ${region.phaseLabel}.` : ""}
                  {source?.linkedEvents?.length
                    ? ` ${source.linkedEvents.length} linked DONKI event${source.linkedEvents.length === 1 ? "" : "s"}.`
                    : ""}
                </li>
              </ol>
              {loc && (
                <svg viewBox="0 0 120 70" className="h-16 w-28" aria-label="Flare location on the Earth-facing disk">
                  <circle cx="60" cy="34" r="28" fill="rgba(251,191,36,0.2)" stroke="rgba(253,230,138,0.7)" />
                  <line x1="60" y1="6" x2="60" y2="62" stroke="rgba(34,211,238,0.7)" strokeDasharray="2 2" />
                  <circle
                    cx={60 - Math.sin((loc.lon * Math.PI) / 180) * Math.cos((loc.lat * Math.PI) / 180) * 26}
                    cy={34 - Math.sin((loc.lat * Math.PI) / 180) * 26}
                    r="3.5"
                    fill={tone(selected.letter)}
                  />
                </svg>
              )}
              {onOpenXray && (
                <button type="button" onClick={onOpenXray} className="text-[0.65rem] font-semibold text-primary">
                  Open the X-ray chart
                </button>
              )}
            </div>
          )}
          {(selected || !compact) && (
            <p className="mt-1.5 text-[0.58rem] leading-snug text-dim">{atlas.honesty}</p>
          )}
        </>
      )}
    </section>
  );
}
