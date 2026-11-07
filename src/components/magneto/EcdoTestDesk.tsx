import { useEffect, useState } from "react";
import { Compass, ExternalLink } from "lucide-react";
import { fetchEcdoPoints } from "@/lib/feeds/eopProxy";
import { ECDO_STATE2, type EcdoPoints } from "@/lib/geo/polarMotion";
import { useObservatory } from "@/store/observatory";

function meters(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(2)} km`;
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
        Exothermic core–mantle decoupling (Ethical Skeptic) says the mantle can
        slip relative to the core. This desk only reads IERS Earth orientation:
        where the geographic pole is, how far it moved, and how strong the
        433-day Chandler band is. A low wobble is a measurement. It is not a
        date for a 104° turn.
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
          ECDO write-up <ExternalLink className="h-3 w-3" />
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
