/**
 * Hybrid CSS2D labels for the 3D globe — crisp DOM type for sparse important chips.
 * Dense catalog stays on mesh pins + optional canvas sprites.
 */

export const CSS2D_CAP_DESKTOP = 28;
export const CSS2D_CAP_MOBILE = 12;

/** Mag threshold for automatic CSS2D chips (spiderfy always eligible). */
export const CSS2D_MAG_MIN = 5.5;

export type Css2dKind = "mag" | "node" | "cluster";

export function css2dCap(isMobile: boolean): number {
  return isMobile ? CSS2D_CAP_MOBILE : CSS2D_CAP_DESKTOP;
}

/** Build a non-interactive mag / node chip element. */
export function createCss2dChip(opts: {
  text: string;
  sub?: string;
  color: string;
  kind: Css2dKind;
}): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `ww-globe-css2d ww-globe-css2d--${opts.kind}`;
  el.style.setProperty("--pin", opts.color);
  el.setAttribute("aria-hidden", "true");

  const main = document.createElement("span");
  main.className = "ww-globe-css2d__main";
  main.textContent = opts.text;
  el.appendChild(main);

  if (opts.sub) {
    const sub = document.createElement("span");
    sub.className = "ww-globe-css2d__sub";
    sub.textContent = opts.sub;
    el.appendChild(sub);
  }

  return el;
}
