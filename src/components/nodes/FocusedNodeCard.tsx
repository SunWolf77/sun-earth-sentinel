import { ExternalLink } from "lucide-react";
import {
  FOCUSED_MONITORS,
  nodeEventStats,
  nodeStatus,
  type EqFeature,
  type NodeStatus,
} from "@/lib/feeds/usgs";
import {
  WOLFWATCH_NETWORK,
  getPublishedMonitor,
  monitorHandoffUrl,
  monitorNavLabel,
} from "@/lib/feeds/publishedMonitors";
import { useObservatory } from "@/store/observatory";
import { ShareFocusButton } from "@/components/ops/ShareFocusButton";
import { WolfFaceIcon } from "@/components/nodes/WolfFaceIcon";
import { DeskGlyph } from "@/components/nodes/DeskGlyph";
import { getDeskGlyph } from "@/lib/feeds/deskGlyphs";

const STATUS_LABEL: Record<NodeStatus, string> = {
  quiet: "Quiet",
  elevated: "Elevated",
  active: "Active",
  watch: "Watch",
};

const STATUS_CLASS: Record<NodeStatus, string> = {
  quiet: "border-primary/40 bg-primary/10 text-primary",
  elevated: "border-gold/50 bg-gold/15 text-gold",
  active: "border-warn/50 bg-warn/15 text-warn",
  watch: "border-danger/50 bg-danger/15 text-danger animate-pulse-soft",
};

/**
 * Published focused monitors — deep swarm boards on Vercel.
 * Focus-in-app zooms the map; Full board opens the dedicated monitor (SES handoff).
 */
export function FocusedNodeCard({ features }: { features: EqFeature[] }) {
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const timeWindow = useObservatory((s) => s.timeWindow);

  if (FOCUSED_MONITORS.length === 0) return null;

  const ordered = [...FOCUSED_MONITORS].sort((a, b) => {
    const pa = getPublishedMonitor(a.id)?.networkOrder ?? 99;
    const pb = getPublishedMonitor(b.id)?.networkOrder ?? 99;
    return pa - pb;
  });

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-gold">
        <WolfFaceIcon className="h-3.5 w-3.5" />
        {WOLFWATCH_NETWORK.name}
      </h3>
      <p className="text-[0.62rem] leading-snug text-dim">
        Regional desks under SES. Focus zooms the map; open board for the dedicated monitor when
        you need depth.
      </p>
      {ordered.map((node) => {
        const st = nodeStatus(features, node, { timeWindow });
        const stats = nodeEventStats(features, node);
        const focused = focusNodeId === node.id;
        const pub = getPublishedMonitor(node.id);
        const boardUrl = monitorHandoffUrl(node.id) || node.monitorUrl;
        const clat = node.center?.[0] ?? (node.bounds[0][0] + node.bounds[1][0]) / 2;
        const clon =
          node.center?.[1] ??
          (node.bounds[0][1] <= node.bounds[1][1]
            ? (node.bounds[0][1] + node.bounds[1][1]) / 2
            : -175);
        return (
          <div
            key={node.id}
            className={`rounded-xl border p-3 ${
              focused
                ? "border-gold/60 bg-gold/10"
                : "border-gold/35 bg-panel"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  {pub && (
                    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-1.5 text-[0.65rem] font-extrabold tracking-wide text-gold">
                      <DeskGlyph sesNodeId={node.id} className="h-3.5 w-3.5" />
                      {monitorNavLabel(pub)}
                    </span>
                  )}
                  <span className="font-medium text-fg">{node.name}</span>
                  {pub && (
                    <span className="rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-gold">
                      WW #{pub.networkOrder}
                    </span>
                  )}
                  {getDeskGlyph(node.id) && (
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[0.55rem] text-dim">
                      {getDeskGlyph(node.id)!.label}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[0.7rem] leading-snug text-dim">{node.role}</p>
                {pub && (
                  <p className="mt-0.5 text-[0.62rem] text-dim">
                    Authority · {pub.authority}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem]">
              <span className={`rounded-full border px-2 py-0.5 font-medium ${STATUS_CLASS[st]}`}>
                {STATUS_LABEL[st]}
              </span>
              <span className="text-muted">
                {stats.count} in view
                {stats.maxMag > 0 ? ` · max M${stats.maxMag.toFixed(1)}` : ""}
                {stats.m5 > 0 ? ` · ${stats.m5}× M5+` : ""}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => (focused ? exitToHomeView() : setFocusNode(node.id))}
                className={`rounded-md border px-2.5 py-1.5 text-[0.7rem] font-medium ${
                  focused
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted hover:text-fg"
                }`}
              >
                {focused ? "Home view" : "Focus on map"}
              </button>
              <ShareFocusButton
                target="node"
                nodeId={node.id}
                lat={clat}
                lon={clon}
                compact
                label="Share zone"
              />
              {boardUrl && (
                <a
                  href={boardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-[0.7rem] font-semibold text-gold hover:bg-gold/20"
                  onClick={() => {
                    // Keep map focused so returning via ?node= feels continuous
                    if (!focused) setFocusNode(node.id);
                  }}
                >
                  Full swarm board
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
