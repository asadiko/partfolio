import {
  ACESFilmicToneMapping,
  Color,
  MathUtils,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { buildImac } from './imac';
import { buildOffice } from './office';
import type { Theme } from './office';
import { Screen } from './screen';
import { Tweens } from './tween';

export type { Theme };

export interface RoomOptions {
  theme: Theme;
  onScreenClick: () => void;
  /** Called once the first frame is on screen — the moment to fade the canvas in. */
  onReady?: () => void;
}

export interface Room {
  screen: Screen;
  focusScreen(): Promise<void>;
  unfocus(): Promise<void>;
  setTheme(theme: Theme): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}

const FOV = 36;
const MAX_DPR = 1.75;
const OVERVIEW = new Vector3(1.0, 0.66, 1.72);
const OVERVIEW_TARGET = new Vector3(-0.05, 0.27, 0.02);
const background: Record<Theme, number> = { light: 0xd9d3c8, dark: 0x15171a };

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function createRoom(canvas: HTMLCanvasElement, options: RoomOptions): Room {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new PerspectiveCamera(FOV, 1, 0.05, 30);
  const tweens = new Tweens();
  const screen = new Screen();
  const imac = buildImac(screen.texture);
  scene.add(imac.group);
  const office = buildOffice(options.theme);
  scene.add(office.group);

  const glow = new PointLight(0x9fd8ff, 0.4, 1, 2);
  glow.position.copy(imac.screenCenter).add(new Vector3(0, 0, 0.1));
  scene.add(glow);

  const overview = { position: OVERVIEW.clone(), target: OVERVIEW_TARGET.clone() };
  const framing = { position: new Vector3(), target: imac.screenCenter.clone() };
  const camState = { focus: 0 };
  const pointer = new Vector2();
  const raycaster = new Raycaster();
  let hovering = false;
  let paused = false;
  let frame = 0;
  let last = performance.now();
  let clock = 0;
  let rendered = false;

  function applyTheme(theme: Theme) {
    office.setTheme(theme);
    scene.background = new Color(background[theme]);
    scene.environmentIntensity = theme === 'dark' ? 0.35 : 0.9;
    renderer.toneMappingExposure = theme === 'dark' ? 0.9 : 1.0;
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Portrait screens stand further back to keep the whole desk in frame.
    const back = camera.aspect < 1 ? 1.5 : camera.aspect < 1.4 ? 1.15 : 1;
    overview.position.copy(OVERVIEW).multiplyScalar(back);
    const halfFov = MathUtils.degToRad(FOV / 2);
    const distance = Math.max(
      imac.screenSize.height / 2 / Math.tan(halfFov),
      imac.screenSize.width / 2 / (Math.tan(halfFov) * camera.aspect),
    );
    framing.position.copy(imac.screenCenter).add(new Vector3(0, 0, distance * 1.04));
    camera.updateProjectionMatrix();
  }

  function render(now: number) {
    if (paused) return;
    frame = requestAnimationFrame(render);
    // Clamp generously: slow devices still get time-accurate tweens rather than slow-motion ones.
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    clock += dt;
    tweens.step(dt);
    screen.tick(dt);

    const drift = 1 - camState.focus;
    const position = new Vector3().lerpVectors(overview.position, framing.position, camState.focus);
    const target = new Vector3().lerpVectors(overview.target, framing.target, camState.focus);
    position.x += (Math.sin(clock * 0.2) * 0.04 + pointer.x * 0.06) * drift;
    position.y += (Math.cos(clock * 0.17) * 0.015 + pointer.y * 0.03) * drift;
    camera.position.copy(position);
    camera.lookAt(target);
    glow.intensity = 0.3 + (hovering ? 0.5 : 0) + Math.sin(clock * 2) * 0.05;
    renderer.render(scene, camera);
    if (!rendered) {
      rendered = true;
      options.onReady?.();
    }
  }

  function updateHover(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    hovering = raycaster.intersectObject(imac.screen).length > 0;
    canvas.style.cursor = hovering ? 'pointer' : 'default';
  }

  let downAt: { x: number; y: number } | null = null;
  const onPointerDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
  const onPointerUp = (e: PointerEvent) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    updateHover(e);
    if (moved < 8 && hovering && camState.focus === 0) options.onScreenClick();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  canvas.addEventListener('pointermove', updateHover);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  applyTheme(options.theme);
  resize();
  frame = requestAnimationFrame(render);

  const animateFocus = (to: number) => {
    const from = camState.focus;
    return tweens.run(1.4, (t) => (camState.focus = MathUtils.lerp(from, to, t)));
  };

  return {
    screen,
    focusScreen: () => animateFocus(1),
    unfocus: () => animateFocus(0),
    setTheme: applyTheme,
    pause() {
      paused = true;
      cancelAnimationFrame(frame);
    },
    resume() {
      if (!paused) return;
      paused = false;
      last = performance.now();
      frame = requestAnimationFrame(render);
    },
    dispose() {
      paused = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', updateHover);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      scene.traverse((obj) => {
        if (obj instanceof Mesh) {
          obj.geometry.dispose();
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
        }
      });
      scene.environment?.dispose();
      screen.texture.dispose();
      renderer.dispose();
    },
  };
}
