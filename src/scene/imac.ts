import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Texture } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export interface ImacModel {
  group: Group;
  screen: Mesh;
  /** World-space centre of the glass, for camera framing. */
  screenCenter: Vector3;
  screenSize: { width: number; height: number };
}

const SCREEN_W = 0.28;
const SCREEN_H = 0.21;
const SCREEN_Z = 0.152;
const SCREEN_Y = 0.215;

const bondi = () =>
  new MeshPhysicalMaterial({
    color: 0x1c9dc3,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.86,
  });

const platinum = (color = 0xd8dad6) => new MeshStandardMaterial({ color, roughness: 0.62 });

function shadowed<T extends Mesh>(mesh: T): T {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** The CRT is a plane whose vertices bulge slightly towards the viewer. */
function crtGeometry() {
  const geometry = new PlaneGeometry(SCREEN_W, SCREEN_H, 24, 18);
  const pos = geometry.attributes.position;
  if (!pos) return geometry;
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i) / (SCREEN_W / 2);
    const ny = pos.getY(i) / (SCREEN_H / 2);
    pos.setZ(i, 0.01 * (1 - 0.5 * nx * nx - 0.5 * ny * ny));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function keyboard(): Group {
  const g = new Group();
  const body = shadowed(new Mesh(new RoundedBoxGeometry(0.36, 0.016, 0.14, 3, 0.006), bondi()));
  g.add(body);
  const cols = 15;
  const rows = 4;
  const keyGeo = new BoxGeometry(0.017, 0.006, 0.017);
  const keys = new InstancedMesh(keyGeo, platinum(0xecece8), cols * rows + 1);
  const m = new Matrix4();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      m.makeTranslation(-0.155 + c * 0.0215, 0.011, -0.045 + r * 0.022);
      keys.setMatrixAt(i++, m);
    }
  }
  m.makeScale(6, 1, 1).setPosition(0, 0.011, 0.045);
  keys.setMatrixAt(i, m);
  keys.castShadow = true;
  g.add(keys);
  return g;
}

function mouse(): Group {
  const g = new Group();
  g.add(shadowed(new Mesh(new CylinderGeometry(0.032, 0.03, 0.02, 32), bondi())));
  const cap = new Mesh(new CylinderGeometry(0.02, 0.02, 0.004, 32), platinum(0xf2f2ee));
  cap.position.y = 0.012;
  g.add(cap);
  return g;
}

export function buildImac(screenTexture: Texture): ImacModel {
  const group = new Group();

  const shell = shadowed(new Mesh(new SphereGeometry(0.22, 48, 32), bondi()));
  shell.scale.set(0.9, 0.86, 1.0);
  shell.position.set(0, 0.21, -0.08);
  group.add(shell);

  const bezel = shadowed(new Mesh(new RoundedBoxGeometry(0.38, 0.36, 0.1, 6, 0.045), platinum()));
  bezel.position.set(0, 0.2, 0.1);
  group.add(bezel);

  const recess = new Mesh(
    new PlaneGeometry(SCREEN_W + 0.02, SCREEN_H + 0.02),
    new MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.9 }),
  );
  recess.position.set(0, SCREEN_Y, SCREEN_Z - 0.003);
  group.add(recess);

  const screen = new Mesh(
    crtGeometry(),
    new MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  );
  screen.position.set(0, SCREEN_Y, SCREEN_Z);
  screen.name = 'screen';
  group.add(screen);

  const handle = shadowed(new Mesh(new TorusGeometry(0.055, 0.008, 10, 28, Math.PI), bondi()));
  handle.position.set(0, 0.385, -0.12);
  handle.rotation.y = Math.PI / 2;
  group.add(handle);

  const foot = shadowed(new Mesh(new CylinderGeometry(0.11, 0.13, 0.02, 40), bondi()));
  foot.position.set(0, 0.01, -0.02);
  group.add(foot);

  const kb = keyboard();
  kb.position.set(0, 0.008, 0.34);
  group.add(kb);

  const puck = mouse();
  puck.position.set(0.27, 0.01, 0.33);
  group.add(puck);

  const cable = new Mesh(
    new TubeGeometry(
      new CatmullRomCurve3([
        new Vector3(0.27, 0.012, 0.31),
        new Vector3(0.3, 0.005, 0.2),
        new Vector3(0.24, 0.005, 0.02),
        new Vector3(0.12, 0.03, -0.14),
      ]),
      32,
      0.0025,
      6,
    ),
    platinum(0xf0f0ec),
  );
  group.add(cable);

  return {
    group,
    screen,
    screenCenter: new Vector3(0, SCREEN_Y, SCREEN_Z + 0.01),
    screenSize: { width: SCREEN_W, height: SCREEN_H },
  };
}
