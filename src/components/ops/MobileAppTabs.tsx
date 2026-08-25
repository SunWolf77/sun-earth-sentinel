import {
  Activity,
  BookOpen,
  Map as MapIcon,
  Sun,
  Waves,
} from "lucide-react";
import { useObservatory, type TabId } from "@/store/observatory";

export const APP_TABS: {
  id: TabId;
  label: string;
  short: string;
  Icon: typeof MapIcon;
}[] = [
  { id: "live", label: "Live Map", short: "Map", Icon: MapIcon },
  { id: "solar", label: "Solar", short: "Solar", Icon: Sun },
  { id: "resonance", label: "Rhythm", short: "Rhythm", Icon: Waves },
  { id: "analytics", label: "Charts", short: "Charts", Icon: Activity },
  { id: "about", label: "About", short: "About", Icon: BookOpen },
];

/** Persistent phone tab bar — always labeled, 44px targets. Replaces the unreadable header chips. */
export function MobileAppTabs() {
  const tab = useObservatory((s) => s.tab);
  const setTab = useObservatory((s) => s.setTab);
  const mapImmersive = useObservatory((s) => s.mapImmersive);
  if (mapImmersive) return null;

  return (
    <nav className="ww-app-tabs" role="tablist" aria-label="Main sections">
      {APP_TABS.map(({ id, short, Icon }) => {
        const on = tab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`mob-tab-${id}`}
            aria-selected={on}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`ww-app-tabs__btn ${on ? "ww-app-tabs__btn--on" : ""}`}
          >
            <Icon className="ww-app-tabs__icon" aria-hidden />
            <span>{short}</span>
          </button>
        );
      })}
    </nav>
  );
}
