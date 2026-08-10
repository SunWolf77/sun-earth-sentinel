import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useObservatory } from "@/store/observatory";
import {
  buildFeedHealth,
  buildFeedHealthSnapshot,
  copyText,
  healthToneClass,
  type FeedHealthSnapshot,
} from "@/lib/ops/feedHealth";
import { getSuperclusterCacheStats } from "@/lib/map/superclusterIndex";

type SesFeedsApi = {
  (): FeedHealthSnapshot;
  copy: () => Promise<boolean>;
  text: () => string;
};

/**
 * Per-source feed health strip — USGS / JMA / GEOFON / SWPC / Nodes / Volc / Pulse.
 *
 * Fluid debug (no extra chrome clutter):
 * - Long-press **Feeds** (mobile) or the strip (desktop) → copy JSON snapshot
 * - Console: `window.__SES_FEEDS()` · `__SES_FEEDS.copy()` · `__SES_FEEDS.text()`
 */
export function FeedHealthStrip({
  compact = false,
  hideOff = true,
}: {
  compact?: boolean;
  hideOff?: boolean;
}) {
  const loading = useObservatory((s) => s.loading);
  const lastUpdate = useObservatory((s) => s.lastUpdate);
  const livePulseAt = useObservatory((s) => s.livePulseAt);
  const feedTimestamps = useObservatory((s) => s.feedTimestamps);
  const feedErrors = useObservatory((s) => s.feedErrors);
  const eq = useObservatory((s) => s.eq);
  const scales = useObservatory((s) => s.scales);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const useGeofon = useObservatory((s) => s.useGeofon);
  const error = useObservatory((s) => s.error);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const longTimer = useRef<number | null>(null);
  const longFired = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const snapshotOpts = useMemo(() => {
    void tick;
    const feats = eq?.features ?? [];
    const hasJma =
      !!feedTimestamps.jma ||
      feats.some((f) => String(f.id ?? "").startsWith("jma:") || String(f.id ?? "").startsWith("jma-"));
    const hasEmsc =
      !!feedTimestamps.emsc ||
      feats.some((f) => String(f.id ?? "").startsWith("emsc:"));
    const hasImo =
      !!feedTimestamps.imo ||
      feats.some((f) => String(f.id ?? "").startsWith("imo:"));
    const hasGeonet =
      !!feedTimestamps.geonet ||
      feats.some((f) => String(f.id ?? "").startsWith("geonet:"));
    const hasBoards =
      !!feedTimestamps.boards ||
      feats.some((f) => {
        const id = String(f.id ?? "");
        return id.startsWith("gossip-") || id.startsWith("usgs-us");
      });
    return {
      loading,
      lastUpdate,
      livePulseAt,
      hasEq: feats.length > 0,
      hasScales: !!scales,
      hasVolc: usgsVolcAlerts.length > 0,
      hasJma,
      hasEmsc,
      hasImo,
      hasGeonet,
      hasGeofon: !!feedTimestamps.geofon,
      hasBoards,
      useGeofon,
      error,
      feedTimestamps,
      feedErrors,
      eqCount: feats.length,
      volcCount: usgsVolcAlerts.length,
    };
  }, [
    tick,
    loading,
    lastUpdate,
    livePulseAt,
    eq,
    scales,
    usgsVolcAlerts.length,
    useGeofon,
    error,
    feedTimestamps,
    feedErrors,
  ]);

  const rows = useMemo(() => buildFeedHealth(snapshotOpts), [snapshotOpts]);

  const getSnapshot = useCallback(
    () => buildFeedHealthSnapshot(snapshotOpts),
    [snapshotOpts],
  );

  const copySnapshot = useCallback(async () => {
    const snap = getSnapshot();
    const text = JSON.stringify(snap, null, 2);
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
    return ok;
  }, [getSnapshot]);

  // Console API — always available when strip is mounted (prod + dev)
  useEffect(() => {
    const api = (() => {
      const fn = (() => getSnapshot()) as SesFeedsApi;
      fn.copy = () => copySnapshot();
      fn.text = () => JSON.stringify(getSnapshot(), null, 2);
      return fn;
    })();
    const w = window as unknown as {
      __SES_FEEDS?: SesFeedsApi;
      __SES_SC_CACHE?: typeof getSuperclusterCacheStats;
    };
    w.__SES_FEEDS = api;
    w.__SES_SC_CACHE = getSuperclusterCacheStats;
    return () => {
      if (w.__SES_FEEDS === api) delete w.__SES_FEEDS;
      if (w.__SES_SC_CACHE === getSuperclusterCacheStats) delete w.__SES_SC_CACHE;
    };
  }, [getSnapshot, copySnapshot]);

  const visible = hideOff ? rows.filter((r) => r.status !== "off") : rows;
  const bad = visible.filter((r) => r.status === "error" || r.status === "stale");
  const summaryTone =
    bad.some((r) => r.status === "error")
      ? "error"
      : bad.some((r) => r.status === "stale")
        ? "stale"
        : loading
          ? "loading"
          : "ok";

  const errFor = (id: string): string | null => {
    if (!feedErrors) return null;
    const key =
      id === "usgs" ? "eq" : id === "swpc" ? "solar" : id === "boards" ? "boards" : id;
    return (feedErrors as Record<string, string | null>)[key] ?? null;
  };

  const clearLong = () => {
    if (longTimer.current != null) {
      window.clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  };

  const onPressStart = () => {
    longFired.current = false;
    clearLong();
    longTimer.current = window.setTimeout(() => {
      longFired.current = true;
      void copySnapshot();
    }, 550);
  };

  const onPressEnd = (toggleOpen: boolean) => {
    clearLong();
    if (longFired.current) {
      longFired.current = false;
      return;
    }
    if (toggleOpen) setOpen((o) => !o);
  };

  return (
    <div
      className={`ww-feed-health ${compact ? "text-[0.55rem]" : "text-[0.6rem]"}`}
      aria-label="Feed health — per source. Long-press to copy snapshot."
      onPointerDown={onPressStart}
      onPointerUp={() => onPressEnd(false)}
      onPointerLeave={clearLong}
      onPointerCancel={clearLong}
      onDoubleClick={() => void copySnapshot()}
      title="Long-press or double-click to copy feed health · console: __SES_FEEDS()"
    >
      <button
        type="button"
        className={`mb-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono sm:hidden ${healthToneClass(
          copied ? "ok" : summaryTone,
        )}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPressStart();
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          onPressEnd(true);
        }}
        onPointerLeave={clearLong}
        onPointerCancel={clearLong}
        aria-expanded={open}
        title="Tap to expand · long-press to copy feed health JSON"
      >
        <span className="font-semibold">Feeds</span>
        <span>
          {copied
            ? "copied"
            : bad.length
              ? `${bad.length} issue${bad.length > 1 ? "s" : ""}`
              : loading
                ? "updating…"
                : "ok"}
        </span>
        <span className="opacity-70">{open ? "▾" : "▸"}</span>
      </button>

      <div
        className={`flex flex-wrap items-center gap-1 ${
          open ? "flex" : "hidden sm:flex"
        }`}
      >
        {visible.map((r) => {
          const err = errFor(r.id);
          const title = [
            r.hint || r.label,
            `Last ok: ${r.detail}`,
            err ? `Error: ${err}` : null,
            r.status === "stale" ? "Stale — last good data still shown" : null,
            "Long-press strip to copy all",
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <span
              key={r.id}
              title={title}
              className={`inline-flex max-w-full items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono ${healthToneClass(r.status)}`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  r.status === "ok"
                    ? "bg-ok"
                    : r.status === "loading"
                      ? "bg-primary animate-pulse"
                      : r.status === "stale"
                        ? "bg-warn"
                        : r.status === "error"
                          ? "bg-danger"
                          : "bg-dim"
                }`}
                aria-hidden
              />
              <span className="font-semibold opacity-90">{r.label}</span>
              <span className="tabular-nums opacity-90">{r.detail}</span>
            </span>
          );
        })}
        <button
          type="button"
          className={`hidden sm:inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono ${
            copied
              ? healthToneClass("ok")
              : "border-border/60 bg-panel text-dim hover:border-primary/40 hover:text-primary"
          }`}
          title="Copy feed health JSON (also: long-press strip or __SES_FEEDS.copy())"
          onClick={(e) => {
            e.stopPropagation();
            void copySnapshot();
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
  );
}
