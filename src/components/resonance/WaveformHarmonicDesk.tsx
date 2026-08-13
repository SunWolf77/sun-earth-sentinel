/**
 * On-demand IRIS BHZ → same Tremor/Mixed/Fracture bands as the SAC pipeline.
 * Manual laptop work: download SAC, run ObsPy, drop CSVs in Downloads.
 * This desk: pick an event, one nearest station, fingerprint + local compare.
 */

import { useMemo, useState } from "react";
import { Activity, Loader2, Radio } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { fetchIrisTrace } from "@/lib/seismology/irisProxy";
import {
  bandPercents,
  cosine3,
  rfftMag,
  sparkBins,
  type WaveFingerprint,
} from "@/lib/seismology/harmonicSpectrum";
import { loadPrints, savePrint } from "@/lib/seismology/harmonicStore";

function magLabel(m: number | null): string {
  return m != null && Number.isFinite(m) ? `M${m.toFixed(1)}` : "M–";
}

export function WaveformHarmonicDesk() {
  const picked = useObservatory((s) => s.pickedEvent);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [print, setPrint] = useState<WaveFingerprint | null>(null);
  const [spark, setSpark] = useState<{ f: number; a: number }[]>([]);
  const [log, setLog] = useState<WaveFingerprint[]>(() =>
    typeof window === "undefined" ? [] : loadPrints(),
  );

  const peers = useMemo(() => {
    if (!print) return [];
    return log
      .filter((p) => p.eventId !== print.eventId)
      .map((p) => ({ p, r: cosine3(print, p) }))
      .sort((a, b) => b.r - a.r)
      .slice(0, 4);
  }, [print, log]);

  const run = async () => {
    if (!picked?.time) {
      setErr("Pick an event on the map first");
      return;
    }
    if ((picked.mag ?? 0) > 0 && (picked.mag ?? 0) < 4.5) {
      setErr("M4.5+ only — weak events rarely have a clean BHZ window");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const tr = await fetchIrisTrace({
        data: { lat: picked.lat, lon: picked.lon, time: picked.time },
      });
      if (!tr.ok || !tr.samples?.length || !tr.station || !tr.sps) {
        setErr(tr.error || "No IRIS trace");
        setPrint(null);
        return;
      }
      const spec = rfftMag(tr.samples, 1 / tr.sps);
      const bands = bandPercents(spec);
      const fp: WaveFingerprint = {
        eventId: picked.id,
        mag: picked.mag,
        place: picked.place,
        time: picked.time,
        lat: picked.lat,
        lon: picked.lon,
        net: tr.station.net,
        sta: tr.station.sta,
        loc: tr.station.loc,
        cha: tr.station.cha,
        elevM: tr.station.elevM,
        distDeg: tr.station.distDeg,
        sps: tr.sps,
        npts: tr.samples.length,
        ...bands,
        fetchedAt: Date.now(),
      };
      setPrint(fp);
      setSpark(sparkBins(spec));
      setLog(savePrint(fp));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Trace failed");
    } finally {
      setBusy(false);
    }
  };

  const maxA = spark.reduce((m, b) => Math.max(m, b.a), 0) || 1;

  return (
    <section className="rounded-xl border border-accent/30 bg-panel p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Radio className="h-4 w-4" />
            Waveform bands
          </h3>
          <p className="mt-0.5 text-[0.65rem] leading-snug text-dim">
            Same 0.5–5 / 5–15 / 15–40 Hz split as the SAC laptop pipeline. One nearest BHZ via
            EarthScope dataselect (GeoCSV), 150 s after origin. On-demand — not a live stream.

          </p>
        </div>
        <button
          type="button"
          className="ww-btn min-h-9 shrink-0 text-[0.68rem]"
          disabled={busy || !picked}
          onClick={() => void run()}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
          {picked ? "Read nearest BHZ" : "Pick an event"}
        </button>
      </div>

      {picked && (
        <p className="mt-2 text-[0.68rem] text-muted">
          Target: {magLabel(picked.mag)} · {picked.place}
        </p>
      )}
      {err && <p className="mt-2 text-[0.68rem] text-danger">{err}</p>}

      {print && (
        <div className="mt-3 space-y-2">
          <p className="font-mono text-[0.65rem] text-dim">
            {print.net}.{print.sta}.{print.loc}.{print.cha}
            {print.elevM != null ? ` · ${Math.round(print.elevM)} m` : ""} ·{" "}
            {print.distDeg.toFixed(1)}° · {print.npts} samples · {print.sps.toFixed(1)} Hz
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[0.65rem]">
            <BandCell label="Tremor 0.5–5" pct={print.tremorPct} />
            <BandCell label="Mixed 5–15" pct={print.mixedPct} />
            <BandCell label="Fracture 15–40" pct={print.fracturePct} />
          </div>
          {spark.length > 0 && (
            <div className="flex h-12 items-end gap-px rounded-md border border-border/70 bg-bg/40 px-1 py-1">
              {spark.map((b, i) => (
                <div
                  key={i}
                  className="min-w-0 flex-1 rounded-sm bg-accent/70"
                  style={{ height: `${Math.max(4, (b.a / maxA) * 100)}%` }}
                  title={`${b.f.toFixed(2)} Hz`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {peers.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-dim">
            Cosine vs saved prints
          </p>
          <ul className="mt-1 space-y-0.5">
            {peers.map(({ p, r }) => (
              <li key={p.eventId} className="flex justify-between gap-2 text-[0.65rem] text-muted">
                <span className="min-w-0 truncate">
                  {magLabel(p.mag)} · {p.place}
                </span>
                <span className="shrink-0 font-mono text-fg">r={r.toFixed(3)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[0.58rem] text-dim">
            Cosine on the 3-band vector (not Pearson on n=3). High r means similar energy split —
            same instrument class can do that. Not a cascade claim.
          </p>
        </div>
      )}
    </section>
  );
}

function BandCell({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="rounded-md border border-border/80 bg-bg/50 px-1.5 py-1.5">
      <div className="text-[0.55rem] text-dim">{label}</div>
      <div className="font-mono text-sm font-semibold text-fg">{pct.toFixed(1)}%</div>
    </div>
  );
}
