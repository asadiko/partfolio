import { MeshPhysicalMaterial, MeshStandardMaterial } from 'three';

// Colourway after the BMW M5 CS: Frozen Deep Green Metallic body, magnesium-grey trim.

/** Satin metallic deep green: a frozen (matte-clearcoat) paint with a light flake sheen. */
export const deepGreen = () =>
  new MeshPhysicalMaterial({
    color: 0x0f3b2c,
    metalness: 0.55,
    roughness: 0.38,
    clearcoat: 0.7,
    clearcoatRoughness: 0.55,
    sheen: 0.25,
    sheenColor: 0x6fae8f,
    sheenRoughness: 0.6,
  });

/** Same paint, cheaper — no clearcoat/sheen passes, for the many small parts. */
export const deepGreenLite = () =>
  new MeshStandardMaterial({ color: 0x0f3b2c, metalness: 0.55, roughness: 0.4 });

/** Magnesium: warm mid-grey metal with a soft, slightly brushed finish. */
export const magnesium = () =>
  new MeshPhysicalMaterial({
    color: 0x8f9296,
    metalness: 0.75,
    roughness: 0.42,
    clearcoat: 0.2,
    clearcoatRoughness: 0.6,
  });

export const matte = (color: number, roughness = 0.8) =>
  new MeshStandardMaterial({ color, roughness });
