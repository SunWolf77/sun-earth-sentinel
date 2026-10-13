/**
 * Dynamic import with limited retries.
 * Mobile + service-worker can return a one-shot 504 on a chunk fetch;
 * a second attempt usually succeeds. Final failure reloads once so the
 * client picks matching hashed assets after a deploy.
 */
const RELOAD_KEY = "ww-chunk-reload";

export function lazyRetry<T extends { default: unknown }>(
  loader: () => Promise<T>,
  retries = 2,
): Promise<T> {
  return loader().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    const isChunk =
      /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
        msg,
      );
    if (retries > 0 && isChunk) {
      return new Promise((resolve) => setTimeout(resolve, 400)).then(() =>
        lazyRetry(loader, retries - 1),
      );
    }
    if (isChunk && typeof window !== "undefined") {
      try {
        const already = sessionStorage.getItem(RELOAD_KEY);
        if (!already) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
          return new Promise(() => {});
        }
      } catch {
        /* private mode */
      }
    }
    throw err;
  });
}
