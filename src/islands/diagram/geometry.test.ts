import { describe, expect, it } from 'vitest';

import type { DiagramNode } from '@/lib/schemas';

import { routeEdge } from './geometry';

const box = (id: string, x: number, y: number): DiagramNode => ({
  id,
  label: id,
  x,
  y,
  w: 100,
  h: 50,
  card: { job: '', guards: '', tradeoff: '' },
});

const nodes = new Map(
  [box('a', 0, 100), box('b', 200, 100), box('c', 600, 100), box('d', 200, 300)].map((n) => [
    n.id,
    n,
  ]),
);

const edge = (from: string, to: string) => ({ id: `${from}-${to}`, from, to, label: '', flow: '' });

describe('routeEdge', () => {
  it('leaves the right side for forward edges', () => {
    const { d } = routeEdge(edge('a', 'b'), nodes);
    expect(d.startsWith('M 100 116')).toBe(true);
    expect(d.endsWith('200 116')).toBe(true);
  });

  it('runs backward edges between neighbours parallel and offset', () => {
    const { d } = routeEdge(edge('b', 'a'), nodes);
    expect(d.startsWith('M 200 134')).toBe(true);
    expect(d.endsWith('100 134')).toBe(true);
  });

  it('loops long backward edges below the row', () => {
    const { d } = routeEdge(edge('c', 'a'), nodes);
    expect(d.startsWith('M 650 150')).toBe(true);
    expect(d).toContain('260');
  });

  it('uses top and bottom sides for mostly vertical edges', () => {
    const { d, labelAt } = routeEdge(edge('b', 'd'), nodes);
    expect(d.startsWith('M 250 150')).toBe(true);
    expect(d.endsWith('250 300')).toBe(true);
    expect(labelAt.x).toBe(250);
  });

  it('throws on a missing node', () => {
    expect(() => routeEdge(edge('a', 'zzz'), nodes)).toThrow(/a-zzz/);
  });
});
