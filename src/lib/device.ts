/** Viewport / UA helpers for first-open defaults (mobile-first data). */

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(max-width: 767px)").matches) return true;
    if (window.matchMedia?.("(pointer: coarse)").matches && window.innerWidth < 900)
      return true;
  } catch {
    /* ignore */
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return /Android|iPhone|iPod|Mobile|webOS|BlackBerry/i.test(ua);
}

/** First visit with no saved mode → lite on phone, standard on desktop. */
export function defaultPerformanceMode(): "lite" | "standard" {
  return isMobileViewport() ? "lite" : "standard";
}

export function historyCap(): number {
  return isMobileViewport() ? 24 : 48;
}

export function cacheSoftLimitBytes(): number {
  return isMobileViewport() ? 1_200_000 : 3_500_000;
}
