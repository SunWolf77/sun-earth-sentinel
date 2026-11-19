import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import { fetchCcorFrames, type CcorFrame } from "@/lib/feeds/ccor";
import { diskLaunches, fetchSuvi131, type StillFrame } from "@/lib/feeds/launchWatch";
import { ccorLatest, suviLatest } from "@/lib/feeds/solarMedia";

function Film({
  title,
  note,
  frames,
  fallback,
  play,
  tall,
}: {
  title: string;
  note: string;
  frames: { time: string; url: string }[];
  fallback: string;
  play: boolean;
  tall?: boolean;
}) {
  const [i, setI] = useState(0);
  const [run, setRun] = useState(play);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setI(Math.max(0, frames.length - 1));
    setBroken(false);
  }, [frames]);

  useEffect(() => {
    if (play) setRun(true);
  }, [play]);

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

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-[#070b12]">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-2 py-1">
        <span className="min-w-0">
          <span className="block truncate text-[0.68rem] font-semibold text-fg">{title}</span>
          <span className="block truncate text-[0.58rem] text-dim">
            {stamp} · {note}
          </span>
        </span>
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
      </div>
      <div className={`flex items-center justify-center ${tall ? "min-h-40" : "aspect-video"}`}>
        {broken ? (
          <span className="px-2 text-center text-[0.62rem] text-dim">Frame unavailable</span>
        ) : (
          <img
            src={frame?.url ?? fallback}
            alt={title}
            className="max-h-52 w-full object-contain"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      {frames.length > 1 && (
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={Math.min(i, frames.length - 1)}
          aria-label={`${title} frame`}
          className="w-full accent-cyan-300"
          onChange={(e) => {
            setRun(false);
            setI(Number(e.target.value));
          }}
        />
      )}
    </div>
  );
}

/** SUVI 131 and CCOR-1 on the solar desk. A launch is seen by stepping these, not from a still. */
export function LaunchWatch() {
  const xra = useObservatory((s) => s.xraFlares);
  const regions = useObservatory((s) => s.activeRegions);
  const [suvi, setSuvi] = useState<StillFrame[]>([]);
  const [ccor, setCcor] = useState<CcorFrame[]>([]);
  const launches = diskLaunches(xra, regions);
  const hot = launches.some((l) => l.facing && Date.now() - Date.parse(l.at) < 90 * 60_000);

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
    return () => {
      cancel = true;
    };
  }, []);

  const lead = launches[0];

  return (
    <section className="space-y-2 rounded-xl border border-border bg-panel p-2">
      <p className="text-[0.72rem] leading-snug text-muted">
        {lead ? (
          <>
            <span className={lead.facing ? "font-semibold text-warn" : "font-semibold text-fg"}>
              {lead.klass}
              {lead.region ? ` · AR${lead.region}` : ""} · {lead.where}
            </span>
            <span className="text-dim"> · {lead.at.slice(5, 16).replace("T", " ")} UTC. </span>
            Step SUVI 131, then CCOR. A still does not show the launch.
          </>
        ) : (
          <>SUVI 131 and CCOR-1, live frames. Run them. A launch is motion, then a front leaving the disk.</>
        )}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Film title="SUVI 131" note="hot plasma" frames={suvi} fallback={suviLatest("131")} play={hot} tall />
        <Film title="CCOR-1" note="coronagraph" frames={ccor} fallback={ccorLatest()} play={false} />
      </div>
    </section>
  );
}
