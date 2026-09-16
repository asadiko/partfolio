import type { City } from './types';

export interface CityPoint {
  x: number;
  y: number;
  label: string;
  major: boolean;
  /** Where the label sits relative to the dot, to keep neighbours from colliding. */
  anchor: 'below' | 'above' | 'left' | 'right';
}

export const VIEW = { width: 1000, height: 520 } as const;

// Stylised, roughly geographic placement — this is not a map projection anyone should navigate by.
export const cityPoints: Record<City, CityPoint> = {
  tashkent: { x: 888, y: 412, label: 'Tashkent', major: true, anchor: 'below' },
  riga: { x: 306, y: 147, label: 'Riga', major: true, anchor: 'right' },
  munich: { x: 145, y: 296, label: 'Munich', major: true, anchor: 'below' },
  helsinki: { x: 317, y: 91, label: 'Helsinki', major: false, anchor: 'above' },
  'st-gallen': { x: 117, y: 308, label: 'St. Gallen', major: false, anchor: 'left' },
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
  const cy = Math.min(a.y, b.y) - Math.abs(a.x - b.x) * 0.12;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export function labelPosition(p: CityPoint): {
  x: number;
  y: number;
  textAnchor: 'start' | 'middle' | 'end';
} {
  const gap = p.major ? 14 : 10;
  switch (p.anchor) {
    case 'below':
      return { x: p.x, y: p.y + gap + 22, textAnchor: 'middle' };
    case 'above':
      return { x: p.x, y: p.y - gap - 4, textAnchor: 'middle' };
    case 'left':
      return { x: p.x - gap, y: p.y + 6, textAnchor: 'end' };
    case 'right':
      return { x: p.x + gap, y: p.y + 7, textAnchor: 'start' };
  }
}
