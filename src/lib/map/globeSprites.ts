/**
 * Optimized Three.js canvas sprites for globe labels.
 *
 * Wins over naive per-pin canvas:
 *  - LRU texture cache (shared mag / count textures)
 *  - Fixed power-of-two-ish sizes + LinearFilter, no mips (crisp chips)
 *  - Heavy font weight + halo for contrast on Earth
 *  - Optional sizeAttenuation for world-stable vs screen-stable
 */

import type * as THREE_NS from "three";

type THREE = typeof THREE_NS;

const MAG_CACHE = new Map<string, InstanceType<THREE["Texture"]>>();
const COUNT_CACHE = new Map<string, InstanceType<THREE["Texture"]>>();
const NODE_CACHE = new Map<string, InstanceType<THREE["Texture"]>>();
const MAX_CACHE = 96;

function touch<T>(map: Map<string, T>, key: string, val: T): T {
  if (map.has(key)) map.delete(key);
  map.set(key, val);
  while (map.size > MAX_CACHE) {
    const oldest = map.keys().next().value as string | undefined;
    if (oldest == null) break;
    const t = map.get(oldest);
    map.delete(oldest);
    try {
      (t as { dispose?: () => void })?.dispose?.();
    } catch {
      /* */
    }
  }
  return val;
}

function prepTex(
  THREE: THREE,
  canvas: HTMLCanvasElement,
): InstanceType<THREE["CanvasTexture"]> {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 1; // chips are small; anisotropy costs with little gain
  tex.needsUpdate = true;
  return tex;
}

function roundedPill(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
  ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  ctx.arcTo(x0, y0 + h, x0, y0, r);
  ctx.arcTo(x0, y0, x0 + w, y0, r);
  ctx.closePath();
}

/** Mag texture key — 0.1 steps, color bucketed */
function magKey(mag: number, color: string): string {
  return `m${mag.toFixed(1)}_${color}`;
}

export function getMagTexture(
  THREE: THREE,
  mag: number,
  color: string,
): InstanceType<THREE["Texture"]> {
  const key = magKey(mag, color);
  const hit = MAG_CACHE.get(key);
  if (hit) return touch(MAG_CACHE, key, hit);

  // 2× supersample for sharper downscale
  const W = 256;
  const H = 128;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(15,23,42,0.9)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  roundedPill(ctx, 12, 16, W - 24, H - 32, 20);
  ctx.fill();
  ctx.stroke();

  const label = `M${mag.toFixed(1)}`;
  ctx.font = "900 68px system-ui,Segoe UI,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(15,23,42,0.96)";
  ctx.strokeText(label, W / 2, H / 2 + 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.strokeText(label, W / 2, H / 2 + 2);
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(label, W / 2, H / 2 + 2);

  return touch(MAG_CACHE, key, prepTex(THREE, c));
}

export function getCountTexture(
  THREE: THREE,
  count: number,
  color: string,
): InstanceType<THREE["Texture"]> {
  const n = count > 99 ? 99 : Math.max(0, Math.floor(count));
  const key = `c${n}_${color}`;
  const hit = COUNT_CACHE.get(key);
  if (hit) return touch(COUNT_CACHE, key, hit);

  const S = 128;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = "rgba(15,23,42,0.92)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  roundedPill(ctx, 14, 22, 100, 84, 26);
  ctx.fill();
  ctx.stroke();

  const label = count > 99 ? "99+" : String(n);
  ctx.font = "900 52px system-ui,Segoe UI,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(15,23,42,0.95)";
  ctx.fillStyle = "#f8fafc";
  ctx.strokeText(label, S / 2, S / 2 + 2);
  ctx.fillText(label, S / 2, S / 2 + 2);

  return touch(COUNT_CACHE, key, prepTex(THREE, c));
}

export function getNodeLabelTexture(
  THREE: THREE,
  name: string,
  chip: string,
  colorHex: number,
): InstanceType<THREE["Texture"]> {
  const key = `n${name}|${chip}|${colorHex}`;
  const hit = NODE_CACHE.get(key);
  if (hit) return touch(NODE_CACHE, key, hit);

  const W = 512;
  const H = 144;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(15,23,42,0.9)";
  ctx.strokeStyle = "rgba(148,163,184,0.5)";
  ctx.lineWidth = 3;
  roundedPill(ctx, 8, 8, W - 16, H - 16, 18);
  ctx.fill();
  ctx.stroke();

  const hex = `#${colorHex.toString(16).padStart(6, "0")}`;
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.arc(44, H / 2, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "800 36px system-ui,Segoe UI,sans-serif";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(15,23,42,0.95)";
  ctx.fillStyle = "#f8fafc";
  ctx.strokeText(name, 72, H / 2 - 14);
  ctx.fillText(name, 72, H / 2 - 14);
  ctx.font = "700 24px system-ui,Segoe UI,sans-serif";
  ctx.lineWidth = 4;
  ctx.fillStyle = "#cbd5e1";
  ctx.strokeText(chip.toUpperCase(), 72, H / 2 + 22);
  ctx.fillText(chip.toUpperCase(), 72, H / 2 + 22);

  return touch(NODE_CACHE, key, prepTex(THREE, c));
}

export function makeMagSprite(
  THREE: THREE,
  mag: number,
  color: string,
  opac: number,
): InstanceType<THREE["Sprite"]> {
  const map = getMagTexture(THREE, mag, color);
  const mat = new THREE.SpriteMaterial({
    map,
    transparent: true,
    opacity: Math.min(1, opac + 0.12),
    depthWrite: false,
    sizeAttenuation: true,
  });
  // Don't dispose map with material — owned by cache
  mat.userData.sharedMap = true;
  return new THREE.Sprite(mat);
}

export function makeCountSprite(
  THREE: THREE,
  count: number,
  color: string,
  opac: number,
): InstanceType<THREE["Sprite"]> {
  const map = getCountTexture(THREE, count, color);
  const mat = new THREE.SpriteMaterial({
    map,
    transparent: true,
    opacity: Math.min(1, opac + 0.15),
    depthWrite: false,
    sizeAttenuation: true,
  });
  mat.userData.sharedMap = true;
  return new THREE.Sprite(mat);
}

export function makeNodeLabelSprite(
  THREE: THREE,
  name: string,
  chip: string,
  colorHex: number,
): InstanceType<THREE["Sprite"]> {
  const map = getNodeLabelTexture(THREE, name, chip, colorHex);
  const mat = new THREE.SpriteMaterial({
    map,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    sizeAttenuation: true,
  });
  mat.userData.sharedMap = true;
  return new THREE.Sprite(mat);
}

/** Dispose materials/geometry but keep cached textures. */
export function disposeSpriteMaterial(mat: InstanceType<THREE["Material"]> | InstanceType<THREE["Material"]>[]): void {
  const list = Array.isArray(mat) ? mat : [mat];
  for (const m of list) {
    const any = m as { userData?: { sharedMap?: boolean }; map?: { dispose?: () => void }; dispose?: () => void };
    if (any.userData?.sharedMap && "map" in any) {
      // drop map ref so dispose won't free cache
      (any as unknown as { map: null }).map = null;
    }
    any.dispose?.();
  }
}

export function clearSpriteCaches(): void {
  for (const m of [MAG_CACHE, COUNT_CACHE, NODE_CACHE]) {
    for (const tex of m.values()) {
      try {
        tex.dispose();
      } catch {
        /* */
      }
    }
    m.clear();
  }
}
