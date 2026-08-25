import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchGoesXrayPlotFn } from "@/lib/feeds/solarProxy";
import {
  classPair,
  GOES_XRAY_WINDOWS,
  XRAY_BANDS,
  type GoesXrayPlot,
  type GoesXrayWindow,
} from "@/lib/feeds/goesXray";
import { fluxToClass } from "@/lib/feeds/swpc";
import { Loader2, Sun } from "lucide-react";

type Props = {
  compact?: boolean;
  onOpenFull?: () => void;
};

const cache = new Map<GoesXrayWindow, { at: number; plot: GoesXrayPlot }>();
const TTL = 45_000;

export function GoesXrayDesk({ compact = false, onOpenFull }: Props) {
  const [window, setWindow] = useState<GoesXrayWindow>("1d");
  const [plot, setPlot] = useState<GoesXrayPlot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show18, setShow18] = useState(true);
  const [show19, setShow19] = useState(true);

  useEffect(() => {
    let live = true;
    const hit = cache.get(window);
    if (hit && Date.now() - hit.at < TTL) {
      setPlot(hit.plot);
      setErr(null);
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        const p = await fetchGoesXrayPlotFn({ data: { window } });
        if (!live) return;
        cache.set(window, { at: Date.now(), plot: p });
        setPlot(p);
        setErr(null);
      } catch (e) {
        if (!live) return;
        setErr(e instanceof Error ? e.message : "X-ray feed failed");
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [window]);

  const windows = compact ? GOES_XRAY_WINDOWS.filter((w) => w.id === "6h" || w.id === "1d") : GOES_XRAY_WINDOWS;
  const height = compact ? 220 : 280;
  const sat18 = plot?.primarySat ?? 18;
  const sat19 = plot?.secondarySat ?? 19;

  const tip = useMemo(
    () => ({
      background: "#0f172a",
      border: "1px solid #334155",
      borderRadius: 8,
      fontSize: 12,
    }),
    [],
  );

  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Sun className="h-4 w-4 text-gold" />
            GOES X-ray
          </h3>
          <p className="mt-0.5 text-[0.62rem] text-dim">
            Log flux · A–X bands · watch the rise — not a forecast
          </p>
        </div>
        {compact && onOpenFull && (
          <button type="button" className="ww-btn min-h-9 text-[0.68rem]" onClick={onOpenFull}>
            Full X-ray
          </button>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-1" role="tablist" aria-label="X-ray window">
        {windows.map((w) => (
          <button
            key={w.id}
            type="button"
            role="tab"
            aria-selected={window === w.id}
            onClick={() => setWindow(w.id)}
            className={`min-h-9 min-w-[2.6rem] rounded-md px-2.5 text-[0.72rem] font-semibold ${
              window === w.id
                ? "bg-gold text-black"
                : "border border-border bg-elevated text-muted hover:text-fg"
            }`}
          >
            {w.label}
          </button>
        ))}
        {!compact && (
          <span
            className="inline-flex min-h-9 items-center rounded-md border border-border/70 px-2 text-[0.62rem] text-dim"
            title="NOAA SWPC public JSON tops out at 7 days"
          >
            30d n/a
          </span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[0.68rem]">
        <span className="text-dim">Satellites:</span>
        <button
          type="button"
          onClick={() => setShow18((v) => !v)}
          className={`rounded-full px-2.5 py-1 font-semibold ${
            show18 ? "bg-cyan-500 text-black" : "border border-border text-muted"
          }`}
        >
          GOES-{sat18}
        </button>
        <button
          type="button"
          onClick={() => setShow19((v) => !v)}
          className={`rounded-full px-2.5 py-1 font-semibold ${
            show19 ? "bg-orange-400 text-black" : "border border-border text-muted"
          }`}
        >
          GOES-{sat19}
        </button>
      </div>

      {plot && (
        <div className="mb-2 grid gap-1.5 sm:grid-cols-2">
          {show18 && (
            <div className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 font-mono text-[0.75rem] text-cyan-200">
              GOES-{sat18} {classPair(plot.latest.pl, plot.latest.ps)}
            </div>
          )}
          {show19 && (
            <div className="rounded-md border border-orange-400/40 bg-orange-400/10 px-2.5 py-1.5 font-mono text-[0.75rem] text-orange-200">
              GOES-{sat19} {classPair(plot.latest.sl, plot.latest.ss)}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        {busy && !plot && (
          <div className="flex h-[12rem] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading GOES XRS…
          </div>
        )}
        {err && !plot && <p className="py-6 text-center text-sm text-danger">{err}</p>}
        {plot && plot.series.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={plot.series} margin={{ top: 6, right: 22, left: 0, bottom: 4 }}>
                {XRAY_BANDS.map((b) => (
                  <ReferenceArea
                    key={b.id}
                    y1={b.y1}
                    y2={b.y2}
                    fill={b.fill}
                    fillOpacity={0.45}
                    ifOverflow="extendDomain"
                  />
                ))}
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.55} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  scale="log"
                  domain={[1e-9, 5e-4]}
                  ticks={[1e-8, 1e-7, 1e-6, 1e-5, 1e-4]}
                  allowDataOverflow
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickFormatter={(v: number) => {
                    if (v >= 1e-4) return "1e-4";
                    if (v >= 1e-5) return "1e-5";
                    if (v >= 1e-6) return "1e-6";
                    if (v >= 1e-7) return "1e-7";
                    return "1e-8";
                  }}
                  width={44}
                />
                <Tooltip
                  contentStyle={tip}
                  formatter={(value, name) => {
                    const n = Number(value);
                    if (!Number.isFinite(n)) return ["—", String(name)];
                    return [fluxToClass(n), String(name)];
                  }}
                />
                {show18 && (
                  <Line
                    type="monotone"
                    dataKey="pl"
                    name={`GOES-${sat18} long`}
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
                {show18 && (
                  <Line
                    type="monotone"
                    dataKey="ps"
                    name={`GOES-${sat18} short`}
                    stroke="#67e8f9"
                    strokeWidth={1.1}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
                {show19 && (
                  <Line
                    type="monotone"
                    dataKey="sl"
                    name={`GOES-${sat19} long`}
                    stroke="#fb923c"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
                {show19 && (
                  <Line
                    type="monotone"
                    dataKey="ss"
                    name={`GOES-${sat19} short`}
                    stroke="#fdba74"
                    strokeWidth={1.1}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            <div
              className="pointer-events-none absolute right-0 top-2 bottom-7 flex flex-col justify-between py-1 pr-0.5 text-[0.7rem] font-bold leading-none"
              aria-hidden
            >
              <span className="text-red-400">X</span>
              <span className="text-amber-400">M</span>
              <span className="text-lime-400">C</span>
              <span className="text-teal-300">B</span>
              <span className="text-emerald-400">A</span>
            </div>
          </>
        )}
        {busy && plot && (
          <div className="absolute right-8 top-2 text-dim">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        )}
      </div>

      <p className="mt-1.5 text-[0.62rem] leading-relaxed text-dim">
        {plot?.note ?? "NOAA SWPC GOES XRS"}
        {". "}
        Long channel (thicker) is the flare class. Short channel sits lower. Crossing 1e-4 is
        X-class in progress — this desk does not predict it.
      </p>
    </section>
  );
}
