/**
 * Field coupling — the reason this app exists.
 * Flares × large ruptures × antipodal geometry. Human reads; we measure.
 */

import { useEffect, useMemo, useState } from "react";
import { Compass, ExternalLink, Loader2, Sun, Waypoints } from "lucide-react";
import { useObservatory, type PickedEvent } from "@/store/observatory";
import type { EqFeature } from "@/lib/feeds/usgs";
import {
  buildCouplingReport,
  fetchMonthM45,
  type CouplingQuake,
  type CouplingReport,
  type CouplingThread,
} from "@/lib/ops/fieldCoupling";
import { requestFocus } from "@/lib/ops/focusNav";

function toPicked(q: CouplingQuake): PickedEvent {
  return {
    id: q.id,
    lat: q.lat,
    lon: q.lon,
    mag: q.mag,
    place: q.place,
    depth: q.depth,
    time: q.time,
    url: q.url,
  };
}

function utcShort(ms: number): string {
  try {
    return new Date(ms).toISOString().replace("T", " ").slice(0, 16) + "Z";
  } catch {
    return "—";
  }
}

const VERDICT: Record<CouplingThread["verdict"], { label: string; cls: string }> = {
  read: { label: "Read this", cls: "border-warn/45 bg-warn/10 text-warn" },
  look: { label: "Worth a look", cls: "border-gold/40 bg-gold/10 text-gold" },
  background: { label: "Background", cls: "border-border bg-panel text-muted" },
};

function ThreadList({
  title,
  hint,
  threads,
  empty,
  onOpen,
  mute = false,
}: {
  title: string;
  hint: string;
  threads: CouplingThread[];
  empty: string;
  onOpen: (t: CouplingThread) => void;
  mute?: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="mb-1.5">
        <h4 className="text-[0.68rem] font-semibold uppercase tracking-wider text-primary">
          {title}
        </h4>
        <p className="text-[0.58rem] text-dim">{hint}</p>
      </div>
      {threads.length === 0 ? (
        <p className="text-[0.68rem] text-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const v = mute
              ? { label: "Geometry", cls: "border-border bg-elevated/40 text-muted" }
              : VERDICT[t.verdict];
            return (
              <article key={t.id} className={`rounded-lg border px-2.5 py-2 ${v.cls}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <p className="text-[0.78rem] font-semibold text-fg">{t.headline}</p>
                  <span className="text-[0.58rem] font-semibold uppercase tracking-wider">
                    {v.label}
                    {!mute && ` · ${t.attention}`}
                  </span>
                </div>
                <p className="mt-1 text-[0.65rem] leading-snug text-muted">{t.reading}</p>
                {t.antipode && (
                  <p className="mt-1 font-mono text-[0.6rem] text-dim">
                    offset {t.antipode.offsetDeg.toFixed(1)}° · {t.antipode.lagHours.toFixed(0)} h apart
                    · sep {t.antipode.sepDeg.toFixed(1)}°
                  </p>
                )}
                {t.lagHours != null && t.kind === "sun-led" && !t.antipode && (
                  <p className="mt-1 font-mono text-[0.6rem] text-dim">
                    lag {t.lagHours.toFixed(0)} h after X-ray peak
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="ww-btn min-h-8 text-[0.62rem]"
                    onClick={() => onOpen(t)}
                  >
                    <Compass className="h-3 w-3" />
                    {t.antipode ? "Show antipode pair" : "Show on map"}
                  </button>
                  {t.flare?.link && (
                    <a
                      href={t.flare.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border px-2 text-[0.62rem] text-muted"
                    >
                      <Sun className="h-3 w-3" />
                      DONKI X-ray {t.flare.classType}
                    </a>
                  )}
                  {t.quakes[0]?.url && (
                    <a
                      href={t.quakes[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border px-2 text-[0.62rem] text-muted"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Agency
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FieldCouplingDesk({ compact = false }: { compact?: boolean }) {
  const donki = useObservatory((s) => s.donki);
  const eq = useObservatory((s) => s.eq);
  const pickEvent = useObservatory((s) => s.pickEvent);
  const antipodeOf = useObservatory((s) => s.antipodeOf);
  const setTab = useObservatory((s) => s.setTab);
  const [month, setMonth] = useState<EqFeature[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setBusy(true);
    void fetchMonthM45()
      .then((feats) => {
        if (live) setMonth(feats);
      })
      .catch((e) => {
        if (live) setErr(e instanceof Error ? e.message : "month catalog failed");
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const report = useMemo<CouplingReport>(() => {
    const features = [...(month ?? []), ...(eq?.features ?? [])];
    return buildCouplingReport({
      flares: donki?.flares ?? [],
      cmes: donki?.cmes ?? [],
      features,
      windowDays: 14,
    });
  }, [donki, eq, month]);

  const sunLed = report.threads.filter((t) => t.kind === "sun-led");
  const geometry = report.threads.filter((t) => t.kind === "geometry");
  const top = sunLed[0] ?? null;

  const openThread = (t: CouplingThread) => {
    const pair = t.antipode;
    if (pair) {
      pickEvent(toPicked(pair.b));
      antipodeOf(pair.a.lat, pair.a.lon);
    } else if (t.quakes[0]) {
      const q = t.quakes[0];
      pickEvent(toPicked(q));
      setTab("live");
    }
  };

  if (compact) {
    if (!top || top.verdict === "background") return null;
    const v = VERDICT[top.verdict];
    return (
      <button
        type="button"
        className={`flex w-full min-h-8 items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[0.62rem] ${v.cls}`}
        onClick={() => {
          setTab("solar");
          requestFocus({ tab: "solar", anchor: "field-coupling" });
        }}
        title={top.reading}
      >
        <Waypoints className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-medium text-fg">{top.headline}</span>
        <span className="shrink-0 uppercase tracking-wide opacity-80">{v.label}</span>
      </button>
    );
  }

  return (
    <section
      id="field-coupling"
      className="rounded-xl border border-accent/35 bg-panel p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Waypoints className="h-4 w-4" />
            Field coupling
          </h3>
          <p className="mt-0.5 text-[0.65rem] leading-snug text-dim">
            Sun first: X-ray M/X-class (GOES) then Mw 6.5+ (USGS), 0–120 h after the peak.
            Antipodes without a preceding flare are geometry, not coupling. Not a forecast.
          </p>
        </div>
        {busy && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-dim" />}
      </div>

      {err && <p className="mt-2 text-[0.68rem] text-danger">{err}</p>}

      <ThreadList
        title="Sun-led"
        hint="X-ray class peaked first. Then Earth."
        threads={sunLed}
        empty="No X-ray M5+ followed by Mw 6.5+ within 120 h. Quiet is a result."
        onOpen={openThread}
      />
      <ThreadList
        title="Antipode geometry"
        hint="Earth–Earth only. No solar lead claimed."
        threads={geometry}
        empty="No two Mw 6.5+ within 40° of antipode this window."
        onOpen={openThread}
        mute
      />

      <details className="mt-3 text-[0.62rem] text-dim">
        <summary className="cursor-pointer font-semibold text-muted">Drivers in window</summary>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          <ul className="space-y-0.5">
            {report.flares.length === 0 && <li>No M5+ flares in DONKI 14 d.</li>}
            {report.flares.slice(0, 6).map((f) => (
              <li key={f.id} className="font-mono">
                X-ray {f.classType} · {utcShort(f.peakMs)}
                {f.sourceLocation ? ` · ${f.sourceLocation}` : ""}
              </li>
            ))}
          </ul>
          <ul className="space-y-0.5">
            {report.quakes.length === 0 && <li>No Mw 6+ in the month catalog.</li>}
            {report.quakes.slice(0, 6).map((q) => (
              <li key={q.id}>
                Mw {q.mag.toFixed(1)} · {q.place} · {utcShort(q.time)}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-2 leading-snug">{report.ringNote}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {report.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
