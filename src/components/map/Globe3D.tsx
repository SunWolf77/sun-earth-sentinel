import { useEffect, useMemo, useRef, useState } from "react";
import { buildAuroraOval, latestKp } from "@/lib/feeds/auroraOval";
import { AuroraOfficialPanel } from "@/components/map/AuroraOfficialPanel";
import { issTrailPoints } from "@/lib/feeds/iss";
import { useObservatory, filteredEq, getFocusNode, getAllFocusNodes, type PickedEvent } from "@/store/observatory";
import { magColor, globeMagStyle, eqDepthKm, DRAGON_NODES } from "@/lib/feeds/usgs";
import { filterFeaturesByTimeWindow } from "@/lib/feeds/usgs";
import type { EqFeature } from "@/lib/feeds/usgs";
import { pointInBounds } from "@/lib/geo/bounds";
import { hasWebGl, resolveGlobeQuality, type GlobeQuality } from "@/lib/device";
import {
  createWebGlProfiler,
  formatPerfChip,
  healthColor,
  type WebGlPerfSample,
} from "@/lib/map/webglProfiler";
import {
  WEBGL_CHECKLIST,
  WEBGPU_MIGRATION,
  checklistSummary,
  probeWebGpuAvailable,
} from "@/lib/map/webglOpt";
import { agencyLinksForEvent } from "@/lib/seismology/agencyLinks";
import {
  eventPageUrl,
  originEventUrl,
  shakeMapEventUrl,
  waveformsEventUrl,
} from "@/lib/seismology/shakemap";
import { formatUtc } from "@/lib/utils";
import { ShareFocusButton } from "@/components/ops/ShareFocusButton";
import { MapChromeDock } from "@/components/map/MapChromeDock";
import {
  nodeWhyLine,
  nodeRoleLine,
  nodeMarkChip,
  nodeShortName,
} from "@/lib/nodes/describeNode";
import type { DragonNode } from "@/lib/feeds/usgs";

import {
  clusterEqPointsByKm,
  globeClusterRadiusKm,
  spiderfyOffsets,
  spiderPinLatLon,
  type EqPoint,
} from "@/lib/map/eqCluster";
import {
  makeMagSprite,
  makeCountSprite,
  disposeSpriteMaterial,
  clearSpriteCaches,
} from "@/lib/map/globeSprites";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  css2dCap,
  CSS2D_MAG_MIN,
  Css2dLabelPool,
} from "@/lib/map/globeCss2d";


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
  const mapImmersive = useObservatory((s) => s.mapImmersive);
  const focusNodeId = useObservatory((s) => s.focusNodeId);
  const globeAutoSpin = useObservatory((s) => s.globeAutoSpin);
  const globeSpinEpoch = useObservatory((s) => s.globeSpinEpoch);
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
  const setFocusNode = useObservatory((s) => s.setFocusNode);
  const timeWindow = useObservatory((s) => s.timeWindow);
  const replayActive = useObservatory((s) => s.replayActive);
  const replayCursorMs = useObservatory((s) => s.replayCursorMs);
  const overlays = useObservatory((s) => s.overlays);
  const auroraOfficial = useObservatory((s) => s.auroraOfficial);
  const issPosition = useObservatory((s) => s.issPosition);
  const wildfires = useObservatory((s) => s.wildfires);
  const kp = useObservatory((s) => s.kp);

  const cleanupRef = useRef<(() => void) | null>(null);
  const updateRef = useRef<((features: EqFeature[], focusId: string | null) => void) | null>(
    null,
  );
  const ambientUpdateRef = useRef<(() => void) | null>(null);
  const autoRef = useRef(globeAutoSpin);
  /** User preference (Spin ON) — aim/drag only pause autoRef, not this. */
  const spinDesiredRef = useRef(globeAutoSpin);
  const spinSpdRef = useRef(globeSpinSpeed);
  const stemRef = useRef(globeStemScale);
  const hexRef = useRef(globeMarkerScale);
  const opacRef = useRef(globeMarkerOpacity);
  const overlaysRef = useRef(overlays);
  const aimRef = useRef<((lat: number, lon: number, smooth?: boolean) => void) | null>(null);
  const recenterRef = useRef<(() => void) | null>(null);
  const [qualityLabel, setQualityLabel] = useState<string>("");
  const [perfSample, setPerfSample] = useState<WebGlPerfSample | null>(null);
  const [perfOpen, setPerfOpen] = useState(false);
  const [optTab, setOptTab] = useState<"live" | "checklist" | "webgpu">("live");
  const [webgpuNote, setWebgpuNote] = useState<string>("…");
  const setPerfSampleRef = useRef(setPerfSample);
  setPerfSampleRef.current = setPerfSample;
  const [bootError, setBootError] = useState<string | null>(null);
  const [pickedGlobeNode, setPickedGlobeNode] = useState<DragonNode | null>(null);
  const setPickedGlobeNodeRef = useRef(setPickedGlobeNode);
  setPickedGlobeNodeRef.current = setPickedGlobeNode;
  const [canPrior, setCanPrior] = useState(false);
  const setCanPriorRef = useRef(setCanPrior);
  setCanPriorRef.current = setCanPrior;
  const priorViewRef = useRef<(() => void) | null>(null);
  const tiltByRef = useRef<((delta: number) => void) | null>(null);
  const tiltPresetRef = useRef<((kind: "equator" | "north" | "oblique") => void) | null>(null);
  const [spinResumeHint, setSpinResumeHint] = useState<string | null>(null);
  const setSpinResumeHintRef = useRef(setSpinResumeHint);
  setSpinResumeHintRef.current = setSpinResumeHint;
  const qualityRef = useRef<GlobeQuality | null>(null);

  useEffect(() => {
    spinDesiredRef.current = globeAutoSpin;
    // Explicit Spin / resume always wins (re-enables after focus pause)
    autoRef.current = globeAutoSpin;
  }, [globeAutoSpin, globeSpinEpoch]);
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
    overlaysRef.current = overlays;
  }, [overlays]);

  // Fullscreen: recompute camera distance so Earth fits the taller viewport
  useEffect(() => {
    if (mapView !== "3d") return;
    const id = window.setTimeout(() => {
      recenterRef.current?.();
    }, 80);
    return () => window.clearTimeout(id);
  }, [mapImmersive, mapView]);

  useEffect(() => {
    if (mapView !== "3d") return;
    ambientUpdateRef.current?.();
  }, [mapView, overlays.iss, overlays.aurora, overlays.wildfires, issPosition, wildfires, kp, auroraOfficial]);

  useEffect(() => {
    if (mapView !== "3d" || !overlays.iss) return;
    void useObservatory.getState().pulseIss();
    const id = window.setInterval(() => void useObservatory.getState().pulseIss(), 12_000);
    return () => window.clearInterval(id);
  }, [mapView, overlays.iss]);

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
      setQualityLabel(Q.id === "mobile" ? "3D · mobile" : "3D");

      // WebGL performance profiler — FPS / frame ms / draw calls
      const profiler = createWebGlProfiler({
        targetFps: Q.maxFps,
        enabled: true,
      });
      const unsubPerf = profiler.subscribe((s) => {
        setPerfSampleRef.current(s);
      });
      let perfLogTimer: ReturnType<typeof setInterval> | null = null;
      try {
        if (
          typeof localStorage !== "undefined" &&
          localStorage.getItem("wolfwatch_gl_perf_log") === "1"
        ) {
          perfLogTimer = setInterval(() => profiler.logSummary(), 5000);
        }
      } catch {
        /* ignore */
      }

      const w = Math.max(container.clientWidth, 280);
      const h = Math.max(container.clientHeight, 280);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1220);
      // Vertical FOV; home distance is aspect-aware (portrait needs more radius)
      const V_FOV = 38;
      const camera = new THREE.PerspectiveCamera(V_FOV, w / h, 0.08, 100);

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
      try {
        // Accurate per-frame draw stats for profiler
        if (renderer.info) {
          (renderer.info as { autoReset?: boolean }).autoReset = false;
        }
      } catch {
        /* ignore */
      }

      if ("outputColorSpace" in renderer) {
        (renderer as { outputColorSpace: string }).outputColorSpace = "srgb";
      }
      // Film-like response so marble + markers pop without washout
      if ("toneMapping" in renderer) {
        (renderer as { toneMapping: number }).toneMapping = 4; // ACESFilmic approx if enum unavailable
      }
      try {
        const THREE_TM = THREE as typeof THREE & {
          ACESFilmicToneMapping?: number;
          SRGBColorSpace?: string;
        };
        if (THREE_TM.ACESFilmicToneMapping != null) {
          (renderer as { toneMapping: number }).toneMapping = THREE_TM.ACESFilmicToneMapping;
        }
        if ("toneMappingExposure" in renderer) {
          (renderer as { toneMappingExposure: number }).toneMappingExposure = 1.12;
        }
      } catch {
        /* ignore */
      }
      container.innerHTML = "";
      container.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.touchAction = "none";

      // Hybrid CSS2D — pooled DOM chips (cap + thrifty facing)
      const labelRenderer = new CSS2DRenderer();
      labelRenderer.setSize(w, h);
      labelRenderer.domElement.className = "ww-globe-css2d-root";
      // contain layout thrash to this layer
      labelRenderer.domElement.style.contain = "strict";
      container.appendChild(labelRenderer.domElement);
      const css2d = new Css2dLabelPool(scene, css2dCap(Q.id === "mobile"));
      const clearCss2d = (kind?: "mag" | "node" | "cluster") => css2d.clear(kind);
      const tryAddCss2d = (
        text: string,
        color: string,
        world: InstanceType<typeof THREE.Vector3>,
        kind: "mag" | "node" | "cluster",
        sub?: string,
      ) => css2d.tryAdd(text, color, world, kind, sub);

      // Balanced lighting: keep night side readable, day side crisp (not muddy)
      scene.add(new THREE.AmbientLight(0x8ba4c0, 0.42));
      scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0b1a2e, 0.55));
      const sun = new THREE.DirectionalLight(0xfff4e5, 1.85);
      sun.position.set(5.2, 2.8, 3.2);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x6ec8ff, 0.55);
      fill.position.set(-4.2, -0.6, -2.4);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0x93c5fd, 0.35);
      rim.position.set(0.5, 3.5, -2.5);
      scene.add(rim);

      // Sketch continents until blue-marble loads (not the final look)
      const baseTex = makeProceduralEarth(THREE);
      const geo = new THREE.SphereGeometry(1, Q.sphereSeg, Q.sphereSeg);
      const mat = new THREE.MeshPhongMaterial({
        map: baseTex,
        color: 0xffffff,
        shininess: Q.id === "mobile" ? 22 : 32,
        specular: 0x4a6278,
        emissive: 0x061018,
        emissiveIntensity: 0.22,
      });
      const earth = new THREE.Mesh(geo, mat);
      scene.add(earth);

      // Always load real Earth imagery when allowed — mobile uses lower anisotropy
      {
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = "anonymous";
        const urls = [
          "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-blue-marble.jpg",
          "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg",
        ];
        const tryLoad = (i: number) => {
          if (cancelled || i >= urls.length) return;
          loader.load(
            urls[i]!,
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
              tex.generateMipmaps = true;
              tex.minFilter = THREE.LinearMipmapLinearFilter;
              tex.magFilter = THREE.LinearFilter;
              const old = mat.map;
              mat.map = tex;
              mat.emissiveIntensity = 0.12;
              mat.needsUpdate = true;
              if (old && old !== tex) {
                try {
                  old.dispose();
                } catch {
                  /* ignore */
                }
              }
            },
            undefined,
            () => tryLoad(i + 1),
          );
        };
        if (Q.loadMarble) tryLoad(0);
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
        kind: "event" | "cluster" | "node";
        id: string;
        lat: number;
        lon: number;
        mag: number;
        place: string;
        depth: number;
        time: number | null;
        url?: string;
        neon: boolean;
        clusterKey?: string;
        count?: number;
        nodeId?: string;
        role?: string;
        why?: string;
        chip?: string;
      };
      let pickList: { mesh: InstanceType<typeof THREE.Object3D>; meta: PickMeta }[] = [];
      /** Expanded spiderfy clusters on the globe (click badge to toggle). */
      const expandedGlobe = new Set<string>();
      /** Cluster key that should play open animation on next rebuild. */
      let spiderExpandKey: string | null = null;
      type SpiderAnim = {
        mesh: InstanceType<typeof THREE.Object3D>;
        from: InstanceType<typeof THREE.Vector3>;
        to: InstanceType<typeof THREE.Vector3>;
        t0: number;
        dur: number;
        legPos?: Float32Array;
        legGeo?: InstanceType<typeof THREE.BufferGeometry>;
      };
      let spiderAnims: SpiderAnim[] = [];
      let lastFeatureList: EqFeature[] = [];
      let lastFocusId: string | null = null;
      let neonMats: { mat: InstanceType<typeof THREE.MeshBasicMaterial>; base: number }[] = [];
      let focusRing: InstanceType<typeof THREE.Line> | null = null;
      let pickRing: InstanceType<typeof THREE.Mesh> | null = null;

      // Fit unit Earth in BOTH axes (Three FOV is vertical — tall portrait needs more distance).
      const RADIUS_MIN = 2.6;
      const RADIUS_MAX = 9.5;
      const FRAME_MARGIN = Q.id === "mobile" ? 1.42 : 1.3;
      function homeRadiusFor(aspect: number, vFovDeg = V_FOV, margin = FRAME_MARGIN): number {
        const v = (vFovDeg * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(v / 2) * Math.max(0.2, aspect));
        const dV = margin / Math.tan(v / 2);
        const dH = margin / Math.tan(hFov / 2);
        return Math.min(RADIUS_MAX, Math.max(3.8, Math.max(dV, dH)));
      }
      let HOME_RADIUS = homeRadiusFor(w / Math.max(1, h));
      const FLY_TO_MIN_MS = 420;
      const FLY_TO_MAX_MS = 900;
      const FLY_TO_HOLD_MS = 450;
      const SPIN_RESUME_AFTER_DRAG_MS = 650;
      const SPIN_RESUME_AFTER_HOME_MS = 280;
      const spherical = { theta: 0.85, phi: 1.05, radius: HOME_RADIUS };
      // Prior-view stack (camera before smooth aim / home)
      type CamSnap = { theta: number; phi: number; radius: number };
      let priorCam: CamSnap | null = null;
      function pushPrior() {
        priorCam = {
          theta: spherical.theta,
          phi: spherical.phi,
          radius: spherical.radius,
        };
        setCanPriorRef.current(true);
      }
      function restorePrior() {
        if (!priorCam) return;
        aimAnim = {
          t0: performance.now(),
          dur: 700,
          from: { theta: spherical.theta, phi: spherical.phi, radius: spherical.radius },
          to: { ...priorCam },
        };
        priorCam = null;
        setCanPriorRef.current(false);
      }
      priorViewRef.current = restorePrior;
      let rotating = false;
      let lastX = 0;
      let lastY = 0;
      let reclusterTimer: number | null = null;
      const scheduleRecluster = () => {
        if (reclusterTimer != null) window.clearTimeout(reclusterTimer);
        reclusterTimer = window.setTimeout(() => {
          reclusterTimer = null;
          updateMarkers(lastFeatureList, lastFocusId);
        }, 180);
      };
      let aimAnim: {
        t0: number;
        dur: number;
        from: { theta: number; phi: number; radius: number };
        to: { theta: number; phi: number; radius: number };
        resumeSpin?: boolean;
        holdMs?: number;
      } | null = null;
      /** Must be declared before applyCam (called during setup). */
      let needsRender = true;

      function applyCam() {
        needsRender = true;
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

      let spinResumeTimer: ReturnType<typeof setTimeout> | null = null;
      const clearSpinResume = () => {
        if (spinResumeTimer != null) {
          clearTimeout(spinResumeTimer);
          spinResumeTimer = null;
        }
        try {
          setSpinResumeHintRef.current(null);
        } catch {
          /* ignore */
        }
      };
      /** Pause auto-spin during focus / drag; resume if Spin preference is ON. */
      const scheduleSpinResume = (delayMs: number, reason: string) => {
        clearSpinResume();
        if (!spinDesiredRef.current) {
          setSpinResumeHintRef.current(null);
          return;
        }
        const sec = Math.max(0.3, delayMs / 1000);
        setSpinResumeHintRef.current(
          `Spin resumes in ~${sec < 1 ? sec.toFixed(1) : Math.round(sec)}s · ${reason}`,
        );
        spinResumeTimer = setTimeout(() => {
          spinResumeTimer = null;
          setSpinResumeHintRef.current(null);
          if (spinDesiredRef.current && !rotating) {
            autoRef.current = true;
          }
        }, delayMs);
      };

      function aimAngularDist(
        from: { theta: number; phi: number },
        to: { theta: number; phi: number },
      ): number {
        let dTh = to.theta - from.theta;
        while (dTh > Math.PI) dTh -= Math.PI * 2;
        while (dTh < -Math.PI) dTh += Math.PI * 2;
        return Math.hypot(dTh, to.phi - from.phi);
      }

      function flyDurationMs(
        from: { theta: number; phi: number },
        to: { theta: number; phi: number },
      ): number {
        const ang = aimAngularDist(from, to);
        const u = Math.min(1, ang / Math.PI);
        return Math.round(FLY_TO_MIN_MS + u * u * (FLY_TO_MAX_MS - FLY_TO_MIN_MS));
      }

      function aimAt(lat: number, lon: number, smooth = true) {
        if (smooth) pushPrior();
        const aim = latLonToVec(lat, lon, 1);
        let toTheta = Math.atan2(aim.x, aim.z);
        const toPhi = Math.acos(Math.max(-1, Math.min(1, aim.y)));
        // Shortest yaw arc (no full-spin fly-to)
        let dTh = toTheta - spherical.theta;
        while (dTh > Math.PI) dTh -= Math.PI * 2;
        while (dTh < -Math.PI) dTh += Math.PI * 2;
        toTheta = spherical.theta + dTh;

        clearSpinResume();
        autoRef.current = false;
        if (!smooth) {
          spherical.theta = toTheta;
          spherical.phi = toPhi;
          applyCam();
          aimAnim = null;
          scheduleSpinResume(FLY_TO_HOLD_MS, "after focus");
          return;
        }
        const from = { theta: spherical.theta, phi: spherical.phi, radius: spherical.radius };
        const to = {
          theta: toTheta,
          phi: toPhi,
          radius: Math.max(HOME_RADIUS * 0.92, Math.min(Math.max(spherical.radius, HOME_RADIUS * 0.92), RADIUS_MAX * 0.85)),
        };
        aimAnim = {
          t0: performance.now(),
          dur: flyDurationMs(from, to),
          from,
          to,
          resumeSpin: true,
          holdMs: FLY_TO_HOLD_MS,
        };
      }
      aimRef.current = aimAt;

      function tiltBy(delta: number) {
        clearSpinResume();
        autoRef.current = false;
        aimAnim = null;
        spherical.phi = Math.max(0.18, Math.min(Math.PI - 0.18, spherical.phi + delta));
        applyCam();
        if (spinDesiredRef.current) scheduleSpinResume(SPIN_RESUME_AFTER_DRAG_MS, "after tilt");
      }
      function tiltPreset(kind: "equator" | "north" | "oblique") {
        clearSpinResume();
        autoRef.current = false;
        const from = { theta: spherical.theta, phi: spherical.phi, radius: spherical.radius };
        const phi =
          kind === "equator" ? Math.PI / 2 : kind === "north" ? 0.55 : 1.05;
        const to = { theta: spherical.theta, phi, radius: spherical.radius };
        aimAnim = {
          t0: performance.now(),
          dur: flyDurationMs(from, to),
          from,
          to,
          resumeSpin: true,
          holdMs: SPIN_RESUME_AFTER_HOME_MS,
        };
      }
      tiltByRef.current = tiltBy;
      tiltPresetRef.current = tiltPreset;

      recenterRef.current = () => {
        pushPrior();
        aimAnim = null;
        clearSpinResume();
        spherical.theta = 0.85;
        spherical.phi = 1.05;
        spherical.radius = HOME_RADIUS;
        applyCam();
        scheduleSpinResume(SPIN_RESUME_AFTER_HOME_MS, "after home");
      };

      const hexGeo = makeHexRingGeometry(THREE, 1, 0.22);
      const dummy = new THREE.Object3D();
      // Shared pin geometries (1 draw path × N meshes, not N unique GPU buffers)
      const geoStem = new THREE.CylinderGeometry(1, 1, 1, Math.max(5, Q.pinSeg));
      const geoFoot = new THREE.SphereGeometry(1, 8, 8);
      const geoHead = new THREE.SphereGeometry(1, Q.id === "mobile" ? 8 : 10, Q.id === "mobile" ? 8 : 10);
      const geoHit = new THREE.SphereGeometry(1, 8, 8);
      const geoBadge = new THREE.CircleGeometry(1, Q.id === "mobile" ? 14 : 20);
      const geoBadgeRing = new THREE.RingGeometry(0.92, 1.08, Q.id === "mobile" ? 14 : 20);
      type MatKey = string;
      const matPool = new Map<MatKey, InstanceType<typeof THREE.MeshBasicMaterial>>();
      const pooledMats: InstanceType<typeof THREE.MeshBasicMaterial>[] = [];
      function pinMat(
        key: MatKey,
        color: number | InstanceType<typeof THREE.Color>,
        opacity: number,
        extra?: { doubleSide?: boolean; depthWrite?: boolean },
      ) {
        const colKey =
          typeof color === "number"
            ? color.toString(16)
            : typeof (color as { getHex?: () => number }).getHex === "function"
              ? (color as { getHex: () => number }).getHex().toString(16)
              : String(color);
        const k = `${key}|${colKey}|${opacity.toFixed(2)}|${extra?.doubleSide ? 1 : 0}`;
        let m = matPool.get(k);
        if (!m) {
          m = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: extra?.depthWrite ?? false,
            side: extra?.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
          });
          matPool.set(k, m);
          pooledMats.push(m);
        }
        return m;
      }

      const sharedGeos = new Set<object>([
        hexGeo,
        geoStem,
        geoFoot,
        geoHead,
        geoHit,
        geoBadge,
        geoBadgeRing,
      ]);
      function disposeGroup(g: InstanceType<typeof THREE.Group>) {
        while (g.children.length) {
          const o = g.children[0]!;
          g.remove(o);
          o.traverse((ch) => {
            const mesh = ch as InstanceType<typeof THREE.Mesh>;
            // Only dispose per-instance geos (spider legs, etc.)
            if (mesh.geometry && !sharedGeos.has(mesh.geometry as object)) {
              mesh.geometry.dispose();
            }
            const m = mesh.material;
            if (m) {
              const list = Array.isArray(m) ? m : [m];
              for (const mat of list) {
                // Keep pooled pin mats; shared sprite maps stay in cache
                if (pooledMats.includes(mat as InstanceType<typeof THREE.MeshBasicMaterial>)) {
                  continue;
                }
                disposeSpriteMaterial(mat as InstanceType<typeof THREE.Material>);
              }
            }
          });
        }
      }

      function updateMarkers(features: EqFeature[], focusId: string | null) {
        lastFeatureList = features;
        lastFocusId = focusId;
        clearCss2d("mag");
        clearCss2d("cluster");
        disposeGroup(quakeGroup);
        pickList = [];
        neonMats = [];
        spiderAnims = [];
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

        // Same mag floor as 2D — never show events outside the control-panel filters
        let list = features.filter((f) => {
          const m = f.properties.mag ?? 0;
          return m >= minMag && m <= maxMag;
        });
        if (focus) {
          list = list.filter((f) => {
            const [lon, lat] = f.geometry.coordinates;
            return pointInBounds(lat, lon, focus.bounds);
          });
        }
        list = [...list].sort(
          (a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0),
        );
        if (list.length > Q.maxMarkers) {
          const strong = list.filter((f) => (f.properties.mag ?? 0) >= 5.5);
          const rest = list.filter((f) => (f.properties.mag ?? 0) < 5.5);
          const room = Math.max(0, Q.maxMarkers - strong.length);
          list = [...strong, ...rest.slice(0, room)].slice(0, Q.maxMarkers);
        }

        const points: EqPoint[] = list.map((f) => {
          const [lon, lat] = f.geometry.coordinates;
          return { f, lat, lon, mag: f.properties.mag ?? 0 };
        });
        const radiusKm = globeClusterRadiusKm(spherical.radius);
        const clusters = clusterEqPointsByKm(points, radiusKm);
        // Drop expanded keys that no longer exist
        const liveKeys = new Set(clusters.map((c) => c.key));
        for (const k of [...expandedGlobe]) {
          if (!liveKeys.has(k)) expandedGlobe.delete(k);
        }

        const stemPos: number[] = [];
        const stemCol: number[] = [];

        const placeEventHex = (
          f: EqFeature,
          lat: number,
          lon: number,
          opts?: {
            showLabel?: boolean;
            elevBoost?: number;
            displayLat?: number;
            displayLon?: number;
            /** Extra pin height for spiderfied events */
            pinTall?: boolean;
          },
        ) => {
          const mag = f.properties.mag ?? 3.5;
          const depth = eqDepthKm(f);
          const place = f.properties.place ?? "—";
          const id = f.id ? String(f.id) : `${lat}_${lon}_${f.properties.time ?? 0}`;
          const st = globeMagStyle(mag);
          const neon = st.neon;
          // Grounded needles — sit on crust (depth → slight lift only)
          let base = 0.014 + Math.pow(Math.max(mag, 0.5), 1.02) * 0.007;
          if (mag >= 5) base *= 1 + (mag - 5) * 0.1;
          if (mag >= 6) base *= 1.08;
          const size = base * Math.max(0.9, Math.min(1.2, hexScale));
          // Depth cue is subtle — not kilometers of air
          const lift = (Math.min(depth, 700) / 700) * Math.max(0.02, stemMul * 0.45);
          const tall = opts?.pinTall ? 1.25 : 1;
          const pinHeight =
            (0.032 + lift * 0.55 + size * 0.55 + (opts?.elevBoost ?? 0)) * tall;
          const elev = 1.004 + pinHeight;
          const dLat = opts?.displayLat ?? lat;
          const dLon = opts?.displayLon ?? lon;
          const pos = latLonToVec(dLat, dLon, elev);
          const surf = latLonToVec(dLat, dLon, 1.0035);
          const colHex = st.color;
          const col = new THREE.Color(colHex);

          const g = new THREE.Group();
          g.position.copy(pos);
          // lookAt: local -Z → Earth center, +Z outward (no rotateY flip)
          g.lookAt(0, 0, 0);

          // Short stem — pin head near surface
          const stemLen = pinHeight * 0.94;
          const stemR = Math.max(0.002, size * 0.1);
          const stem = new THREE.Mesh(
            geoStem,
            pinMat("stem", col, Math.min(1, opac * 0.96)),
          );
          stem.rotation.x = Math.PI / 2;
          stem.scale.set(stemR, stemLen, stemR);
          stem.position.z = -stemLen / 2;
          stem.renderOrder = 8;
          g.add(stem);

          {
            const foot = new THREE.Mesh(
              geoFoot,
              pinMat("foot", col, Math.min(1, opac * 0.88)),
            );
            foot.scale.setScalar(stemR * 1.9);
            foot.position.z = -stemLen;
            foot.renderOrder = 7;
            g.add(foot);
          }

          // Compact head on crust
          const allRings =
            neon ? [0.92, 0.68] : mag >= 5.5 ? [0.92, 0.66] : [0.88];
          const rings = allRings.slice(0, Math.max(1, Q.maxRings));
          rings.forEach((s, i) => {
            const ro = opac * (1 - i * 0.2) * (neon && i === 0 ? 0.96 : 0.9);
            const ringMat =
              neon && i === 0
                ? new THREE.MeshBasicMaterial({
                    color: col,
                    transparent: true,
                    opacity: ro,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                  })
                : pinMat(`ring${i}`, col, ro, { doubleSide: true });
            if (neon && i === 0) {
              neonMats.push({ mat: ringMat, base: opac * 0.95 });
            }
            const mesh = new THREE.Mesh(hexGeo, ringMat);
            mesh.scale.setScalar(size * s);
            mesh.renderOrder = 12 + Math.floor(mag);
            g.add(mesh);
          });
          const headR = size * 0.4;
          const head = new THREE.Mesh(
            geoHead,
            pinMat("head", col, Math.min(1, opac + 0.12)),
          );
          head.scale.setScalar(headR);
          head.renderOrder = 14;
          g.add(head);

          if (Q.id === "mobile") {
            head.scale.setScalar(Math.max(headR, 0.016));
          } else {
            const hit = new THREE.Mesh(geoHit, pinMat("hit", 0x000000, 0.001));
            hit.scale.setScalar(Math.max(0.022, size * 1.45));
            g.add(hit);
          }

          // CSS2D only for strong (M6+) or spiderfy — stops "floating label cloud"
          // Label world pos = pin head (same elev), CSS nudge handles offset
          const wantCss = mag >= CSS2D_MAG_MIN || !!opts?.pinTall;
          if (wantCss) {
            const headWorld = latLonToVec(dLat, dLon, elev);
            tryAddCss2d(`M${mag.toFixed(1)}`, colHex, headWorld, "mag");
          }

          quakeGroup.add(g);
          pickList.push({
            mesh: g,
            meta: {
              kind: "event",
              id,
              lat,
              lon,
              mag,
              place,
              depth,
              time: f.properties.time ?? null,
              url: f.properties.url ?? undefined,
              neon,
            },
          });

          // Depth line only when meaningfully deep (avoids floating spokes)
          if (depth >= 70 || pinHeight > 0.05) {
            stemPos.push(surf.x, surf.y, surf.z, pos.x, pos.y, pos.z);
            stemCol.push(col.r, col.g, col.b, col.r, col.g, col.b);
          }
        };

        for (const cl of clusters) {
          if (cl.points.length === 1) {
            const p = cl.points[0]!;
            placeEventHex(p.f, p.lat, p.lon, {
              showLabel: Q.magSprites && p.mag >= 5,
            });
            continue;
          }

          const expanded = expandedGlobe.has(cl.key);
          if (expanded) {
            const offs = spiderfyOffsets(cl.points.length, 16);
            const animateOpen = spiderExpandKey === cl.key;
            const t0 = performance.now();
            for (let i = 0; i < cl.points.length; i++) {
              const p = cl.points[i]!;
              const o = offs[i] ?? { dLat: 0, dLon: 0 };
              const [plat, plon] = spiderPinLatLon(cl.lat, cl.lon, o.dLat, o.dLon);

              const mag = p.mag;
              const depth = eqDepthKm(p.f);
              let base = 0.018 + Math.pow(Math.max(mag, 0.5), 1.1) * 0.01;
              if (mag >= 5) base *= 1 + (mag - 5) * 0.18;
              const size = base * hexScale;
              const lift = (Math.min(depth, 700) / 700) * stemMul;
              const pinH =
                (0.055 +
                  (Math.min(depth, 700) / 700) * Math.max(0.04, stemMul) * 1.35 +
                  size * 0.9 +
                  0.04) *
                1.55;
              const elev = 1.008 + pinH;
              const from = latLonToVec(cl.lat, cl.lon, elev);
              const to = latLonToVec(plat, plon, elev);

              // Start at cluster center when opening; full spread when already open (recluster)
              const startLat = animateOpen ? cl.lat : plat;
              const startLon = animateOpen ? cl.lon : plon;
              placeEventHex(p.f, p.lat, p.lon, {
                showLabel: true,
                elevBoost: 0.04,
                pinTall: true,
                displayLat: startLat,
                displayLon: startLon,
              });
              const last = pickList[pickList.length - 1];
              if (!last) continue;

              // Animated spider leg (center → pin tip)
              const legArr = new Float32Array([
                from.x,
                from.y,
                from.z,
                animateOpen ? from.x : to.x,
                animateOpen ? from.y : to.y,
                animateOpen ? from.z : to.z,
              ]);
              const legGeo = new THREE.BufferGeometry();
              legGeo.setAttribute("position", new THREE.BufferAttribute(legArr, 3));
              const legCol = new THREE.Color(globeMagStyle(p.mag).color);
              const leg = new THREE.Line(
                legGeo,
                new THREE.LineBasicMaterial({
                  color: legCol,
                  transparent: true,
                  opacity: 0.75,
                  depthWrite: false,
                  linewidth: 2,
                }),
              );
              quakeGroup.add(leg);

              if (animateOpen) {
                // Stagger slightly so the fan reads as a wave
                const delay = i * 18;
                spiderAnims.push({
                  mesh: last.mesh,
                  from: from.clone(),
                  to: to.clone(),
                  t0: t0 + delay,
                  dur: 280,
                  legPos: legArr,
                  legGeo,
                });
                // Start slightly smaller for pop
                last.mesh.scale.setScalar(0.35);
              } else {
                last.mesh.position.copy(to);
                last.mesh.lookAt(0, 0, 0);
              }
            }
            if (animateOpen && spiderExpandKey === cl.key) {
              spiderExpandKey = null;
            }
          }

          // Cluster pin + readable count badge
          const st = globeMagStyle(cl.maxMag);
          const col = new THREE.Color(st.color);
          const badgeSize = 0.02 + Math.min(0.016, cl.points.length * 0.0018);
          const badgeStem = 0.028 + Math.min(0.016, cl.points.length * 0.0018);
          const badgePos = latLonToVec(cl.lat, cl.lon, 1.005 + badgeStem);
          const bg = new THREE.Group();
          bg.position.copy(badgePos);
          bg.lookAt(0, 0, 0);

          const cStem = new THREE.Mesh(
            geoStem,
            pinMat("cstem", col, Math.min(1, opac + 0.05)),
          );
          cStem.rotation.x = Math.PI / 2;
          cStem.scale.set(0.0034, badgeStem, 0.0034);
          cStem.position.z = -badgeStem / 2;
          cStem.renderOrder = 38;
          bg.add(cStem);

          const disc = new THREE.Mesh(
            geoBadge,
            pinMat("badge", col, Math.min(1, opac + 0.12), { doubleSide: true }),
          );
          disc.scale.setScalar(badgeSize);
          disc.renderOrder = 40;
          bg.add(disc);

          const ring = new THREE.Mesh(
            geoBadgeRing,
            pinMat(
              "badgeRing",
              cl.maxMag >= 6 ? 0xfbbf24 : 0xf8fafc,
              0.92,
              { doubleSide: true },
            ),
          );
          ring.scale.setScalar(badgeSize);
          ring.renderOrder = 41;
          bg.add(ring);

          {
            const spr = makeCountSprite(THREE, cl.points.length, st.color, opac);
            spr.scale.set(0.044, 0.044, 1);
            spr.position.set(0, 0, badgeSize * 0.6);
            bg.add(spr);
          }

          quakeGroup.add(bg);
          pickList.push({
            mesh: bg,
            meta: {
              kind: "cluster",
              id: `cluster:${cl.key.slice(0, 24)}`,
              lat: cl.lat,
              lon: cl.lon,
              mag: cl.maxMag,
              place: `${cl.points.length} nearby events · max M${cl.maxMag.toFixed(1)}`,
              depth: 0,
              time: null,
              neon: st.neon,
              clusterKey: cl.key,
              count: cl.points.length,
            },
          });
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
              opacity: Math.max(0.75, Math.min(1, opac * 0.95)),
              depthWrite: false,
              linewidth: 2,
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

        rebuildNodePins();
        void dummy;
      }

      const pinGroup = new THREE.Group();
      scene.add(pinGroup);
      const ambientGroup = new THREE.Group();
      scene.add(ambientGroup);

      function rebuildAmbient() {
        while (ambientGroup.children.length) {
          const o = ambientGroup.children[0]!;
          ambientGroup.remove(o);
          o.traverse((ch) => {
            const mesh = ch as InstanceType<typeof THREE.Mesh>;
            if (mesh.geometry) mesh.geometry.dispose();
            const mat = mesh.material;
            if (mat) {
              if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
              else (mat as InstanceType<typeof THREE.Material>).dispose();
            }
          });
        }
        const ov = overlaysRef.current;
        const st = useObservatory.getState();
        if (ov.aurora && !st.auroraOfficial) {
          const oval = buildAuroraOval(latestKp(st.kp));
          const col =
            oval.level === "storm" ? 0x34d399 : oval.level === "elevated" ? 0x6ee7b7 : 0x2dd4bf;
          for (const ring of [oval.northRing, oval.southRing]) {
            const pts = ring.map((p) => latLonToVec(p.lat, p.lon, 1.012));
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const line = new THREE.Line(
              geo,
              new THREE.LineBasicMaterial({
                color: col,
                transparent: true,
                opacity: oval.level === "quiet" ? 0.35 : 0.65,
              }),
            );
            ambientGroup.add(line);
          }
        }
        if (ov.iss && st.issPosition) {
          const iss = st.issPosition;
          const elev = 1.02 + Math.min(0.04, iss.altitudeKm / 20000);
          const v = latLonToVec(iss.lat, iss.lon, elev);
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.018, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
          );
          mesh.position.copy(v);
          ambientGroup.add(mesh);
          const trail = issTrailPoints(iss.lat, iss.lon, 16, 3).map((p) =>
            latLonToVec(p.lat, p.lon, 1.015),
          );
          ambientGroup.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(trail),
              new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5 }),
            ),
          );
        }
        if (ov.wildfires && st.wildfires?.length) {
          const geo = new THREE.SphereGeometry(0.008, 6, 6);
          const mat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
          for (const f of st.wildfires.slice(0, 80)) {
            const m = new THREE.Mesh(geo, mat);
            m.position.copy(latLonToVec(f.lat, f.lon, 1.01));
            ambientGroup.add(m);
          }
        }
      }
      ambientUpdateRef.current = rebuildAmbient;
      rebuildAmbient();

      function rebuildNodePins() {
        clearCss2d("node");
        // Remove previous node meshes + their pick entries
        pickList = pickList.filter((p) => p.meta.kind !== "node");
        while (pinGroup.children.length) {
          const o = pinGroup.children[0]!;
          pinGroup.remove(o);
          o.traverse((ch) => {
            const mesh = ch as InstanceType<typeof THREE.Mesh>;
            if (mesh.geometry && mesh.geometry !== hexGeo) mesh.geometry.dispose();
            const mat = mesh.material;
            if (mat) {
              if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
              else (mat as InstanceType<typeof THREE.Material>).dispose();
            }
          });
        }
        // Only draw when Nodes overlay is on — every pin is pickable with a "why" card
        if (!Q.nodePins || !overlaysRef.current.nodes) return;
        let nodes = getAllFocusNodes();
        if (Q.id === "mobile") {
          nodes = nodes.filter(
            (n) => n.publishedFocus || n.watchPriority || n.kind === "volcano",
          );
        }
        for (const node of nodes) {
          const clat = node.center?.[0] ?? (node.bounds[0][0] + node.bounds[1][0]) / 2;
          const clon =
            node.center?.[1] ??
            (node.bounds[0][1] <= node.bounds[1][1]
              ? (node.bounds[0][1] + node.bounds[1][1]) / 2
              : -175);
          // Node markers: discrete dots on short stems (labels only when close)
          const important = !!(node.publishedFocus || node.kind === "volcano" || node.watchPriority);
          const stemLen = important ? 0.028 : 0.018;
          const elev = 1.004 + stemLen;
          const v = latLonToVec(clat, clon, elev);
          const col =
            node.kind === "volcano"
              ? 0xfb923c
              : node.publishedFocus
                ? 0xfbbf24
                : 0x22d3ee;
          const g = new THREE.Group();
          g.position.copy(v);
          g.lookAt(0, 0, 0);

          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0028, 0.004, stemLen, 6),
            new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: 0.92,
              depthWrite: false,
            }),
          );
          stem.rotation.x = Math.PI / 2;
          stem.position.z = -stemLen / 2;
          g.add(stem);
          const nFoot = new THREE.Mesh(
            new THREE.SphereGeometry(0.005, 6, 6),
            new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 }),
          );
          nFoot.position.z = -stemLen;
          g.add(nFoot);

          const hitR = important ? 0.028 : 0.022;
          const hit = new THREE.Mesh(
            new THREE.SphereGeometry(hitR, 10, 10),
            new THREE.MeshBasicMaterial({
              transparent: true,
              opacity: 0.001,
              depthWrite: false,
            }),
          );
          g.add(hit);

          const core = new THREE.Mesh(
            new THREE.SphereGeometry(important ? 0.014 : 0.01, Q.pinSeg, Q.pinSeg),
            new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: 0.95,
              depthWrite: false,
            }),
          );
          g.add(core);

          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.012, 0.016, 16),
            new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: 0.85,
              side: THREE.DoubleSide,
              depthWrite: false,
            }),
          );
          ring.scale.setScalar(important ? 1.15 : 1);
          g.add(ring);

          // Name chips only when zoomed in — home view stays clean
          // Important nodes — CSS2D chips when not fully zoomed out
          const camOk = spherical.radius < 2.55;
          if (camOk && important) {
            const hex = "#" + (col & 0xffffff).toString(16).padStart(6, "0");
            const tip = v.clone().normalize().multiplyScalar(elev + 0.004);
            tryAddCss2d(
              nodeShortName(node, 14),
              hex,
              tip,
              "node",
              nodeMarkChip(node),
            );
          }

          pinGroup.add(g);
          pickList.push({
            mesh: g,
            meta: {
              kind: "node",
              id: `node:${node.id}`,
              nodeId: node.id,
              lat: clat,
              lon: clon,
              mag: 0,
              place: node.name,
              depth: 0,
              time: null,
              neon: false,
              role: nodeRoleLine(node),
              why: nodeWhyLine(node),
              chip: nodeMarkChip(node),
            },
          });
        }
      }


      updateRef.current = updateMarkers;
      updateMarkers(
        filterFeaturesByTimeWindow(filteredEq(eq?.features, minMag, maxMag), timeWindow),
        focusNodeId,
      );

      const el = renderer.domElement;
      el.style.touchAction = "none";
      // Hover tooltip — quick context without click
      const hoverTip = document.createElement("div");
      hoverTip.className = "ww-globe-hover-tip";
      hoverTip.style.display = "none";
      container.appendChild(hoverTip);

      function showHoverTip(meta: PickMeta, clientX: number, clientY: number) {
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        if (meta.kind === "node") {
          const isVolc = (meta.chip || "").toLowerCase().includes("volcano");
          hoverTip.innerHTML = `<div class="ww-hover-tip__kind">${isVolc ? "VOLCANO / NODE" : "FOCUS NODE"}</div>
            <div class="ww-hover-tip__title">${meta.place}</div>
            <div class="ww-hover-tip__chip">${meta.chip || "Focus zone"}</div>
            <div class="ww-hover-tip__role">${meta.role || ""}</div>
            <div class="ww-hover-tip__hint">Tap</div>`;
        } else if (meta.kind === "cluster") {
          hoverTip.innerHTML = `<div class="ww-hover-tip__kind">CLUSTER</div>
            <div class="ww-hover-tip__title">${meta.count ?? "?"} nearby EQs</div>
            <div class="ww-hover-tip__chip">max M${meta.mag.toFixed(1)}</div>
            <div class="ww-hover-tip__hint">Tap · expand</div>`;
        } else {
          hoverTip.innerHTML = `<div class="ww-hover-tip__kind">EARTHQUAKE</div>
            <div class="ww-hover-tip__title">M${meta.mag.toFixed(1)} · ${meta.place}</div>
            <div class="ww-hover-tip__role">${meta.depth.toFixed(0)} km · ${meta.lat.toFixed(2)}°, ${meta.lon.toFixed(2)}°</div>
            <div class="ww-hover-tip__hint">Tap</div>`;
        }
        hoverTip.style.display = "block";
        const pad = 12;
        const tw = hoverTip.offsetWidth || 160;
        const th = hoverTip.offsetHeight || 60;
        let left = x + 14;
        let top = y + 14;
        if (left + tw > rect.width - pad) left = x - tw - 10;
        if (top + th > rect.height - pad) top = y - th - 10;
        hoverTip.style.left = `${Math.max(pad, left)}px`;
        hoverTip.style.top = `${Math.max(pad, top)}px`;
        el.style.cursor = "pointer";
      }
      function hideHoverTip() {
        hoverTip.style.display = "none";
        if (!rotating) el.style.cursor = "grab";
      }

      // Hover scale highlight (seamless target feedback)
      let hoverObj: InstanceType<typeof THREE.Object3D> | null = null;
      let hoverScale = 1;
      function clearHoverHighlight() {
        if (hoverObj) {
          hoverObj.scale.setScalar(hoverScale);
          hoverObj = null;
        }
      }
      function setHoverHighlight(mesh: InstanceType<typeof THREE.Object3D>) {
        if (hoverObj === mesh) return;
        clearHoverHighlight();
        hoverObj = mesh;
        hoverScale = mesh.scale.x || 1;
        mesh.scale.setScalar(hoverScale * 1.28);
      }

      const ray = new THREE.Raycaster();
      // Prefer closest hit; slightly generous for thin hex rings / spider pins
      ray.params.Points = { threshold: 0.1 };
      ray.params.Line = { threshold: 0.04 };
      const mouse = new THREE.Vector2();

      function pickAt(clientX: number, clientY: number): PickMeta | null {
        const rect = el.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        ray.setFromCamera(mouse, camera);
        const objs = pickList.map((p) => p.mesh);
        const hits = ray.intersectObjects(objs, true);
        if (!hits.length) return null;
        // Prefer event pins over cluster badges when both under the cursor
        // so a new EQ can replace the open card without closing first.
        const resolved: { meta: PickMeta; dist: number }[] = [];
        for (const h of hits) {
          let o: InstanceType<typeof THREE.Object3D> | null = h.object;
          while (o) {
            const found = pickList.find((p) => p.mesh === o);
            if (found) {
              resolved.push({ meta: found.meta, dist: h.distance });
              break;
            }
            o = o.parent;
          }
        }
        if (!resolved.length) return null;
        const events = resolved.filter((r) => r.meta.kind === "event");
        const nodes = resolved.filter((r) => r.meta.kind === "node");
        const pool = events.length ? events : nodes.length ? nodes : resolved;
        pool.sort((a, b) => a.dist - b.dist);
        return pool[0]!.meta;
      }

      function applyPick(meta: PickMeta) {
        // Seamless switch: any pick replaces the previous detail card
        hideHoverTip();
        clearHoverHighlight();
        if (meta.kind === "node" && meta.nodeId) {
          pickEvent(null);
          const node =
            getAllFocusNodes().find((n) => n.id === meta.nodeId) ||
            DRAGON_NODES.find((n) => n.id === meta.nodeId) ||
            null;
          setPickedGlobeNodeRef.current(node);
          setFocusNode(meta.nodeId);
          aimAt(meta.lat, meta.lon, true);
          return;
        }
        // Cluster badge: expand / collapse spider pins (globe equivalent of 2D spiderfy)
        if (meta.kind === "cluster" && meta.clusterKey) {
          setPickedGlobeNodeRef.current(null);
          pickEvent(null);
          if (expandedGlobe.has(meta.clusterKey)) {
            expandedGlobe.delete(meta.clusterKey);
            spiderExpandKey = null;
          } else {
            // one expanded stack at a time keeps the globe readable
            expandedGlobe.clear();
            expandedGlobe.add(meta.clusterKey);
            spiderExpandKey = meta.clusterKey;
          }
          updateMarkers(lastFeatureList, lastFocusId);
          aimAt(meta.lat, meta.lon, true);
          return;
        }

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
        setPickedGlobeNodeRef.current(null);
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
        quakeGroup.add(pickRing);
      }

      const onDown = (x: number, y: number) => {
        rotating = true;
        clearSpinResume();
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
        // Drag ended — resume auto-spin if Spin is still preferred
        if (spinDesiredRef.current) scheduleSpinResume(SPIN_RESUME_AFTER_DRAG_MS, "after drag");
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
          onMove(e.clientX, e.clientY);
          hideHoverTip();
          clearHoverHighlight();
          return;
        }
        // Hover tooltips when idle — quick context without click
        const over = el.getBoundingClientRect();
        const inside =
          e.clientX >= over.left &&
          e.clientX <= over.right &&
          e.clientY >= over.top &&
          e.clientY <= over.bottom;
        if (!inside) {
          hideHoverTip();
          return;
        }
        const meta = pickAt(e.clientX, e.clientY);
        if (meta) {
          showHoverTip(meta, e.clientX, e.clientY);
          const hit = pickList.find((p) => p.meta.id === meta.id);
          if (hit) setHoverHighlight(hit.mesh);
        } else {
          hideHoverTip();
          clearHoverHighlight();
        }
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
            spherical.radius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, pinchStartRadius * scale));
            applyCam();
            scheduleRecluster();
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
        spherical.radius = Math.max(RADIUS_MIN, Math.min(RADIUS_MAX, spherical.radius + e.deltaY * 0.0025));
        applyCam();
        scheduleRecluster();
      };
      el.addEventListener("wheel", wheel, { passive: false });

      const onKey = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          tiltBy(-0.08);
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          tiltBy(0.08);
        } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          e.preventDefault();
          clearSpinResume();
          autoRef.current = false;
          spherical.theta += 0.12;
          applyCam();
          if (spinDesiredRef.current) scheduleSpinResume(SPIN_RESUME_AFTER_DRAG_MS, "after pan");
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          e.preventDefault();
          clearSpinResume();
          autoRef.current = false;
          spherical.theta -= 0.12;
          applyCam();
          if (spinDesiredRef.current) scheduleSpinResume(SPIN_RESUME_AFTER_DRAG_MS, "after pan");
        } else if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          tiltPreset("equator");
        } else if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          tiltPreset("north");
        } else if (e.key === "o" || e.key === "O") {
          e.preventDefault();
          tiltPreset("oblique");
        } else if (e.key === "r" || e.key === "R") {
          recenterRef.current?.();
        }
      };
      window.addEventListener("keydown", onKey);

      let animId = 0;
      let active = true;
      let blink = 0;
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
      let lastFrameT = 0;
      const minFrameMs = 1000 / Math.max(15, Q.maxFps);
      const animate = (now = performance.now()) => {
        if (!active) return;
        animId = requestAnimationFrame(animate);
        if (typeof document !== "undefined" && document.hidden) return;
        if (now - lastFrameT < minFrameMs) return;
        lastFrameT = now;
        profiler.beginFrame(now);

        // Spiderfy lerp — pins fan from badge center (~220ms ease-out, staggered)
        if (spiderAnims.length) {
          const nowS = performance.now();
          const next: SpiderAnim[] = [];
          for (const a of spiderAnims) {
            const raw = (nowS - a.t0) / a.dur;
            if (raw < 0) {
              // staggered delay — hold at origin
              a.mesh.position.copy(a.from);
              next.push(a);
              continue;
            }
            const t = Math.min(1, raw);
            const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
            a.mesh.position.lerpVectors(a.from, a.to, e);
            a.mesh.lookAt(0, 0, 0);
            a.mesh.scale.setScalar(0.35 + 0.65 * e);
            if (a.legPos && a.legGeo) {
              a.legPos[3] = a.from.x + (a.to.x - a.from.x) * e;
              a.legPos[4] = a.from.y + (a.to.y - a.from.y) * e;
              a.legPos[5] = a.from.z + (a.to.z - a.from.z) * e;
              const attr = a.legGeo.getAttribute("position");
              if (attr) attr.needsUpdate = true;
            }
            if (t < 1) next.push(a);
            else {
              a.mesh.position.copy(a.to);
              a.mesh.scale.setScalar(1);
            }
          }
          spiderAnims = next;
        }

        if (aimAnim) {
          const t = Math.min(1, (performance.now() - aimAnim.t0) / aimAnim.dur);
          // Ease-out cubic — quick start, soft settle
          const e = 1 - Math.pow(1 - t, 3);
          spherical.theta = aimAnim.from.theta + (aimAnim.to.theta - aimAnim.from.theta) * e;
          spherical.phi = aimAnim.from.phi + (aimAnim.to.phi - aimAnim.from.phi) * e;
          spherical.radius = aimAnim.from.radius + (aimAnim.to.radius - aimAnim.from.radius) * e;
          applyCam();
          if (t >= 1) {
            const resume = aimAnim.resumeSpin;
            const hold = aimAnim.holdMs ?? FLY_TO_HOLD_MS;
            aimAnim = null;
            if (resume) scheduleSpinResume(hold, "after focus");
          }
        } else if (autoRef.current && !rotating && spiderAnims.length === 0) {
          // Prograde Earth: west→east. Matches three.js OrbitControls autoRotate
          // (theta decreases) and Dutchsinse Public Seismic Globe. Prior += was retrograde.
          spherical.theta -= 0.0022 * spinSpdRef.current;
          applyCam();
        }

        const busy =
          !!aimAnim ||
          spiderAnims.length > 0 ||
          rotating ||
          (autoRef.current && !rotating);
        if (busy || neonMats.length) {
          blink += 0.045;
          const bo = 0.42 + 0.58 * Math.abs(Math.sin(blink));
          for (const n of neonMats) {
            n.mat.opacity = n.base * bo;
          }
          needsRender = true;
        }

        if (!needsRender && !busy) {
          // Idle hold — skip GPU submit (still throttled rAF)
          profiler.beginFrame(now);
          profiler.endFrame(null);
          return;
        }
        needsRender = false;

        // CSS2D: throttled backface cull (display:none), then one DOM pass
        if (css2d.size > 0) {
          css2d.updateFacing(
            camera.position.x,
            camera.position.y,
            camera.position.z,
            now,
            {
              force: busy,
              intervalMs: Q.id === "mobile" ? 100 : 72,
            },
          );
        }

        renderer.render(scene, camera);
        if (css2d.size > 0) {
          labelRenderer.render(scene, camera);
        }
        profiler.endFrame(renderer);
      };
      animate();

      const onResize = () => {
        if (!container) return;
        const nw = Math.max(container.clientWidth, 280);
        const nh = Math.max(container.clientHeight, 320);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
        labelRenderer.setSize(nw, nh);
        // Fullscreen / shell chrome changes aspect — keep Earth fully on-screen
        const nextHome = homeRadiusFor(nw / Math.max(1, nh));
        const wasNearHome = Math.abs(spherical.radius - HOME_RADIUS) < 0.45;
        HOME_RADIUS = nextHome;
        if (wasNearHome || spherical.radius < nextHome * 0.92) {
          spherical.radius = nextHome;
          applyCam();
        }
      };
      window.addEventListener("resize", onResize);
      const ro =
        typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => onResize()) : null;
      ro?.observe(container);

      const hint = document.createElement("div");
      hint.className =
        "ww-globe-bottom-hint pointer-events-none absolute z-10 hidden";
      hint.textContent = ""; // tips live in Help guide — less map clutter
      container.style.position = "relative";
      container.appendChild(hint);

      const legend = document.createElement("div");
      legend.className =
        "ww-globe-legend pointer-events-none absolute bottom-2 left-2 z-10 hidden rounded border border-border/80 bg-surface/80 px-1.5 py-0.5 text-[0.5rem] text-muted backdrop-blur sm:block sm:text-[0.55rem]";
      legend.innerHTML =
        '<span style="color:#ff8c00">●</span> EQ &nbsp; <span style="opacity:.85">n</span> cluster &nbsp; <span style="color:#fbbf24">●</span> node &nbsp; <span style="color:#fb923c">●</span> volc';
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
        try {
          clearSpinResume();
        } catch {
          /* ignore */
        }
        try {
          unsubPerf();
          if (perfLogTimer) clearInterval(perfLogTimer);
          profiler.reset();
        } catch {
          /* ignore */
        }
        try {
          for (const m of pooledMats) m.dispose();
          matPool.clear();
          for (const g of [geoStem, geoFoot, geoHead, geoHit, geoBadge, geoBadgeRing, hexGeo]) {
            try { g.dispose(); } catch { /* */ }
          }
        } catch { /* */ }
        try {
          clearHoverHighlight();
          hoverTip.remove();
        } catch {
          /* ignore */
        }
        disposeGroup(quakeGroup);
        disposeGroup(pinGroup);
        disposeGroup(ambientGroup);
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
        css2d.dispose();
        clearSpriteCaches();
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
    if (mapView !== "3d" || !updateRef.current) return;
    // Same catalog pipeline as 2D: mag floor + hard time-window clip
    let list = filteredEq(eq?.features, minMag, maxMag);
    list = filterFeaturesByTimeWindow(list, timeWindow);
    // Mirror 2D: significant filter + educational replay cursor
    if (overlays.significant) {
      list = list.filter((f) => (f.properties.mag ?? 0) >= 6);
    }
    if (replayActive && replayCursorMs != null) {
      list = list.filter((f) => {
        const t = f.properties.time;
        return typeof t === "number" && t <= replayCursorMs;
      });
    }
    updateRef.current(list, focusNodeId);
  }, [
    eq,
    minMag,
    maxMag,
    mapView,
    focusNodeId,
    globeStemScale,
    globeMarkerScale,
    globeMarkerOpacity,
    overlays.significant,
    overlays.nodes,
    replayActive,
    replayCursorMs,
    timeWindow,
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
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-lg border border-border bg-[#0b1220] sm:min-h-[280px]">
      <div ref={containerRef} className="h-full min-h-0 w-full" />
      <div className="pointer-events-none absolute right-2 top-12 z-20 sm:top-14">
        <AuroraOfficialPanel />
      </div>

      <div className="pointer-events-auto absolute left-2 top-2 z-20 flex flex-col items-start gap-1">
        <button
          type="button"
          className="rounded-md border border-border/70 bg-surface/90 px-1.5 py-0.5 text-left text-[0.5rem] font-semibold uppercase tracking-wider shadow backdrop-blur sm:text-[0.55rem]"
          style={{
            color: perfSample ? healthColor(perfSample.health) : undefined,
          }}
          title="WebGL performance — tap for profile"
          onClick={() => {
            setPerfOpen((v) => {
              const next = !v;
              if (next) {
                void probeWebGpuAvailable().then((r) =>
                  setWebgpuNote(r.available ? r.detail : r.detail),
                );
              }
              return next;
            });
          }}
          aria-expanded={perfOpen}
        >
          {formatPerfChip(perfSample, qualityLabel || "3D")}
        </button>
        {perfOpen && (
          <div className="ww-gl-perf max-w-[min(94vw,18rem)] rounded-lg border border-border bg-surface/95 p-2 text-[0.6rem] text-muted shadow-lg backdrop-blur">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wider text-fg">WebGL</span>
              <button
                type="button"
                className="text-[0.55rem] text-dim hover:text-fg"
                onClick={() => setPerfOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mb-1.5 flex flex-wrap gap-0.5">
              {(
                [
                  ["live", "Live"],
                  ["checklist", "Checklist"],
                  ["webgpu", "WebGPU"],
                ] as const
              ).map(([id, lab]) => (
                <button
                  key={id}
                  type="button"
                  className={`rounded px-1.5 py-0.5 text-[0.55rem] font-semibold ${
                    optTab === id ? "bg-primary/20 text-primary" : "text-dim hover:text-fg"
                  }`}
                  onClick={() => setOptTab(id)}
                >
                  {lab}
                </button>
              ))}
            </div>

            {optTab === "live" && perfSample && (
              <>
                <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono tabular-nums">
                  <dt className="text-dim">FPS</dt>
                  <dd className="text-fg">
                    {perfSample.fpsSmooth.toFixed(0)}/{perfSample.targetFps}{" "}
                    <span className="text-dim">(1% {perfSample.fps1pctLow.toFixed(0)})</span>
                  </dd>
                  <dt className="text-dim">Work</dt>
                  <dd className="text-fg">{perfSample.frameMsSmooth.toFixed(1)} ms</dd>
                  <dt className="text-dim">Draws</dt>
                  <dd className="text-fg">{perfSample.drawCalls}</dd>
                  <dt className="text-dim">Tris</dt>
                  <dd className="text-fg">{perfSample.triangles.toLocaleString()}</dd>
                  <dt className="text-dim">Geom/Tex</dt>
                  <dd className="text-fg">
                    {perfSample.geometries}/{perfSample.textures}
                  </dd>
                  {perfSample.jsHeapMb != null && (
                    <>
                      <dt className="text-dim">JS heap</dt>
                      <dd className="text-fg">{perfSample.jsHeapMb.toFixed(1)} MB</dd>
                    </>
                  )}
                  <dt className="text-dim">Health</dt>
                  <dd
                    style={{ color: healthColor(perfSample.health) }}
                    className="font-semibold uppercase"
                  >
                    {perfSample.health}
                  </dd>
                </dl>
                <p className="mt-1.5 text-[0.55rem] leading-snug text-dim">{perfSample.tip}</p>
              </>
            )}
            {optTab === "live" && !perfSample && (
              <p className="text-[0.55rem] text-dim">Sampling…</p>
            )}

            {optTab === "checklist" && (
              <div className="max-h-[40vh] space-y-1 overflow-y-auto overscroll-contain">
                <p className="text-[0.5rem] text-dim">{checklistSummary()}</p>
                {WEBGL_CHECKLIST.map((item) => (
                  <div
                    key={item.id}
                    className="rounded border border-border/70 bg-bg/50 px-1.5 py-1"
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className={
                          item.status === "done"
                            ? "text-ok"
                            : item.status === "partial"
                              ? "text-warn"
                              : "text-dim"
                        }
                      >
                        {item.status === "done" ? "✓" : item.status === "partial" ? "◐" : "○"}
                      </span>
                      <span className="font-semibold text-fg">{item.label}</span>
                    </div>
                    <p className="mt-0.5 text-[0.5rem] leading-snug text-dim">{item.detail}</p>
                  </div>
                ))}
              </div>
            )}

            {optTab === "webgpu" && (
              <div className="space-y-1 text-[0.55rem] leading-snug">
                <p className="font-semibold text-fg">{WEBGPU_MIGRATION.title}</p>
                <p className="text-dim">Probe: {webgpuNote}</p>
                <ol className="list-decimal space-y-0.5 pl-3.5 text-dim">
                  {WEBGPU_MIGRATION.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            )}

            <p className="mt-1.5 text-[0.5rem] text-dim/80">
              wolfwatch_gl_perf_log=1 → console 5s
            </p>
          </div>
        )}
      </div>
      {bootError && (
        <div className="pointer-events-none absolute inset-x-2 top-10 z-20 rounded-md border border-danger/40 bg-surface/95 px-2 py-1.5 text-center text-[0.65rem] text-danger sm:inset-x-auto sm:left-3 sm:right-auto sm:text-left">
          {bootError}
        </div>
      )}

      {pickedEvent && (
        <div className="pointer-events-none absolute left-3 top-12 z-20 max-w-[min(300px,78vw)]">
          <div className="pointer-events-auto rounded-md border border-border bg-surface/95 px-2.5 py-2 text-[0.72rem] shadow-lg">
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
            Assessment
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
        </div>
      )}


      {pickedGlobeNode && !pickedEvent && (
        <div className="pointer-events-none absolute left-3 top-12 z-20 max-w-[min(320px,82vw)]">
          <div className="pointer-events-auto rounded-md border border-border bg-surface/95 px-2.5 py-2 text-[0.72rem] shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-fg">{pickedGlobeNode.name}</div>
                <span className="mt-1 inline-block rounded-full border border-border bg-elevated px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-gold">
                  {nodeMarkChip(pickedGlobeNode)}
                </span>
                <p className="mt-1 text-[0.62rem] text-muted">{nodeRoleLine(pickedGlobeNode)}</p>
              </div>
              <button
                type="button"
                className="ww-btn ww-btn--ghost px-1.5 text-[0.6rem]"
                onClick={() => setPickedGlobeNode(null)}
                aria-label="Clear node"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 rounded-md border border-border/80 bg-bg/80 px-2 py-1.5 text-[0.62rem] leading-snug text-dim">
              <div className="mb-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-muted">
                Why marked
              </div>
              {nodeWhyLine(pickedGlobeNode)}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <ShareFocusButton
                target="node"
                nodeId={pickedGlobeNode.id}
                lat={pickedGlobeNode.center?.[0]}
                lon={pickedGlobeNode.center?.[1]}
                compact
                label="Share zone"
              />
              <button
                type="button"
                className="ww-btn text-[0.62rem] font-semibold"
                onClick={() => {
                  if (focusNodeId === pickedGlobeNode.id) {
                    useObservatory.getState().exitToHomeView();
                    setPickedGlobeNode(null);
                  } else {
                    setFocusNode(pickedGlobeNode.id);
                  }
                }}
              >
                {focusNodeId === pickedGlobeNode.id ? "Home view" : "Focus zone"}
              </button>
              {pickedGlobeNode.monitorUrl && (
                <a
                  href={pickedGlobeNode.monitorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ww-btn text-[0.62rem]"
                >
                  {pickedGlobeNode.kind === "volcano" ? "Profile →" : "Swarm board →"}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edge dock — keeps chrome off the Earth */}
      {spinResumeHint && (
        <div className="pointer-events-none absolute bottom-[5.5rem] right-2 z-30 max-w-[11rem] rounded-md border border-primary/30 bg-surface/90 px-2 py-1 text-[0.55rem] font-semibold text-primary shadow backdrop-blur sm:bottom-[7.5rem] sm:right-3 sm:max-w-[14rem] sm:text-[0.6rem]">
          {spinResumeHint}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-[max(0.5rem,env(safe-area-inset-bottom))] right-[max(0.35rem,env(safe-area-inset-right))] z-30 sm:bottom-4 sm:right-3">
        <MapChromeDock
          className="items-end"
          canPriorView={canPrior}
          onPriorView={() => priorViewRef.current?.()}
          onHomeView={() => recenterRef.current?.()}
          onTiltUp={() => tiltByRef.current?.(-0.1)}
          onTiltDown={() => tiltByRef.current?.(0.1)}
          onTiltPreset={(k) => tiltPresetRef.current?.(k)}
        />
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

function makeProceduralEarth(THREE: typeof import("three")) {
  // Higher-res sketch continents — only shown until blue-marble texture loads
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 1024;
  const ctx = c.getContext("2d")!;
  const W = 2048;
  const H = 1024;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a4a78");
  g.addColorStop(0.45, "#0c3560");
  g.addColorStop(0.55, "#0a2f58");
  g.addColorStop(1, "#1a4a78");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const iceN = ctx.createLinearGradient(0, 0, 0, 120);
  iceN.addColorStop(0, "rgba(226,232,240,0.7)");
  iceN.addColorStop(1, "rgba(226,232,240,0)");
  ctx.fillStyle = iceN;
  ctx.fillRect(0, 0, W, 120);
  const iceS = ctx.createLinearGradient(0, H, 0, H - 120);
  iceS.addColorStop(0, "rgba(226,232,240,0.65)");
  iceS.addColorStop(1, "rgba(226,232,240,0)");
  ctx.fillStyle = iceS;
  ctx.fillRect(0, H - 120, W, 120);

  const proj = (lon: number, lat: number): [number, number] => [
    ((lon + 180) / 360) * W,
    ((90 - lat) / 180) * H,
  ];

  const fillPoly = (pts: [number, number][], fill: string) => {
    if (pts.length < 3) return;
    ctx.beginPath();
    const [x0, y0] = proj(pts[0]![0], pts[0]![1]);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = proj(pts[i]![0], pts[i]![1]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  const land: [number, number][][] = [
    [
      [-18, 35], [10, 37], [32, 31], [43, 12], [51, 12], [43, -5], [40, -25],
      [32, -35], [18, -35], [12, -18], [8, 5], [-5, 5], [-17, 15], [-18, 28],
    ],
    [
      [-10, 36], [-9, 44], [-5, 48], [0, 51], [8, 55], [20, 55], [30, 50],
      [40, 45], [28, 41], [20, 40], [12, 38], [5, 43], [-5, 43], [-10, 38],
    ],
    [
      [40, 45], [60, 45], [80, 50], [100, 55], [120, 50], [140, 50], [145, 42],
      [130, 35], [120, 25], [100, 20], [90, 22], [70, 25], [60, 30], [50, 35], [40, 40],
    ],
    [[68, 25], [78, 28], [88, 22], [80, 8], [72, 12], [68, 22]],
    [[95, 20], [110, 20], [120, 10], [130, 5], [120, -5], [110, 0], [100, 5], [95, 12]],
    [[113, -12], [135, -12], [153, -25], [150, -38], [115, -35], [113, -22]],
    [
      [-168, 65], [-140, 70], [-100, 72], [-60, 60], [-55, 50], [-70, 45],
      [-80, 30], [-100, 20], [-110, 25], [-125, 40], [-130, 55], [-165, 60],
    ],
    [
      [-80, 12], [-60, 10], [-35, -5], [-35, -25], [-55, -55], [-70, -55],
      [-75, -40], [-80, -20], [-82, 0],
    ],
    [[-55, 60], [-40, 65], [-20, 75], [-45, 83], [-60, 75], [-60, 65]],
  ];

  for (const poly of land) {
    fillPoly(poly, "#2d6a4f");
  }
  fillPoly(
    [[-10, 30], [10, 32], [30, 28], [25, 15], [0, 15], [-10, 22]],
    "rgba(180, 150, 90, 0.22)",
  );

  ctx.strokeStyle = "rgba(148,163,184,0.12)";
  ctx.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = proj(0, lat)[1];
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const x = proj(lon, 0)[0];
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}
