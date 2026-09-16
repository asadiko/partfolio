import type { DiagramEdge, DiagramNode } from '@/lib/schemas';

export interface Point {
  x: number;
  y: number;
}

export interface RoutedEdge {
  d: string;
  labelAt: Point;
}

const ADJACENT_GAP = 120;
// Prefer top/bottom anchors once an edge is mostly vertical; keeps layered graphs from routing through neighbours.
const VERTICAL_BIAS = 0.6;
const PAIR_OFFSET = 9;
const LOOP_DEPTH = 110;

const center = (n: DiagramNode): Point => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

function curve(a: Point, b: Point, c1: Point, c2: Point): RoutedEdge {
  // Bezier midpoint at t = 0.5 — where a label sits without overlapping either box.
  const labelAt = {
    x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8,
    y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8 - 8,
  };
  return { d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`, labelAt };
}

const horizontal = (a: Point, b: Point) => {
  const mx = (a.x + b.x) / 2;
  return curve(a, b, { x: mx, y: a.y }, { x: mx, y: b.y });
};

const vertical = (a: Point, b: Point) => {
  const my = (a.y + b.y) / 2;
  return curve(a, b, { x: a.x, y: my }, { x: b.x, y: my });
};

/**
 * Routes an edge between two boxes: forward edges leave the right side, backward edges
 * between neighbours run parallel underneath, and long backward edges loop below the row.
 */
export function routeEdge(edge: DiagramEdge, nodes: ReadonlyMap<string, DiagramNode>): RoutedEdge {
  const from = nodes.get(edge.from);
  const to = nodes.get(edge.to);
  if (!from || !to) throw new Error(`edge ${edge.id} references a missing node`);

  const cf = center(from);
  const ct = center(to);
  const dx = ct.x - cf.x;
  const dy = ct.y - cf.y;

  if (Math.abs(dy) > Math.abs(dx) * VERTICAL_BIAS) {
    const down = dy > 0;
    return vertical(
      { x: cf.x, y: down ? from.y + from.h : from.y },
      { x: ct.x, y: down ? to.y : to.y + to.h },
    );
  }

  if (dx >= 0) {
    return horizontal(
      { x: from.x + from.w, y: cf.y - PAIR_OFFSET },
      { x: to.x, y: ct.y - PAIR_OFFSET },
    );
  }

  const gap = from.x - (to.x + to.w);
  if (gap < ADJACENT_GAP) {
    return horizontal(
      { x: from.x, y: cf.y + PAIR_OFFSET },
      { x: to.x + to.w, y: ct.y + PAIR_OFFSET },
    );
  }

  const a = { x: cf.x, y: from.y + from.h };
  const b = { x: ct.x, y: to.y + to.h };
  const depth = Math.max(a.y, b.y) + LOOP_DEPTH;
  return curve(a, b, { x: a.x, y: depth }, { x: b.x, y: depth });
}
