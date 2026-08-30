/**
 * Optional sound on a new catalog notice (not a civil alert).
 */

import {
  collectFreshNotices,
  showOsRelay,
  type CatalogNotice,
} from "@/lib/ops/catalogNotice";
import type { EqFeature } from "@/lib/feeds/usgs";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

/** Soft chirp — pitch scales mildly with magnitude. */
export function playQuakeAlert(mag: number): void {
  const audio = getCtx();
  if (!audio) return;
  void audio.resume().catch(() => undefined);

  const t0 = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain);
  gain.connect(audio.destination);

  const m = Math.max(2, Math.min(8, mag));
  const freq = 420 + m * 70;
  osc.type = m >= 6 ? "triangle" : "sine";
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.35, t0 + 0.08);

  const vol = m >= 6 ? 0.14 : m >= 5 ? 0.11 : 0.08;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);

  osc.start(t0);
  osc.stop(t0 + 0.3);
}

export type NoticeRelayOpts = {
  sound?: boolean;
  desktop?: boolean;
  minMag?: number;
  max?: number;
};

/**
 * Detect fresh M≥minMag origins vs last pulse.
 * Sound / OS notice are opt-in relays — never a civil alert path.
 */
export function relayNewEvents(
  features: EqFeature[],
  prevIds: Set<string>,
  opts: NoticeRelayOpts = {},
): { nextIds: Set<string>; fresh: CatalogNotice[] } {
  const { nextIds, fresh } = collectFreshNotices(features, prevIds, {
    minMag: opts.minMag ?? 4.5,
    max: opts.max ?? 3,
  });

  if (opts.sound && fresh[0]) {
    playQuakeAlert(fresh[0].mag ?? 4.5);
  }
  if (opts.desktop && fresh[0]) {
    showOsRelay(fresh[0]);
  }

  return { nextIds, fresh };
}

/** @deprecated use relayNewEvents — kept for older call sites */
export function alertNewEvents(
  features: EqFeature[],
  prevIds: Set<string>,
  opts: { enabled?: boolean; minMag?: number; maxAlerts?: number } = { enabled: true },
): Set<string> {
  const { nextIds } = relayNewEvents(features, prevIds, {
    sound: opts.enabled,
    minMag: opts.minMag,
    max: opts.maxAlerts,
  });
  return nextIds;
}
