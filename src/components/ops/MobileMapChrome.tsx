/**
 * Overlay chrome on the mobile live canvas.
 * Never takes layout height — Pulse expand is a sheet over Earth,
 * not a block that pushes the map down.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { MobilePulseStrip } from "@/components/ops/MobilePulseStrip";
import { useMapChrome } from "@/lib/hooks/useMapChrome";
import { useObservatory, getFocusNode } from "@/store/observatory";
import { getPublishedMonitor, resolveNodeId } from "@/lib/feeds/publishedMonitors";

export function MobileMapChrome() {
  const { isMap, setChrome } = useMapChrome();
  const [pulseOpen, setPulseOpen] = useState(false);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const setTab = useObservatory((s) => s.setTab);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);
  const mobileSheet = useObservatory((s) => s.mobileSheet);

  const resolved = focusNodeId ? resolveNodeId(focusNodeId) ?? focusNodeId : null;
  const pub = resolved ? getPublishedMonitor(resolved) : null;
  const node = getFocusNode(resolved);
  const leaveLabel =
    pub?.shortCode ??
    (node?.name ? node.name.split(/[–—]/)[0]?.trim().slice(0, 10) : null) ??
    "zone";

  useEffect(() => {
    const close = () => setPulseOpen(false);
    window.addEventListener("ww-map-interact", close);
    return () => window.removeEventListener("ww-map-interact", close);
  }, []);

  useEffect(() => {
    if (mobileSheet !== "closed") setPulseOpen(false);
  }, [mobileSheet]);

  useEffect(() => {
    if (!pulseOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPulseOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pulseOpen]);

  const goHome = () => {
    exitToHomeView();
    setTab("live");
    setMobileSheet("closed");
  };

  return (
    <div className={`ww-map-fog${pulseOpen ? " ww-map-fog--open" : ""}`}>
      {pulseOpen && (
        <button
          type="button"
          className="ww-pulse-backdrop"
          aria-label="Close pulse"
          onClick={() => setPulseOpen(false)}
        />
      )}
      <div className="ww-map-fog__row">
        {!pulseOpen && focusNodeId && (
          <button
            type="button"
            className="ww-chrome-peek ww-chrome-peek--back"
            onClick={goHome}
            title="Back to SES world (H)"
            aria-label={`Back to SES world from ${leaveLabel}`}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{leaveLabel}</span>
          </button>
        )}
        {!pulseOpen && isMap && (
          <button
            type="button"
            className="ww-chrome-peek"
            onClick={() => setChrome("desk")}
            title="Show desk — header and WolfWatch"
            aria-label="Show desk chrome"
          >
            <span>SES</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <MobilePulseStrip overlay open={pulseOpen} onOpenChange={setPulseOpen} />
        </div>
      </div>
    </div>
  );
}
