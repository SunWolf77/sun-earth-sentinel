/**
 * First-visit UI flags.
 *
 * Keys live under `ww_ui_*` so:
 *  - site-data clear / CACHE_VER bump in localCache.ts wipes them (coach returns)
 *  - ordinary feed prune does NOT (rank 99) — nags after a quota trim would be worse
 */

const PREFIX = "ww_ui_";

export const UI_FOLDERS_KEY = "folders_v1";

export function uiSeen(key: string): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    return localStorage.getItem(PREFIX + key) === "1";
  } catch {
    return true;
  }
}

export function markUiSeen(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, "1");
  } catch {
    /* quota / private mode */
  }
  try {
    window.dispatchEvent(new CustomEvent("ww-ui-seen", { detail: key }));
  } catch {
    /* */
  }
}
