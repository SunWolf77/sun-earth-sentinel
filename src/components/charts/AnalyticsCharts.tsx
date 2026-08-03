import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { useObservatory, filteredEq } from "@/store/observatory";
import { longChannelXrays } from "@/lib/feeds/swpc";
import { SUPT_ANCHORS } from "@/lib/supt/probe";
import { SuptContinuumStrip } from "@/components/supt/SuptContinuumStrip";
import { RecommendationsPanel } from "@/components/ops/RecommendationsPanel";

/**
 * Analytics = charts AFTER live data/visuals tabs.
 * Leads with shared SUPT continuum (same numbers as Solar / Rhythm), then time series.
 */
export function AnalyticsCharts() {
  const kp = useObservatory((s) => s.kp);
  const xray = useObservatory((s) => s.xray);
  const dijHistory = useObservatory((s) => s.dijHistory);
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const setTab = useObservatory((s) => s.setTab);

  const kpData = kp.slice(-48).map((p) => ({
    t: p.time_tag?.slice(5, 16) ?? "",
    Kp: Number(p.Kp) || 0,
  }));

  const long = longChannelXrays(xray);
  const xrayData = long.slice(-90).map((p) => ({
    t: new Date(p.time_tag).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    flux: Math.log10(Math.max(p.flux || p.observed_flux || 1e-12, 1e-12)),
  }));

  const dijData = dijHistory.map((p) => ({
    t: new Date(p.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    d_ij: p.d_ij,
    z: p.z,
  }));

  const features = filteredEq(eq?.features, minMag, maxMag);
  const buckets = new Map<string, number>();
  for (const f of features) {
    if (!f.properties.time) continue;
    const d = new Date(f.properties.time);
    const key = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, "0")}h`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const rateData = [...buckets.entries()].slice(-24).map(([t, count]) => ({ t, count }));

  const tipStyle = {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
      <header>
        <h2 className="text-lg font-semibold text-primary sm:text-xl">Charts & continuum</h2>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          After Map · Solar · Rhythm — shared SUPT read first, then time series. Same probe, same
          vocabulary.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" className="ww-btn min-h-9 text-[0.68rem]" onClick={() => setTab("live")}>
            Map
          </button>
          <button type="button" className="ww-btn min-h-9 text-[0.68rem]" onClick={() => setTab("solar")}>
            Solar
          </button>
          <button
            type="button"
            className="ww-btn min-h-9 text-[0.68rem]"
            onClick={() => setTab("resonance")}
          >
            Rhythm
          </button>
        </div>
      </header>

      {/* 1. Continuum (analytics of the stack) */}
      <SuptContinuumStrip />

      <RecommendationsPanel />

      <>
          <p className="text-[0.7rem] font-medium uppercase tracking-wider text-dim">
            Time series (supporting visuals)
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Planetary K-index" hint="Geomagnetic · SWPC">
              {kpData.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={kpData}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis domain={[0, 9]} tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip contentStyle={tipStyle} />
                    <ReferenceLine y={5} stroke="#f43f5e" strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="Kp"
                      stroke="#22d3ee"
                      fill="#22d3ee33"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="GOES X-ray (log₁₀)" hint="Long channel · flare context">
              {xrayData.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={xrayData}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip contentStyle={tipStyle} />
                    <ReferenceLine
                      y={-5}
                      stroke="#fb923c"
                      strokeDasharray="4 4"
                      label={{ value: "M", fill: "#fb923c", fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="flux"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Quake rate (hourly)" hint="Filtered catalog">
              {rateData.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={rateData}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip contentStyle={tipStyle} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#34d399"
                      fill="#34d39933"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Rolling seismic dᵢⱼ" hint="Live address · band edges + ζ line are context, not fitted targets">
              {dijData.filter((d) => d.d_ij != null).length === 0 ? (
                <Empty msg="History builds as the probe runs on each refresh." />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dijData}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip contentStyle={tipStyle} />
                    <ReferenceLine
                      y={SUPT_ANCHORS.zetaFloor}
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      label={{
                        value: "ζ floor (context only)",
                        position: "insideTopRight",
                        fill: "#64748b",
                        fontSize: 10,
                      }}
                    />
                    <ReferenceLine y={1} stroke="#22d3ee" strokeDasharray="2 4" />
                    <ReferenceLine y={2} stroke="#a78bfa" strokeDasharray="2 4" />
                    <Line
                      type="monotone"
                      dataKey="d_ij"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      connectNulls
                      dot
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
      </>

      <p className="text-[0.65rem] leading-relaxed text-dim">
        Charts support the continuum — they do not replace SWPC or USGS. SUPT timing structure is
        independent of R/S/G scales and magnitude filters.
      </p>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-panel p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-primary">{title}</h3>
        {hint && <span className="text-[0.62rem] text-dim">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ msg = "No data yet — waiting for feed." }: { msg?: string }) {
  return <p className="py-8 text-center text-sm text-dim">{msg}</p>;
}
