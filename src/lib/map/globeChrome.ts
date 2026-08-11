/**
 * Bridge 3D globe camera actions to MapChromeDock in the grid tools track.
 * Globe3D registers on mount; dock calls these without sitting on the canvas.
 */

export type TiltPreset = "equator" | "north" | "oblique";

export type GlobeChromeApi = {
  home: () => void;
  prior: () => void;
  canPrior: () => boolean;
  tiltBy: (delta: number) => void;
  tiltPreset: (kind: TiltPreset) => void;
};

let api: GlobeChromeApi | null = null;

export function registerGlobeChrome(next: GlobeChromeApi | null): void {
  api = next;
}

export function getGlobeChrome(): GlobeChromeApi | null {
  return api;
}
