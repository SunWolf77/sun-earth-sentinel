import { ExternalLink, Mountain, Pin, PinOff, EyeOff, Eye } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  colorCodeHex,
  type UsgsVolcanoAlert,
} from "@/lib/feeds/usgsVolcanoAlerts";
import { alertKey, nodeIdForAlert } from "@/lib/feeds/watchlistOverride";

function AlertChip({ v }: { v: UsgsVolcanoAlert }) {
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const setOverlay = useObservatory((s) => s.setOverlay);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const pins = useObservatory((s) => s.volcWatchPins);
  const mutes = useObservatory((s) => s.volcWatchMutes);
  const pinVolcWatch = useObservatory((s) => s.pinVolcWatch);
  const unpinVolcWatch = useObservatory((s) => s.unpinVolcWatch);
  const muteVolcWatch = useObservatory((s) => s.muteVolcWatch);
  const unmuteVolcWatch = useObservatory((s) => s.unmuteVolcWatch);

  const hex = colorCodeHex(v.colorCode);
  const canFly = v.lat != null && v.lon != null;
  const key = alertKey(v);
  const nodeId = nodeIdForAlert(v);
  const active = focusNodeId === nodeId;
  const pinned = pins.includes(key);
  const muted = mutes.includes(key);

  return (
    <li>
      <div
        className={`flex w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-md border px-2 py-1.5 text-[0.7rem] ${
          active
            ? "border-orange-400/60 bg-orange-500/15"
            : muted
              ? "border-border/40 bg-bg/30 opacity-60"
              : "border-border/70 bg-bg/50"
        }`}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-left hover:opacity-90 disabled:opacity-50"
          disabled={!canFly}
          onClick={() => {
            if (!canFly) return;
            setOverlay("volcanoes", true);
            setFocusNode(active ? null : nodeId);
            flyMapTo(v.lat!, v.lon!, 7, nodeId);
          }}
        >
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: hex }}
            aria-hidden
          />
          <span className="font-semibold text-fg">{v.name}</span>
          <span className="font-mono text-[0.62rem] uppercase" style={{ color: hex }}>
            {v.colorCode}
          </span>
          <span className="text-[0.62rem] text-dim">{v.alertLevel}</span>
          {pinned && (
            <span className="text-[0.55rem] font-semibold text-primary">PIN</span>
          )}
        </button>
        <button
          type="button"
          className="ww-btn ww-btn--icon h-7 w-7 min-h-0"
          title={pinned ? "Unpin (auto-drop at green)" : "Pin (keep after green)"}
          onClick={() => (pinned ? unpinVolcWatch(key) : pinVolcWatch(key))}
        >
          {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button
          type="button"
          className="ww-btn ww-btn--icon h-7 w-7 min-h-0"
          title={muted ? "Unmute (show on watchlist)" : "Mute (hide from watchlist)"}
          onClick={() => (muted ? unmuteVolcWatch(key) : muteVolcWatch(key))}
        >
          {muted ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
        {v.noticeUrl && (
          <a
            href={v.noticeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[0.6rem] text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

export function VolcanoAlertsBar({ compact = false }: { compact?: boolean }) {
  const alerts = useObservatory((s) => s.usgsVolcAlerts);
  const pins = useObservatory((s) => s.volcWatchPins);
  const mutes = useObservatory((s) => s.volcWatchMutes);
  const loading = useObservatory((s) => s.loading);
  const memoryPins = pins.filter((k) => !alerts.some((a) => alertKey(a) === k));

  if (!alerts.length && !pins.length && !loading) {
    if (compact) return null;
    return (
      <div className="rounded-lg border border-border/80 bg-panel/60 px-2.5 py-2 text-[0.68rem] text-dim">
        <span className="inline-flex items-center gap-1 font-semibold text-muted">
          <Mountain className="h-3.5 w-3.5" /> USGS volcano alerts
        </span>
        <p className="mt-0.5">
          All baseline (NORMAL / GREEN). Pin from history when elevated to keep a watch.
        </p>
      </div>
    );
  }

  if (!alerts.length && !pins.length) return null;

  return (
    <div
      className={`rounded-lg border border-orange-500/30 bg-orange-500/5 ${
        compact ? "px-2 py-1.5" : "px-2.5 py-2"
      }`}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
        <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-orange-300">
          <Mountain className="h-3.5 w-3.5" />
          USGS elevated ({alerts.length})
          {pins.length > 0 && (
            <span className="font-normal text-dim">· {pins.length} pinned</span>
          )}
          {mutes.length > 0 && (
            <span className="font-normal text-dim">· {mutes.length} muted</span>
          )}
        </span>
        <a
          href="https://www.usgs.gov/programs/VHP"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.6rem] text-dim hover:text-primary"
        >
          VHP / HANS
        </a>
      </div>
      <p className="mb-1 text-[0.58rem] text-dim">
        Pin = keep after green · Mute = hide while elevated · Tap name = map focus
      </p>
      <ul
        className={`space-y-1 ${
          compact ? "max-h-32 overflow-y-auto scroll-thin" : "max-h-44 overflow-y-auto scroll-thin"
        }`}
      >
        {alerts.map((v) => (
          <AlertChip key={v.id} v={v} />
        ))}
      </ul>
      {memoryPins.length > 0 && (
        <p className="mt-1 text-[0.58rem] text-dim">
          Pinned baseline keys: {memoryPins.join(", ")} (map watch until unpin)
        </p>
      )}
    </div>
  );
}
