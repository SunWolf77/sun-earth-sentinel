/**
 * Header row 3 — published node hops.
 * Layout: [← Back when focused] | SES home · TK · CF · JP · KM (↗ board)
 * Details stay in sidebar FocusedNodeCard / NodeFocusPanel.
 */

import { ExternalLink, Home } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  PUBLISHED_MONITORS,
  monitorHandoffUrl,
  resolveNodeId,
  type PublishedMonitor,
} from "@/lib/feeds/publishedMonitors";
import { BackToSesButton } from "@/components/nodes/BackToSesButton";

function orderedMonitors(): PublishedMonitor[] {
  return [...PUBLISHED_MONITORS].sort((a, b) => {
    if (a.networkOrder !== b.networkOrder) return a.networkOrder - b.networkOrder;
    return a.shortCode.localeCompare(b.shortCode);
  });
}

const SHORTCUT_HINT: Record<string, string> = {
  tonga: "T",
  mediterranean: "C",
  japan: "J",
  kamchatka: "K",
  iceland: "I",
  southsandwich: "S",
  andes: "A",
  newzealand: "N",
};

export function PublishedNodesNav({ className = "" }: { className?: string }) {
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const setTab = useObservatory((s) => s.setTab);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);

  const focused = focusNodeId ? resolveNodeId(focusNodeId) ?? focusNodeId : null;
  const monitors = orderedMonitors();
  const anyFocused = Boolean(focusNodeId);

  const goHome = () => {
    exitToHomeView();
    setTab("live");
    setMobileSheet("closed");
  };

  const goNode = (sesNodeId: string) => {
    setTab("live");
    if (focused === sesNodeId) {
      exitToHomeView();
      setMobileSheet("closed");
      return;
    }
    setFocusNode(sesNodeId);
    setMobileSheet("closed");
  };

  return (
    <div
      className={`ww-header-row ww-header-row--nodes ${className}`}
      role="navigation"
      aria-label="Published SES nodes"
    >
      <span className="ww-header-row__label" title="Published focus nodes">
        Nodes
      </span>

      <div className="ww-nodes-nav">
        {anyFocused && <BackToSesButton variant="inline" />}

        <button
          type="button"
          className={`ww-nodes-nav__chip ww-nodes-nav__chip--home ${
            !anyFocused ? "ww-nodes-nav__chip--on" : ""
          }`}
          title="Sun-Earth Sentinel home — full world (H)"
          aria-pressed={!anyFocused}
          onClick={goHome}
        >
          <Home className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
          <span>SES</span>
        </button>

        <span className="ww-nodes-nav__sep" aria-hidden>
          ·
        </span>

        {monitors.map((m) => {
          const on = focused === m.sesNodeId;
          const board = monitorHandoffUrl(m.sesNodeId) || m.monitorUrl;
          const hint = SHORTCUT_HINT[m.sesNodeId];
          return (
            <span key={m.sesNodeId} className="ww-nodes-nav__pair">
              <button
                type="button"
                className={`ww-nodes-nav__chip ${on ? "ww-nodes-nav__chip--on" : ""}`}
                title={`${m.name} · focus on map${hint ? ` (${hint})` : ""}. Tap again for home.`}
                aria-pressed={on}
                aria-label={`Focus ${m.name}${hint ? `, shortcut ${hint}` : ""}`}
                onClick={() => goNode(m.sesNodeId)}
              >
                <span className="ww-nodes-nav__code">{m.shortCode}</span>
                <span className="ww-nodes-nav__name">
                  {m.name.split(/[–—-]/)[0]?.trim()}
                </span>
                {hint && (
                  <kbd className="ww-nodes-nav__kbd" aria-hidden>
                    {hint}
                  </kbd>
                )}
              </button>
              {board && (
                <a
                  href={board}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ww-nodes-nav__ext"
                  title={`Open ${m.name} full board (new tab)`}
                  aria-label={`Open ${m.shortCode} board in new tab`}
                  onClick={() => {
                    if (focused !== m.sesNodeId) setFocusNode(m.sesNodeId);
                  }}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
