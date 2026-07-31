import { useEffect, useState } from "react";
import { isMobileViewport } from "@/lib/device";

/** false on SSR + first paint; then real viewport (avoids hydration mismatch). */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const update = () => setMobile(isMobileViewport());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return mobile;
}
