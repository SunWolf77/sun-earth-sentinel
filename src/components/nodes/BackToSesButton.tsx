/**
 * Dedicated "back to SES world" control — visible only while a zone is focused.
 * Complements header SES chip; large hit target for map-first / mobile use.
 */

import { ArrowLeft } from "lucide-react";
import { useObservatory, getFocusNode } from "@/store/observatory";
import { resolveNodeId, getPublishedMonitor } from "@/lib/feeds/publishedMonitors";

type Props = {
  /** floating over map | inline in header row */
  variant?: "float" | "inline";
  className?: string;
};

export function BackToSesButton({ variant = "float", className = "" }: Props) {
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const setTab = useObservatory((s) => s.setTab);
  const setMobileSheet = useObservatory((s) => s.setMobileSheet);

  if (!focusNodeId) return null;

  const resolved = resolveNodeId(focusNodeId) ?? focusNodeId;
  const pub = getPublishedMonitor(resolved);
  const node = getFocusNode(resolved);
  const label =
    pub?.shortCode ??
    (node?.name ? node.name.split(/[–—]/)[0]?.trim().slice(0, 12) : null) ??
    "zone";

  const goHome = () => {
    exitToHomeView();
    setTab("live");
    setMobileSheet("closed");
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        className={`ww-back-ses ww-back-ses--inline ${className}`}
        onClick={goHome}
        title="Back to SES world view (H)"
        aria-label={`Back to SES world from ${label}`}
      >
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="ww-back-ses__text">SES</span>
        <span className="ww-back-ses__from">← {label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`ww-back-ses ww-back-ses--float ${className}`}
      onClick={goHome}
      title="Back to SES world view — keyboard H or Esc"
      aria-label={`Back to SES world from ${label}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span className="text-[0.68rem] font-semibold tracking-wide">SES world</span>
        <span className="max-w-[9rem] truncate text-[0.55rem] font-medium opacity-80">
          leave {label}
        </span>
      </span>
    </button>
  );
}
