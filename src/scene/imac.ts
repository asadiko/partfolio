import {
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { Texture } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { bondiBlue, bondiBlueLite, icePlastic, matte } from './materials';

export interface ImacModel {
  group: Group;
  screen: Mesh;
  /** World-space centre of the glass, for camera framing. */
  screenCenter: Vector3;
  screenSize: { width: number; height: number };
}

const SCREEN_W = 0.27;
const SCREEN_H = 0.2;
const SCREEN_Y = 0.235;
const BEZEL_FRONT = 0.16;

function shadowed<T extends Mesh>(mesh: T): T {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Slightly domed CRT face. */
function crtGeometry() {
  const geometry = new PlaneGeometry(SCREEN_W, SCREEN_H, 24, 18);
  const pos = geometry.attributes.position;
  if (!pos) return geometry;
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i) / (SCREEN_W / 2);
    const ny = pos.getY(i) / (SCREEN_H / 2);
    pos.setZ(i, 0.012 * (1 - 0.5 * nx * nx - 0.5 * ny * ny));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** The translucent back: an egg profile revolved around the front-back axis. */
function shell(): Mesh {
  const profile = [
    [0.0, 0.0],
    [0.19, 0.0],
    [0.205, 0.05],
    [0.207, 0.12],
    [0.195, 0.19],
    [0.16, 0.26],
    [0.11, 0.31],
    [0.055, 0.345],
    [0.0, 0.355],
  ].map(([r, t]) => new Vector2(r, t));
  const mesh = shadowed(new Mesh(new LatheGeometry(profile, 64), bondiBlue()));
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(1, 0.94, 1);
  return mesh;
}

function speakerGrille(): InstancedMesh {
  const rows = 5;
  const cols = 7;
  const dots = new InstancedMesh(
    new CylinderGeometry(0.0022, 0.0022, 0.002, 8),
    matte(0x2b2d2f, 0.9),
    rows * cols,
  );
  const m = new Matrix4();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 0.007;
      const y = (r - (rows - 1) / 2) * 0.007;
      if (Math.hypot(x / 0.024, y / 0.016) > 1) {
        m.makeScale(0, 0, 0);
      } else {
        m.makeRotationX(Math.PI / 2).setPosition(x, y, 0);
      }
      dots.setMatrixAt(i++, m);
    }
  }
  return dots;
}

function keyboard(): Group {
  const g = new Group();
  const tray = shadowed(
    new Mesh(new RoundedBoxGeometry(0.37, 0.018, 0.145, 4, 0.008), bondiBlue()),
  );
  tray.position.y = 0.009;
  g.add(tray);
  const inner = new Mesh(new BoxGeometry(0.345, 0.004, 0.115), icePlastic());
  inner.position.set(0, 0.018, 0.002);
  g.add(inner);
  const cols = 15;
  const rows = 4;
  const keyGeo = new RoundedBoxGeometry(0.0175, 0.007, 0.0175, 2, 0.002);
  const keys = new InstancedMesh(keyGeo, icePlastic(), cols * rows + 1);
  const m = new Matrix4();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      m.makeTranslation(-0.155 + c * 0.0215, 0.024, -0.042 + r * 0.022);
      keys.setMatrixAt(i++, m);
    }
  }
  m.makeScale(6, 1, 1).setPosition(0, 0.024, 0.048);
  keys.setMatrixAt(i, m);
  keys.castShadow = true;
  g.add(keys);
  return g;
}

function puckMouse(): Group {
  const g = new Group();
  // The G3 puck: a flattened translucent dome with a clear button insert on top.
  const dome = shadowed(
    new Mesh(new SphereGeometry(0.036, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), bondiBlueLite()),
  );
  dome.scale.set(1, 0.6, 1.05);
  g.add(dome);
  const skirt = new Mesh(new CylinderGeometry(0.036, 0.034, 0.006, 40), bondiBlueLite());
  skirt.position.y = 0.003;
  g.add(skirt);
  const button = new Mesh(
    new SphereGeometry(0.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    icePlastic(),
  );
  button.scale.set(1, 0.55, 1.25);
  button.position.set(0, 0.014, 0.004);
  g.add(button);
  return g;
}

/** A thin cable lying on the desk between two points, with a little slack. */
function cable(points: Vector3[]): Mesh {
  return new Mesh(new TubeGeometry(new CatmullRomCurve3(points), 48, 0.0022, 6), icePlastic());
}

export function buildImac(screenTexture: Texture): ImacModel {
  const group = new Group();

  const back = shell();
  back.position.set(0, 0.225, BEZEL_FRONT - 0.07);
  group.add(back);

  // A dark tube inside the translucent shell — what you see through the plastic on the real thing.
  const funnel = new Mesh(new ConeGeometry(0.15, 0.3, 32, 1, true), matte(0x2a2f33, 0.9));
  funnel.rotation.x = -Math.PI / 2;
  funnel.position.set(0, 0.225, BEZEL_FRONT - 0.2);
  group.add(funnel);

  const bezel = shadowed(
    new Mesh(new RoundedBoxGeometry(0.385, 0.36, 0.1, 8, 0.055), icePlastic()),
  );
  bezel.position.set(0, 0.215, BEZEL_FRONT - 0.05);
  group.add(bezel);

  const recess = new Mesh(
    new RoundedBoxGeometry(SCREEN_W + 0.03, SCREEN_H + 0.03, 0.012, 4, 0.01),
    matte(0x1e2124, 0.85),
  );
  recess.position.set(0, SCREEN_Y, BEZEL_FRONT - 0.004);
  group.add(recess);

  const screen = new Mesh(
    crtGeometry(),
    new MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  );
  screen.position.set(0, SCREEN_Y, BEZEL_FRONT + 0.001);
  screen.name = 'screen';
  group.add(screen);

  const glass = new Mesh(
    crtGeometry(),
    new MeshPhysicalMaterial({
      transmission: 1,
      roughness: 0.04,
      thickness: 0.002,
      ior: 1.5,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  glass.position.set(0, SCREEN_Y, BEZEL_FRONT + 0.004);
  group.add(glass);

  const chinY = 0.075;
  for (const side of [-1, 1]) {
    const grille = speakerGrille();
    grille.position.set(side * 0.135, chinY, BEZEL_FRONT + 0.0005);
    group.add(grille);
  }
  const slot = new Mesh(new RoundedBoxGeometry(0.13, 0.008, 0.006, 2, 0.003), matte(0x2b2d2f, 0.7));
  slot.position.set(0, chinY + 0.018, BEZEL_FRONT + 0.001);
  group.add(slot);
  const mark = new Mesh(new CylinderGeometry(0.007, 0.007, 0.002, 4), matte(0x1c8f9f, 0.4));
  mark.rotation.set(Math.PI / 2, 0, Math.PI / 4);
  mark.position.set(0, chinY - 0.012, BEZEL_FRONT + 0.002);
  group.add(mark);

  const handle = shadowed(new Mesh(new TorusGeometry(0.06, 0.009, 12, 32, Math.PI), bondiBlue()));
  handle.position.set(0, 0.4, -0.05);
  handle.rotation.y = Math.PI / 2;
  group.add(handle);

  const foot = shadowed(new Mesh(new CylinderGeometry(0.1, 0.125, 0.03, 48), bondiBlueLite()));
  foot.position.set(0, 0.015, 0.02);
  group.add(foot);
  const footPad = new Mesh(new CylinderGeometry(0.125, 0.13, 0.006, 48), icePlastic());
  footPad.position.set(0, 0.003, 0.02);
  group.add(footPad);

  const kb = keyboard();
  kb.position.set(0.02, 0, 0.36);
  kb.rotation.y = -0.04;
  group.add(kb);

  const mouse = puckMouse();
  mouse.position.set(0.3, 0, 0.34);
  group.add(mouse);

  // Mouse → keyboard (the puck plugged into the keyboard), keyboard → the port on the iMac's right side.
  group.add(
    cable([
      new Vector3(0.3, 0.008, 0.32),
      new Vector3(0.31, 0.004, 0.27),
      new Vector3(0.27, 0.004, 0.24),
      new Vector3(0.215, 0.006, 0.3),
    ]),
  );
  group.add(
    cable([
      new Vector3(0.205, 0.008, 0.3),
      new Vector3(0.26, 0.004, 0.2),
      new Vector3(0.27, 0.004, 0.06),
      new Vector3(0.22, 0.005, -0.03),
      new Vector3(0.2, 0.05, -0.05),
      new Vector3(0.198, 0.12, -0.02),
    ]),
  );

  return {
    group,
    screen,
    screenCenter: new Vector3(0, SCREEN_Y, BEZEL_FRONT + 0.012),
    screenSize: { width: SCREEN_W, height: SCREEN_H },
  };
}
