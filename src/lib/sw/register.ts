/**
 * Register shell service worker (production + secure contexts).
 * Skips in Vite HMR dev when SW would fight the dev server — opt-in via flag.
 *
 * Deploy safety: SW never caches HTML (hashed asset map). On SW update we reload
 * once so open tabs pick the new document + matching /assets/*.
 */

const SW_PATH = "/sw.js";

export type SwStatus = "unsupported" | "skipped" | "registering" | "ready" | "error";

function markReloaded(): boolean {
  try {
    if (sessionStorage.getItem("ww_sw_reloaded") === "1") return false;
    sessionStorage.setItem("ww_sw_reloaded", "1");
    return true;
  } catch {
    return true;
  }
}

export async function registerShellServiceWorker(opts?: {
  /** Allow SW during Vite dev (default false). */
  allowDev?: boolean;
}): Promise<{ status: SwStatus; error?: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { status: "unsupported" };
  }
  const isDev =
    typeof import.meta !== "undefined" &&
    Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  if (isDev && !opts?.allowDev) {
    return { status: "skipped" };
  }
  try {
    const hadController = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.addEventListener("message", (ev) => {
      const data = ev.data as { type?: string } | undefined;
      if (data?.type !== "WW_SW_ACTIVATED") return;
      // Only force reload when this tab was already controlled (update path)
      if (!hadController) return;
      if (!markReloaded()) return;
      window.location.reload();
    });

    // controllerchange fires on first claim AND on updates — reload only for updates
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) return;
      if (!markReloaded()) return;
      window.location.reload();
    });

    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    await reg.update().catch(() => undefined);
    if (reg.waiting) {
      reg.waiting.postMessage?.({ type: "SKIP_WAITING" });
    }
    // Mobile profile → leaner runtime cache (fewer entries, skip fat images)
    const mobile =
      window.matchMedia("(max-width: 768px)").matches ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 1 && window.innerWidth < 900);
    const postProfile = (sw: ServiceWorker | null | undefined) => {
      sw?.postMessage?.({ type: "SET_PROFILE", mobile });
      if (mobile) sw?.postMessage?.({ type: "TRIM" });
    };
    postProfile(reg.active);
    postProfile(navigator.serviceWorker.controller);
    navigator.serviceWorker.ready.then((r) => postProfile(r.active)).catch(() => undefined);
    return { status: "ready" };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : "SW register failed",
    };
  }
}

export async function unregisterShellServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("ww-shell") || k.startsWith("ww-runtime") || k.startsWith("ww-"))
        .map((k) => caches.delete(k)),
    );
  }
  return true;
}
