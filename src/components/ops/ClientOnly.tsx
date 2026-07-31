import { useEffect, useState, type ReactNode } from "react";

/** Render children only after mount — keeps browser-only libs (Leaflet) off SSR. */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
}
