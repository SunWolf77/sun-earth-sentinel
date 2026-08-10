import { Crosshair, Download, ExternalLink, Home, Mountain, X } from "lucide-react";
import { useObservatory, getFocusNode, getAllFocusNodes, viewEvents } from "@/store/observatory";
import {
  nodeEventStats,
  nodeStatus,
  type EqFeature,
  type NodeStatus,
} from "@/lib/feeds/usgs";
import { AVIATION_COLOR, AVIATION_LABEL } from "@/lib/feeds/volcanoWatches";
import {
  getPublishedMonitor,
  monitorHandoffUrl,
} from "@/lib/feeds/publishedMonitors";
import { downloadNodesCsv } from "@/lib/nodes/exportNodesCsv";
import { DeskGlyph } from "@/components/nodes/DeskGlyph";

const STATUS_DOT: Record<NodeStatus, string> = {
  quiet: "bg-primary border-primary",
  elevated: "bg-gold border-gold",
  active: "bg-warn border-warn",
  watch: "bg-danger border-danger animate-pulse-soft",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  quiet: "Quiet",
  elevated: "Elevated",
  active: "Active",
  watch: "Watch",
};

function agencyLinkLabel(nodeId: string, agencyUrl?: string): string {
  if (nodeId.startsWith("usgs-volc-")) return "USGS notice";
  if (nodeId.startsWith("gvp-")) return "Smithsonian GVP";
  if (agencyUrl?.includes("kvert") || agencyUrl?.includes("kscnet")) return "KVERT";
  return "Agency";
}

/**
 * Lightweight node focus — fly-to + filter + status.
 * Published SES monitors open dedicated Vercel boards with seamless handoff.
 */
export function NodeFocusPanel({ allFeatures }: { allFeatures: EqFeature[] }) {
  const timeWindow = useObservatory((s) => s.timeWindow);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const volcWatchNodes = useObservatory((s) => s.volcWatchNodes);
  const gvpFocusNode = useObservatory((s) => s.gvpFocusNode);
  const focus = getFocusNode(focusNodeId);
  const allNodes = getAllFocusNodes();
  void volcWatchNodes;
  void gvpFocusNode;

  const ranked = [...allNodes].sort((a, b) => {
    const aUsgs = a.id.startsWith("usgs-volc-");
    const bUsgs = b.id.startsWith("usgs-volc-");
    if (aUsgs && !bUsgs) return -1;
    if (!aUsgs && bUsgs) return 1;
    if (a.publishedFocus && !b.publishedFocus) return -1;
    if (!a.publishedFocus && b.publishedFocus) return 1;
    if (a.watchPriority && !b.watchPriority) return -1;
    if (!a.watchPriority && b.watchPriority) return 1;
    const rank = (id: string) => {
      const n = allNodes.find((x) => x.id === id)!;
      const st = nodeStatus(allFeatures, n, { timeWindow });
      if (st === "watch") return 0;
      if (st === "active") return 1;
      if (st === "elevated") return 2;
      return 3;
    };
    const ra = rank(a.id);
    const rb = rank(b.id);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });

  const pub = focus ? getPublishedMonitor(focus.id) : null;
  const boardUrl = focus ? monitorHandoffUrl(focus.id) || focus.monitorUrl : null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-primary">
          <Crosshair className="h-3.5 w-3.5" />
          Node Focus
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => downloadNodesCsv(allNodes)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[0.65rem] text-muted hover:border-primary/40 hover:text-primary"
            title="Download all node metadata as CSV"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
          {focus && (
            <button
              type="button"
              onClick={() => exitToHomeView()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[0.65rem] text-muted hover:text-fg"
              title="Return to world home view"
            >
              <Home className="h-3 w-3" />
              Home view
            </button>
          )}
        </div>
      </div>

      <p className="text-[0.65rem] leading-snug text-dim">
        Tap a node for swarm corridors or volcano watches — map zooms, list filters. Published SES
        boards open on Vercel without losing focus.
      </p>

      {focus && (
        <div
          className={`rounded-lg border px-2.5 py-2 ${
            focus.kind === "volcano"
              ? "border-warn/50 bg-warn/10"
              : focus.publishedFocus
                ? "border-gold/50 bg-gold/10"
                : "border-primary/40 bg-primary/10"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-fg">
                {focus.kind === "volcano" && (
                  <Mountain className="h-3.5 w-3.5 shrink-0 text-warn" />
                )}
                {pub && <DeskGlyph sesNodeId={focus.id} className="h-3.5 w-3.5 text-gold" />}
                {focus.name}
                {pub && (
                  <span className="rounded border border-gold/40 px-1 text-[0.55rem] uppercase text-gold">
                    WW #{pub.networkOrder}
                  </span>
                )}
              </div>
              <div className="text-[0.65rem] text-dim">{focus.role}</div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[0.6rem] font-medium ${
                nodeStatus(allFeatures, focus, { timeWindow }) === "watch"
                  ? "border-danger/50 text-danger"
                  : nodeStatus(allFeatures, focus, { timeWindow }) === "active"
                    ? "border-warn/50 text-warn"
                    : "border-primary/40 text-primary"
              }`}
            >
              {STATUS_LABEL[nodeStatus(allFeatures, focus, { timeWindow })]}
            </span>
          </div>

          {focus.kind === "volcano" && focus.aviationCode && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.68rem]">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-semibold"
                style={{
                  borderColor: AVIATION_COLOR[focus.aviationCode],
                  color: AVIATION_COLOR[focus.aviationCode],
                }}
              >
                Aviation {AVIATION_LABEL[focus.aviationCode]}
              </span>
              <span className="text-dim">
                {focus.id.startsWith("usgs-volc-")
                  ? "USGS HANS elevated"
                  : focus.id.startsWith("gvp-")
                    ? "Smithsonian GVP"
                    : "Volcano watch"}
              </span>
            </div>
          )}

          {focus.focusNote && (
            <p className="mt-1.5 text-[0.65rem] leading-snug text-muted">{focus.focusNote}</p>
          )}

          {(() => {
            const s = nodeEventStats(allFeatures, focus);
            return (
              <div className="mt-1.5 text-[0.68rem] text-muted">
                {s.count} seismic in box
                {s.maxMag > 0 ? ` · max M${s.maxMag.toFixed(1)}` : ""}
                {s.m5 > 0 ? ` · ${s.m5}× M5+` : ""}
                {focus.id === "mediterranean" && s.count < 3
                  ? " · open board for dense INGV catalog"
                  : ""}
              </div>
            );
          })()}

          <div className="mt-1.5 flex flex-wrap gap-2">
            {boardUrl && focus.kind !== "volcano" && (
              <a
                href={boardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-[0.68rem] font-semibold text-gold hover:bg-gold/20"
              >
                Full swarm board
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {focus.gvpUrl && (
              <a
                href={focus.gvpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-warn hover:underline"
              >
                Smithsonian GVP
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {focus.agencyUrl && (
              <a
                href={focus.agencyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-primary hover:underline"
              >
                {agencyLinkLabel(focus.id, focus.agencyUrl)}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              type="button"
              onClick={() => exitToHomeView()}
              className="inline-flex items-center gap-1 text-[0.68rem] font-medium text-muted hover:text-fg"
            >
              <Home className="h-3 w-3" />
              Home view
            </button>
          </div>
        </div>
      )}

      <ul className="max-h-52 space-y-1 overflow-y-auto scroll-thin">
        {ranked.map((node) => {
          const st = nodeStatus(allFeatures, node, { timeWindow });
          const stats = nodeEventStats(allFeatures, node);
          const active = focusNodeId === node.id;
          const isVolc = node.kind === "volcano";
          const nodePub = getPublishedMonitor(node.id);
          return (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => (active ? exitToHomeView() : setFocusNode(node.id))}
                className={`flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition ${
                  active
                    ? isVolc
                      ? "border-warn/50 bg-warn/15"
                      : node.publishedFocus
                        ? "border-gold/50 bg-gold/15"
                        : "border-primary/50 bg-primary/15"
                    : "border-border/70 bg-panel hover:border-border-strong hover:bg-elevated/50"
                }`}
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full border ${STATUS_DOT[st]}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1">
                    {isVolc && <Mountain className="h-3 w-3 text-warn" />}
                    {nodePub && (
                      <DeskGlyph sesNodeId={node.id} className="h-3 w-3 text-gold" />
                    )}
                    <span className="text-[0.75rem] font-medium text-fg">{node.name}</span>
                    {nodePub && (
                      <span className="rounded border border-gold/40 px-1 text-[0.55rem] uppercase text-gold">
                        WW #{nodePub.networkOrder}
                      </span>
                    )}
                    {node.watchPriority && !nodePub && (
                      <span className="rounded border border-danger/40 px-1 text-[0.55rem] uppercase text-danger">
                        Volc watch
                      </span>
                    )}
                    {isVolc && node.aviationCode && (
                      <span
                        className="rounded border px-1 text-[0.55rem] font-semibold uppercase"
                        style={{
                          borderColor: AVIATION_COLOR[node.aviationCode],
                          color: AVIATION_COLOR[node.aviationCode],
                        }}
                      >
                        {AVIATION_LABEL[node.aviationCode]}
                      </span>
                    )}
                  </span>
                  <span className="block text-[0.62rem] text-dim">
                    {isVolc
                      ? `${STATUS_LABEL[st]} · volcano watch`
                      : STATUS_LABEL[st]}
                    {stats.count > 0
                      ? ` · ${stats.count} · M${stats.maxMag.toFixed(1)}`
                      : isVolc
                        ? " · local seismicity filter"
                        : node.publishedFocus
                          ? " · open board for dense catalog"
                          : " · none in view"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Compact map overlay when a node is focused. */
export function NodeFocusBanner() {
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const gvpFocusNode = useObservatory((s) => s.gvpFocusNode);
  void gvpFocusNode;
  const focus = getFocusNode(focusNodeId);
  if (!focus) return null;

  const events = viewEvents(eq?.features, minMag, focusNodeId, maxMag);
  const st = nodeStatus(events.length ? events : eq?.features ?? [], focus, { timeWindow });
  const stats = nodeEventStats(eq?.features ?? [], focus);
  const isVolc = focus.kind === "volcano";
  const pub = getPublishedMonitor(focus.id);
  const boardUrl = monitorHandoffUrl(focus.id) || focus.monitorUrl;

  return (
    <div
      className={`pointer-events-auto absolute left-3 right-3 top-3 z-[500] flex flex-wrap items-center gap-2 rounded-lg border bg-bg/95 px-3 py-2 text-xs shadow-lg backdrop-blur sm:left-auto sm:right-3 sm:max-w-lg ${
        isVolc
          ? "border-warn/50"
          : focus.publishedFocus
            ? "border-gold/50"
            : "border-primary/40"
      }`}
    >
      {isVolc ? (
        <Mountain className="h-3.5 w-3.5 shrink-0 text-warn" />
      ) : (
        <Crosshair className="h-3.5 w-3.5 shrink-0 text-primary" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 font-semibold text-fg">
          {focus.name}
          {pub && (
            <span className="rounded border border-gold/40 px-1 text-[0.55rem] font-medium uppercase text-gold">
              WW #{pub.networkOrder}
            </span>
          )}
        </div>
        <div className="text-[0.68rem] text-dim">
          {isVolc && focus.aviationCode ? (
            <>
              Aviation {AVIATION_LABEL[focus.aviationCode]} · {STATUS_LABEL[st]}
              {stats.count > 0
                ? ` · ${stats.count} eq · max M${stats.maxMag.toFixed(1)}`
                : " · volcano watch"}
            </>
          ) : isVolc ? (
            <>
              {focus.role}
              {stats.count > 0
                ? ` · ${stats.count} eq · max M${stats.maxMag.toFixed(1)}`
                : ""}
            </>
          ) : (
            <>
              {STATUS_LABEL[st]} · {stats.count} events · max M
              {stats.maxMag > 0 ? stats.maxMag.toFixed(1) : "—"}
              {pub ? ` · ${pub.authority}` : ""}
            </>
          )}
        </div>
      </div>
      {boardUrl && !isVolc && (
        <a
          href={boardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-2 py-1 text-[0.68rem] font-semibold text-gold hover:bg-gold/20"
        >
          Full board
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {focus.gvpUrl && (
        <a
          href={focus.gvpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-warn/40 bg-warn/10 px-2 py-1 text-[0.68rem] font-medium text-warn hover:bg-warn/20"
        >
          GVP
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {focus.agencyUrl && isVolc && (
        <a
          href={focus.agencyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[0.68rem] font-medium text-primary hover:bg-primary/20"
        >
          {agencyLinkLabel(focus.id, focus.agencyUrl)}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <button
        type="button"
        onClick={() => exitToHomeView()}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[0.68rem] font-medium text-muted hover:text-fg"
        title="Home view — exit focus"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Home</span>
        <X className="h-3.5 w-3.5 sm:hidden" />
      </button>
    </div>
  );
}
