/**
 * Lightweight Web Audio alerts for new seismic events (no external files).
 * Inspired by public seismic globe patterns — short beep only, user-toggleable.
 */

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
  // M3 ~ 520 Hz, M6 ~ 880 Hz, M7+ higher
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

/**
 * Compare previous id set to new features; alert on fresh M≥minMag events.
 * Returns the updated id set.
 */
export function alertNewEvents(
  features: { id?: string; properties: { mag: number | null; time: number | null } }[],
  prevIds: Set<string>,
  opts: { enabled: boolean; minMag?: number; maxAlerts?: number } = { enabled: true },
): Set<string> {
  const minMag = opts.minMag ?? 4.5;
  const maxAlerts = opts.maxAlerts ?? 3;
  const next = new Set<string>();
  const fresh: number[] = [];

  for (const f of features) {
    const id =
      f.id ||
      `${f.properties.time ?? 0}_${f.properties.mag ?? 0}`;
    next.add(String(id));
    if (
      opts.enabled &&
      prevIds.size > 0 &&
      !prevIds.has(String(id)) &&
      (f.properties.mag ?? 0) >= minMag
    ) {
      // only very recent (last 30 min) to avoid burst on first load of old catalog
      const age = Date.now() - (f.properties.time ?? 0);
      if (age < 30 * 60_000) fresh.push(f.properties.mag ?? minMag);
    }
  }

  if (opts.enabled && prevIds.size > 0) {
    fresh
      .sort((a, b) => b - a)
      .slice(0, maxAlerts)
      .forEach((m) => playQuakeAlert(m));
  }

  return next;
}
