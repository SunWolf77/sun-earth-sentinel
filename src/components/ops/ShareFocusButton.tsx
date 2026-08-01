import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import {
  shareOrCopy,
  shareUrlForPickedEvent,
  shareUrlForNode,
  shareUrlForVolcano,
  buildShareFocusUrl,
  type ShareFocusInput,
} from "@/lib/pwa/shareFocus";
import { useObservatory, type PickedEvent } from "@/store/observatory";

type Props =
  | { target: "event"; event: PickedEvent; className?: string; compact?: boolean; label?: string }
  | { target: "node"; nodeId: string; lat?: number; lon?: number; className?: string; compact?: boolean; label?: string }
  | {
      target: "volcano";
      volcanoId: string;
      lat?: number;
      lon?: number;
      place?: string;
      className?: string;
      compact?: boolean;
      label?: string;
    }
  | { target: "custom"; input: ShareFocusInput; className?: string; compact?: boolean; label?: string };

/**
 * One-click share of focused entity (event / node / volcano) as a deep link.
 */
export function ShareFocusButton(props: Props) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const minMag = useObservatory((s) => s.minMag);
  const mapView = useObservatory((s) => s.mapView);
  const basemapStyle = useObservatory((s) => s.basemapStyle);
  const mode = useObservatory((s) => s.mode);
  const overlays = useObservatory((s) => s.overlays);
  const replayActive = useObservatory((s) => s.replayActive);
  const replayCursorMs = useObservatory((s) => s.replayCursorMs);

  const ctx = {
    nodeId: focusNodeId,
    window: timeWindow,
    minMag,
    mapView,
    basemap: basemapStyle,
    mode,
    layers: overlays,
    replay: replayActive,
    replayMs: replayActive ? replayCursorMs : null,
  };

  const buildUrl = (): string => {
    if (props.target === "event") return shareUrlForPickedEvent(props.event, ctx);
    if (props.target === "node")
      return shareUrlForNode(props.nodeId, {
        lat: props.lat,
        lon: props.lon,
        window: timeWindow,
        minMag,
        mapView,
        layers: overlays,
      });
    if (props.target === "volcano")
      return shareUrlForVolcano(props.volcanoId, {
        lat: props.lat,
        lon: props.lon,
        place: props.place,
        layers: overlays,
      });
    return buildShareFocusUrl({
      ...props.input,
      window: props.input.window ?? timeWindow,
      minMag: props.input.minMag ?? minMag,
      mapView: props.input.mapView ?? mapView,
      basemap: props.input.basemap ?? basemapStyle,
      mode: props.input.mode ?? mode,
      layers: props.input.layers ?? overlays,
      nodeId: props.input.nodeId ?? focusNodeId,
    });
  };

  const onShare = async () => {
    const url = buildUrl();
    // Push into address bar so header "copy view" matches
    try {
      if (typeof window !== "undefined") {
        const next = new URL(url);
        window.history.replaceState(
          window.history.state,
          "",
          next.pathname + next.search + next.hash,
        );
      }
    } catch {
      /* ignore */
    }
    const title =
      props.target === "event"
        ? `M${props.event.mag.toFixed(1)} · ${props.event.place}`
        : props.target === "node"
          ? `Node · ${props.nodeId}`
          : props.target === "volcano"
            ? `Volcano · ${props.place || props.volcanoId}`
            : "Sun Earth Sentinel";
    const r = await shareOrCopy(url, title);
    setState(r === "failed" ? "err" : "ok");
    window.setTimeout(() => setState("idle"), 1800);
  };

  const label =
    props.label ??
    (props.compact ? "Share" : state === "ok" ? "Link ready" : state === "err" ? "Failed" : "Share focus");

  return (
    <button
      type="button"
      className={
        props.className ??
        `ww-btn text-[0.62rem] ${props.compact ? "ww-btn--compact" : ""} ${
          state === "ok" ? "ww-btn--active" : ""
        }`
      }
      onClick={() => void onShare()}
      title="Copy / share a direct link to this focus (event, node, volcano, or replay)"
    >
      {state === "ok" ? (
        <Check className="mr-1 inline h-3 w-3" aria-hidden />
      ) : (
        <Link2 className="mr-1 inline h-3 w-3" aria-hidden />
      )}
      {label}
    </button>
  );
}
