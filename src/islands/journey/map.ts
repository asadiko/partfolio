import type { City } from './types';

export interface CityPoint {
  x: number;
  y: number;
  label: string;
  major: boolean;
}

export const VIEW = { width: 1000, height: 520 } as const;

// Stylised, roughly geographic placement — this is not a map projection anyone should navigate by.
export const cityPoints: Record<City, CityPoint> = {
  tashkent: { x: 888, y: 412, label: 'Tashkent', major: true },
  riga: { x: 306, y: 147, label: 'Riga', major: true },
  munich: { x: 145, y: 296, label: 'Munich', major: true },
  helsinki: { x: 317, y: 91, label: 'Helsinki', major: false },
  'st-gallen': { x: 117, y: 308, label: 'St. Gallen', major: false },
};

export const route: readonly City[] = ['tashkent', 'riga', 'munich'];

export const hubOf: Record<City, City> = {
  tashkent: 'tashkent',
  riga: 'riga',
  munich: 'munich',
  helsinki: 'riga',
  'st-gallen': 'munich',
};

export function segmentPath(from: City, to: City): string {
  const a = cityPoints[from];
  const b = cityPoints[to];
  const cx = (a.x + b.x) / 2;
  const cy = Math.min(a.y, b.y) - Math.abs(a.x - b.x) * 0.18;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}
