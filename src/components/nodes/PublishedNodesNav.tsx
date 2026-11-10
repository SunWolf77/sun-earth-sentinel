/**
 * Header row 3 — WolfWatch desks as a clean segmented strip.
 * Strip shows: wolf mark · SES · glyph+code desks · All
 * Names / boards / keys live in tooltips + the All sheet — not in the chrome.
 */

import { useEffect, useId, useState } from "react";
import { ChevronDown, ExternalLink, Home, X } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  WOLFWATCH_NETWORK,
  monitorHandoffUrl,
  monitorNavLabel,
  orderedPublishedMonitors,
  resolveNodeId,
  type PublishedMonitor,
} from "@/lib/feeds/publishedMonitors";
import { WolfFaceIcon } from "@/components/nodes/WolfFaceIcon";
import { DeskGlyph } from "@/components/nodes/DeskGlyph";
import { getDeskGlyph } from "@/lib/feeds/deskGlyphs";

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

function chipCaption(m: PublishedMonitor): string {
  return m.chipName || m.name.split(/[–—,/]/)[0]?.trim() || m.shortCode;
}

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
      <div className="ww-nodes-rail">
        <span className="ww-nodes-rail__brand" title={WOLFWATCH_NETWORK.tagline}>
          <WolfFaceIcon className="ww-nodes-rail__wolf" title="WolfWatch" />
          <span className="ww-nodes-rail__brand-text">WolfWatch</span>
        </span>

        <div className="ww-nodes-seg" role="group" aria-label="Desk focus">
          <button
            type="button"
            className={`ww-nodes-seg__btn ww-nodes-seg__btn--home ${
              !anyFocused ? "ww-nodes-seg__btn--on" : ""
            }`}
            title="SES world · clear desk focus (H)"
            aria-pressed={!anyFocused}
            onClick={goHome}
          >
            <Home className="ww-nodes-seg__ico" aria-hidden />
            <span className="ww-nodes-seg__code">SES</span>
          </button>

          {monitors.map((m) => {
            const on = focused === m.sesNodeId;
            const hint = SHORTCUT_HINT[m.sesNodeId];
            const code = monitorNavLabel(m);
            const glyph = getDeskGlyph(m.sesNodeId);
            const caption = chipCaption(m);
            return (
              <button
                key={m.sesNodeId}
                type="button"
                className={`ww-nodes-seg__btn ${on ? "ww-nodes-seg__btn--on" : ""}`}
                title={`${m.name}${glyph ? ` · ${glyph.label}` : ""}${
                  hint ? ` · key ${hint}` : ""
                }. Tap again for SES home.`}
                aria-pressed={on}
                aria-label={`Focus ${m.name}${hint ? `, shortcut ${hint}` : ""}`}
                onClick={() => goNode(m.sesNodeId)}
              >
                <DeskGlyph sesNodeId={m.sesNodeId} className="ww-nodes-seg__glyph" titled={false} />
                <span className="ww-nodes-seg__code">{code}</span>
                <span className="ww-nodes-seg__name">{caption}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={`ww-nodes-rail__all ${sheetOpen ? "ww-nodes-rail__all--on" : ""}`}
          aria-expanded={sheetOpen}
          aria-controls={sheetTitleId}
          title="All desks — names & boards"
          onClick={() => setSheetOpen((v) => !v)}
        >
          <span>All</span>
          <ChevronDown
            className={`ww-nodes-rail__chev ${sheetOpen ? "ww-nodes-rail__chev--open" : ""}`}
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
                  <WolfFaceIcon className="ww-ww-sheet__title-ico" />
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
                <span className="ww-ww-sheet__glyph-wrap">
                  <Home className="h-4 w-4" aria-hidden />
                </span>
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
                    const glyph = getDeskGlyph(m.sesNodeId);
                    return (
                      <li key={m.sesNodeId}>
                        <div className={`ww-ww-sheet__row ${on ? "ww-ww-sheet__row--on" : ""}`}>
                          <button
                            type="button"
                            className="ww-ww-sheet__focus"
                            onClick={() => goNode(m.sesNodeId)}
                          >
                            <span className="ww-ww-sheet__glyph-wrap">
                              <DeskGlyph sesNodeId={m.sesNodeId} className="h-4 w-4" />
                            </span>
                            <span className="ww-ww-sheet__code">{monitorNavLabel(m)}</span>
                            <span className="min-w-0 flex-1 text-left">
                              <span className="block truncate font-semibold text-fg">{m.name}</span>
                              <span className="block truncate text-[0.62rem] text-dim">
                                #{m.networkOrder}
                                {glyph ? ` · ${glyph.label}` : ""}
                                {hint ? ` · ${hint}` : ""}
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
                Focused <strong>{focusedMon.shortCode}</strong> · {focusedMon.name}. Tap again or SES
                to leave.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
