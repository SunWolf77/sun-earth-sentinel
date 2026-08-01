import { ExternalLink, Home, Mountain, Pin, PinOff, EyeOff, Eye } from "lucide-react";
import { useObservatory } from "@/store/observatory";
import {
  colorCodeHex,
  type UsgsVolcanoAlert,
} from "@/lib/feeds/usgsVolcanoAlerts";
import { gvpProfileUrl } from "@/lib/feeds/gvpGlobal";
import { alertKey, nodeIdForAlert } from "@/lib/feeds/watchlistOverride";

function AlertChip({ v }: { v: UsgsVolcanoAlert }) {
  const setOverlay = useObservatory((s) => s.setOverlay);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
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
  const gvp = gvpProfileUrl(v.vnum) || (v.vnum ? `https://volcano.si.edu/volcano.cfm?vn=${v.vnum}` : null);

  return (
    <li>
      <div
        className={`flex w-full flex-col gap-1 rounded-md border px-2 py-1.5 text-[0.7rem] ${
          active
            ? "border-orange-400/60 bg-orange-500/15"
            : muted
              ? "border-border/40 bg-bg/30 opacity-60"
              : "border-border/70 bg-bg/50"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <button
            type="button"
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-left hover:opacity-90 disabled:opacity-50"
            disabled={!canFly}
            title={active ? "Exit focus · home view" : "Focus region on map"}
            onClick={() => {
              if (!canFly) return;
              setOverlay("volcanoes", true);
              if (active) {
                exitToHomeView();
              } else {
                setFocusNode(nodeId);
              }
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
          {active && (
            <button
              type="button"
              className="ww-btn ww-btn--icon h-7 w-7 min-h-0"
              title="Home view"
              onClick={() => exitToHomeView()}
            >
              <Home className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-3.5 text-[0.6rem] text-dim">
          <span>
            {v.region || v.obsName}
            {v.region && v.obsAbbr ? ` · ${v.obsAbbr.toUpperCase()}` : ""}
          </span>
          {gvp && (
            <a
              href={gvp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-warn hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Smithsonian GVP
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {v.noticeUrl && (
            <a
              href={v.noticeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              USGS notice
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {v.volcanoUrl && v.volcanoUrl !== v.noticeUrl && (
            <a
              href={v.volcanoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-muted hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Profile
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

export function VolcanoAlertsBar({ compact = false }: { compact?: boolean }) {
  const alerts = useObservatory((s) => s.usgsVolcAlerts);
  const pins = useObservatory((s) => s.volcWatchPins);
  const mutes = useObservatory((s) => s.volcWatchMutes);
  const loading = useObservatory((s) => s.loading);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const exitToHomeView = useObservatory((s) => s.exitToHomeView);
  const setOverlay = useObservatory((s) => s.setOverlay);
  const globalOn = useObservatory((s) => s.overlays.globalVolcanoes);
  const gvpCount = useObservatory((s) => s.gvpVolcanoes.length);
  const gvpLoading = useObservatory((s) => s.gvpVolcanoesLoading);
  const memoryPins = pins.filter((k) => !alerts.some((a) => alertKey(a) === k));
  const focusedElevated = focusNodeId?.startsWith("usgs-volc-") || focusNodeId?.startsWith("gvp-");

  if (!alerts.length && !pins.length && !loading) {
    if (compact) {
      return (
        <div className="rounded-lg border border-border/80 bg-panel/60 px-2.5 py-2 text-[0.68rem] text-dim">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 font-semibold text-muted">
              <Mountain className="h-3.5 w-3.5" /> USGS elevated · none
            </span>
            <button
              type="button"
              className={`rounded-md border px-1.5 py-0.5 text-[0.58rem] font-medium ${
                globalOn
                  ? "border-warn/50 bg-warn/15 text-warn"
                  : "border-border text-muted hover:text-fg"
              }`}
              onClick={() => setOverlay("globalVolcanoes", !globalOn)}
            >
              {gvpLoading ? "GVP…" : globalOn ? `GVP world · ${gvpCount || "…"}` : "Opt-in GVP world"}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-border/80 bg-panel/60 px-2.5 py-2 text-[0.68rem] text-dim">
        <span className="inline-flex items-center gap-1 font-semibold text-muted">
          <Mountain className="h-3.5 w-3.5" /> USGS volcano alerts
        </span>
        <p className="mt-0.5">
          All baseline (NORMAL / GREEN). Enable <strong className="text-fg">GVP world</strong> in
          layers for global Holocene vents (Smithsonian).
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
        <div className="flex items-center gap-1.5">
          {focusedElevated && (
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded-md border border-border px-1.5 py-0.5 text-[0.58rem] text-muted hover:text-fg"
              onClick={() => exitToHomeView()}
              title="Return to world home view"
            >
              <Home className="h-3 w-3" />
              Home
            </button>
          )}
          <button
            type="button"
            className={`rounded-md border px-1.5 py-0.5 text-[0.58rem] font-medium ${
              globalOn
                ? "border-warn/50 bg-warn/15 text-warn"
                : "border-border text-muted hover:text-fg"
            }`}
            onClick={() => setOverlay("globalVolcanoes", !globalOn)}
            title="Opt-in Smithsonian GVP Holocene (eruption ≥ 2010)"
          >
            {gvpLoading ? "GVP…" : globalOn ? `GVP · ${gvpCount || "…"}` : "GVP world"}
          </button>
          <a
            href="https://www.usgs.gov/programs/VHP"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.6rem] text-dim hover:text-primary"
          >
            VHP
          </a>
        </div>
      </div>
      <p className="mb-1 text-[0.58rem] text-dim">
        Tap name = map focus + region · GVP / notice links open profiles · Home = world view
      </p>
      <ul
        className={`space-y-1 ${
          compact ? "max-h-36 overflow-y-auto scroll-thin" : "max-h-52 overflow-y-auto scroll-thin"
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
