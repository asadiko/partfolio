import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  SpotLight,
  TorusGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { matte } from './materials';
import { clockTexture, noteTexture, posterTexture, woodTexture } from './textures';

export type Theme = 'light' | 'dark';

export interface Office {
  group: Group;
  setTheme(theme: Theme): void;
}

const DESK_Y = 0;

function shadowed<T extends Mesh>(mesh: T, cast = true, receive = true): T {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function desk(): Group {
  const g = new Group();
  const top = shadowed(
    new Mesh(
      new RoundedBoxGeometry(2.6, 0.04, 1.3, 3, 0.01),
      new MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 }),
    ),
  );
  top.position.set(0, DESK_Y - 0.02, 0.15);
  g.add(top);
  const legMaterial = matte(0x3a3d40, 0.5);
  for (const [x, z] of [
    [-1.2, -0.4],
    [1.2, -0.4],
    [-1.2, 0.7],
    [1.2, 0.7],
  ] as const) {
    const leg = shadowed(new Mesh(new CylinderGeometry(0.022, 0.022, 0.72, 16), legMaterial));
    leg.position.set(x, DESK_Y - 0.4, z);
    g.add(leg);
  }
  return g;
}

function lamp(): { group: Group; light: SpotLight; bulb: Mesh } {
  const g = new Group();
  const metal = new MeshStandardMaterial({ color: 0x2d3033, roughness: 0.35, metalness: 0.6 });
  const base = shadowed(new Mesh(new CylinderGeometry(0.08, 0.09, 0.02, 32), metal));
  g.add(base);
  const post = shadowed(new Mesh(new CylinderGeometry(0.008, 0.008, 0.44, 12), metal));
  post.position.set(-0.02, 0.22, 0);
  post.rotation.z = 0.1;
  g.add(post);

  // Head: the shade opens along `aim`; the bulb sits inside it and the spotlight shines out of the opening.
  const head = new Vector3(0.3, 0.47, 0.06);
  const aim = new Vector3(0.5, -1, 0.35).normalize();
  const armEnd = head.clone().addScaledVector(aim, -0.07);
  const armStart = new Vector3(-0.04, 0.44, 0);
  const arm = shadowed(
    new Mesh(new CylinderGeometry(0.007, 0.007, armStart.distanceTo(armEnd), 12), metal),
  );
  arm.position.copy(armStart).lerp(armEnd, 0.5);
  arm.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), armEnd.clone().sub(armStart).normalize());
  g.add(arm);
  const joint = new Mesh(new SphereGeometry(0.014, 16, 12), metal);
  joint.position.copy(armStart);
  g.add(joint);

  const shade = shadowed(
    new Mesh(
      new ConeGeometry(0.085, 0.14, 40, 1, true),
      new MeshStandardMaterial({
        color: 0x2d3033,
        roughness: 0.45,
        metalness: 0.5,
        side: DoubleSide,
      }),
    ),
  );
  shade.position.copy(head);
  shade.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), aim);
  g.add(shade);
  const cap = new Mesh(new SphereGeometry(0.02, 16, 12), metal);
  cap.position.copy(head).addScaledVector(aim, -0.07);
  g.add(cap);

  const bulb = new Mesh(
    new SphereGeometry(0.016, 16, 12),
    new MeshBasicMaterial({ color: 0xffe9c4 }),
  );
  bulb.position.copy(head).addScaledVector(aim, 0.025);
  g.add(bulb);
  const light = new SpotLight(0xffd9a3, 6, 1.8, 0.62, 0.5, 1.4);
  light.position.copy(bulb.position);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0008;
  g.add(light);
  g.add(light.target);
  light.target.position.copy(bulb.position).addScaledVector(aim, 1);
  return { group: g, light, bulb };
}

function books(): Group {
  const g = new Group();
  const spec: [number, number, number, number][] = [
    [0.26, 0.035, 0.19, 0x8a5a44],
    [0.24, 0.03, 0.17, 0x4b6b8a],
    [0.22, 0.028, 0.16, 0xc9b58f],
  ];
  let y = 0;
  spec.forEach(([w, h, d, color], i) => {
    const book = shadowed(new Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.006), matte(color, 0.7)));
    book.position.set(0, y + h / 2, 0);
    book.rotation.y = (i - 1) * 0.12;
    g.add(book);
    y += h;
  });
  return g;
}

function plant(): Group {
  const g = new Group();
  const pot = shadowed(
    new Mesh(new CylinderGeometry(0.075, 0.06, 0.13, 32), matte(0xb8a38e, 0.75)),
  );
  pot.position.y = 0.065;
  g.add(pot);
  const soil = new Mesh(new CylinderGeometry(0.07, 0.07, 0.01, 32), matte(0x3a2c22, 1));
  soil.position.y = 0.128;
  g.add(soil);
  const leafMaterial = matte(0x3f7a4a, 0.7);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const len = 0.16 + (i % 3) * 0.04;
    const leaf = shadowed(new Mesh(new SphereGeometry(1, 12, 8), leafMaterial));
    leaf.scale.set(0.028, len / 2, 0.012);
    leaf.position.set(Math.cos(a) * 0.05, 0.13 + len / 2 - 0.02, Math.sin(a) * 0.05);
    leaf.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
    g.add(leaf);
  }
  return g;
}

function penCup(): Group {
  const g = new Group();
  const cup = shadowed(
    new Mesh(
      new CylinderGeometry(0.04, 0.036, 0.1, 32, 1, true),
      new MeshStandardMaterial({ color: 0x2d3033, roughness: 0.6, side: 2 }),
    ),
  );
  cup.position.y = 0.05;
  g.add(cup);
  const bottom = new Mesh(new CylinderGeometry(0.036, 0.036, 0.004, 32), matte(0x2d3033));
  bottom.position.y = 0.002;
  g.add(bottom);
  const colors = [0x1b1a17, 0x0f6e63, 0xb3261e, 0xe2a53f];
  colors.forEach((color, i) => {
    const pen = shadowed(new Mesh(new CylinderGeometry(0.004, 0.004, 0.15, 8), matte(color, 0.5)));
    const a = (i / colors.length) * Math.PI * 2;
    pen.position.set(Math.cos(a) * 0.018, 0.085, Math.sin(a) * 0.018);
    pen.rotation.set(Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15);
    g.add(pen);
  });
  return g;
}

function notepad(): Group {
  const g = new Group();
  const pad = shadowed(new Mesh(new BoxGeometry(0.15, 0.008, 0.21), matte(0xf4f1ea, 0.9)));
  pad.position.y = 0.004;
  g.add(pad);
  const lines = new Mesh(
    new PlaneGeometry(0.13, 0.17),
    new MeshBasicMaterial({ color: 0xd8d4ca, transparent: true, opacity: 0.6 }),
  );
  lines.rotation.x = -Math.PI / 2;
  lines.position.set(0, 0.0085, 0);
  g.add(lines);
  const pen = shadowed(new Mesh(new CylinderGeometry(0.004, 0.004, 0.14, 8), matte(0x1b1a17, 0.5)));
  pen.rotation.set(0, 0.5, Math.PI / 2);
  pen.position.set(0.02, 0.012, 0.02);
  g.add(pen);
  return g;
}

function stickyNotes(): Group {
  const g = new Group();
  const notes: [string, string, number, number, number][] = [
    ['ship it', '#f6e27a', 0, 0, 0.08],
    ['check the\ncitations', '#f9b8c9', 0.1, -0.02, -0.06],
    ['heartbeat\n15 s', '#bfe3ff', 0.05, -0.12, 0.05],
  ];
  notes.forEach(([text, paper, x, y, rot]) => {
    const note = new Mesh(
      new PlaneGeometry(0.075, 0.075),
      new MeshStandardMaterial({ map: noteTexture({ text, paper }), roughness: 0.95 }),
    );
    note.position.set(x, y, 0.004);
    note.rotation.z = rot;
    note.castShadow = true;
    g.add(note);
  });
  return g;
}

export function buildOffice(theme: Theme): Office {
  const group = new Group();

  const wallMaterial = new MeshStandardMaterial({ roughness: 1 });
  const wall = shadowed(new Mesh(new PlaneGeometry(8, 4), wallMaterial), false, true);
  wall.position.set(0, 1.4, -0.55);
  group.add(wall);
  const sideWall = shadowed(new Mesh(new PlaneGeometry(6, 4), wallMaterial), false, true);
  sideWall.rotation.y = Math.PI / 2;
  sideWall.position.set(-1.7, 1.4, 1);
  group.add(sideWall);
  const floorMaterial = new MeshStandardMaterial({ roughness: 0.9 });
  const floor = shadowed(new Mesh(new PlaneGeometry(8, 8), floorMaterial), false, true);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.76;
  group.add(floor);

  group.add(desk());

  // Window on the side wall: a bright pane behind blinds, and the sun that shines through them.
  const paneMaterial = new MeshBasicMaterial({ color: 0xdff0ff });
  const pane = new Mesh(new PlaneGeometry(1.1, 1.3), paneMaterial);
  pane.rotation.y = Math.PI / 2;
  pane.position.set(-1.69, 1.05, 0.35);
  group.add(pane);
  const frameMaterial = matte(0xe9e6df, 0.6);
  for (const [w, h, y, z] of [
    [1.2, 0.05, 1.725, 0.35],
    [1.2, 0.05, 0.375, 0.35],
    [0.05, 1.4, 1.05, -0.225],
    [0.05, 1.4, 1.05, 0.925],
  ] as const) {
    const bar = new Mesh(new BoxGeometry(0.04, h, w), frameMaterial);
    bar.position.set(-1.68, y, z);
    group.add(bar);
  }
  const slatMaterial = matte(0xf1efe8, 0.5);
  for (let i = 0; i < 14; i++) {
    const slat = new Mesh(new BoxGeometry(0.006, 0.02, 1.08), slatMaterial);
    slat.position.set(-1.64, 0.42 + i * 0.09, 0.35);
    slat.rotation.z = 0.45;
    slat.castShadow = true;
    group.add(slat);
  }
  const sun = new DirectionalLight(0xfff1dc, 3.2);
  sun.position.set(-4.5, 2.6, 1.2);
  sun.target.position.set(0.3, 0, 0.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 9;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -1.6;
  sun.shadow.camera.right = sun.shadow.camera.top = 1.6;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.01;
  group.add(sun, sun.target);

  const { group: lampGroup, light: lampLight, bulb } = lamp();
  lampGroup.position.set(-0.78, DESK_Y, -0.05);
  group.add(lampGroup);

  const stack = books();
  stack.position.set(0.62, DESK_Y, -0.24);
  stack.rotation.y = -0.35;
  group.add(stack);

  const pot = plant();
  pot.position.set(0.74, DESK_Y, 0.5);
  pot.scale.setScalar(0.85);
  group.add(pot);

  const cup = penCup();
  cup.position.set(0.56, DESK_Y, 0.66);
  group.add(cup);

  const pad = notepad();
  pad.position.set(-0.42, DESK_Y, 0.42);
  pad.rotation.y = 0.25;
  group.add(pad);

  const mugMaterial = matte(0xf1ede4, 0.45);
  const mug = shadowed(new Mesh(new CylinderGeometry(0.038, 0.034, 0.09, 32), mugMaterial));
  mug.position.set(-0.48, DESK_Y + 0.045, 0.12);
  group.add(mug);
  const mugHandle = new Mesh(new TorusGeometry(0.022, 0.006, 8, 20, Math.PI), mugMaterial);
  mugHandle.position.set(-0.52, DESK_Y + 0.045, 0.12);
  mugHandle.rotation.set(0, 0, Math.PI / 2);
  group.add(mugHandle);
  const coffee = new Mesh(new CylinderGeometry(0.034, 0.034, 0.004, 32), matte(0x3b2314, 0.3));
  coffee.position.set(-0.48, DESK_Y + 0.082, 0.12);
  group.add(coffee);

  const notes = stickyNotes();
  notes.position.set(0.52, 0.44, -0.545);
  group.add(notes);

  const posterMaterial = new MeshStandardMaterial({ map: posterTexture(theme), roughness: 0.9 });
  const poster = new Mesh(new PlaneGeometry(0.4, 0.5), posterMaterial);
  poster.position.set(-0.55, 0.72, -0.54);
  group.add(poster);
  const posterFrame = shadowed(new Mesh(new BoxGeometry(0.44, 0.54, 0.02), matte(0x2b2622, 0.5)));
  posterFrame.position.set(-0.55, 0.72, -0.555);
  group.add(posterFrame);

  const clock = new Mesh(
    new CylinderGeometry(0.11, 0.11, 0.02, 48),
    new MeshStandardMaterial({ map: clockTexture(), roughness: 0.6 }),
  );
  clock.rotation.x = Math.PI / 2;
  clock.position.set(0.32, 0.8, -0.54);
  group.add(clock);
  const clockRim = new Mesh(new TorusGeometry(0.11, 0.01, 12, 48), matte(0x2b2622, 0.5));
  clockRim.position.set(0.32, 0.8, -0.53);
  group.add(clockRim);

  const fill = new PointLight(0xffffff, 0.6, 4, 2);
  fill.position.set(1.2, 1.2, 1.4);
  group.add(fill);

  const palette: Record<
    Theme,
    { wall: number; floor: number; pane: number; sun: number; lamp: number; fill: number }
  > = {
    light: { wall: 0xe4dfd6, floor: 0x8c7b6a, pane: 0xdff0ff, sun: 3.2, lamp: 4.5, fill: 0.6 },
    dark: { wall: 0x23262a, floor: 0x2a2623, pane: 0x233b57, sun: 0.35, lamp: 7, fill: 0.15 },
  };

  const setTheme = (t: Theme) => {
    const p = palette[t];
    wallMaterial.color = new Color(p.wall);
    floorMaterial.color = new Color(p.floor);
    paneMaterial.color = new Color(p.pane);
    sun.intensity = p.sun;
    lampLight.intensity = p.lamp;
    fill.intensity = p.fill;
    (bulb.material as MeshBasicMaterial).color = new Color(t === 'dark' ? 0xffd08a : 0xfff3d6);
    posterMaterial.map?.dispose();
    posterMaterial.map = posterTexture(t);
    posterMaterial.needsUpdate = true;
  };
  setTheme(theme);

  return { group, setTheme };
}
