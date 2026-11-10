/**
 * Landing flare window. The number is the 7-day fit, then a small
 * local nudge after flares this browser has already watched.
 */

import { useEffect, useState } from "react";
import { fetchFlareOutlookFn } from "@/lib/feeds/solarProxy";
import type { FlareOutlook } from "@/lib/solar/flareOutlook";

const KEY = "ww_flare_learn_v1";

type Call = { t: number; p: number; done?: boolean };
type Memory = { bias: number; calls: Call[]; scored: string[] };

function loadMem(): Memory {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { bias: 0, calls: [], scored: [] };
    const p = JSON.parse(raw) as Memory;
    return {
      bias: Number.isFinite(p.bias) ? Math.max(-0.25, Math.min(0.3, p.bias)) : 0,
      calls: Array.isArray(p.calls) ? p.calls.slice(-40) : [],
      scored: Array.isArray(p.scored) ? p.scored.slice(-30) : [],
    };
  } catch {
    return { bias: 0, calls: [], scored: [] };
  }
}

function saveMem(m: Memory) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function learn(outlook: FlareOutlook, mem: Memory): { mem: Memory; note: string | null } {
  const next: Memory = {
    bias: mem.bias,
    calls: mem.calls.slice(),
    scored: mem.scored.slice(),
  };
  let changed = 0;
  for (const fl of outlook.recentFlares) {
    if (next.scored.includes(fl.peak)) continue;
    if (!fl.klass.startsWith("M") && !fl.klass.startsWith("X")) continue;
    const peak = Date.parse(fl.peak);
    const prior = next.calls.filter((c) => peak - c.t > 10 * 60_000 && peak - c.t < 6 * 3600_000);
    if (!prior.length) continue;
    const best = Math.max(...prior.map((c) => c.p));
    next.bias = best >= 0.35 ? next.bias : Math.min(0.3, next.bias + 0.06);
    next.scored.push(fl.peak);
    changed += 1;
  }
  const now = Date.now();
  for (const call of next.calls) {
    if (call.done || now - call.t < 6 * 3600_000) continue;
    const flare = outlook.recentFlares.some((fl) => {
      const peak = Date.parse(fl.peak);
      return peak > call.t && peak <= call.t + 6 * 3600_000;
    });
    if (!flare && call.p >= 0.45) next.bias = Math.max(-0.25, next.bias - 0.04);
    call.done = true;
    changed += 1;
  }
  next.bias = Math.max(-0.25, Math.min(0.3, next.bias));
  if (changed) saveMem(next);
  const note =
    next.scored.length > 0
      ? `Desk memory has scored ${next.scored.length} flare${next.scored.length === 1 ? "" : "s"} on this browser.`
      : null;
  return { mem: next, note };
}

export function FlareOutlookDesk() {
  const [outlook, setOutlook] = useState<FlareOutlook | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [bias, setBias] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetchFlareOutlookFn()
      .then((o) => {
        if (!live) return;
        const mem = loadMem();
        const learned = learn(o, mem);
        if (o.pM != null) {
          const open = learned.mem.calls.some((c) => !c.done && Date.now() - c.t < 6 * 3600_000);
          if (!open) {
            learned.mem.calls.push({
              t: Date.now(),
              p: Math.max(0.02, Math.min(0.9, o.pM + learned.mem.bias)),
            });
            learned.mem.calls = learned.mem.calls.slice(-40);
            saveMem(learned.mem);
          }
        }
        setBias(learned.mem.bias);
        setNote(learned.note);
        setOutlook(o);
      })
      .catch((e) => {
        if (!live) return;
        setErr(e instanceof Error ? e.message : "Flare window failed");
      });
    return () => {
      live = false;
    };
  }, []);

  const shown =
    outlook?.pM != null ? Math.max(0.02, Math.min(0.9, outlook.pM + bias)) : null;
  const pct = shown != null ? Math.round(shown * 100) : null;

  return (
    <section className="rounded-xl border border-border bg-panel px-3 py-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-wider text-primary">
          Flare window
        </h2>
        <p className="text-[0.6rem] text-dim">GOES 7-day fit · 6-hour horizon</p>
      </div>
      {err && <p className="text-[0.75rem] text-danger">{err}</p>}
      {!outlook && !err && <p className="text-[0.75rem] text-muted">Reading the X-ray record…</p>}
      {outlook && (
        <div className="grid items-start gap-3 sm:grid-cols-[8.5rem_1fr]">
          <div className="rounded-lg border border-border/80 bg-bg/60 px-2 py-2 text-center">
            <div className="text-[0.58rem] uppercase tracking-wide text-dim">M within 6 h</div>
            <div className={`text-[2rem] font-semibold leading-none ${pct != null && pct >= 40 ? "text-warn" : "text-fg"}`}>
              {pct != null ? `${pct}%` : "—"}
            </div>
            <div className="mt-1 text-[0.62rem] text-muted">
              {outlook.learnedM ? "trained on this week" : "trend + region"}
            </div>
            {outlook.pC != null && (
              <div className="mt-1 text-[0.62rem] text-dim">C or above {Math.round(outlook.pC * 100)}%</div>
            )}
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-[0.9rem] font-medium leading-snug text-fg">{outlook.sentence}</p>
            {note && <p className="text-[0.68rem] text-primary">{note}</p>}
            <p className="text-[0.6rem] leading-snug text-dim">{outlook.honesty}</p>
          </div>
        </div>
      )}
    </section>
  );
}
