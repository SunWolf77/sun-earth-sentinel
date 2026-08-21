/**
 * First-visit mobile chrome coach.
 * Sits in the dock track (not over Earth). One line. Got it = don't show again
 * until ww_* cache is fully cleared (CACHE_VER bump or site data).
 */

import { X } from "lucide-react";

type Props = {
  onDismiss: () => void;
};

export function MobileFolderCoach({ onDismiss }: Props) {
  return (
    <div
      className="ww-folder-coach pointer-events-auto mx-auto w-full max-w-[min(24rem,calc(100vw-0.75rem))]"
      role="status"
    >
      <p className="min-w-0 flex-1">
        <strong className="text-fg">Folders slide up.</strong> Map · Filters · Events ·
        Layers. Pulse (top) expands. Swipe the map to change views.
      </p>
      <button
        type="button"
        className="ww-btn ww-btn--compact shrink-0 text-[0.62rem] font-semibold"
        onClick={onDismiss}
      >
        Got it
      </button>
      <button
        type="button"
        className="shrink-0 rounded p-0.5 text-dim hover:text-fg"
        aria-label="Don't show again"
        onClick={onDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
