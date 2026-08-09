import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, ExternalLink, Magnet, RefreshCw } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { MAG_STATIONS, getStation } from "@/lib/magneto/stations";
import {
  assessMagneto,
  seriesFromProcessed,
  type MagAssessment,
} from "@/lib/magneto/analyze";
import { fetchDrmagnetoChart } from "@/lib/magneto/proxy";
import { scanDrmagnetoSteps, scanSuddenSteps, type SscScanResult } from "@/lib/magneto/ssc";
import { fetchGoesMagnetometer } from "@/lib/feeds/goesMagneto";
import { INTERMAGNET_FORMATS } from "@/lib/magneto/intermagnetFormats";
import { XHandle } from "@/components/ui/XProfileLink";
import { formatUtc } from "@/lib/utils";
import { GicExplainer } from "@/components/magneto/GicExplainer";
import { IgrfFieldNote } from "@/components/magneto/IgrfFieldNote";
import { Igrf14Explorer } from "@/components/magneto/Igrf14Explorer";
import { Wmm2025Sampler } from "@/components/magneto/Wmm2025Sampler";

/**
 * Magnetic anomaly desk — data via Richard Cordaro’s public INTERMAGNET tool
 * (drmagneto.appspot.com). Quake matches are exploratory time/distance co-incidence only.
 */
export function MagnetoPanel({ compact = false }: { compact?: boolean }) {
  const eq = useObservatory((s) => s.eq);
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const setTab = useObservatory((s) => s.setTab);
  const pickEvent = useObservatory((s) => s.pickEvent);

  const [station, setStation] = useState("HYB");
  const [threshold, setThreshold] = useState(0.4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawSeries, setRawSeries] = useState<
    { t: number; v: number; raw?: number }[]
  >([]);
  const [fullSeries, setFullSeries] = useState<
    { t: number; v: number; raw?: number }[]
  >([]);
  const [meta, setMeta] = useState<{ name: string; source: string } | null>(null);
  const [assessment, setAssessment] = useState<MagAssessment | null>(null);
  const [sscResult, setSscResult] = useState<SscScanResult | null>(null);
  const [goesSsc, setGoesSsc] = useState<SscScanResult | null>(null);
  const [showFormats, setShowFormats] = useState(false);

  const stMeta = getStation(station) ?? MAG_STATIONS[0]!;

  const load = async (code = station, thr = threshold) => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchDrmagnetoChart({
        data: { station: code, threshold: thr },
      });
      if (d.error || !d.processed_data.length) {
        setRawSeries([]);
        setAssessment(null);
        setMeta(null);
        setError(d.error || "No data for this station right now");
        return;
      }
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const series = seriesFromProcessed(
        d.processed_data,
        d.raw_data,
        dayStart.getTime(),
      );
      // downsample for chart perf (~5 min)
      const step = Math.max(1, Math.floor(series.length / 288));
      const chart = series.filter((_, i) => i % step === 0);
      setFullSeries(series);
      setRawSeries(chart);
      setMeta({ name: d.station_name, source: d.data_source });
      const st = getStation(code) ?? {
        code,
        name: d.station_name,
        lat: 0,
        lon: 0,
        region: "?",
      };
      setAssessment(
        assessMagneto({
          station: st,
          series,
          threshold: thr,
          features: eq?.features ?? [],
        }),
      );
      // Prefer raw H for step scan when present
      const stepSeries =
        series[0]?.raw != null
          ? series.map((p) => ({ t: p.t, v: p.raw ?? p.v }))
          : series.map((p) => ({ t: p.t, v: p.v }));
      setSscResult(
        series[0]?.raw != null
          ? scanSuddenSteps(stepSeries, {
              stepSec: 180,
              minAbs: 8,
              source: "ground-H",
              unit: "nT-ish",
            })
          : scanDrmagnetoSteps(stepSeries, Math.max(0.25, thr * 0.8)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Magneto fetch failed");
      setRawSeries([]);
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void (async () => {
      const goes = await fetchGoesMagnetometer();
      if (!goes.length) {
        setGoesSsc(null);
        return;
      }
      // last 12h, 1-min samples
      const cut = Date.now() - 12 * 3600_000;
      const series = goes.filter((g) => g.t >= cut && !g.arcjet_flag).map((g) => ({
        t: g.t,
        v: g.Hp,
      }));
      setGoesSsc(
        scanSuddenSteps(series, {
          stepSec: 180,
          minAbs: 12,
          source: "goes-Hp",
          unit: "nT",
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-match when quake catalog updates
  useEffect(() => {
    if (!fullSeries.length) return;
    const st = getStation(station);
    if (!st) return;
    setAssessment(
      assessMagneto({
        station: st,
        series: fullSeries,
        threshold,
        features: eq?.features ?? [],
      }),
    );
  }, [eq?.features, fullSeries, station, threshold]);

  const chartData = useMemo(
    () =>
      rawSeries.map((p) => ({
        t: p.t,
        v: p.v,
        label: new Date(p.t).toISOString().slice(11, 16),
      })),
    [rawSeries],
  );

  if (compact) {
    return (
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-2.5 text-[0.72rem]">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-accent">
            <Magnet className="h-3.5 w-3.5" /> Magneto
          </span>
          <button
            type="button"
            className="ww-btn min-h-8 px-2 text-[0.62rem]"
            onClick={() => setTab("solar")}
          >
            Open
          </button>
        </div>
        <p className="text-dim">
          Cordaro-style INTERMAGNET relative probability · quake match exploratory
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-accent/30 bg-panel p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Magnet className="h-4 w-4" />
            Magnetic anomalies
          </h3>
          <p className="mt-0.5 text-[0.68rem] text-dim">
            INTERMAGNET via{" "}
            <a
              href="https://drmagneto.appspot.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              drmagneto.appspot.com
            </a>{" "}
            · method & public tool by{" "}
            <XHandle profile="cordaro" /> · data matching
            to catalog quakes is exploratory only
          </p>
        </div>
        <a
          href="https://drmagneto.appspot.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="ww-btn min-h-9 text-[0.68rem]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Full tool
        </a>
      </div>

      <GicExplainer />
      <Igrf14Explorer />
      <IgrfFieldNote />
      <Wmm2025Sampler />

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[0.65rem] text-dim">
          Station
          <select
            className="mt-0.5 block min-h-9 rounded-md border border-border bg-bg px-2 text-sm text-fg"
            value={station}
            onChange={(e) => setStation(e.target.value)}
          >
            {MAG_STATIONS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
                {s.priority ? " ★" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[0.65rem] text-dim">
          Threshold
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="mt-1 block w-36 accent-violet-400"
          />
          <span className="font-mono text-fg">{threshold.toFixed(2)}</span>
        </label>
        <button
          type="button"
          className="ww-btn min-h-9 text-[0.68rem]"
          disabled={loading}
          onClick={() => void load(station, threshold)}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Load / match
        </button>
        <button
          type="button"
          className="ww-btn min-h-9 text-[0.68rem]"
          onClick={() => flyMapTo(stMeta.lat, stMeta.lon, 4)}
        >
          Show station
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-warn/40 bg-warn/10 px-2.5 py-1.5 text-xs text-warn">
          {error}
          {/e1|No valid|400/i.test(error)
            ? " — try HYB, IZN, or another star station; drmagneto availability varies by day."
            : ""}
        </p>
      )}

      {meta && (
        <p className="text-[0.68rem] text-muted">
          <strong className="text-fg">{meta.name}</strong> ({station}) · component{" "}
          {meta.source || "H"} · {stMeta.region} · {chartData.length} chart pts
        </p>
      )}

      {assessment && (
        <div className="rounded-lg border border-border bg-bg/40 px-3 py-2 text-xs text-muted">
          <p className="font-medium text-fg">{assessment.plain}</p>
          <p className="mt-1 text-[0.65rem] text-dim">{assessment.caveat}</p>
          <div className="mt-2 flex flex-wrap gap-3 font-mono text-[0.7rem]">
            <span>peak {assessment.peak.toFixed(2)}</span>
            <span>mean {assessment.mean.toFixed(3)}</span>
            <span>
              ≥thr {assessment.aboveCount}/{assessment.n}
            </span>
            <span>peaks {assessment.peaks.length}</span>
            <span>matches {assessment.matches.length}</span>
          </div>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="h-48 w-full sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748b" }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                width={32}
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  fontSize: 12,
                }}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { t?: number } | undefined;
                  return p?.t ? formatUtc(p.t) : "";
                }}
              />
              <ReferenceLine
                y={threshold}
                stroke="#a78bfa"
                strokeDasharray="4 4"
                label={{ value: "thr", fill: "#a78bfa", fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="v"
                name="Relative"
                stroke="#a78bfa"
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(sscResult || goesSsc) && (
        <div className="rounded-lg border border-border bg-bg/40 px-3 py-2 text-xs text-muted">
          <h4 className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
            Sudden commencement / SI watch
          </h4>
          <p className="text-[0.65rem] text-dim">
            Heuristic step scan (not Kyoto/ISGI official SSC lists). Pressure pulses → step in H /
            GOES Hp; if a storm follows, archives call it SSC.
          </p>
          {sscResult && (
            <p className="mt-1.5 text-fg">
              <strong className="text-accent">Ground/tool:</strong> {sscResult.plain}
            </p>
          )}
          {goesSsc && (
            <p className="mt-1 text-fg">
              <strong className="text-primary">GOES Hp (SWPC):</strong> {goesSsc.plain}
            </p>
          )}
          {goesSsc && goesSsc.candidates[0] && (
            <p className="mt-1 font-mono text-[0.65rem] text-dim">
              Largest GOES step: {goesSsc.candidates[0].note} ·{" "}
              {new Date(goesSsc.candidates[0].t).toISOString()}
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border/80 bg-bg/30 px-3 py-2">
        <button
          type="button"
          className="text-[0.7rem] font-semibold text-primary hover:underline"
          onClick={() => setShowFormats((v) => !v)}
        >
          {showFormats ? "Hide" : "Show"} INTERMAGNET data formats
        </button>
        {showFormats && (
          <ul className="mt-2 space-y-1.5 text-[0.65rem] text-muted">
            {INTERMAGNET_FORMATS.map((f) => (
              <li key={f.id} className="rounded-md border border-border/60 bg-panel/50 px-2 py-1.5">
                <span className="font-semibold text-fg">{f.name}</span>
                <span className="text-dim"> · {f.cadence}</span>
                <p>{f.use}</p>
                <p className="text-dim">{f.notes}</p>
                <p className="text-[0.6rem] text-dim">Credit: {f.credit}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {assessment && assessment.matches.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
            <Activity className="h-3.5 w-3.5" />
            Peak ↔ quake matches
          </h4>
          <ul className="scroll-thin max-h-48 space-y-1 overflow-y-auto">
            {assessment.matches.slice(0, 12).map((m) => (
              <li key={`${m.quake.id}-${m.peak.t}`}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-border/70 bg-bg/50 px-2 py-1.5 text-left text-[0.7rem] hover:bg-elevated"
                  onClick={() => {
                    pickEvent({
                      id: m.quake.id,
                      lat: m.quake.lat,
                      lon: m.quake.lon,
                      mag: m.quake.mag,
                      place: m.quake.place,
                      depth: m.quake.depth,
                      time: m.quake.time,
                    });
                    flyMapTo(m.quake.lat, m.quake.lon, 5, m.quake.id);
                    setTab("live");
                  }}
                >
                  <span className="font-semibold text-fg">
                    M{m.quake.mag.toFixed(1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {m.quake.place}
                  </span>
                  <span className="font-mono text-dim">
                    lag {m.lagMin >= 0 ? "+" : ""}
                    {m.lagMin.toFixed(0)}m · {Math.round(m.distKm)} km · peak{" "}
                    {m.peak.v.toFixed(2)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
