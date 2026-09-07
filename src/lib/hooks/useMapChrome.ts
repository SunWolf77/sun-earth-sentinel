import { useCallback, useEffect, useState } from "react";
import {
  MAP_CHROME_EVENT,
  MAP_INTERACT_EVENT,
  readMapChrome,
  writeMapChrome,
  type MapChrome,
} from "@/lib/ui/mapChrome";

/**
 * Phone live-map chrome. Hydrates after mount (SSR-safe desk first).
 * Pan/zoom auto-fogs to map. Bottom tabs are not part of this mode.
 */
export function useMapChrome(): {
  chrome: MapChrome;
  setChrome: (mode: MapChrome) => void;
  isMap: boolean;
} {
  const [chrome, setChromeState] = useState<MapChrome>("desk");

  useEffect(() => {
    setChromeState(readMapChrome());
    const onMode = (e: Event) => {
      const next = (e as CustomEvent<MapChrome>).detail;
      if (next === "desk" || next === "map") setChromeState(next);
    };
    const onInteract = () => {
      if (readMapChrome() === "map") return;
      writeMapChrome("map");
    };
    window.addEventListener(MAP_CHROME_EVENT, onMode);
    window.addEventListener(MAP_INTERACT_EVENT, onInteract);
    return () => {
      window.removeEventListener(MAP_CHROME_EVENT, onMode);
      window.removeEventListener(MAP_INTERACT_EVENT, onInteract);
    };
  }, []);

  useEffect(() => {
    const pulse = () => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("ww-map-resize"));
    };
    const a = window.setTimeout(pulse, 60);
    const b = window.setTimeout(pulse, 220);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [chrome]);

  const setChrome = useCallback((mode: MapChrome) => {
    writeMapChrome(mode);
  }, []);

  return { chrome, setChrome, isMap: chrome === "map" };
}
