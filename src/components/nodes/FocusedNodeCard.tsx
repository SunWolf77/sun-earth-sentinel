import { ExternalLink, Radar } from "lucide-react";
import {
  FOCUSED_MONITORS,
  nodeEventStats,
  nodeStatus,
  type EqFeature,
  type NodeStatus,
} from "@/lib/feeds/usgs";
import { useObservatory } from "@/store/observatory";

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
 * Published focused monitors — deep swarm boards live outside Sentinel.
 * Card offers Focus-in-app + open full board.
 */
export function FocusedNodeCard({ features }: { features: EqFeature[] }) {
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const focusNodeId = useObservatory((s) => s.focusNodeId);

  if (FOCUSED_MONITORS.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-gold">
        <Radar className="h-3.5 w-3.5" />
        Published Swarm Boards
      </h3>
      {FOCUSED_MONITORS.map((node) => {
        const st = nodeStatus(features, node);
        const stats = nodeEventStats(features, node);
        const focused = focusNodeId === node.id;
        return (
          <div
            key={node.id}
            className="rounded-xl border border-gold/35 bg-panel p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-fg">{node.name}</span>
                  <span className="rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-gold">
                    Published
                  </span>
                </div>
                <p className="mt-0.5 text-[0.7rem] leading-snug text-dim">{node.role}</p>
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
                onClick={() => setFocusNode(focused ? null : node.id)}
                className={`rounded-md border px-2.5 py-1.5 text-[0.7rem] font-medium ${
                  focused
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted hover:text-fg"
                }`}
              >
                {focused ? "Exit focus" : "Focus on map"}
              </button>
              {node.monitorUrl && (
                <a
                  href={node.monitorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-[0.7rem] font-semibold text-gold hover:bg-gold/20"
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
