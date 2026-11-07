import { useEffect, useState } from "react";
import { Compass, ExternalLink } from "lucide-react";
import { fetchEcdoPoints } from "@/lib/feeds/eopProxy";
import { ECDO_STATE2, type EcdoPoints } from "@/lib/geo/polarMotion";
import { useObservatory } from "@/store/observatory";
import { XPerson } from "@/components/ui/XProfileLink";

function meters(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(2)} km`;
  if (n < 1) return `${Math.round(n * 100)} cm`;
  return `${Math.round(n)} m`;
}

function mas(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n)} mas`;
}

/**
 * Hypothesis desk. IERS polar motion and a Chandler-band fit.
 * The State-2 coordinate is the ECDO claim, not a measured pole.
 */
export function EcdoTestDesk() {
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const setTab = useObservatory((s) => s.setTab);
  const [points, setPoints] = useState<EcdoPoints | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancel = false;
    void fetchEcdoPoints()
      .then((d) => {
        if (cancel) return;
        setPoints(d);
        if (!d) setErr("IERS polar motion did not return");
      })
      .catch((e) => {
        if (!cancel) setErr(e instanceof Error ? e.message : "IERS failed");
      })
      .finally(() => {
        if (!cancel) setBusy(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const ratio =
    points?.chandlerRecentMas != null &&
    points.chandlerRefMas != null &&
    points.chandlerRefMas > 0
      ? points.chandlerRecentMas / points.chandlerRefMas
      : null;

  return (
    <section className="rounded-xl border border-accent/30 bg-panel p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-accent">ECDO test points</h3>
        <p className="text-[0.62rem] text-dim">
          Hypothesis · not an agency call · not a flip time
        </p>
      </div>
      <p className="mt-1 text-[0.68rem] leading-relaxed text-muted">
        Research acknowledged:{" "}
        <XPerson profile="ethicalskeptic" withAvatar={false} />. ECDO — Exothermic
        Core-Mantle Decoupling, Dzhanibekov oscillation — is his hypothesis. This
        desk only reads IERS Earth orientation against that question: where the
        geographic pole is, how far it moved, and how strong the 433-day Chandler
        band is. A low wobble is a measurement. It is not his conclusion, and it
        is not a date for a 104° turn.
      </p>

      {busy && <p className="mt-2 text-[0.68rem] text-dim">Reading IERS…</p>}
      {err && <p className="mt-2 text-[0.68rem] text-danger">{err}</p>}

      {points && (
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <Stat
            k="Geographic pole"
            v={`${points.xArcsec.toFixed(3)}″ x · ${points.yArcsec.toFixed(3)}″ y`}
            s={points.asOf}
          />
          <Stat
            k="LOD excess"
            v={points.lodMs != null ? `${points.lodMs.toFixed(3)} ms` : "—"}
            s={points.lodAsOf ? `Bulletin A · ${points.lodAsOf}` : "Bulletin A · milliseconds"}
          />
          <Stat
            k="14-day pole"
            v={`${meters(points.net14m)} net · ${meters(points.path14m)} path`}
            s={
              points.r2_14 != null
                ? `linear R² ${points.r2_14.toFixed(2)} (weaker of x, y)`
                : "net shift, not a forecast"
            }
          />
          <Stat
            k="90-day pole"
            v={`${meters(points.net90m)} net · ${meters(points.path90m)} path`}
            s="IERS observed days only"
          />
          <Stat
            k="Chandler band"
            v={mas(points.chandlerRecentMas)}
            s={points.recentSpan}
          />
          <Stat
            k="1985–1994 band"
            v={mas(points.chandlerRefMas)}
            s={
              ratio != null
                ? `recent is ${(ratio * 100).toFixed(0)}% of that band`
                : points.refSpan
            }
          />
        </dl>
      )}

      {points && points.track.length > 1 && (
        <PoleTrack
          pts={points.track}
          wander={points.wanderMperYear}
          step={points.stepM}
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="ww-btn min-h-8 text-[0.65rem]"
          onClick={() => {
            flyMapTo(ECDO_STATE2.lat, ECDO_STATE2.lon, 3);
            setTab("live");
          }}
        >
          <Compass className="h-3 w-3" />
          State-2 claim · 14°S 31°E
        </button>
        <a
          href="https://datacenter.iers.org/products/eop/long-term/c04_14/iau2000/eopc04_14_IAU2000.62-now"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[0.62rem] text-primary hover:underline"
        >
          IERS C04 <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href="https://theethicalskeptic.com/2024/05/23/master-exothermic-core-mantle-decoupling-dzhanibekov-oscillation-theory/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[0.62rem] text-primary hover:underline"
        >
          Ethical Skeptic · ECDO <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="mt-2 text-[0.6rem] leading-relaxed text-dim">
        State-2 is the hypothesis geometry: 104° from the north pole along 31°E.
        Not observed. Not on this map as a pole. C04 Chandler fit runs through{" "}
        {points?.c04Through ?? "the last IERS release"}; the live pole is Bulletin A.
        This desk does not score the South Atlantic Anomaly, monument alignments,
        or a flip timetable.
      </p>
    </section>
  );
}

function Stat({ k, v, s }: { k: string; v: string; s: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-bg/40 px-2.5 py-1.5">
      <dt className="text-[0.58rem] font-semibold uppercase tracking-wide text-dim">{k}</dt>
      <dd className="font-mono text-sm font-semibold tabular-nums text-fg">{v}</dd>
      <dd className="text-[0.58rem] text-dim">{s}</dd>
    </div>
  );
}

function PoleTrack({
  pts,
  wander,
  step,
}: {
  pts: { d: string; x: number; y: number }[];
  wander: number | null;
  step: number | null;
}) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const padX = Math.max(0.004, (maxX - minX) * 0.08);
  const padY = Math.max(0.004, (maxY - minY) * 0.08);
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;
  const W = 360;
  const H = 210;
  const sx = (x: number) => ((x - minX) / (maxX - minX)) * (W - 36) + 28;
  const sy = (y: number) => H - 18 - ((y - minY) / (maxY - minY)) * (H - 32);
  const d = pts
    .map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1]!;
  const first = pts[0]!;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          Polar motion
        </h4>
        <p className="text-[0.58rem] text-dim">
          {first.d} → {last.d} · IERS daily · not a minute feed
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full text-primary" role="img" aria-label="Geographic pole path">
        <line x1={28} y1={sy(0)} x2={W - 8} y2={sy(0)} stroke="#334155" strokeWidth="0.6" />
        <line x1={sx(0)} y1={14} x2={sx(0)} y2={H - 18} stroke="#334155" strokeWidth="0.6" />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx={sx(first.x)} cy={sy(first.y)} r="2.2" fill="#64748b" />
        <circle cx={sx(last.x)} cy={sy(last.y)} r="3.4" fill="#f87171" />
        <text x={W - 8} y={H - 4} textAnchor="end" fill="#64748b" fontSize="9">
          x″ toward Greenwich
        </text>
        <text x={4} y={12} fill="#64748b" fontSize="9">
          y″
        </text>
      </svg>
      <p className="text-[0.6rem] text-dim">
        Red is the latest observed day
        {step != null ? ` · last step ${meters(step)}` : ""}. Drift of this path{" "}
        {wander != null ? `${wander.toFixed(2)} m/year` : "—"} (linear fit, so the wobble mostly
        cancels). That is polar motion, not a measured mantle flip.
      </p>
    </div>
  );
}
