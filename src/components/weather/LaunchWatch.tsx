import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { fetchCcorFrames, type CcorFrame } from "@/lib/feeds/ccor";
import { diskLaunches, fetchSuvi131, type StillFrame } from "@/lib/feeds/launchWatch";
import { fetchAia171, type AiaFrame } from "@/lib/feeds/aia171";
import { ccorLatest, sdoStill, suviLatest } from "@/lib/feeds/solarMedia";
import { readLiveFlare } from "@/lib/solar/liveFlare";
import { liveChartPeriod } from "@/lib/solar/flareOutlook";
import type { ActiveRegion } from "@/lib/feeds/solarRegions";
import { haleRank } from "@/lib/feeds/solarRegions";
import { diskXY, longitudeAt } from "@/lib/solar/diskPoint";

const AIA = { cx: 99.6, cy: 99.2, r: 80.9 };
/** SUVI 131 is a 1280 square. The limb is near 390 px, which is r 61 in this 200-unit frame. */
const SUVI = { cx: 100, cy: 100, r: 61 };

function spot(r: ActiveRegion, at: number, geom: { cx: number; cy: number; r: number }): { x: number; y: number } | null {
  const lon = longitudeAt(r.lon, r.lat, r.observed, at);
  return diskXY(r.lat, lon, at, geom);
}

function aiaColor(r: ActiveRegion): string {
  if (haleRank(r.hale) >= 4) return "#fb7185";
  if (haleRank(r.hale) >= 3) return "#fbbf24";
  if (haleRank(r.hale) >= 2) return "#67e8f9";
  return "#e2e8f0";
}

function Film({
  title,
  note,
  frames,
  fallback,
  play,
  marksAt,
}: {
  title: string;
  note: string;
  frames: { time: string; url: string }[];
  fallback: string;
  play: boolean;
  marksAt?: (time: string | null) => { region: number; x: number; y: number; color: string }[];
}) {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(false);
  const [broken, setBroken] = useState(false);
  const [labels, setLabels] = useState(true);
  const armed = useRef(false);

  useEffect(() => {
    setI(Math.max(0, frames.length - 1));
    setBroken(false);
  }, [frames]);

  useEffect(() => {
    if (!play || frames.length < 2 || armed.current) return;
    armed.current = true;
    setRun(true);
    setI(Math.max(0, frames.length - 12));
  }, [play, frames.length]);

  useEffect(() => {
    if (!run || frames.length < 2) return;
    const start = Math.max(0, frames.length - 12);
    const id = window.setInterval(() => {
      setI((n) => (n >= frames.length - 1 ? start : n + 1));
    }, 380);
    return () => window.clearInterval(id);
  }, [run, frames.length]);

  const frame = frames[i];
  const stamp = frame ? frame.time.slice(5, 16).replace("T", " ") + " UTC" : "latest";
  const marks = marksAt?.(frame?.time ?? null) ?? [];

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-black">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-[#070b12] px-2 py-1">
        <span className="min-w-0">
          <span className="block truncate text-[0.68rem] font-semibold text-fg">{title}</span>
          <span className="block truncate text-[0.58rem] text-dim">
            {stamp} · {note}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border px-2 text-[0.62rem] text-muted hover:text-fg"
          onClick={() => {
            if (!run && frames.length > 1) setI(Math.max(0, frames.length - 12));
            setRun((v) => !v);
          }}
        >
          {run ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {run ? "Stop" : "Run"}
        </button>
        {marks.length > 0 && (
          <button
            type="button"
            className={`inline-flex min-h-8 items-center rounded-md border px-2 text-[0.62rem] ${labels ? "border-primary text-primary" : "border-border text-muted"}`}
            onClick={() => setLabels((v) => !v)}
          >
            ARs
          </button>
        )}
        </span>
      </div>
      <div className="relative aspect-square w-full">
        {broken ? (
          <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-[0.62rem] text-dim">
            Frame unavailable
          </span>
        ) : (
          <img
            src={frame?.url ?? fallback}
            alt={title}
            className="absolute inset-0 h-full w-full object-contain"
            onError={() => setBroken(true)}
          />
        )}
        {labels &&
          marks.map((m) => (
            <span
              key={m.region}
              className="pointer-events-none absolute"
              style={{ left: `${(m.x / 200) * 100}%`, top: `${(m.y / 200) * 100}%` }}
            >
              <span
                className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.72rem] font-bold leading-none"
                style={{ color: m.color, textShadow: "0 0 3px #000, 0 0 6px #000" }}
              >
                {m.region}
              </span>
              <span
                className="absolute left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: m.color, boxShadow: "0 0 4px #000" }}
              />
            </span>
          ))}
      </div>
      {frames.length > 1 && (
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={Math.min(i, frames.length - 1)}
          aria-label={`${title} frame`}
          className="block w-full accent-cyan-300"
          onChange={(e) => {
            setRun(false);
            setI(Number(e.target.value));
          }}
        />
      )}
    </div>
  );
}

/** SUVI 131, AIA 171, and CCOR-1. The AIA film sits beside the sunspot list when one is passed. */
export function LaunchWatch({ side }: { side?: ReactNode }) {
  const xra = useObservatory((s) => s.xraFlares);
  const regions = useObservatory((s) => s.activeRegions);
  const xray = useObservatory((s) => s.xray);
  const [suvi, setSuvi] = useState<StillFrame[]>([]);
  const [ccor, setCcor] = useState<CcorFrame[]>([]);
  const [aia, setAia] = useState<AiaFrame[]>([]);
  const launches = diskLaunches(xra, regions);
  const live = readLiveFlare(xray, regions);
  const period = liveChartPeriod(xray).period;
  const hot = launches.some((l) => l.facing && Date.now() - Date.parse(l.at) < 90 * 60_000);
  const flareOn = live?.phase === "rising" || live?.phase === "peak" || hot;
  const frontOn = live?.phase === "peak" || live?.phase === "subsided" || hot;

  useEffect(() => {
    let cancel = false;
    fetchSuvi131()
      .then((list) => {
        if (!cancel) setSuvi(list);
      })
      .catch(() => undefined);
    fetchCcorFrames()
      .then((list) => {
        if (!cancel) setCcor(list.slice(-24));
      })
      .catch(() => undefined);
    fetchAia171()
      .then((list) => {
        if (!cancel) setAia(list);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  const lead = launches[0];
  const marksFor = (geom: { cx: number; cy: number; r: number }) => (time: string | null) => {
    const at = time ? Date.parse(time) : Date.now();
    const when = Number.isFinite(at) ? at : Date.now();
    return regions
      .map((r) => {
        const p = spot(r, when, geom);
        return p ? { region: r.region, x: p.x, y: p.y, color: aiaColor(r) } : null;
      })
      .filter((m): m is { region: number; x: number; y: number; color: string } => m != null);
  };
  const aiaMarks = marksFor(AIA);
  const suviMarks = marksFor(SUVI);

  return (
    <div className="space-y-2">
      <p className="text-[0.72rem] leading-snug text-muted">
        {live ? (
          <span className={live.phase === "peak" || live.phase === "rising" ? "text-warn" : "text-fg"}>
            {live.line}
          </span>
        ) : lead ? (
          <>
            <span className={lead.facing ? "font-semibold text-warn" : "font-semibold text-fg"}>
              {lead.klass}
              {lead.region ? ` · AR${lead.region}` : ""} · {lead.where}
            </span>
            <span className="text-dim"> · {lead.at.slice(5, 16).replace("T", " ")} UTC. </span>
            Step SUVI 131, then CCOR.
          </>
        ) : (
          <>Loops move in 171. A launch is the brightening, then a front leaving the disk.</>
        )}
        {period != null && (
          <span className="text-dim"> Chart period {period} min in the last 90 minutes. That is a repeat in this chart, not a forecast.</span>
        )}
      </p>
      <div className="ww-solar-top">
        <Film title="AIA 171" note="coronal loops · NOAA ARs" frames={aia} fallback={sdoStill("0171", 1024)} play={flareOn} marksAt={aiaMarks} />
        {side}
      </div>
      <div className="grid items-start gap-2 sm:grid-cols-2">
        <Film title="SUVI 131" note="hot plasma · NOAA ARs" frames={suvi} fallback={suviLatest("131")} play={flareOn} marksAt={suviMarks} />
        <Film title="CCOR-1" note="coronagraph" frames={ccor} fallback={ccorLatest()} play={frontOn} />
      </div>
    </div>
  );
}