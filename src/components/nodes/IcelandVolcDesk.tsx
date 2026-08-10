/**
 * Iceland node #4 — SUPT volcanic analytics desk (IMO authority).
 * Shown when iceland is focused; calm language, zone breakdown, spacing probe.
 */

import { ExternalLink, Mountain, Radar } from "lucide-react";
import { useMemo } from "react";
import { useObservatory } from "@/store/observatory";
import { filteredEq } from "@/store/observatory";
import { buildIcelandVolcanicDesk } from "@/lib/supt/icelandVolcanic";
import type { ZoneActivityTone } from "@/lib/supt/icelandVolcanic";
import type { GlobalVolcAlert } from "@/lib/feeds/globalVolcanoAlerts";
import { resolveNodeId } from "@/lib/feeds/publishedMonitors";

const TONE_CLASS: Record<ZoneActivityTone, string> = {
  quiet: "border-border/60 bg-surface/40 text-muted",
  background: "border-primary/30 bg-primary/5 text-fg",
  elevated: "border-gold/45 bg-gold/10 text-gold",
  swarm: "border-warn/50 bg-warn/10 text-warn",
};

const TONE_LABEL: Record<ZoneActivityTone, string> = {
  quiet: "Quiet",
  background: "Background",
  elevated: "Elevated",
  swarm: "Dense burst",
};

function ageLabel(ms: number | null, now: number): string {
  if (ms == null) return "—";
  const h = (now - ms) / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
  if (h < 48) return `${h.toFixed(0)}h ago`;
  return `${(h / 24).toFixed(1)}d ago`;
}

export function IcelandVolcDesk({ className = "" }: { className?: string }) {
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const usgsVolcAlerts = useObservatory((s) => s.usgsVolcAlerts);
  const setFocusNode = useObservatory((s) => s.setFocusNode);

  const focused = focusNodeId
    ? resolveNodeId(focusNodeId) ?? focusNodeId
    : null;
  const isIceland = focused === "iceland";

  const features = useMemo(
    () => filteredEq(eq?.features, minMag, maxMag),
    [eq?.features, minMag, maxMag],
  );

  // For Iceland desk use full catalog slice (include microseismicity below global minMag)
  const deskFeatures = useMemo(() => {
    const all = eq?.features ?? [];
    // Prefer all in island; desk analytics use its own floors
    return all;
  }, [eq?.features]);

  const desk = useMemo(() => {
    if (!isIceland && focused) return null;
    // Always build when iceland focused; optional compact peek when not
    if (!isIceland) return null;
    return buildIcelandVolcanicDesk({
      features: deskFeatures.length ? deskFeatures : features,
      volcAlerts: usgsVolcAlerts as GlobalVolcAlert[],
      timeWindow,
    });
  }, [isIceland, focused, deskFeatures, features, usgsVolcAlerts, timeWindow]);

  if (!isIceland || !desk) return null;

  const now = Date.now();

  return (
    <section
      className={`rounded-xl border border-violet-500/35 bg-violet-500/5 p-3 space-y-2 ${className}`}
      aria-label="Iceland volcanic analytics"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-violet-300">
            <Mountain className="h-3.5 w-3.5" />
            Iceland · SUPT volcanic desk
          </h3>
          <p className="mt-0.5 text-[0.62rem] text-dim">
            SES #4 · IMO authority · window {desk.windowLabel}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[0.6rem] text-muted hover:text-fg"
          onClick={() => setFocusNode(null)}
          title="Clear focus"
        >
          Close
        </button>
      </div>

      <div className="rounded-lg border border-violet-400/25 bg-surface/50 px-2.5 py-2">
        <div className="text-sm font-semibold text-fg">{desk.headline}</div>
        <p className="mt-1 text-[0.68rem] leading-snug text-muted">{desk.plain}</p>
        <div className="mt-1.5 flex flex-wrap gap-2 text-[0.62rem] text-dim">
          <span>
            Island n={desk.totalInBox}
            {desk.maxMag > 0 ? ` · max M${desk.maxMag.toFixed(1)}` : ""}
          </span>
          <span className="text-violet-300/90">{desk.spacingPlain}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1 text-[0.62rem] font-medium uppercase tracking-wide text-dim">
          <Radar className="h-3 w-3" />
          System boxes
        </div>
        {desk.zones.map((z) => (
          <div
            key={z.id}
            className={`rounded-lg border px-2 py-1.5 ${TONE_CLASS[z.tone]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[0.72rem] font-medium">
                  <span>{z.name}</span>
                  <span className="rounded border border-current/30 px-1 text-[0.55rem] uppercase opacity-80">
                    {TONE_LABEL[z.tone]}
                  </span>
                  {z.volcColor && z.volcColor !== "GREEN" && (
                    <span className="rounded border border-warn/40 px-1 text-[0.55rem] font-semibold text-warn">
                      VALS/VONA {z.volcColor}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[0.6rem] leading-snug opacity-80">
                  {z.role}
                </p>
                <p className="mt-0.5 text-[0.62rem] leading-snug opacity-90">
                  {z.plain}
                </p>
              </div>
              <div className="shrink-0 text-right text-[0.6rem] opacity-80">
                <div>n={z.count}</div>
                <div>{z.maxMag > 0 ? `M${z.maxMag.toFixed(1)}` : "—"}</div>
                <div>{ageLabel(z.lastMs, now)}</div>
              </div>
            </div>
            {(z.gvpUrl || z.volcNative) && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.58rem]">
                {z.volcNative && (
                  <span className="text-dim line-clamp-2">{z.volcNative}</span>
                )}
                {z.gvpUrl && (
                  <a
                    href={z.gvpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    GVP <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[0.58rem] leading-snug text-dim">{desk.disclaimer}</p>
      <div className="flex flex-wrap gap-2 text-[0.62rem]">
        <a
          href="https://en.vedur.is/earthquakes-and-volcanism/earthquakes/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-primary hover:border-primary/40"
        >
          IMO earthquakes <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href="https://skjalftalisa.vedur.is/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-primary hover:border-primary/40"
        >
          Skjálftalísa <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href="https://en.vedur.is/earthquakes-and-volcanism/volcanic-eruptions/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-primary hover:border-primary/40"
        >
          IMO volcanoes <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
}
