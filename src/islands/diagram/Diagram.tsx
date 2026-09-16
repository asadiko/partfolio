import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';

import type { DiagramSpec } from '@/lib/schemas';

import { routeEdge } from './geometry';

export type NodeStatus = 'idle' | 'info' | 'ok' | 'warn' | 'fail' | 'recover';

interface DiagramProps {
  spec: DiagramSpec;
  title: string;
  status?: Readonly<Record<string, NodeStatus>>;
  activeEdges?: ReadonlySet<string>;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
}

const nodeStroke: Record<NodeStatus, string> = {
  idle: 'stroke-line',
  info: 'stroke-accent',
  ok: 'stroke-ok',
  warn: 'stroke-warn',
  fail: 'stroke-fail',
  recover: 'stroke-ok',
};

const nodeGlow: Record<NodeStatus, string> = {
  idle: '',
  info: 'fill-accent/10',
  ok: 'fill-ok/10',
  warn: 'fill-warn/15',
  fail: 'fill-fail/15',
  recover: 'fill-ok/15',
};

export function Diagram({
  spec,
  title,
  status = {},
  activeEdges,
  selected,
  onSelect,
}: DiagramProps) {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const markerId = useId();
  const nodes = useMemo(() => new Map(spec.nodes.map((n) => [n.id, n])), [spec.nodes]);
  const paths = useMemo(
    () => spec.edges.map((edge) => ({ edge, ...routeEdge(edge, nodes) })),
    [spec.edges, nodes],
  );

  const activate = (id: string) => onSelect?.(selected === id ? null : id);
  const onKey = (id: string) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(id);
    }
  };

  const hovered = hoveredEdge ? spec.edges.find((e) => e.id === hoveredEdge) : undefined;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${spec.width} ${spec.height}`}
        role="group"
        aria-label={title}
        className="h-auto w-full select-none"
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-faint" />
          </marker>
        </defs>

        {paths.map(({ edge, d, labelAt }) => {
          const active = activeEdges?.has(edge.id) ?? false;
          const fromLabel = nodes.get(edge.from)?.label ?? edge.from;
          const toLabel = nodes.get(edge.to)?.label ?? edge.to;
          return (
            <g
              key={edge.id}
              tabIndex={0}
              role="img"
              aria-label={`${fromLabel} to ${toLabel}: ${edge.flow}`}
              className="outline-none"
              onMouseEnter={() => setHoveredEdge(edge.id)}
              onMouseLeave={() => setHoveredEdge(null)}
              onFocus={() => setHoveredEdge(edge.id)}
              onBlur={() => setHoveredEdge(null)}
            >
              <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
              <path
                d={d}
                fill="none"
                markerEnd={`url(#${markerId})`}
                strokeWidth={active ? 2.5 : 1.5}
                className={[
                  'transition-[stroke,stroke-width] duration-300',
                  active
                    ? 'stroke-accent diagram-edge-active'
                    : hoveredEdge === edge.id
                      ? 'stroke-ink'
                      : 'stroke-line',
                ].join(' ')}
              />
              {edge.label && (
                <text
                  x={labelAt.x}
                  y={labelAt.y}
                  textAnchor="middle"
                  className="fill-faint pointer-events-none font-mono text-[10px]"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {spec.nodes.map((node) => {
          const s = status[node.id] ?? 'idle';
          const isSelected = selected === node.id;
          return (
            <g
              key={node.id}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${node.label}${node.sublabel ? `, ${node.sublabel}` : ''}. Status: ${s}.`}
              className="focus-visible:[&>rect:first-of-type]:stroke-accent cursor-pointer outline-none focus-visible:[&>rect:first-of-type]:stroke-[3]"
              onClick={() => activate(node.id)}
              onKeyDown={onKey(node.id)}
            >
              <rect
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                rx={10}
                strokeWidth={isSelected ? 2.5 : 1.5}
                className={[
                  'fill-surface transition-[stroke] duration-300',
                  isSelected ? 'stroke-ink' : nodeStroke[s],
                ].join(' ')}
              />
              {s !== 'idle' && (
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx={10}
                  className={`pointer-events-none ${nodeGlow[s]}`}
                />
              )}
              <text
                x={node.x + node.w / 2}
                y={node.y + node.h / 2 + (node.sublabel ? -4 : 5)}
                textAnchor="middle"
                className="fill-ink pointer-events-none text-[15px] font-medium"
              >
                {node.label}
              </text>
              {node.sublabel && (
                <text
                  x={node.x + node.w / 2}
                  y={node.y + node.h / 2 + 14}
                  textAnchor="middle"
                  className="fill-muted pointer-events-none font-mono text-[11px]"
                >
                  {node.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="text-muted mt-2 min-h-[1.5rem] text-sm" aria-live="polite">
        {hovered ? (
          <>
            <span className="text-ink font-medium">
              {nodes.get(hovered.from)?.label} → {nodes.get(hovered.to)?.label}:
            </span>{' '}
            {hovered.flow}
          </>
        ) : (
          'Click a node for its job, the failure it guards against and the trade-off. Hover an edge to see what flows along it.'
        )}
      </figcaption>
    </figure>
  );
}
