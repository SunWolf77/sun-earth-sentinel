/**
 * First-visit mobile chrome coach.
 * Sits in the dock track (not over Earth). One control. Got it = don't show
 * again until ww_* cache is fully cleared (CACHE_VER bump or site data).
 */

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
        <strong className="text-fg">Map owns the screen.</strong> Drag to hide the
        desk · SES ▾ brings it back. Folders (Map · Filters · Events · Layers)
        slide up. Views stay on the bar at the bottom.
      </p>
      <button
        type="button"
        className="ww-folder-coach__gotit shrink-0"
        onClick={onDismiss}
      >
        Got it
      </button>
    </div>
  );
}
