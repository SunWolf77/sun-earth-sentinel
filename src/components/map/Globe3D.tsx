import { useEffect, useMemo, useRef, useState } from "react";
import { useObservatory, filteredEq, getFocusNode, type PickedEvent } from "@/store/observatory";
import { magColor, globeMagStyle, eqDepthKm, DRAGON_NODES } from "@/lib/feeds/usgs";
import type { EqFeature } from "@/lib/feeds/usgs";
import { pointInBounds } from "@/lib/geo/bounds";
import { hasWebGl, resolveGlobeQuality, type GlobeQuality } from "@/lib/device";
import { agencyLinksForEvent } from "@/lib/seismology/agencyLinks";
import {
  eventPageUrl,
  originEventUrl,
  shakeMapEventUrl,
  waveformsEventUrl,
} from "@/lib/seismology/shakemap";
import { formatUtc } from "@/lib/utils";
import { ShareFocusButton } from "@/components/ops/ShareFocusButton";


/**
 * Three.js seismic globe — available in any performance mode.
 * Mobile / low-end: lean quality profile (no marble texture, fewer markers,
 * 30fps, context-loss → 2D fallback) so phones do not crash out of WebGL.
 */
export function Globe3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const eq = useObservatory((s) => s.eq);
  const minMag = useObservatory((s) => s.minMag);
  const maxMag = useObservatory((s) => s.maxMag);
  const mapView = useObservatory((s) => s.mapView);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const globeAutoSpin = useObservatory((s) => s.globeAutoSpin);
  const setGlobeAutoSpin = useObservatory((s) => s.setGlobeAutoSpin);
  const globeAntipode = useObservatory((s) => s.globeAntipode);
  const clearGlobeAntipode = useObservatory((s) => s.clearGlobeAntipode);
  const antipodeOf = useObservatory((s) => s.antipodeOf);
  const setMapView = useObservatory((s) => s.setMapView);
  const globeStemScale = useObservatory((s) => s.globeStemScale);
  const setGlobeStemScale = useObservatory((s) => s.setGlobeStemScale);
  const globeMarkerScale = useObservatory((s) => s.globeMarkerScale);
  const setGlobeMarkerScale = useObservatory((s) => s.setGlobeMarkerScale);
  const globeSpinSpeed = useObservatory((s) => s.globeSpinSpeed);
  const setGlobeSpinSpeed = useObservatory((s) => s.setGlobeSpinSpeed);
  const globeMarkerOpacity = useObservatory((s) => s.globeMarkerOpacity);
  const setGlobeMarkerOpacity = useObservatory((s) => s.setGlobeMarkerOpacity);
  const pickEvent = useObservatory((s) => s.pickEvent);
  const pickedEvent = useObservatory((s) => s.pickedEvent);

  const cleanupRef = useRef<(() => void) | null>(null);
  const updateRef = useRef<((features: EqFeature[], focusId: string | null) => void) | null>(
    null,
  );
  const autoRef = useRef(globeAutoSpin);
  const spinSpdRef = useRef(globeSpinSpeed);
  const stemRef = useRef(globeStemScale);
  const hexRef = useRef(globeMarkerScale);
  const opacRef = useRef(globeMarkerOpacity);
  const aimRef = useRef<((lat: number, lon: number, smooth?: boolean) => void) | null>(null);
  const recenterRef = useRef<(() => void) | null>(null);
  const [qualityLabel, setQualityLabel] = useState<string>("");
  const [bootError, setBootError] = useState<string | null>(null);
  const qualityRef = useRef<GlobeQuality | null>(null);

  useEffect(() => {
    autoRef.current = globeAutoSpin;
  }, [globeAutoSpin]);
  useEffect(() => {
    spinSpdRef.current = globeSpinSpeed;
  }, [globeSpinSpeed]);
  useEffect(() => {
    stemRef.current = globeStemScale;
  }, [globeStemScale]);
  useEffect(() => {
    hexRef.current = globeMarkerScale;
  }, [globeMarkerScale]);
  useEffect(() => {
    opacRef.current = globeMarkerOpacity;
  }, [globeMarkerOpacity]);

  useEffect(() => {
    if (mapView !== "3d" || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      setBootError(null);
      if (!hasWebGl()) {
        setBootError("WebGL unavailable on this device");
        setMapView("2d");
        return;
      }
      const THREE = await import("three");
      if (cancelled || !container) return;

      const Q = resolveGlobeQuality();
      qualityRef.current = Q;
      setQualityLabel(Q.id === "mobile" ? "Preview · safe" : "Preview");

      const w = Math.max(container.clientWidth, 280);
      const h = Math.max(container.clientHeight, 280);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1220);
      const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: Q.antialias,
          alpha: false,
          powerPreference: Q.powerPreference,
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
        });
      } catch (e) {
        setBootError(e instanceof Error ? e.message : "WebGL init failed");
        setMapView("2d");
        return;
      }
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pixelRatioCap));
      if ("outputColorSpace" in renderer) {
        (renderer as { outputColorSpace: string }).outputColorSpace = "srgb";
      }
      container.innerHTML = "";
      container.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.touchAction = "none";

      scene.add(new THREE.AmbientLight(0xb8d4f0, 0.9));
      scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e3a5f, 0.6));
      const sun = new THREE.DirectionalLight(0xffffff, 1.4);
      sun.position.set(4.5, 2.2, 3.5);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x93c5fd, 0.5);
      fill.position.set(-3, -1, -2);
      scene.add(fill);

      const baseTex = makeProceduralEarth(THREE);
      const geo = new THREE.SphereGeometry(1, Q.sphereSeg, Q.sphereSeg);
      const mat = new THREE.MeshPhongMaterial({
        map: baseTex,
        color: 0xffffff,
        shininess: 18,
        specular: 0x334155,
        emissive: 0x0c1a30,
        emissiveIntensity: 0.4,
      });
      const earth = new THREE.Mesh(geo, mat);
      scene.add(earth);

      if (Q.loadMarble) {
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = "anonymous";
        loader.load(
          "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-blue-marble.jpg",
          (tex) => {
            if (cancelled) {
              tex.dispose();
              return;
            }
            if ("colorSpace" in tex) {
              (tex as { colorSpace: string }).colorSpace = "srgb";
            }
            tex.anisotropy = Math.min(
              renderer.capabilities.getMaxAnisotropy(),
              Q.anisotropy,
            );
            mat.map = tex;
            mat.emissiveIntensity = 0.15;
            mat.needsUpdate = true;
          },
          undefined,
          () => {
            /* procedural already visible */
          },
        );
      }

      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(1.045, Q.atmoSeg, Q.atmoSeg),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.14,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      );
      scene.add(atmo);

      let glow: InstanceType<typeof THREE.Mesh> | null = null;
      if (Q.glow) {
        glow = new THREE.Mesh(
          new THREE.SphereGeometry(1.09, 24, 24),
          new THREE.MeshBasicMaterial({
            color: 0x0ea5e9,
            transparent: true,
            opacity: 0.06,
            side: THREE.BackSide,
            depthWrite: false,
          }),
        );
        scene.add(glow);
      }

      // stars
      {
        const n = Q.stars;
        const pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const r = 12 + Math.random() * 20;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          pos[i * 3 + 1] = r * Math.cos(ph);
          pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
        }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        scene.add(
          new THREE.Points(
            sg,
            new THREE.PointsMaterial({
              color: 0xcbd5e1,
              size: 0.035,
              sizeAttenuation: true,
              transparent: true,
              opacity: 0.7,
              depthWrite: false,
            }),
          ),
        );
      }

      const quakeGroup = new THREE.Group();
      scene.add(quakeGroup);

      type PickMeta = {
        id: string;
        lat: number;
        lon: number;
        mag: number;
        place: string;
        depth: number;
        time: number | null;
        url?: string;
        neon: boolean;
      };
      let pickList: { mesh: InstanceType<typeof THREE.Object3D>; meta: PickMeta }[] = [];
      let neonMats: { mat: InstanceType<typeof THREE.MeshBasicMaterial>; base: number }[] = [];
      let focusRing: InstanceType<typeof THREE.Line> | null = null;
      let pickRing: InstanceType<typeof THREE.Mesh> | null = null;

      const spherical = { theta: 0.55, phi: 1.15, radius: 2.85 };
      let rotating = false;
      let lastX = 0;
      let lastY = 0;
      let aimAnim: {
        t0: number;
        dur: number;
        from: { theta: number; phi: number; radius: number };
        to: { theta: number; phi: number; radius: number };
      } | null = null;

      function applyCam() {
        camera.position.x =
          spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
        camera.position.y = spherical.radius * Math.cos(spherical.phi);
        camera.position.z =
          spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        camera.lookAt(0, 0, 0);
      }
      applyCam();

      function latLonToVec(lat: number, lon: number, radius = 1.02) {
        const phi = ((90 - lat) * Math.PI) / 180;
        const theta = ((lon + 180) * Math.PI) / 180;
        return new THREE.Vector3(
          -radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta),
        );
      }

      function aimAt(lat: number, lon: number, smooth = true) {
        const aim = latLonToVec(lat, lon, 1);
        const toTheta = Math.atan2(aim.x, aim.z);
        const toPhi = Math.acos(Math.max(-1, Math.min(1, aim.y)));
        autoRef.current = false;
        if (!smooth) {
          spherical.theta = toTheta;
          spherical.phi = toPhi;
          applyCam();
          aimAnim = null;
          return;
        }
        aimAnim = {
          t0: performance.now(),
          dur: 1200,
          from: { theta: spherical.theta, phi: spherical.phi, radius: spherical.radius },
          to: { theta: toTheta, phi: toPhi, radius: Math.max(2.2, Math.min(spherical.radius, 3.2)) },
        };
      }
      aimRef.current = aimAt;
      recenterRef.current = () => {
        aimAnim = null;
        spherical.theta = 0.55;
        spherical.phi = 1.15;
        spherical.radius = 2.85;
        applyCam();
      };

      const hexGeo = makeHexRingGeometry(THREE, 1, 0.22);
      const dummy = new THREE.Object3D();

      function disposeGroup(g: InstanceType<typeof THREE.Group>) {
        while (g.children.length) {
          const o = g.children[0]!;
          g.remove(o);
          o.traverse((ch) => {
            const mesh = ch as InstanceType<typeof THREE.Mesh>;
            if (mesh.geometry && mesh.geometry !== hexGeo) mesh.geometry.dispose();
            const m = mesh.material;
            if (m) {
              if (Array.isArray(m)) m.forEach((x) => x.dispose());
              else (m as InstanceType<typeof THREE.Material>).dispose();
            }
          });
        }
      }

      function updateMarkers(features: EqFeature[], focusId: string | null) {
        disposeGroup(quakeGroup);
        pickList = [];
        neonMats = [];
        if (focusRing) {
          scene.remove(focusRing);
          focusRing.geometry.dispose();
          (focusRing.material as InstanceType<typeof THREE.Material>).dispose();
          focusRing = null;
        }
        if (pickRing) {
          quakeGroup.remove(pickRing);
          pickRing.geometry.dispose();
          (pickRing.material as InstanceType<typeof THREE.Material>).dispose();
          pickRing = null;
        }

        const focus = getFocusNode(focusId);
        const stemMul = stemRef.current;
        const hexScale = hexRef.current;
        const opac = opacRef.current;

        const floor = Q.id === "mobile" ? Math.max(minMag, 4.0) : Math.min(minMag, 3.5);
        let list = features.filter((f) => {
          const m = f.properties.mag ?? 0;
          return m >= floor && m <= maxMag;
        });
        if (focus) {
          list = list.filter((f) => {
            const [lon, lat] = f.geometry.coordinates;
            return pointInBounds(lat, lon, focus.bounds);
          });
        }
        // Sort small first so large hexes draw on top visually
        list = [...list]
          .sort((a, b) => (a.properties.mag ?? 0) - (b.properties.mag ?? 0))
          .slice(0, Q.maxMarkers);

        const stemPos: number[] = [];
        const stemCol: number[] = [];

        for (const f of list) {
          const [lon, lat] = f.geometry.coordinates;
          const mag = f.properties.mag ?? 3.5;
          const depth = eqDepthKm(f);
          const place = f.properties.place ?? "—";
          const id = f.id ? String(f.id) : `${lat}_${lon}_${f.properties.time ?? 0}`;
          // Dutchsinse Public Seismic Globe palette + neon tiers
          const st = globeMagStyle(mag);
          const neon = st.neon;

          // Size curve aligned with public globe (scaled for unit-radius earth)
          let base = 0.018 + Math.pow(Math.max(mag, 0.5), 1.1) * 0.01;
          if (mag >= 5) base *= 1 + (mag - 5) * 0.18;
          const size = base * hexScale;

          const lift = (Math.min(depth, 700) / 700) * stemMul;
          const elev = 1.012 + lift + size * 0.28;
          const pos = latLonToVec(lat, lon, elev);
          const colHex = st.color;
          const col = new THREE.Color(colHex);

          const g = new THREE.Group();
          g.position.copy(pos);
          g.lookAt(0, 0, 0);
          // Face outward: lookAt centers the -Z toward origin; flip so ring faces camera-ish
          g.rotateY(Math.PI);

          // Concentric hex rings — public globe: neon [1.1,1,0.7,0.42] else [1,0.7,0.42]
          const allRings = neon
            ? [1.1, 1.0, 0.7, 0.42]
            : mag >= 5
              ? [1.0, 0.7, 0.42]
              : [1.0, 0.7];
          const rings = allRings.slice(0, Q.maxRings);
          rings.forEach((s, i) => {
            const ringMat = new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: opac * (1 - i * 0.18) * (neon && i === 0 ? 0.95 : 0.88),
              side: THREE.DoubleSide,
              depthWrite: false,
            });
            if (neon && i === 0) {
              neonMats.push({ mat: ringMat, base: opac * 0.95 });
            }
            const mesh = new THREE.Mesh(hexGeo, ringMat);
            mesh.scale.setScalar(size * s);
            mesh.renderOrder = 10 + Math.floor(mag);
            g.add(mesh);
          });

          // Mag label for M5+ — skipped on mobile (canvas sprites are GPU+RAM heavy)
          if (Q.magSprites && mag >= 5) {
            const spr = makeMagSprite(THREE, mag, colHex, opac);
            spr.scale.setScalar(size * 2.8);
            spr.position.set(0, 0, size * 0.15);
            g.add(spr);
          }

          quakeGroup.add(g);
          const meta: PickMeta = {
            id,
            lat,
            lon,
            mag,
            place,
            depth,
            time: f.properties.time ?? null,
            url: f.properties.url ?? undefined,
            neon,
          };
          pickList.push({ mesh: g, meta });

          if (depth > Q.stemMinDepthKm) {
            const surf = latLonToVec(lat, lon, 1.004);
            stemPos.push(surf.x, surf.y, surf.z, pos.x, pos.y, pos.z);
            stemCol.push(col.r, col.g, col.b, col.r, col.g, col.b);
          }
        }

        if (stemPos.length) {
          const sg = new THREE.BufferGeometry();
          sg.setAttribute("position", new THREE.Float32BufferAttribute(stemPos, 3));
          sg.setAttribute("color", new THREE.Float32BufferAttribute(stemCol, 3));
          const stems = new THREE.LineSegments(
            sg,
            new THREE.LineBasicMaterial({
              vertexColors: true,
              transparent: true,
              opacity: Math.max(0.2, opac * 0.5),
              depthWrite: false,
            }),
          );
          quakeGroup.add(stems);
        }

        if (focus) {
          const [[latMin, lonMin], [latMax, lonMax]] = focus.bounds;
          const edges: [number, number, number, number][] = [
            [latMin, lonMin, latMin, lonMax],
            [latMin, lonMax, latMax, lonMax],
            [latMax, lonMax, latMax, lonMin],
            [latMax, lonMin, latMin, lonMin],
          ];
          const verts: number[] = [];
          for (const [la0, lo0, la1, lo1] of edges) {
            for (let i = 0; i <= 24; i++) {
              const t = i / 24;
              const la = la0 + (la1 - la0) * t;
              const lo = lo0 + (lo1 - lo0) * t;
              const vv = latLonToVec(la, lo > 180 ? lo - 360 : lo, 1.03);
              verts.push(vv.x, vv.y, vv.z);
            }
          }
          const rg = new THREE.BufferGeometry();
          rg.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
          focusRing = new THREE.Line(
            rg,
            new THREE.LineBasicMaterial({
              color: 0x22d3ee,
              transparent: true,
              opacity: 0.9,
            }),
          );
          scene.add(focusRing);

          const clat = focus.center?.[0] ?? (latMin + latMax) / 2;
          const clon = focus.center?.[1] ?? (lonMin + lonMax) / 2;
          aimAt(clat, clon, false);
        }

        void dummy;
      }

      updateRef.current = updateMarkers;
      updateMarkers(filteredEq(eq?.features, minMag, maxMag), focusNodeId);

      const el = renderer.domElement;
      el.style.touchAction = "none";
      const ray = new THREE.Raycaster();
      // widen pick a bit for thin rings
      ray.params.Points = { threshold: 0.08 };
      const mouse = new THREE.Vector2();

      function pickAt(clientX: number, clientY: number): PickMeta | null {
        const rect = el.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        ray.setFromCamera(mouse, camera);
        const objs = pickList.map((p) => p.mesh);
        const hits = ray.intersectObjects(objs, true);
        if (!hits.length) return null;
        let o: InstanceType<typeof THREE.Object3D> | null = hits[0]!.object;
        while (o) {
          const found = pickList.find((p) => p.mesh === o);
          if (found) return found.meta;
          o = o.parent;
        }
        return null;
      }

      function applyPick(meta: PickMeta) {
        const usgsUrl =
          meta.url ||
          eventPageUrl(meta.id) ||
          undefined;
        const ev: PickedEvent = {
          id: meta.id,
          lat: meta.lat,
          lon: meta.lon,
          mag: meta.mag,
          place: meta.place,
          depth: meta.depth,
          time: meta.time,
          url: usgsUrl,
        };
        pickEvent(ev);
        aimAt(meta.lat, meta.lon, true);
        // highlight ring
        if (pickRing) {
          quakeGroup.remove(pickRing);
          pickRing.geometry.dispose();
          (pickRing.material as InstanceType<typeof THREE.Material>).dispose();
        }
        const elev =
          1.012 +
          (Math.min(meta.depth, 700) / 700) * stemRef.current +
          0.02 * hexRef.current;
        const p = latLonToVec(meta.lat, meta.lon, elev + 0.012);
        pickRing = new THREE.Mesh(
          new THREE.RingGeometry(0.028, 0.038, 6),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        pickRing.position.copy(p);
        pickRing.lookAt(0, 0, 0);
        pickRing.rotateY(Math.PI);
        quakeGroup.add(pickRing);
      }

      const onDown = (x: number, y: number) => {
        rotating = true;
        autoRef.current = false;
        lastX = x;
        lastY = y;
      };
      const onMove = (x: number, y: number) => {
        if (!rotating) return;
        const dx = x - lastX;
        const dy = y - lastY;
        lastX = x;
        lastY = y;
        spherical.theta -= dx * 0.005;
        spherical.phi = Math.max(0.12, Math.min(Math.PI - 0.12, spherical.phi + dy * 0.005));
        applyCam();
      };
      const onUp = () => {
        rotating = false;
      };

      let pinchStartDist = 0;
      let pinchStartRadius = spherical.radius;
      let dragMoved = false;
      const touchDist = (a: Touch, b: Touch) =>
        Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

      const md = (e: MouseEvent) => {
        dragMoved = false;
        onDown(e.clientX, e.clientY);
      };
      const mm = (e: MouseEvent) => {
        if (rotating) {
          const d = Math.hypot(e.clientX - lastX, e.clientY - lastY);
          if (d > 3) dragMoved = true;
        }
        onMove(e.clientX, e.clientY);
      };
      const mu = (e: MouseEvent) => {
        const was = rotating;
        onUp();
        if (was && !dragMoved && e.button === 0) {
          const meta = pickAt(e.clientX, e.clientY);
          if (meta) applyPick(meta);
        }
      };
      const ctx = (e: MouseEvent) => {
        e.preventDefault();
        const meta = pickAt(e.clientX, e.clientY);
        if (meta) {
          applyPick(meta);
          if (meta.url) window.open(meta.url, "_blank", "noopener,noreferrer");
        }
      };
      el.addEventListener("mousedown", md);
      window.addEventListener("mousemove", mm);
      window.addEventListener("mouseup", mu);
      el.addEventListener("contextmenu", ctx);

      const ts = (e: TouchEvent) => {
        dragMoved = false;
        if (e.touches.length === 1) {
          onDown(e.touches[0]!.clientX, e.touches[0]!.clientY);
        } else if (e.touches.length === 2) {
          rotating = false;
          pinchStartDist = touchDist(e.touches[0]!, e.touches[1]!);
          pinchStartRadius = spherical.radius;
          autoRef.current = false;
        }
      };
      const tm = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const d = touchDist(e.touches[0]!, e.touches[1]!);
          if (pinchStartDist > 0) {
            const scale = pinchStartDist / Math.max(d, 1);
            spherical.radius = Math.max(1.55, Math.min(5.5, pinchStartRadius * scale));
            applyCam();
          }
          return;
        }
        if (e.touches.length === 1) {
          e.preventDefault();
          const t = e.touches[0]!;
          if (Math.hypot(t.clientX - lastX, t.clientY - lastY) > 4) dragMoved = true;
          onMove(t.clientX, t.clientY);
        }
      };
      const te = (e: TouchEvent) => {
        if (e.touches.length < 2) pinchStartDist = 0;
        if (e.touches.length === 0) {
          const was = rotating;
          const cx = e.changedTouches[0]?.clientX;
          const cy = e.changedTouches[0]?.clientY;
          onUp();
          if (was && !dragMoved && cx != null && cy != null) {
            const meta = pickAt(cx, cy);
            if (meta) applyPick(meta);
          }
        } else if (e.touches.length === 1) {
          onDown(e.touches[0]!.clientX, e.touches[0]!.clientY);
        }
      };
      el.addEventListener("touchstart", ts, { passive: true });
      el.addEventListener("touchmove", tm, { passive: false });
      el.addEventListener("touchend", te);
      el.addEventListener("touchcancel", te);

      const wheel = (e: WheelEvent) => {
        e.preventDefault();
        spherical.radius = Math.max(1.55, Math.min(5.5, spherical.radius + e.deltaY * 0.002));
        applyCam();
      };
      el.addEventListener("wheel", wheel, { passive: false });

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "r" || e.key === "R") {
          recenterRef.current?.();
        }
        if (e.ctrlKey && (e.key === "a" || e.key === "A")) {
          e.preventDefault();
          // antipode of picked or focus
        }
      };
      window.addEventListener("keydown", onKey);

      const pinGroup = new THREE.Group();
      if (Q.nodePins) {
        const nodes = Q.id === "mobile" ? DRAGON_NODES.filter((n) => n.publishedFocus || n.watchPriority) : DRAGON_NODES;
        for (const node of nodes) {
          const clat = node.center?.[0] ?? (node.bounds[0][0] + node.bounds[1][0]) / 2;
          const clon =
            node.center?.[1] ??
            (node.bounds[0][1] <= node.bounds[1][1]
              ? (node.bounds[0][1] + node.bounds[1][1]) / 2
              : -175);
          const v = latLonToVec(clat, clon, 1.028);
          const pin = new THREE.Mesh(
            new THREE.SphereGeometry(
              node.publishedFocus ? 0.02 : 0.013,
              Q.pinSeg,
              Q.pinSeg,
            ),
            new THREE.MeshBasicMaterial({
              color: node.kind === "volcano" ? 0xfb923c : node.publishedFocus ? 0xfbbf24 : 0x22d3ee,
              transparent: true,
              opacity: 0.95,
            }),
          );
          pin.position.copy(v);
          pinGroup.add(pin);
        }
        scene.add(pinGroup);
      }

      let animId = 0;
      let active = true;
      let blink = 0;
      let lastFrameT = 0;
      const onContextLost = (ev: Event) => {
        ev.preventDefault();
        active = false;
        setBootError("GPU context lost — switched to 2D");
        try {
          setMapView("2d");
        } catch {
          /* ignore */
        }
      };
      el.addEventListener("webglcontextlost", onContextLost, false);
      const minFrameMs = 1000 / Math.max(15, Q.maxFps);
      const animate = (now = performance.now()) => {
        if (!active) return;
        animId = requestAnimationFrame(animate);
        if (typeof document !== "undefined" && document.hidden) return;
        if (now - lastFrameT < minFrameMs) return;
        lastFrameT = now;

        if (aimAnim) {
          const t = Math.min(1, (performance.now() - aimAnim.t0) / aimAnim.dur);
          const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          spherical.theta = aimAnim.from.theta + (aimAnim.to.theta - aimAnim.from.theta) * e;
          spherical.phi = aimAnim.from.phi + (aimAnim.to.phi - aimAnim.from.phi) * e;
          spherical.radius = aimAnim.from.radius + (aimAnim.to.radius - aimAnim.from.radius) * e;
          applyCam();
          if (t >= 1) aimAnim = null;
        } else if (autoRef.current && !rotating) {
          // Prograde Earth: west→east. Matches three.js OrbitControls autoRotate
          // (theta decreases) and Dutchsinse Public Seismic Globe. Prior += was retrograde.
          spherical.theta -= 0.0022 * spinSpdRef.current;
          applyCam();
        }

        blink += 0.045;
        const bo = 0.42 + 0.58 * Math.abs(Math.sin(blink));
        for (const n of neonMats) {
          n.mat.opacity = n.base * bo;
        }

        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        if (!container) return;
        const nw = Math.max(container.clientWidth, 280);
        const nh = Math.max(container.clientHeight, 320);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener("resize", onResize);
      const ro =
        typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => onResize()) : null;
      ro?.observe(container);

      const hint = document.createElement("div");
      hint.className =
        "pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[92%] -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface/95 px-3 py-1.5 text-[0.68rem] text-muted shadow";
      hint.textContent =
        "Drag to look · pinch zoom · tap hex → USGS / waveforms / agencies · Spin = Earth west→east";
      container.style.position = "relative";
      container.appendChild(hint);

      const legend = document.createElement("div");
      legend.className =
        "pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-border bg-surface/90 px-2.5 py-1.5 text-[0.68rem] text-muted";
      legend.innerHTML =
        '<span style="color:#00ee66">⬡</span> M3 &nbsp; <span style="color:#ffee00">⬡</span> M4 &nbsp; <span style="color:#ff8c00">⬡</span> M5 &nbsp; <span style="color:#ff2200">⬡</span> M6 &nbsp; <span style="color:#f0f0f0">⬡</span> M7+ pulse &nbsp; <span style="opacity:.7">| stems=depth</span>';
      container.appendChild(legend);

      cleanupRef.current = () => {
        active = false;
        cancelAnimationFrame(animId);
        window.removeEventListener("mousemove", mm);
        window.removeEventListener("mouseup", mu);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("keydown", onKey);
        ro?.disconnect();
        el.removeEventListener("mousedown", md);
        el.removeEventListener("contextmenu", ctx);
        el.removeEventListener("touchstart", ts);
        el.removeEventListener("touchmove", tm);
        el.removeEventListener("touchend", te);
        el.removeEventListener("touchcancel", te);
        el.removeEventListener("wheel", wheel);
        el.removeEventListener("webglcontextlost", onContextLost);
        disposeGroup(quakeGroup);
        disposeGroup(pinGroup);
        scene.remove(pinGroup);
        if (focusRing) {
          scene.remove(focusRing);
          focusRing.geometry.dispose();
          (focusRing.material as InstanceType<typeof THREE.Material>).dispose();
        }
        hexGeo.dispose();
        earth.geometry.dispose();
        if (mat.map && mat.map !== baseTex) mat.map.dispose();
        baseTex.dispose();
        mat.dispose();
        atmo.geometry.dispose();
        (atmo.material as InstanceType<typeof THREE.Material>).dispose();
        if (glow) {
          scene.remove(glow);
          glow.geometry.dispose();
          (glow.material as InstanceType<typeof THREE.Material>).dispose();
        }
        try {
          renderer.forceContextLoss?.();
        } catch {
          /* ignore */
        }
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        container.innerHTML = "";
        updateRef.current = null;
        aimRef.current = null;
        recenterRef.current = null;
        qualityRef.current = null;
      };
    })().catch((err) => {
      console.error(err);
      if (container) {
        setBootError(err instanceof Error ? err.message : "3D failed");
        try {
          setMapView("2d");
        } catch {
          /* ignore */
        }
        if (container) {
          container.innerHTML =
            '<div class="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted"><p class="text-danger">3D Globe failed — back on 2D.</p><p class="text-xs text-dim">Mobile uses a safe WebGL profile; try again or stay on 2D Map.</p></div>';
        }
      }
    });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per 3d enter
  }, [mapView]);

  useEffect(() => {
    if (mapView === "3d" && updateRef.current) {
      updateRef.current(filteredEq(eq?.features, minMag, maxMag), focusNodeId);
    }
  }, [
    eq,
    minMag,
    maxMag,
    mapView,
    focusNodeId,
    globeStemScale,
    globeMarkerScale,
    globeMarkerOpacity,
  ]);

  useEffect(() => {
    if (mapView !== "3d" || !globeAntipode || !aimRef.current) return;
    aimRef.current(globeAntipode.lat, globeAntipode.lon, true);
    clearGlobeAntipode();
  }, [globeAntipode, mapView, clearGlobeAntipode]);

  const pickLinks = useMemo(() => {
    if (!pickedEvent) {
      return { event: null as string | null, waveforms: null as string | null, origin: null as string | null, shakemap: null as string | null, agencies: [] as ReturnType<typeof agencyLinksForEvent> };
    }
    const id = pickedEvent.id;
    // USGS product tabs separate; keep regional agencies (JMA/INGV/…) for zone depth
    const skip = new Set(["usgs", "source", "usgs-map", "emsc", "geofon-search"]);
    const agencies = agencyLinksForEvent({
      lat: pickedEvent.lat,
      lon: pickedEvent.lon,
      eventId: id,
      place: pickedEvent.place,
      url: pickedEvent.url,
    }).filter((l) => !skip.has(l.id));
    const event =
      pickedEvent.url && /^https?:\/\//i.test(pickedEvent.url)
        ? pickedEvent.url
        : eventPageUrl(id);
    return {
      event,
      waveforms: waveformsEventUrl(id),
      origin: originEventUrl(id),
      shakemap: shakeMapEventUrl(id),
      agencies,
    };
  }, [pickedEvent]);

  if (mapView !== "3d") return null;

  const focus = getFocusNode(focusNodeId);

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-lg border border-border bg-[#0b1220]">
      <div ref={containerRef} className="h-full min-h-[320px] w-full" />

      {qualityLabel && (
        <div className="pointer-events-none absolute right-2 top-2 z-20 rounded-md border border-border bg-surface/90 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-primary sm:right-3">
          {qualityLabel}
        </div>
      )}
      {bootError && (
        <div className="pointer-events-none absolute inset-x-2 top-10 z-20 rounded-md border border-danger/40 bg-surface/95 px-2 py-1.5 text-center text-[0.65rem] text-danger sm:inset-x-auto sm:left-3 sm:right-auto sm:text-left">
          {bootError}
        </div>
      )}

      {pickedEvent && (
        <div className="pointer-events-auto absolute left-3 top-12 z-20 max-w-[min(300px,78vw)] rounded-md border border-border bg-surface/95 px-2.5 py-2 text-[0.72rem] shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span
                className="font-mono font-semibold tabular-nums"
                style={{ color: globeMagStyle(pickedEvent.mag).color }}
              >
                M{pickedEvent.mag.toFixed(1)}
              </span>
              <p className="mt-0.5 line-clamp-2 text-fg">{pickedEvent.place}</p>
              <p className="text-[0.62rem] text-dim">
                {pickedEvent.depth.toFixed(0)} km · {pickedEvent.lat.toFixed(2)}°,{" "}
                {pickedEvent.lon.toFixed(2)}°
              </p>
              <p className="text-[0.62rem] text-dim">{formatUtc(pickedEvent.time)}</p>
            </div>
            <button
              type="button"
              className="ww-btn ww-btn--ghost px-1.5 text-[0.6rem]"
              onClick={() => pickEvent(null)}
              aria-label="Clear pick"
            >
              ✕
            </button>
          </div>
          <p className="mt-1.5 text-[0.58rem] font-semibold uppercase tracking-wider text-dim">
            Assessment · few clicks
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <ShareFocusButton target="event" event={pickedEvent} compact label="Share" />
            {pickLinks.event && (
              <a
                href={pickLinks.event}
                target="_blank"
                rel="noopener noreferrer"
                className="ww-btn text-[0.62rem] font-semibold"
              >
                USGS event →
              </a>
            )}
            {pickLinks.waveforms && (
              <a
                href={pickLinks.waveforms}
                target="_blank"
                rel="noopener noreferrer"
                className="ww-btn text-[0.62rem]"
              >
                Waveforms →
              </a>
            )}
            {pickLinks.origin && (
              <a
                href={pickLinks.origin}
                target="_blank"
                rel="noopener noreferrer"
                className="ww-btn text-[0.62rem]"
              >
                Origin →
              </a>
            )}
            {pickLinks.shakemap && (
              <a
                href={pickLinks.shakemap}
                target="_blank"
                rel="noopener noreferrer"
                className="ww-btn text-[0.62rem]"
              >
                ShakeMap →
              </a>
            )}
            {pickLinks.agencies.slice(0, 4).map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ww-btn text-[0.62rem]"
                style={l.primary || l.id.startsWith("jma") ? { color: "var(--color-primary)" } : undefined}
              >
                {l.label} →
              </a>
            ))}
            <button
              type="button"
              className="ww-btn text-[0.62rem]"
              onClick={() => antipodeOf(pickedEvent.lat, pickedEvent.lon)}
            >
              Antipode ⊕
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-12 right-2 z-20 flex flex-col gap-1.5 sm:right-3">
        <button
          type="button"
          className={`ww-btn text-[0.65rem] ${globeAutoSpin ? "ww-btn--active" : ""}`}
          title="Auto-rotate Earth west→east (prograde), same sense as real Earth / standard globe viewers"
          onClick={() => setGlobeAutoSpin(!globeAutoSpin)}
        >
          {globeAutoSpin ? "Spin ON" : "Spin OFF"}
        </button>
        <button
          type="button"
          className="ww-btn text-[0.65rem]"
          onClick={() => recenterRef.current?.()}
        >
          Recenter
        </button>
        <button
          type="button"
          className="ww-btn text-[0.65rem]"
          onClick={() => setMapView("2d")}
        >
          2D Map
        </button>
      </div>

    </div>
  );
}

function makeHexRingGeometry(THREE: typeof import("three"), outer = 1, thick = 0.22) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * outer;
    const y = Math.sin(a) * outer;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const hole = new THREE.Path();
  const inner = Math.max(0.05, outer - thick);
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const x = Math.cos(a) * inner;
    const y = Math.sin(a) * inner;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape);
}

function makeMagSprite(
  THREE: typeof import("three"),
  mag: number,
  color: string,
  opac: number,
) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 32);
  ctx.font = "bold 20px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.fillStyle = color;
  const t = mag.toFixed(1);
  ctx.strokeText(t, 32, 16);
  ctx.fillText(t, 32, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: Math.min(1, opac + 0.2),
    depthWrite: false,
  });
  return new THREE.Sprite(mat);
}

function makeProceduralEarth(THREE: typeof import("three")) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#1e4d7b");
  g.addColorStop(0.35, "#0f3a62");
  g.addColorStop(0.5, "#0c3358");
  g.addColorStop(0.65, "#0f3a62");
  g.addColorStop(1, "#1e4d7b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);

  const iceN = ctx.createLinearGradient(0, 0, 0, 70);
  iceN.addColorStop(0, "rgba(226,232,240,0.55)");
  iceN.addColorStop(1, "rgba(226,232,240,0)");
  ctx.fillStyle = iceN;
  ctx.fillRect(0, 0, 1024, 70);
  const iceS = ctx.createLinearGradient(0, 512, 0, 442);
  iceS.addColorStop(0, "rgba(226,232,240,0.5)");
  iceS.addColorStop(1, "rgba(226,232,240,0)");
  ctx.fillStyle = iceS;
  ctx.fillRect(0, 442, 1024, 70);

  ctx.fillStyle = "#2f6b4f";
  const land: [number, number, number, number][] = [
    [180, 120, 220, 160],
    [280, 200, 90, 140],
    [480, 100, 160, 100],
    [520, 180, 140, 180],
    [620, 120, 220, 120],
    [780, 220, 100, 80],
    [820, 280, 120, 70],
    [100, 280, 80, 100],
  ];
  for (const [x, y, w, h] of land) {
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(148,163,184,0.18)";
  ctx.lineWidth = 1;
  for (let y = 0; y <= 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  for (let x = 0; x <= 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
