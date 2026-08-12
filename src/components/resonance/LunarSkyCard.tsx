/**
 * Sky context — local lunar phase (no network).
 * Sibling to catalog timing on Rhythm; does not feed the spacing score.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronRight, Moon, Orbit } from "lucide-react";
import {
  computeLunarPhase,
  formatAgeDays,
  formatDaysUntil,
  type LunarPhaseSnapshot,
} from "@/lib/astro/lunar";
import { computeEclipseWatch } from "@/lib/astro/eclipses";
import { formatUtc } from "@/lib/utils";
import { useObservatory } from "@/store/observatory";

function MoonDisc({ snap }: { snap: LunarPhaseSnapshot }) {
  // Simple CSS disc: shadow side depends on waxing/waning + illumination
  const lit = snap.illumination; // 0…1
  const waxing = snap.waxing;
  // For a right-lit (northern-hemisphere style) moon: waxing lights from right
  const gradient = waxing
    ? `linear-gradient(90deg, #0f172a 0%, #0f172a ${(1 - lit) * 50}%, #e2e8f0 ${(1 - lit) * 50 + lit * 50}%, #e2e8f0 100%)`
    : `linear-gradient(270deg, #0f172a 0%, #0f172a ${(1 - lit) * 50}%, #e2e8f0 ${(1 - lit) * 50 + lit * 50}%, #e2e8f0 100%)`;

  // Cleaner: use box-shadow / radial for full/new edge cases
  const style: CSSProperties =
    snap.phaseId === "new"
      ? { background: "#0f172a", boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.35)" }
      : snap.phaseId === "full"
        ? { background: "#e2e8f0", boxShadow: "0 0 12px rgba(251,191,36,0.25)" }
        : {
            background: gradient,
            boxShadow: "inset 0 0 0 1px rgba(148,163,184,0.25)",
          };

  return (
    <div
      className="h-14 w-14 shrink-0 rounded-full"
      style={style}
      role="img"
      aria-label={`${snap.phaseLabel}, ${snap.illuminationPct}% lit`}
    />
  );
}

export function LunarSkyCard() {
  const setTab = useObservatory((s) => s.setTab);
  const [now, setNow] = useState(() => Date.now());
  const [openTech, setOpenTech] = useState(false);

  useEffect(() => {
    // Refresh every 15 min — phase is slow
    const id = window.setInterval(() => setNow(Date.now()), 15 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  const snap = useMemo(() => computeLunarPhase(new Date(now)), [now]);
  const eclipse = useMemo(() => computeEclipseWatch(now), [now]);

  const aspectTone =
    snap.aspectTag === "syzygy_full" || snap.aspectTag === "syzygy_new"
      ? "border-gold/40 bg-gold/10 text-gold"
      : snap.aspectTag === "quadrature"
        ? "border-primary/35 bg-primary/10 text-primary"
        : "border-border bg-bg/50 text-muted";

  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Moon className="h-3.5 w-3.5" />
            Sky context
          </h3>
          <p className="mt-0.5 text-[0.65rem] text-dim">
            Lunar phase · local compute · observational only
          </p>
        </div>
        <span className={`rounded-md border px-1.5 py-0.5 text-[0.58rem] font-semibold ${aspectTone}`}>
          {snap.aspectLabel}
        </span>
      </div>

      {(eclipse.awareness === "active" ||
        eclipse.awareness === "elevated" ||
        eclipse.awareness === "approaching") && (
        <button
          type="button"
          onClick={() => setTab("solar")}
          className="mb-2 w-full rounded-md border border-warn/40 bg-warn/10 px-2 py-1.5 text-left text-[0.68rem] text-warn hover:bg-warn/15"
        >
          <span className="font-semibold">Eclipse watch · {eclipse.awareness}</span>
          <span className="mt-0.5 block text-[0.62rem] text-muted">{eclipse.headline} · open Solar</span>
        </button>
      )}

      <div className="flex items-center gap-3">
        <MoonDisc snap={snap} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-fg">{snap.phaseLabel}</p>
          <p className="text-[0.72rem] text-muted">
            {snap.illuminationPct}% lit · age {formatAgeDays(snap.ageDays)}
            {snap.waxing ? " · waxing" : " · waning"}
          </p>
          <p className="mt-0.5 text-[0.62rem] text-dim">
            Elongation ~{snap.elongationDeg.toFixed(0)}° (Sun–Moon)
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-1.5 text-[0.65rem] sm:grid-cols-4">
        <div className="rounded-md border border-border/80 bg-bg/50 px-2 py-1.5">
          <dt className="text-dim">Next new</dt>
          <dd className="mt-0.5 font-medium text-fg">{formatDaysUntil(snap.daysToNew)}</dd>
          <dd className="text-[0.55rem] text-dim">{formatUtc(snap.nextNewMs)}</dd>
        </div>
        <div className="rounded-md border border-border/80 bg-bg/50 px-2 py-1.5">
          <dt className="text-dim">Next full</dt>
          <dd className="mt-0.5 font-medium text-fg">{formatDaysUntil(snap.daysToFull)}</dd>
          <dd className="text-[0.55rem] text-dim">{formatUtc(snap.nextFullMs)}</dd>
        </div>
        <div className="rounded-md border border-border/80 bg-bg/50 px-2 py-1.5">
          <dt className="text-dim">Synodic age</dt>
          <dd className="mt-0.5 font-mono font-medium text-fg">{snap.ageDays.toFixed(2)} d</dd>
        </div>
        <div className="rounded-md border border-border/80 bg-bg/50 px-2 py-1.5">
          <dt className="text-dim">Illumination</dt>
          <dd className="mt-0.5 font-mono font-medium text-fg">{snap.illuminationPct}%</dd>
        </div>
      </dl>

      <p className="mt-2 text-[0.65rem] leading-snug text-muted">
        Compare with catalog timing above if you like — this does{" "}
        <strong className="text-fg">not</strong> change the spacing score. Not a forecast.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1 text-[0.65rem] font-medium text-dim hover:text-primary"
          onClick={() => setOpenTech((v) => !v)}
          aria-expanded={openTech}
        >
          {openTech ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          How this is computed
        </button>
        <button
          type="button"
          className="ww-btn min-h-9 text-[0.65rem]"
          onClick={() => setTab("solar")}
          title="Open Solar · Magneto (Cordaro INTERMAGNET)"
        >
          <Orbit className="h-3 w-3" />
          Magneto desk
        </button>
      </div>

      {openTech && (
        <div className="mt-2 space-y-1.5 rounded-md border border-border/70 bg-bg/40 px-2.5 py-2 text-[0.62rem] leading-relaxed text-muted">
          <p>
            Mean synodic month {29.530588853} d from JD new-moon epoch 2451550.1 (2000-01-06). Age →
            illumination via (1 − cos θ)/2; phase labels from age sectors. Elongation ≈ 360 ×
            age/synodic.
          </p>
          <p>
            Precision is UI-grade (~hours). For magnetic field series linked to Sun–Earth context,
            use the <strong className="text-fg">Magneto</strong> desk (Cordaro / INTERMAGNET) — ground
            data, not sky geometry.
          </p>
          <p className="font-mono text-dim">
            JD {snap.jd.toFixed(4)} · phase {snap.phaseId} · {snap.aspectTag}
          </p>
        </div>
      )}
    </section>
  );
}
