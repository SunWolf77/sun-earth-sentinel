import { useEffect, useRef } from "react";
import { useObservatory } from "@/store/observatory";

/**
 * Smart mapping for USGS elevated volcano watchlist:
 *  - Auto-enable Volcanoes layer while any elevated
 *  - Toast elevate / return-to-baseline
 *  - Fly + focus only on single new elevate (not bulk first seed)
 */
export function VolcWatchSmart() {
  const transitions = useObservatory((s) => s.volcWatchTransitions);
  const volcWatchNodes = useObservatory((s) => s.volcWatchNodes);
  const setOverlay = useObservatory((s) => s.setOverlay);
  const flyMapTo = useObservatory((s) => s.flyMapTo);
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const seen = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  useEffect(() => {
    if (volcWatchNodes.length > 0) {
      setOverlay("volcanoes", true);
    }
  }, [volcWatchNodes.length, setOverlay]);

  useEffect(() => {
    if (!transitions.length) return;

    // First paint after fetch: may dump several "elevated" seeds — one summary toast, no multi-fly
    const fresh = transitions.filter((t) => {
      const key = `${t.kind}:${t.id}:${t.at}`;
      if (seen.current.has(key)) return false;
      seen.current.add(key);
      return true;
    });
    if (!fresh.length) return;

    const elevates = fresh.filter((t) => t.kind === "elevated");
    const baselines = fresh.filter((t) => t.kind === "baseline");

    if (!seeded.current && elevates.length > 1) {
      seeded.current = true;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ww-volc-watch", {
            detail: {
              message: `Volcanoes: ${elevates.length} elevated`,
              kind: "elevated",
            },
          }),
        );
      }
      return;
    }
    seeded.current = true;

    for (const latest of elevates) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ww-volc-watch", {
            detail: {
              message: `${latest.name}: ${latest.colorCode}`,
              kind: "elevated",
              nodeId: latest.id,
            },
          }),
        );
      }
      const node = useObservatory
        .getState()
        .volcWatchNodes.find((n) => n.id === latest.id);
      if (node?.center && elevates.length === 1) {
        flyMapTo(node.center[0], node.center[1], 6, latest.id);
        setFocusNode(latest.id);
      }
    }

    for (const latest of baselines) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ww-volc-watch", {
            detail: {
              message: `${latest.name}: baseline`,
              kind: "baseline",
              nodeId: latest.id,
            },
          }),
        );
      }
      const focus = useObservatory.getState().focusNodeId;
      if (focus === latest.id) setFocusNode(null);
    }
  }, [transitions, flyMapTo, setFocusNode]);

  return null;
}
