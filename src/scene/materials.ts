import { MeshPhysicalMaterial, MeshStandardMaterial } from 'three';

export const bondiBlue = () =>
  new MeshPhysicalMaterial({
    color: 0x2aa3c8,
    roughness: 0.16,
    metalness: 0,
    transmission: 0.42,
    thickness: 0.25,
    ior: 1.45,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    attenuationColor: 0x1b8fb4,
    attenuationDistance: 0.6,
  });

/** Same plastic without the transmission pass — for small parts where refraction is invisible anyway. */
export const bondiBlueLite = () =>
  new MeshPhysicalMaterial({
    color: 0x2aa3c8,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.92,
  });

export const icePlastic = () =>
  new MeshPhysicalMaterial({
    color: 0xe6e8e4,
    roughness: 0.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.3,
  });

export const matte = (color: number, roughness = 0.8) =>
  new MeshStandardMaterial({ color, roughness });
