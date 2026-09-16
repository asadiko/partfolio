import { useEffect, useMemo, useState } from 'react';

import { escrowFixture } from '@/lib/fixtures';
import { usePrefersReducedMotion } from '@/lib/motion';

import type { NodeStatus } from '../diagram/Diagram';
import { Diagram } from '../diagram/Diagram';
import { NodeCard } from '../diagram/NodeCard';
import { Button, Panel } from '../shared/ui';

const STEP_MS = 3200;

export function EscrowTour() {
  const reduced = usePrefersReducedMotion();
  const { diagram, tour } = escrowFixture;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const current = tour[step];
  const status = useMemo<Record<string, NodeStatus>>(() => {
    const s: Record<string, NodeStatus> = {};
    tour.slice(0, step).forEach((t) => (s[t.nodeId] = 'ok'));
    if (current) s[current.nodeId] = 'info';
    return s;
  }, [tour, step, current]);
  const activeEdges = useMemo(
    () => new Set(diagram.edges.filter((e) => e.to === current?.nodeId).map((e) => e.id)),
    [diagram.edges, current],
  );

  useEffect(() => {
    if (!playing || reduced) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s + 1 >= tour.length) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [playing, reduced, tour.length]);

  const go = (next: number) => {
    setStep(Math.max(0, Math.min(tour.length - 1, next)));
    setPlaying(false);
  };

  return (
    <div className="space-y-5">
      <div className="border-line bg-surface rounded-lg border p-3 sm:p-4">
        <Diagram
          spec={diagram}
          title="Escrow wallet architecture: apps, API services, PostgreSQL, ledger, outbox, aggregator, reconciler"
          status={status}
          activeEdges={activeEdges}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={
            <span className="flex items-center justify-between">
              One order, end to end
              <span className="text-faint font-mono text-xs font-normal">
                step {step + 1}/{tour.length}
              </span>
            </span>
          }
        >
          <p className="text-ink m-0 min-h-16 text-sm leading-relaxed" aria-live="polite">
            <span className="text-accent mr-2 font-mono text-xs">
              {diagram.nodes.find((n) => n.id === current?.nodeId)?.label}
            </span>
            {current?.text}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => go(step - 1)} disabled={step === 0}>
              ← Previous
            </Button>
            <Button onClick={() => go(step + 1)} disabled={step === tour.length - 1}>
              Next →
            </Button>
            {!reduced && (
              <Button
                variant={playing ? 'primary' : 'ghost'}
                aria-pressed={playing}
                onClick={() => {
                  if (step === tour.length - 1) setStep(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? 'Pause' : 'Autoplay'}
              </Button>
            )}
          </div>
        </Panel>
        <NodeCard node={diagram.nodes.find((n) => n.id === selected)} />
      </div>
    </div>
  );
}
