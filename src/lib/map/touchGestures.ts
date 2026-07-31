/**
 * Touch / pointer gestures for Leaflet map + shared helpers.
 * Leaflet already does pan + pinch-zoom; this hardens mobile UX and adds
 * double-tap zoom, long-press lat/lon, and pull-to-refresh prevention.
 */

import type L from "leaflet";

export type MapTouchOptions = {
  /** Double-tap zoom delta (default 1) */
  doubleTapZoomDelta?: number;
  /** Long-press ms (default 520) */
  longPressMs?: number;
  /** Called after long-press with lat/lon */
  onLongPress?: (lat: number, lon: number) => void;
};

export type MapTouchHandle = {
  destroy: () => void;
};

/**
 * Attach mobile-first gestures to a Leaflet map instance.
 */
export function attachMapTouchGestures(
  map: L.Map,
  opts: MapTouchOptions = {},
): MapTouchHandle {
  const el = map.getContainer();
  const doubleTapZoomDelta = opts.doubleTapZoomDelta ?? 1;
  const longPressMs = opts.longPressMs ?? 520;

  // Prefer native multi-touch; prevent browser gestures over map chrome
  el.classList.add("ww-map--touch");
  el.style.touchAction = "none";
  el.style.userSelect = "none";
  (el.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect =
    "none";

  // Ensure core handlers on
  map.dragging?.enable();
  map.touchZoom?.enable();
  map.doubleClickZoom?.enable();
  map.scrollWheelZoom?.enable();
  map.boxZoom?.enable();
  map.keyboard?.enable();
  // Tighter bounce feels better on phone
  map.options.bounceAtZoomLimits = false;
  map.options.worldCopyJump = true;

  let lastTapAt = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let longTimer: ReturnType<typeof setTimeout> | null = null;
  let pressStart: { x: number; y: number; t: number } | null = null;
  let moved = false;
  let suppressClick = false;

  const clearLong = () => {
    if (longTimer) {
      clearTimeout(longTimer);
      longTimer = null;
    }
  };

  const clientXY = (e: TouchEvent | PointerEvent | MouseEvent) => {
    if ("changedTouches" in e && e.changedTouches[0]) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    if ("clientX" in e) return { x: e.clientX, y: e.clientY };
    return { x: 0, y: 0 };
  };

  const onPointerDown = (e: PointerEvent | TouchEvent) => {
    // multi-touch → let Leaflet pinch handle; cancel long-press
    if ("touches" in e && e.touches.length > 1) {
      clearLong();
      pressStart = null;
      return;
    }
    const { x, y } = clientXY(e);
    pressStart = { x, y, t: Date.now() };
    moved = false;
    clearLong();
    longTimer = setTimeout(() => {
      if (!pressStart || moved) return;
      const rect = el.getBoundingClientRect();
      const point = map.containerPointToLatLng([
        pressStart.x - rect.left,
        pressStart.y - rect.top,
      ]);
      opts.onLongPress?.(point.lat, point.lng);
      suppressClick = true;
      // brief haptic if available
      try {
        navigator.vibrate?.(12);
      } catch {
        /* ignore */
      }
    }, longPressMs);
  };

  const onPointerMove = (e: PointerEvent | TouchEvent) => {
    if (!pressStart) return;
    if ("touches" in e && e.touches.length > 1) {
      clearLong();
      return;
    }
    const { x, y } = clientXY(e);
    if (Math.hypot(x - pressStart.x, y - pressStart.y) > 12) {
      moved = true;
      clearLong();
    }
  };

  const onPointerUp = (e: PointerEvent | TouchEvent) => {
    clearLong();
    if ("touches" in e && e.touches.length > 0) {
      pressStart = null;
      return;
    }
    if (suppressClick) {
      suppressClick = false;
      pressStart = null;
      return;
    }
    if (!pressStart || moved) {
      pressStart = null;
      return;
    }
    // Single-finger quick tap → double-tap detect
    if ("touches" in e && e.changedTouches.length !== 1) {
      pressStart = null;
      return;
    }
    const { x, y } = clientXY(e);
    const now = Date.now();
    const dt = now - lastTapAt;
    const dist = Math.hypot(x - lastTapX, y - lastTapY);
    if (dt < 320 && dist < 36) {
      // Double-tap zoom in toward tap point
      const rect = el.getBoundingClientRect();
      const latlng = map.containerPointToLatLng([x - rect.left, y - rect.top]);
      const z = Math.min(map.getMaxZoom(), map.getZoom() + doubleTapZoomDelta);
      map.setView(latlng, z, { animate: true });
      lastTapAt = 0;
      e.preventDefault?.();
    } else {
      lastTapAt = now;
      lastTapX = x;
      lastTapY = y;
    }
    pressStart = null;
  };

  const onPointerCancel = () => {
    clearLong();
    pressStart = null;
  };

  // Prefer Pointer Events; fall back to touch*
  const usePointer = typeof window !== "undefined" && "PointerEvent" in window;
  if (usePointer) {
    el.addEventListener("pointerdown", onPointerDown as EventListener, {
      passive: true,
    });
    el.addEventListener("pointermove", onPointerMove as EventListener, {
      passive: true,
    });
    el.addEventListener("pointerup", onPointerUp as EventListener, { passive: false });
    el.addEventListener("pointercancel", onPointerCancel, { passive: true });
  } else {
    el.addEventListener("touchstart", onPointerDown as EventListener, {
      passive: true,
    });
    el.addEventListener("touchmove", onPointerMove as EventListener, {
      passive: true,
    });
    el.addEventListener("touchend", onPointerUp as EventListener, { passive: false });
    el.addEventListener("touchcancel", onPointerCancel, { passive: true });
  }

  // Stop pull-to-refresh / overscroll chaining on the map element
  const onTouchMoveDoc = (e: TouchEvent) => {
    if (!el.contains(e.target as Node)) return;
    if (e.touches.length >= 1) {
      // allow Leaflet; prevent parent scroll when map is the target
      if (e.cancelable && (e.target === el || el.contains(e.target as Node))) {
        /* leaflet handles; don't preventDefault here for one-finger pan */
      }
    }
  };
  document.addEventListener("touchmove", onTouchMoveDoc, { passive: true });

  return {
    destroy() {
      clearLong();
      el.classList.remove("ww-map--touch");
      if (usePointer) {
        el.removeEventListener("pointerdown", onPointerDown as EventListener);
        el.removeEventListener("pointermove", onPointerMove as EventListener);
        el.removeEventListener("pointerup", onPointerUp as EventListener);
        el.removeEventListener("pointercancel", onPointerCancel);
      } else {
        el.removeEventListener("touchstart", onPointerDown as EventListener);
        el.removeEventListener("touchmove", onPointerMove as EventListener);
        el.removeEventListener("touchend", onPointerUp as EventListener);
        el.removeEventListener("touchcancel", onPointerCancel);
      }
      document.removeEventListener("touchmove", onTouchMoveDoc);
    },
  };
}

/**
 * Horizontal swipe between tabs (mobile).
 * Returns pointer handlers for a panel container.
 */
export function createTabSwipe(opts: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /** Min horizontal px (default 56) */
  threshold?: number;
  /** Max vertical drift (default 48) */
  maxVertical?: number;
}) {
  const threshold = opts.threshold ?? 56;
  const maxVertical = opts.maxVertical ?? 48;
  let startX = 0;
  let startY = 0;
  let tracking = false;

  return {
    onTouchStart(e: React.TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0]!;
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    },
    onTouchEnd(e: React.TouchEvent) {
      if (!tracking || e.changedTouches.length !== 1) {
        tracking = false;
        return;
      }
      const t = e.changedTouches[0]!;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      tracking = false;
      if (Math.abs(dy) > maxVertical) return;
      if (Math.abs(dx) < threshold) return;
      // Don't steal when user is scrolling a nested scrollable
      const target = e.target as HTMLElement | null;
      if (target?.closest?.(".leaflet-container, .ww-map, canvas, .scroll-thin")) {
        // allow if gesture is clearly horizontal and not on map
        if (target.closest(".leaflet-container, .ww-map, canvas")) return;
      }
      if (dx < 0) opts.onSwipeLeft();
      else opts.onSwipeRight();
    },
    onTouchCancel() {
      tracking = false;
    },
  };
}
