import L from "leaflet";
import { sampleWind, type WindSample } from "@/lib/feeds/openMeteo";

type Particle = { x: number; y: number; age: number; maxAge: number };

export type WindParticleHandle = {
  setSamples: (samples: WindSample[]) => void;
  setActive: (on: boolean) => void;
  setParticleBudget: (n: number) => void;
  destroy: () => void;
  layer: L.Layer;
};

/**
 * Canvas particle advection over a coarse wind sample grid (Windy-inspired).
 */
export function createWindParticleLayer(map: L.Map): WindParticleHandle {
  let samples: WindSample[] = [];
  let active = false;
  let budget = 2200;
  let particles: Particle[] = [];
  let raf = 0;
  let lastTs = 0;

  const canvas = L.DomUtil.create("canvas", "ww-wind-canvas") as HTMLCanvasElement;
  canvas.style.pointerEvents = "none";

  const layer = new (L.Layer.extend({
    onAdd(this: L.Layer, m: L.Map) {
      const size = m.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      canvas.style.position = "absolute";
      canvas.style.left = "0";
      canvas.style.top = "0";
      canvas.style.zIndex = "350";
      canvas.style.opacity = "0.85";
      const pane = m.getPane("overlayPane") || m.getContainer();
      pane.appendChild(canvas);
      m.on("move resize zoom", onView);
      m.on("moveend zoomend", onView);
      start();
    },
    onRemove(this: L.Layer, m: L.Map) {
      stop();
      m.off("move resize zoom", onView);
      m.off("moveend zoomend", onView);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  }))() as L.Layer;

  function onView() {
    const size = map.getSize();
    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      seedParticles(true);
    }
  }

  function seedParticles(reset: boolean) {
    if (reset) particles = [];
    const need = active ? budget : 0;
    while (particles.length < need) {
      particles.push(spawn());
    }
    if (particles.length > need) particles.length = need;
  }

  function spawn(): Particle {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      age: Math.random() * 40,
      maxAge: 40 + Math.random() * 60,
    };
  }

  function frame(ts: number) {
    if (!active) {
      raf = 0;
      return;
    }
    const dt = lastTs ? Math.min(40, ts - lastTs) / 16.67 : 1;
    lastTs = ts;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      raf = requestAnimationFrame(frame);
      return;
    }
    // Fade trails
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";

    const b = map.getBounds();
    for (const p of particles) {
      p.age += dt;
      if (p.age > p.maxAge) {
        Object.assign(p, spawn());
        p.age = 0;
        continue;
      }
      const ll = map.containerPointToLatLng(L.point(p.x, p.y));
      if (!b.contains(ll)) {
        Object.assign(p, spawn());
        p.age = 0;
        continue;
      }
      const w = sampleWind(samples, ll.lat, ll.lng);
      if (!w) {
        Object.assign(p, spawn());
        continue;
      }
      // Project wind m/s → screen pixels (scale with zoom)
      const z = map.getZoom();
      const scale = 0.35 * Math.pow(1.35, Math.max(0, z - 2));
      const x1 = p.x;
      const y1 = p.y;
      p.x += w.u * scale * dt;
      p.y -= w.v * scale * dt; // north is up

      const speed = w.speedKmh;
      const alpha = 0.25 + Math.min(0.65, speed / 80);
      const col =
        speed < 15
          ? `rgba(147, 197, 253, ${alpha})`
          : speed < 40
            ? `rgba(56, 189, 248, ${alpha})`
            : speed < 70
              ? `rgba(34, 211, 238, ${alpha})`
              : `rgba(250, 204, 21, ${alpha})`;
      ctx.strokeStyle = col;
      ctx.lineWidth = speed > 50 ? 1.6 : 1.1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf) return;
    lastTs = 0;
    seedParticles(true);
    if (active) raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastTs = 0;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return {
    layer,
    setSamples(s) {
      samples = s;
    },
    setActive(on) {
      active = on;
      if (on) {
        if (!map.hasLayer(layer)) layer.addTo(map);
        seedParticles(true);
        start();
      } else {
        stop();
        if (map.hasLayer(layer)) map.removeLayer(layer);
      }
    },
    setParticleBudget(n) {
      budget = Math.max(200, Math.min(5000, n));
      seedParticles(false);
    },
    destroy() {
      stop();
      if (map.hasLayer(layer)) map.removeLayer(layer);
      samples = [];
      particles = [];
    },
  };
}
