import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

import { buildImac } from './imac';
import { Screen } from './screen';
import { Tweens } from './tween';

export type Theme = 'light' | 'dark';

export interface RoomOptions {
  theme: Theme;
  onScreenClick: () => void;
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

const FOV = 34;
const MAX_DPR = 1.5;
const palette: Record<Theme, { wall: number; desk: number; hemi: number; exposure: number }> = {
  light: { wall: 0xe7e2d9, desk: 0x9b7b5b, hemi: 0.75, exposure: 1.05 },
  dark: { wall: 0x1a1b1e, desk: 0x5a4636, hemi: 0.35, exposure: 0.85 },
};

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
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.05, 20);
  const tweens = new Tweens();
  const screen = new Screen();
  const imac = buildImac(screen.texture);
  scene.add(imac.group);

  const wallMaterial = new MeshStandardMaterial({ roughness: 1 });
  const wall = new Mesh(new PlaneGeometry(8, 4), wallMaterial);
  wall.position.set(0, 1.5, -0.75);
  wall.receiveShadow = true;
  scene.add(wall);

  const deskMaterial = new MeshStandardMaterial({ roughness: 0.85 });
  const desk = new Mesh(new BoxGeometry(3, 0.04, 1.4), deskMaterial);
  desk.position.set(0, -0.02, 0.1);
  desk.receiveShadow = true;
  scene.add(desk);

  const mug = new Mesh(
    new CylinderGeometry(0.038, 0.034, 0.09, 32),
    new MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.5 }),
  );
  mug.position.set(-0.44, 0.045, -0.04);
  mug.castShadow = true;
  scene.add(mug);
  const mugHandle = new Mesh(new TorusGeometry(0.022, 0.006, 8, 20, Math.PI), mug.material);
  mugHandle.position.set(-0.48, 0.045, -0.04);
  mugHandle.rotation.set(0, 0, Math.PI / 2);
  scene.add(mugHandle);

  const hemi = new HemisphereLight(0xffffff, 0x6b5a48, 1);
  scene.add(hemi);
  const key = new DirectionalLight(0xfff4e6, 2.4);
  key.position.set(1.4, 2.2, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 6;
  key.shadow.camera.left = key.shadow.camera.bottom = -1;
  key.shadow.camera.right = key.shadow.camera.top = 1;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new DirectionalLight(0xbfe3ff, 0.8);
  rim.position.set(-1.5, 1.2, -1);
  scene.add(rim);
  const glow = new PointLight(0x9fd8ff, 0.5, 1.2, 2);
  glow.position.copy(imac.screenCenter).add(new Vector3(0, 0, 0.12));
  scene.add(glow);

  const OVERVIEW = new Vector3(0.8, 0.56, 1.3);
  const overview = { position: OVERVIEW.clone(), target: new Vector3(0, 0.17, 0.08) };
  const framing = { position: new Vector3(), target: imac.screenCenter.clone() };
  const camState = {
    position: overview.position.clone(),
    target: overview.target.clone(),
    focus: 0,
  };
  const pointer = new Vector2();
  const raycaster = new Raycaster();
  let hovering = false;
  let paused = false;
  let frame = 0;
  let last = performance.now();
  let clock = 0;

  function applyTheme(theme: Theme) {
    const p = palette[theme];
    wallMaterial.color = new Color(p.wall);
    deskMaterial.color = new Color(p.desk);
    hemi.intensity = p.hemi;
    renderer.toneMappingExposure = p.exposure;
    scene.background = new Color(p.wall);
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Portrait screens need to stand further back to keep the whole iMac in frame.
    const back = camera.aspect < 1 ? 1.45 : camera.aspect < 1.4 ? 1.15 : 1;
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
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    tweens.step(dt);
    screen.tick(dt);

    const drift = 1 - camState.focus;
    const orbit = Math.sin(clock * 0.22) * 0.05 * drift;
    const parallaxX = pointer.x * 0.05 * drift;
    const parallaxY = pointer.y * 0.03 * drift;
    const position = new Vector3().lerpVectors(overview.position, framing.position, camState.focus);
    const target = new Vector3().lerpVectors(overview.target, framing.target, camState.focus);
    position.x += orbit + parallaxX;
    position.y += parallaxY;
    camera.position.copy(position);
    camera.lookAt(target);
    renderer.render(scene, camera);
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

  const animateFocus = (to: number) =>
    tweens.run(1.3, (t) => (camState.focus = MathUtils.lerp(camState.focus, to, t)));

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
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
      screen.texture.dispose();
      renderer.dispose();
    },
  };
}
