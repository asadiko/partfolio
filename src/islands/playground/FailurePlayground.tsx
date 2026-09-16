import { useMemo, useState } from 'react';

import type { EventKind, ScenarioEvent } from '@/engines/playground';
import { runScenario } from '@/engines/playground';
import { playgroundFixture } from '@/lib/fixtures';
import { formatDuration } from '@/lib/format';
import { usePrefersReducedMotion } from '@/lib/motion';
import type { ScenarioId } from '@/lib/schemas';

import type { NodeStatus } from '../diagram/Diagram';
import { Diagram } from '../diagram/Diagram';
import { NodeCard } from '../diagram/NodeCard';
import { SimBadge } from '../shared/SimBadge';
import { Button, Definition, Panel } from '../shared/ui';
import { usePlayback } from '../shared/usePlayback';

const kindTone: Record<EventKind, string> = {
  info: 'text-muted',
  ok: 'text-ok',
  warn: 'text-warn',
  fail: 'text-fail',
  recover: 'text-ok',
};

function deriveState(events: readonly ScenarioEvent[]) {
  const status: Record<string, NodeStatus> = {};
  const activeEdges = new Set<string>();
  const last = events.at(-1);
  for (const event of events) {
    if ('node' in event.target) status[event.target.node] = event.kind;
  }
  if (last && 'edge' in last.target) activeEdges.add(last.target.edge);
  return { status, activeEdges };
}

export function FailurePlayground() {
  const reduced = usePrefersReducedMotion();
  const { diagram, scenarios } = playgroundFixture;
  const [scenarioId, setScenarioId] = useState<ScenarioId>('happy-path');
  const [runId, setRunId] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const events = useMemo(() => runScenario(scenarioId, diagram), [scenarioId, diagram]);
  const revealed = usePlayback(events, runId, reduced);
  const visible = events.slice(0, revealed);
  const { status, activeEdges } = useMemo(() => deriveState(visible), [visible]);
  const scenario = scenarios.find((s) => s.id === scenarioId);
  const finished = revealed >= events.length;

  const inject = (id: ScenarioId) => {
    setScenarioId(id);
    setRunId((n) => n + 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Inject a failure" className="flex flex-wrap gap-2">
          {scenarios.map((s) => (
            <Button
              key={s.id}
              variant={s.id === scenarioId ? 'primary' : 'ghost'}
              aria-pressed={s.id === scenarioId}
              onClick={() => inject(s.id)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <SimBadge note="scripted scenarios" />
      </div>

      {scenario && (
        <p className="text-muted m-0 text-sm">
          {scenario.description} <span className="text-ink">Guarded by: {scenario.guard}</span>
        </p>
      )}

      <div className="border-line bg-surface rounded-lg border p-3 sm:p-4">
        <Diagram
          spec={diagram}
          title="LLM pipeline topology: client, proxy, extraction service, gateway, three model endpoints"
          status={status}
          activeEdges={activeEdges}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel
          title={
            <span className="flex items-center justify-between">
              Event log
              <span className="text-faint font-mono text-xs font-normal">
                {finished ? 'complete' : 'running…'} · {revealed}/{events.length}
              </span>
            </span>
          }
        >
          <ol className="m-0 list-none space-y-1.5 p-0 font-mono text-xs" aria-live="polite">
            {visible.map((event, i) => (
              <li key={i} className="grid grid-cols-[3.5rem_1fr] gap-2 leading-relaxed">
                <span className="text-faint tabular-nums">+{formatDuration(event.at)}</span>
                <span>
                  <span className={`${kindTone[event.kind]} font-semibold`}>
                    {'node' in event.target ? event.target.node : event.target.edge}
                  </span>{' '}
                  <span className="text-ink">{event.message}</span>
                </span>
              </li>
            ))}
          </ol>
          {finished && (
            <Button className="mt-3" onClick={() => setRunId((n) => n + 1)}>
              Replay
            </Button>
          )}
        </Panel>

        <div className="space-y-4">
          <NodeCard node={diagram.nodes.find((n) => n.id === selected)} />
          {scenario && (
            <Panel title="Why this design">
              <dl className="m-0">
                <Definition term="Failure injected">{scenario.description}</Definition>
                <Definition term="Mechanism">{scenario.guard}</Definition>
              </dl>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
