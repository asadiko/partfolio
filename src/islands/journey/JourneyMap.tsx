import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { usePrefersReducedMotion } from '@/lib/motion';

import { VIEW, cityPoints, hubOf, labelPosition, route, segmentPath } from './map';
import type { City, Milestone, MilestoneKind } from './types';

const kindLabel: Record<MilestoneKind, string> = {
  school: 'School',
  study: 'University',
  work: 'Work',
  hackathon: 'Hackathon',
  founder: 'Founding',
  community: 'Community',
  move: 'Move',
};

export function JourneyMap({ milestones }: { milestones: Milestone[] }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const active = milestones[index];
  const activeCity: City = active?.city ?? 'tashkent';
  const hub = hubOf[activeCity];
  const reachedIndex = route.indexOf(hub);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-index="${index}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [index, reduced]);

  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(milestones.length - 1, index + delta));
    setIndex(next);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="border-line bg-surface rounded-lg border p-3 sm:p-4 lg:sticky lg:top-20 lg:self-start">
        <svg
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          role="img"
          aria-label={`Route from Tashkent to Riga to Munich. Currently highlighting ${cityPoints[activeCity].label}.`}
          className="h-auto w-full"
        >
          <g className="stroke-line" strokeWidth={1} strokeDasharray="2 6" fill="none">
            {[100, 200, 300, 400].map((y) => (
              <line key={y} x1={0} y1={y} x2={VIEW.width} y2={y} />
            ))}
            {[200, 400, 600, 800].map((x) => (
              <line key={x} x1={x} y1={0} x2={x} y2={VIEW.height} />
            ))}
          </g>

          {route.slice(0, -1).map((from, i) => {
            const to = route[i + 1];
            if (!to) return null;
            const travelled = i < reachedIndex;
            return (
              <path
                key={from}
                d={segmentPath(from, to)}
                fill="none"
                strokeWidth={travelled ? 2.5 : 1.5}
                strokeDasharray={travelled ? undefined : '6 6'}
                className={`transition-[stroke] duration-500 ${travelled ? 'stroke-accent' : 'stroke-faint'}`}
              />
            );
          })}

          {(['helsinki', 'st-gallen'] as const).map((spoke) => {
            const on = activeCity === spoke;
            return (
              <path
                key={spoke}
                d={segmentPath(hubOf[spoke], spoke)}
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="3 5"
                className={`transition-[stroke] duration-500 ${on ? 'stroke-accent' : 'stroke-line'}`}
              />
            );
          })}

          {Object.entries(cityPoints).map(([id, p]) => {
            const on = activeCity === id;
            const visited = p.major ? route.indexOf(id as City) <= reachedIndex : on;
            return (
              <g key={id}>
                {on && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.major ? 22 : 14}
                    className="fill-accent/20 journey-pulse"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.major ? 9 : 5}
                  className={`transition-[fill] duration-500 ${visited || on ? 'fill-accent' : 'fill-faint'}`}
                />
                <text
                  {...labelPosition(p)}
                  className={`${p.major ? 'text-[22px] font-medium' : 'text-[16px]'} ${on ? 'fill-ink' : 'fill-muted'}`}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
        {active && (
          <p className="text-muted mt-2 text-sm" aria-live="polite">
            <span className="text-ink font-medium">{active.date}</span> ·{' '}
            {cityPoints[active.city].label} · {kindLabel[active.kind]}
          </p>
        )}
      </div>

      <ol ref={listRef} aria-label="Milestones" className="m-0 list-none space-y-2 p-0">
        {milestones.map((m, i) => {
          const on = i === index;
          return (
            <li key={m.id}>
              <button
                type="button"
                data-index={i}
                aria-current={on ? 'step' : undefined}
                onClick={() => setIndex(i)}
                onFocus={() => setIndex(i)}
                onKeyDown={onKey}
                className={[
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  on ? 'border-accent bg-accent/8' : 'border-line bg-surface hover:bg-raised',
                ].join(' ')}
              >
                <span className="text-faint flex items-center gap-2 font-mono text-[11px]">
                  {m.date}
                  <span aria-hidden="true">·</span>
                  {cityPoints[m.city].label}
                </span>
                <span className="text-ink mt-0.5 block text-sm font-medium">{m.title}</span>
                <span
                  className={[
                    'text-muted mt-1 block text-sm leading-relaxed',
                    on ? '' : 'hidden',
                  ].join(' ')}
                >
                  {m.body}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
