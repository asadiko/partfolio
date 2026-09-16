import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';

import land from '@/assets/land-110m.json';

import { Tweens } from './tween';

export type GlobeTheme = 'light' | 'dark';

export interface GlobeCity {
  id: string;
  lat: number;
  lon: number;
  major: boolean;
}

export interface LabelPosition {
  id: string;
  /** Canvas-relative pixel position of the marker. */
  x: number;
  y: number;
  /** False when the marker is on the far side of the globe. */
  visible: boolean;
}

export interface GlobeOptions {
  theme: GlobeTheme;
  cities: GlobeCity[];
  /** Ordered city ids forming the main route. */
  route: string[];
  reducedMotion: boolean;
  /** Called every frame with where each city marker is on screen, for DOM labels. */
  onProject?: (labels: LabelPosition[]) => void;
}

export interface Globe {
  /** Turns the globe to face a city and marks the route up to `reachedIndex` as travelled. */
  focus(cityId: string, reachedIndex: number): void;
  setTheme(theme: GlobeTheme): void;
  dispose(): void;
}

const RADIUS = 1;
const palette: Record<
  GlobeTheme,
  { ocean: string; land: string; grid: string; glow: number; marker: number }
> = {
  light: {
    ocean: '#d9e3e8',
    land: '#a9b8b3',
    grid: 'rgba(0,0,0,0.06)',
    glow: 0x8fd3c7,
    marker: 0x0f6e63,
  },
  dark: {
    ocean: '#141c24',
    land: '#3b4b53',
    grid: 'rgba(255,255,255,0.05)',
    glow: 0x5fc7b6,
    marker: 0x5fc7b6,
  },
};

function toVector(lat: number, lon: number, radius = RADIUS): Vector3 {
  const phi = MathUtils.degToRad(90 - lat);
  const theta = MathUtils.degToRad(lon + 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function paintEarth(theme: GlobeTheme): CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const p = palette[theme];
  ctx.fillStyle = p.ocean;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 15) {
    const x = ((lon + 180) / 360) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = ((90 - lat) / 180) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = p.land;
  for (const ring of land.rings as [number, number][][]) {
    ctx.beginPath();
    ring.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * w;
      const y = ((90 - lat) / 180) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Wraps an angle delta into (-π, π] so a tween never spins the long way round. */
export const shortestTurn = (delta: number) =>
  MathUtils.euclideanModulo(delta + Math.PI, Math.PI * 2) - Math.PI;

function arc(from: Vector3, to: Vector3, lift: number): CatmullRomCurve3 {
  const points: Vector3[] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = new Vector3().lerpVectors(from, to, t).normalize();
    p.multiplyScalar(RADIUS + Math.sin(Math.PI * t) * lift);
    points.push(p);
  }
  return new CatmullRomCurve3(points);
}

export function createGlobe(canvas: HTMLCanvasElement, options: GlobeOptions): Globe {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 0.3, 4.1);
  camera.lookAt(0, 0, 0);
  const tweens = new Tweens();
  const globe = new Group();
  scene.add(globe);

  let theme = options.theme;
  const earthMaterial = new MeshStandardMaterial({ map: paintEarth(theme), roughness: 0.9 });
  const earth = new Mesh(new SphereGeometry(RADIUS, 96, 64), earthMaterial);
  globe.add(earth);

  const glowMaterial = new MeshBasicMaterial({
    color: palette[theme].glow,
    transparent: true,
    opacity: 0.18,
    side: BackSide,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new Mesh(new SphereGeometry(RADIUS * 1.06, 48, 32), glowMaterial));

  scene.add(new AmbientLight(0xffffff, 1.4));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 1.5, 3);
  scene.add(sun);

  const markerMaterial = new MeshBasicMaterial({ color: palette[theme].marker });
  const faintMaterial = new MeshBasicMaterial({ color: 0x8f8c84 });
  const markers = new Map<string, Mesh>();
  for (const city of options.cities) {
    const m = new Mesh(new SphereGeometry(city.major ? 0.022 : 0.014, 16, 12), faintMaterial);
    m.position.copy(toVector(city.lat, city.lon, RADIUS + 0.005));
    globe.add(m);
    markers.set(city.id, m);
  }
  const pulse = new Mesh(
    new SphereGeometry(0.05, 16, 12),
    new MeshBasicMaterial({ color: palette[theme].marker, transparent: true, opacity: 0.35 }),
  );
  globe.add(pulse);

  const byId = new Map(options.cities.map((c) => [c.id, c]));
  const segments: Mesh[] = [];
  options.route.slice(0, -1).forEach((fromId, i) => {
    const from = byId.get(fromId);
    const to = byId.get(options.route[i + 1] ?? '');
    if (!from || !to) return;
    const curve = arc(toVector(from.lat, from.lon), toVector(to.lat, to.lon), 0.12);
    const seg = new Mesh(new TubeGeometry(curve, 48, 0.006, 6), faintMaterial.clone());
    globe.add(seg);
    segments.push(seg);
  });

  const rotation = { x: 0, y: 0 };
  let autoSpin = !options.reducedMotion;
  let paused = false;
  let frame = 0;
  let last = performance.now();
  let clock = 0;
  let dragging: { x: number; y: number; rx: number; ry: number } | null = null;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  const render = (now: number) => {
    if (paused) return;
    frame = requestAnimationFrame(render);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    tweens.step(dt);
    if (autoSpin && !dragging) rotation.y += dt * 0.08;
    globe.rotation.set(rotation.x, rotation.y, 0);
    const s = 1 + Math.sin(clock * 3) * 0.25;
    pulse.scale.setScalar(options.reducedMotion ? 1 : s);
    renderer.render(scene, camera);
    options.onProject?.(project());
  };

  const world = new Vector3();
  const toCamera = new Vector3();
  function project(): LabelPosition[] {
    const { clientWidth: w, clientHeight: h } = canvas;
    return [...markers].map(([id, marker]) => {
      marker.getWorldPosition(world);
      toCamera.copy(camera.position).sub(world);
      const visible = world.clone().normalize().dot(toCamera.normalize()) > 0.12;
      const ndc = world.clone().project(camera);
      return { id, x: ((ndc.x + 1) / 2) * w, y: ((1 - ndc.y) / 2) * h, visible };
    });
  }

  const onDown = (e: PointerEvent) => {
    dragging = { x: e.clientX, y: e.clientY, rx: rotation.x, ry: rotation.y };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    rotation.y = dragging.ry + (e.clientX - dragging.x) * 0.006;
    rotation.x = MathUtils.clamp(dragging.rx + (e.clientY - dragging.y) * 0.006, -1.2, 1.2);
  };
  const onUp = (e: PointerEvent) => {
    dragging = null;
    canvas.releasePointerCapture(e.pointerId);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  resize();
  frame = requestAnimationFrame(render);

  return {
    focus(cityId, reachedIndex) {
      const city = byId.get(cityId);
      if (!city) return;
      autoSpin = false;
      // Rotate the globe so the city sits at the front, slightly above centre (see toVector for the frame).
      const targetY = -MathUtils.degToRad(city.lon) - Math.PI / 2;
      const targetX = MathUtils.degToRad(city.lat) - 0.3;
      const fromX = rotation.x;
      const fromY = rotation.y;
      const dy = shortestTurn(targetY - fromY);
      void tweens.run(options.reducedMotion ? 0 : 1.1, (t) => {
        rotation.x = MathUtils.lerp(fromX, targetX, t);
        rotation.y = fromY + dy * t;
      });
      pulse.position.copy(toVector(city.lat, city.lon, RADIUS + 0.01));
      markers.forEach((m, id) => {
        const c = byId.get(id);
        const visited = c?.major ? options.route.indexOf(id) <= reachedIndex : id === cityId;
        m.material = visited || id === cityId ? markerMaterial : faintMaterial;
      });
      segments.forEach((seg, i) => {
        (seg.material as MeshBasicMaterial).color = new Color(
          i < reachedIndex ? palette[theme].marker : 0x8f8c84,
        );
      });
    },
    setTheme(next) {
      theme = next;
      earthMaterial.map?.dispose();
      earthMaterial.map = paintEarth(theme);
      earthMaterial.needsUpdate = true;
      glowMaterial.color = new Color(palette[theme].glow);
      markerMaterial.color = new Color(palette[theme].marker);
      (pulse.material as MeshBasicMaterial).color = new Color(palette[theme].marker);
    },
    dispose() {
      paused = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      scene.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      earthMaterial.map?.dispose();
      renderer.dispose();
    },
  };
}
