/**
 * Tiny animal mark for a WolfWatch desk (header chips, sheet, sidebar).
 */

import { getDeskGlyph } from "@/lib/feeds/deskGlyphs";

type Props = {
  sesNodeId: string;
  className?: string;
  /** Show title tooltip with animal name */
  titled?: boolean;
};

export function DeskGlyph({ sesNodeId, className = "h-3.5 w-3.5", titled = true }: Props) {
  const g = getDeskGlyph(sesNodeId);
  if (!g) return null;
  const { Icon, label, why } = g;
  return (
    <Icon
      className={`shrink-0 ${className}`}
      title={titled ? `${label} · ${why}` : undefined}
    />
  );
}
