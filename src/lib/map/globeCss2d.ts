/**
 * Hybrid CSS2D labels — pool + thrifty updates for globe performance.
 *
 * Optimizations:
 *  - DOM/CSS2DObject pool (no create/destroy each catalog rebuild)
 *  - content-hash skip when chip text/color unchanged
 *  - backface via display:none (cheaper than class thrash every frame)
 *  - facing tests throttled (~10–12 Hz) while spinning
 *  - hard cap mobile/desktop
 */

import type { Object3D, Scene, Vector3 } from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export const CSS2D_CAP_DESKTOP = 24;
export const CSS2D_CAP_MOBILE = 10;

/** Mag threshold for automatic CSS2D chips (spiderfy always eligible). */
export const CSS2D_MAG_MIN = 5.5;

export type Css2dKind = "mag" | "node" | "cluster";

export function css2dCap(isMobile: boolean): number {
  return isMobile ? CSS2D_CAP_MOBILE : CSS2D_CAP_DESKTOP;
}

export type Css2dEntry = {
  obj: CSS2DObject;
  el: HTMLDivElement;
  main: HTMLSpanElement;
  sub: HTMLSpanElement;
  kind: Css2dKind;
  nx: number;
  ny: number;
  nz: number;
  /** last content signature */
  sig: string;
  visible: boolean;
  inScene: boolean;
};

function ensureChipDom(el: HTMLDivElement): {
  main: HTMLSpanElement;
  sub: HTMLSpanElement;
} {
  let main = el.querySelector(".ww-globe-css2d__main") as HTMLSpanElement | null;
  let sub = el.querySelector(".ww-globe-css2d__sub") as HTMLSpanElement | null;
  if (!main) {
    main = document.createElement("span");
    main.className = "ww-globe-css2d__main";
    el.appendChild(main);
  }
  if (!sub) {
    sub = document.createElement("span");
    sub.className = "ww-globe-css2d__sub";
    sub.hidden = true;
    el.appendChild(sub);
  }
  return { main, sub };
}

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
  const { main, sub } = ensureChipDom(el);
  main.textContent = opts.text;
  if (opts.sub) {
    sub.hidden = false;
    sub.textContent = opts.sub;
  } else {
    sub.hidden = true;
    sub.textContent = "";
  }
  return el;
}

/**
 * Pooled CSS2D label manager — reuse DOM + CSS2DObject across rebuilds.
 */
export class Css2dLabelPool {
  private pool: Css2dEntry[] = [];
  private active: Css2dEntry[] = [];
  private used = 0;
  private readonly max: number;
  private readonly scene: Scene;
  private lastFacingMs = 0;
  private facingDirty = true;

  constructor(scene: Scene, max: number) {
    this.scene = scene;
    this.max = max;
  }

  get size(): number {
    return this.active.length;
  }

  get capacity(): number {
    return this.max;
  }

  /** Release active labels back to pool (keep DOM nodes). */
  clear(kind?: Css2dKind): void {
    if (!kind) {
      for (const e of this.active) this.park(e);
      this.active.length = 0;
      this.used = 0;
      this.facingDirty = true;
      return;
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i]!;
      if (e.kind !== kind) continue;
      this.park(e);
      this.active.splice(i, 1);
      this.used = Math.max(0, this.used - 1);
    }
    this.facingDirty = true;
  }

  private park(e: Css2dEntry): void {
    if (e.inScene) {
      try {
        e.obj.parent?.remove(e.obj);
      } catch {
        /* */
      }
      e.inScene = false;
    }
    e.el.style.display = "none";
    e.visible = false;
    this.pool.push(e);
  }

  private acquire(kind: Css2dKind): Css2dEntry | null {
    if (this.used >= this.max) return null;
    let e = this.pool.pop();
    if (!e) {
      const el = document.createElement("div");
      el.className = "ww-globe-css2d";
      el.setAttribute("aria-hidden", "true");
      const { main, sub } = ensureChipDom(el);
      const obj = new CSS2DObject(el);
      e = {
        obj,
        el,
        main,
        sub,
        kind,
        nx: 0,
        ny: 1,
        nz: 0,
        sig: "",
        visible: false,
        inScene: false,
      };
    }
    e.kind = kind;
    return e;
  }

  /**
   * Place or update a chip. Returns false if at cap.
   * world: Vector3-like with x,y,z
   */
  tryAdd(
    text: string,
    color: string,
    world: { x: number; y: number; z: number },
    kind: Css2dKind,
    sub?: string,
  ): boolean {
    const e = this.acquire(kind);
    if (!e) return false;

    const sig = `${kind}|${text}|${sub ?? ""}|${color}`;
    if (e.sig !== sig) {
      e.sig = sig;
      e.el.className = `ww-globe-css2d ww-globe-css2d--${kind}`;
      e.el.style.setProperty("--pin", color);
      if (e.main.textContent !== text) e.main.textContent = text;
      if (sub) {
        if (e.sub.hidden) e.sub.hidden = false;
        if (e.sub.textContent !== sub) e.sub.textContent = sub;
      } else if (!e.sub.hidden) {
        e.sub.hidden = true;
        e.sub.textContent = "";
      }
    }

    e.obj.position.set(world.x, world.y, world.z);
    const len = Math.hypot(world.x, world.y, world.z) || 1;
    e.nx = world.x / len;
    e.ny = world.y / len;
    e.nz = world.z / len;

    if (!e.inScene) {
      this.scene.add(e.obj as unknown as Object3D);
      e.inScene = true;
    }
    // visibility applied in updateFacing
    e.el.style.display = "";
    e.visible = true;

    this.active.push(e);
    this.used++;
    this.facingDirty = true;
    return true;
  }

  /**
   * Backface / horizon cull. Throttled while spinning.
   * @returns true if any visibility bit changed (caller may force CSS2D render)
   */
  updateFacing(
    camX: number,
    camY: number,
    camZ: number,
    nowMs: number,
    opts?: { force?: boolean; intervalMs?: number },
  ): boolean {
    if (!this.active.length) return false;
    const interval = opts?.intervalMs ?? 80; // ~12.5 Hz
    if (!opts?.force && !this.facingDirty && nowMs - this.lastFacingMs < interval) {
      return false;
    }
    this.lastFacingMs = nowMs;
    this.facingDirty = false;

    const clen = Math.hypot(camX, camY, camZ) || 1;
    const vx = camX / clen;
    const vy = camY / clen;
    const vz = camZ / clen;
    let changed = false;
    for (const e of this.active) {
      const facing = e.nx * vx + e.ny * vy + e.nz * vz;
      const show = facing >= 0.12;
      if (show !== e.visible) {
        e.visible = show;
        // display:none skips layout for hidden chips
        e.el.style.display = show ? "" : "none";
        changed = true;
      }
    }
    return changed;
  }

  /** Full dispose when leaving 3D. */
  dispose(): void {
    this.clear();
    for (const e of this.pool) {
      try {
        e.obj.parent?.remove(e.obj);
        e.el.remove();
      } catch {
        /* */
      }
    }
    this.pool.length = 0;
  }
}
