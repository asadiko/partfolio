import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { cx } from '@/lib/cx';
import { usePrefersReducedMotion } from '@/lib/motion';
import type { Globe, GlobeTheme, LabelPosition } from '@/scene/globe';

import { cities, hubOf, route } from './cities';
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

const currentTheme = (): GlobeTheme => {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'dark' || forced === 'light') return forced;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function JourneyMap({ milestones }: { milestones: Milestone[] }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [webgl, setWebgl] = useState(true);
  const listRef = useRef<HTMLOListElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<Globe | null>(null);
  const labelRefs = useRef(new Map<string, HTMLSpanElement>());
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const pinnedRef = useRef<string | null>(null);
  const lastLabelsRef = useRef<LabelPosition[]>([]);
  const active = milestones[index];
  const activeCity = active?.city ?? 'tashkent';
  const reachedIndex = route.indexOf(hubOf[activeCity]);
  const focusRef = useRef({ activeCity, reachedIndex });
  focusRef.current = { activeCity, reachedIndex };

  // Labels are positioned imperatively every frame; re-rendering React 60× a second would be wasteful.
  const nearest = (labels: LabelPosition[], point: { x: number; y: number } | null) =>
    point
      ? labels.find((l) => l.visible && Math.hypot(l.x - point.x, l.y - point.y) < 22)?.id
      : undefined;

  const placeLabels = useCallback((labels: LabelPosition[]) => {
    lastLabelsRef.current = labels;
    const near = nearest(labels, pointerRef.current);
    for (const { id, x, y, visible } of labels) {
      const el = labelRefs.current.get(id);
      if (!el) continue;
      const shown =
        visible && (id === focusRef.current.activeCity || id === near || id === pinnedRef.current);
      // Major cities label above the dot, minor ones below, so Riga and Helsinki don't collide.
      const offset = cities[id as City]?.major ? 'calc(-100% - 10px)' : '10px';
      el.style.transform = `translate(-50%, ${offset}) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.opacity = shown ? '1' : '0';
    }
  }, []);

  const trackPointer = (e: {
    clientX: number;
    clientY: number;
    currentTarget: HTMLCanvasElement;
  }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let globe: Globe | null = null;
    (async () => {
      const { createGlobe } = await import('@/scene/globe');
      const { isWebGLAvailable } = await import('@/scene/room');
      if (disposed) return;
      if (!isWebGLAvailable()) {
        setWebgl(false);
        return;
      }
      globe = createGlobe(canvas, {
        theme: currentTheme(),
        reducedMotion: reduced,
        route: [...route],
        cities: Object.entries(cities).map(([id, c]) => ({
          id,
          lat: c.lat,
          lon: c.lon,
          major: c.major,
        })),
        onProject: placeLabels,
      });
      globeRef.current = globe;
      globe.focus(focusRef.current.activeCity, focusRef.current.reachedIndex);
    })();
    const observer = new MutationObserver(() => globe?.setTheme(currentTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      disposed = true;
      observer.disconnect();
      globe?.dispose();
      globeRef.current = null;
    };
  }, [reduced, placeLabels]);

  useEffect(() => {
    globeRef.current?.focus(activeCity, reachedIndex);
  }, [activeCity, reachedIndex]);

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
        <div className="relative aspect-square max-h-[540px] w-full">
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none"
            aria-label={`Globe showing the route Tashkent → Riga → Munich, focused on ${cities[activeCity].label}. Drag to rotate; tap a marker for its name.`}
            onPointerMove={trackPointer}
            onPointerDown={(e) => {
              trackPointer(e);
              // A press pins the marker under the finger (touch has no hover) until the next press.
              pinnedRef.current = nearest(lastLabelsRef.current, pointerRef.current) ?? null;
            }}
            onPointerLeave={() => (pointerRef.current = null)}
          />
          {webgl &&
            Object.entries(cities).map(([id, c]) => (
              <span
                key={id}
                ref={(el) => {
                  if (el) labelRefs.current.set(id, el);
                  else labelRefs.current.delete(id);
                }}
                aria-hidden="true"
                className={cx(
                  'pointer-events-none absolute top-0 left-0 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap opacity-0 shadow-sm transition-opacity',
                  id === activeCity
                    ? 'border-accent bg-accent text-accent-ink font-medium'
                    : 'border-line bg-surface/90 text-ink',
                )}
              >
                {c.label}
                <span className={id === activeCity ? 'text-accent-ink/80' : 'text-muted'}>
                  , {c.country}
                </span>
              </span>
            ))}
          {!webgl && (
            <p className="text-muted absolute inset-0 grid place-items-center text-sm">
              Globe needs WebGL; the milestones on the right still work.
            </p>
          )}
        </div>
        {active && (
          <p className="text-muted mt-2 text-sm" aria-live="polite">
            <span className="text-ink font-medium">{active.date}</span> ·{' '}
            {cities[active.city].label} · {kindLabel[active.kind]}
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
                className={cx(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  on ? 'border-accent bg-accent/8' : 'border-line bg-surface hover:bg-raised',
                )}
              >
                <span className="text-faint flex items-center gap-2 font-mono text-[11px]">
                  {m.date}
                  <span aria-hidden="true">·</span>
                  {cities[m.city].label}
                </span>
                <span className="text-ink mt-0.5 block text-sm font-medium">{m.title}</span>
                <span
                  className={cx('text-muted mt-1 block text-sm leading-relaxed', !on && 'hidden')}
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
