/**
 * Realtime transport layer.
 *
 * USGS does not publish a public WebSocket for GeoJSON feeds. True "push"
 * requires a self-hosted relay (VITE_REALTIME_WS). Default path is adaptive
 * multi-feed HTTP pulse (all_hour + significant_hour), visibility-aware,
 * with online/offline + optional Network Information pacing.
 *
 * When WS is configured: prefer WS wake-ups + safety HTTP underlay +
 * exponential reconnect; optional GeoJSON frames call onGeojson.
 */

export type LiveStatus = "live" | "polling" | "paused" | "error" | "ws" | "offline";

export type RealtimeHandlers = {
  onPulse: (kind?: "hour" | "significant" | "ws") => void | Promise<void>;
  /** Optional: relay pushed a full GeoJSON FeatureCollection */
  onGeojson?: (data: unknown) => void | Promise<void>;
  onStatus?: (s: LiveStatus, detail?: string) => void;
};

function wsUrl(): string | null {
  try {
    const env = (import.meta as { env?: Record<string, string> }).env;
    const u = env?.VITE_REALTIME_WS?.trim();
    return u || null;
  } catch {
    return null;
  }
}

function connectionFactor(): number {
  try {
    const c = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (!c) return 1;
    if (c.saveData) return 1.6;
    const t = c.effectiveType || "";
    if (t === "slow-2g" || t === "2g") return 2.2;
    if (t === "3g") return 1.45;
    return 1;
  } catch {
    return 1;
  }
}

/**
 * Start realtime. Prefer WebSocket when configured; else adaptive multi-feed HTTP.
 * Returns stop().
 */
export function startRealtime(
  handlers: RealtimeHandlers,
  opts: { baseMs: number; minMs?: number; maxMs?: number },
): () => void {
  const minMs = opts.minMs ?? 12_000;
  const maxMs = opts.maxMs ?? 180_000;
  let baseMs = Math.max(minMs, opts.baseMs);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let ws: WebSocket | null = null;
  let wsRetry: ReturnType<typeof setTimeout> | null = null;
  let wsRetryMs = 3_000;
  let pulseN = 0;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const visible = () =>
    typeof document === "undefined" ? true : document.visibilityState === "visible";
  const online = () =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false;

  const nextInterval = () => {
    const f = connectionFactor();
    const hidden = !visible();
    let ms = baseMs * f;
    if (hidden) ms = Math.min(maxMs, Math.max(ms * 3, 90_000));
    if (!online()) ms = Math.min(maxMs, 120_000);
    return Math.round(Math.min(maxMs, Math.max(minMs, ms)));
  };

  const scheduleHttp = (ms: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      if (stopped) return;
      if (!online()) {
        handlers.onStatus?.("offline", "waiting for network");
        scheduleHttp(nextInterval());
        return;
      }
      if (!visible()) {
        handlers.onStatus?.("paused", "tab hidden — slow pulse");
        // still pulse occasionally while hidden so resume isn't cold
        try {
          await handlers.onPulse("hour");
        } catch {
          /* */
        }
        scheduleHttp(nextInterval());
        return;
      }
      handlers.onStatus?.("polling", "HTTP multi-feed");
      try {
        // Alternate significant_hour every 3rd tick for fast large-event catch
        pulseN += 1;
        const kind = pulseN % 3 === 0 ? "significant" : "hour";
        await handlers.onPulse(kind);
        handlers.onStatus?.(
          ws && ws.readyState === WebSocket.OPEN ? "ws" : "live",
          kind === "significant" ? "significant_hour" : "all_hour",
        );
        baseMs = Math.max(minMs, Math.floor(baseMs * 0.92));
      } catch {
        handlers.onStatus?.("error", "pulse failed");
        baseMs = Math.min(maxMs, Math.floor(baseMs * 1.4));
      }
      scheduleHttp(nextInterval());
    }, ms);
  };

  const clearHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const connectWs = (url: string) => {
    try {
      if (ws) {
        try {
          ws.close();
        } catch {
          /* */
        }
      }
      ws = new WebSocket(url);
      ws.onopen = () => {
        wsRetryMs = 3_000;
        handlers.onStatus?.("ws", "relay connected");
        void handlers.onPulse("ws");
        clearHeartbeat();
        // Keepalive for proxies that drop idle sockets
        heartbeat = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
            } catch {
              /* */
            }
          }
        }, 25_000);
      };
      ws.onmessage = (ev) => {
        try {
          const raw = typeof ev.data === "string" ? ev.data : "";
          if (raw) {
            const data = JSON.parse(raw) as {
              type?: string;
              features?: unknown;
              typeGeo?: string;
            };
            if (data?.type === "pong" || data?.type === "ping") return;
            // GeoJSON FeatureCollection from relay
            if (data && (data.type === "FeatureCollection" || Array.isArray(data.features))) {
              void handlers.onGeojson?.(data);
              handlers.onStatus?.("ws", "push frame");
              return;
            }
          }
        } catch {
          /* non-JSON wake */
        }
        void handlers.onPulse("ws");
        handlers.onStatus?.("ws", "wake");
      };
      ws.onerror = () => {
        handlers.onStatus?.("error", "ws error — HTTP underlay active");
      };
      ws.onclose = () => {
        clearHeartbeat();
        if (stopped) return;
        handlers.onStatus?.("polling", "ws closed — reconnect + HTTP");
        scheduleHttp(baseMs);
        const wait = wsRetryMs;
        wsRetryMs = Math.min(60_000, Math.floor(wsRetryMs * 1.7));
        wsRetry = setTimeout(() => {
          if (!stopped && online()) connectWs(url);
        }, wait);
      };
    } catch {
      scheduleHttp(baseMs);
    }
  };

  const onVis = () => {
    if (stopped) return;
    if (visible() && online()) {
      void handlers.onPulse("hour");
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        handlers.onStatus?.("live", "tab visible");
        scheduleHttp(minMs);
      } else {
        handlers.onStatus?.("ws", "tab visible");
      }
    } else if (!online()) {
      handlers.onStatus?.("offline", "network down");
    } else {
      handlers.onStatus?.("paused", "tab hidden");
    }
  };

  const onOnline = () => {
    if (stopped) return;
    handlers.onStatus?.("live", "back online");
    void handlers.onPulse("hour");
    scheduleHttp(minMs);
    const url = wsUrl();
    if (url) connectWs(url);
  };
  const onOffline = () => {
    handlers.onStatus?.("offline", "network down");
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVis);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
  }

  const url = wsUrl();
  if (url && typeof WebSocket !== "undefined") {
    connectWs(url);
    // Safety HTTP underlay — WS can be quiet between events
    handlers.onStatus?.("ws", "connecting relay + HTTP underlay");
    void handlers.onPulse("hour");
    scheduleHttp(Math.max(baseMs, 45_000));
  } else {
    handlers.onStatus?.(
      "live",
      "adaptive HTTP multi-feed (USGS has no public WS)",
    );
    void handlers.onPulse("hour");
    scheduleHttp(baseMs);
  }

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (wsRetry) clearTimeout(wsRetry);
    clearHeartbeat();
    if (ws) {
      try {
        ws.close();
      } catch {
        /* */
      }
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVis);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    }
  };
}
