/**
 * Header row 3 — WolfWatch Network desk hops.
 * Mobile: code-only chips + scroll + “All desks” sheet (names + boards).
 * Desktop: codes + short names + kbd + board ↗.
 * SES home chip always first; details stay in FocusedNodeCard.
 */

import { useEffect, useId, useState } from "react";
import { ChevronDown, ExternalLink, Home, Network, X } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  WOLFWATCH_NETWORK,
  monitorHandoffUrl,
  monitorNavLabel,
  orderedPublishedMonitors,
  resolveNodeId,
  type PublishedMonitor,
} from "@/lib/feeds/publishedMonitors";
import { BackToSesButton } from "@/components/nodes/BackToSesButton";

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

const REGION_LABEL: Record<NonNullable<PublishedMonitor["region"]>, string> = {
  pacific: "Pacific",
  ring: "NW Pacific",
  atlantic: "N Atlantic",
  europe: "Europe",
  polar: "Southern",
};

export function PublishedNodesNav({ className = "" }: { className?: string }) {
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const setTab = useObservatory((s) => s.setTab);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);

  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetTitleId = useId();

  const focused = focusNodeId ? resolveNodeId(focusNodeId) ?? focusNodeId : null;
  const monitors = orderedPublishedMonitors();
  const anyFocused = Boolean(focusNodeId);
  const focusedMon = focused ? monitors.find((m) => m.sesNodeId === focused) : null;

  const goHome = () => {
    exitToHomeView();
    setTab("live");
    setMobileSheet("closed");
    setSheetOpen(false);
  };

  const goNode = (sesNodeId: string) => {
    setTab("live");
    if (focused === sesNodeId) {
      exitToHomeView();
      setMobileSheet("closed");
      setSheetOpen(false);
      return;
    }
    setFocusNode(sesNodeId);
    setMobileSheet("closed");
    setSheetOpen(false);
  };

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  // Group for sheet
  const byRegion = (() => {
    const map = new Map<string, PublishedMonitor[]>();
    for (const m of monitors) {
      const key = m.region ?? "other";
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return map;
  })();

  return (
    <div
      className={`ww-header-row ww-header-row--nodes ${className}`}
      role="navigation"
      aria-label={`${WOLFWATCH_NETWORK.name} desks`}
    >
      <span
        className="ww-header-row__label ww-header-row__label--ww"
        title={WOLFWATCH_NETWORK.tagline}
      >
        <Network className="ww-header-row__label-icon" aria-hidden />
        <span className="ww-header-row__label-full">{WOLFWATCH_NETWORK.shortName}</span>
        <span className="ww-header-row__label-short">{WOLFWATCH_NETWORK.code}</span>
      </span>

      <div className="ww-nodes-nav">
        {/* Inline back only on sm+ — mobile uses SES chip + map float */}
        {anyFocused && (
          <span className="ww-nodes-nav__back-wrap">
            <BackToSesButton variant="inline" />
          </span>
        )}

        <button
          type="button"
          className={`ww-nodes-nav__chip ww-nodes-nav__chip--home ${
            !anyFocused ? "ww-nodes-nav__chip--on" : ""
          }`}
          title="Sun-Earth Sentinel home — full world (H)"
          aria-pressed={!anyFocused}
          onClick={goHome}
        >
          <Home className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          <span>SES</span>
        </button>

        <span className="ww-nodes-nav__sep" aria-hidden>
          ·
        </span>

        {monitors.map((m) => {
          const on = focused === m.sesNodeId;
          const board = monitorHandoffUrl(m.sesNodeId) || m.monitorUrl;
          const hint = SHORTCUT_HINT[m.sesNodeId];
          const code = monitorNavLabel(m);
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
                <span className="ww-nodes-nav__code">{code}</span>
                <span className="ww-nodes-nav__name">{m.name.split(/[–—-]/)[0]?.trim()}</span>
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
                  title={`Open ${m.name} board (new tab)`}
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

        <button
          type="button"
          className={`ww-nodes-nav__chip ww-nodes-nav__chip--all ${
            sheetOpen ? "ww-nodes-nav__chip--on" : ""
          }`}
          aria-expanded={sheetOpen}
          aria-controls={sheetTitleId}
          title="All WolfWatch desks — names & boards"
          onClick={() => setSheetOpen((v) => !v)}
        >
          <span className="ww-nodes-nav__code">All</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${sheetOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {sheetOpen && (
        <div className="ww-ww-sheet" role="dialog" aria-modal="true" aria-labelledby={sheetTitleId}>
          <button
            type="button"
            className="ww-ww-sheet__backdrop"
            aria-label="Close desks list"
            onClick={() => setSheetOpen(false)}
          />
          <div className="ww-ww-sheet__panel">
            <header className="ww-ww-sheet__head">
              <div className="min-w-0">
                <h2 id={sheetTitleId} className="ww-ww-sheet__title">
                  {WOLFWATCH_NETWORK.name}
                </h2>
                <p className="ww-ww-sheet__sub">{WOLFWATCH_NETWORK.tagline}</p>
              </div>
              <button
                type="button"
                className="ww-ww-sheet__close"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="ww-ww-sheet__home-row">
              <button
                type="button"
                className={`ww-ww-sheet__row ${!anyFocused ? "ww-ww-sheet__row--on" : ""}`}
                onClick={goHome}
              >
                <Home className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">SES world</span>
                  <span className="block text-[0.65rem] text-dim">Full globe · clear desk focus</span>
                </span>
              </button>
            </div>

            {[...byRegion.entries()].map(([region, list]) => (
              <div key={region} className="ww-ww-sheet__group">
                <h3 className="ww-ww-sheet__group-label">
                  {REGION_LABEL[region as keyof typeof REGION_LABEL] ?? region}
                </h3>
                <ul className="ww-ww-sheet__list">
                  {list.map((m) => {
                    const on = focused === m.sesNodeId;
                    const board = monitorHandoffUrl(m.sesNodeId) || m.monitorUrl;
                    const hint = SHORTCUT_HINT[m.sesNodeId];
                    return (
                      <li key={m.sesNodeId}>
                        <div className={`ww-ww-sheet__row ${on ? "ww-ww-sheet__row--on" : ""}`}>
                          <button
                            type="button"
                            className="ww-ww-sheet__focus"
                            onClick={() => goNode(m.sesNodeId)}
                          >
                            <span className="ww-ww-sheet__code">{monitorNavLabel(m)}</span>
                            <span className="min-w-0 flex-1 text-left">
                              <span className="block truncate font-semibold text-fg">{m.name}</span>
                              <span className="block truncate text-[0.62rem] text-dim">
                                #{m.networkOrder}
                                {hint ? ` · key ${hint}` : ""}
                                {" · "}
                                {m.authority.split(/[·(]/)[0]?.trim()}
                              </span>
                            </span>
                          </button>
                          {board && (
                            <a
                              href={board}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ww-ww-sheet__board"
                              title={`Open ${m.name} board`}
                              aria-label={`Open ${m.shortCode} board`}
                              onClick={() => {
                                if (focused !== m.sesNodeId) setFocusNode(m.sesNodeId);
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {focusedMon && (
              <p className="ww-ww-sheet__foot">
                Focused: <strong>{focusedMon.shortCode}</strong> · {focusedMon.name}. Tap again or SES
                to leave.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
