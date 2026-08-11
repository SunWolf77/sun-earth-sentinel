import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import {
  shareOrCopy,
  shareUrlForPickedEvent,
  shareUrlForNode,
  shareUrlForVolcano,
  buildShareFocusUrl,
  payloadForPickedEvent,
  softReplaceShareUrl,
  canWebShare,
  type ShareFocusInput,
  type ShareResult,
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
 * One-click Web Share (native sheet) or clipboard of focused entity deep link.
 * Never full-navigates the SPA.
 */
export function ShareFocusButton(props: Props) {
  const [state, setState] = useState<"idle" | "ok" | "err" | "cancel">("idle");
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
    softReplaceShareUrl(url);

    let title = "Sun-Earth Sentinel";
    let text: string | undefined;
    if (props.target === "event") {
      const p = payloadForPickedEvent(props.event, url);
      title = p.title;
      text = p.text;
    } else if (props.target === "node") {
      title = `Zone · ${props.nodeId} · Sun-Earth Sentinel`;
      text = `Watch desk ${props.nodeId}\n${url}`;
    } else if (props.target === "volcano") {
      title = `Volcano · ${props.place || props.volcanoId} · Sun-Earth Sentinel`;
      text = `${props.place || props.volcanoId}\n${url}`;
    }

    const r: ShareResult = await shareOrCopy(url, title, { text });
    if (r === "shared" || r === "copied") setState("ok");
    else if (r === "cancelled") setState("cancel");
    else setState("err");
    window.setTimeout(() => setState("idle"), 1800);
  };

  const web = typeof navigator !== "undefined" && canWebShare();
  const label =
    props.label ??
    (props.compact
      ? web
        ? "Share"
        : "Copy"
      : state === "ok"
        ? web
          ? "Shared"
          : "Link ready"
        : state === "err"
          ? "Failed"
          : state === "cancel"
            ? "Cancelled"
            : web
              ? "Share focus"
              : "Copy link");

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
      title={
        web
          ? "Open system share sheet (Messages, Mail, …) with a deep link to this focus"
          : "Copy a direct link to this focus (event, node, volcano, or replay)"
      }
    >
      {state === "ok" ? (
        <Check className="mr-1 inline h-3 w-3" aria-hidden />
      ) : web ? (
        <Share2 className="mr-1 inline h-3 w-3" aria-hidden />
      ) : (
        <Link2 className="mr-1 inline h-3 w-3" aria-hidden />
      )}
      {label}
    </button>
  );
}
