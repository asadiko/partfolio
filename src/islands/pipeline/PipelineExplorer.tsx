import { useMemo, useState } from 'react';

import type { Design } from '@/engines/pipeline';
import { simulatePipeline, unitCount } from '@/engines/pipeline';
import { pipelineFixture } from '@/lib/fixtures';
import { formatDuration, formatInt, formatRatio } from '@/lib/format';
import { usePrefersReducedMotion } from '@/lib/motion';
import type { CallRule, PipelineStage } from '@/lib/schemas';

import { SimBadge } from '../shared/SimBadge';
import { Button, Definition, Panel, Segmented } from '../shared/ui';
import { useAnimatedNumber } from '../shared/useAnimatedNumber';
import { useTicker } from '../shared/useTicker';

const STEP_MS = 420;
const designs = [
  { value: 'naive', label: 'Naive: one call per item' },
  { value: 'batched', label: 'Batched: v2 design' },
] as const;

const unitLabel: Record<CallRule['per'], string> = {
  document: 'document',
  page: 'page',
  requirement: 'requirement',
  code: 'standards code',
  language: 'language',
  'requirement-language': 'requirement × language',
};

function describeRule(rule: CallRule, doc: typeof pipelineFixture.document): string {
  if (rule.model === 'none') return 'deterministic code, no model call';
  const units = unitCount(rule.per, doc);
  const per = unitLabel[rule.per];
  const model = rule.model === 'cheap' ? 'cheap model' : 'strong model';
  const calls = rule.calls === 1 ? '1 call' : `${rule.calls} calls`;
  if (rule.batch) {
    return `${calls} per batch of ${rule.batch} ${per}s (${formatInt(units)} ${per}s), ${model}, ${rule.concurrency} concurrent`;
  }
  return `${calls} per ${per} × ${formatInt(units)}, ${model}, ${rule.concurrency} concurrent`;
}

export function PipelineExplorer() {
  const reduced = usePrefersReducedMotion();
  const [design, setDesign] = useState<Design>('naive');
  const [runId, setRunId] = useState(0);
  const [selectedId, setSelectedId] = useState<string>(pipelineFixture.stages[0]?.id ?? '');

  const { document, stages } = pipelineFixture;
  const results = useMemo(
    () => ({
      naive: simulatePipeline(pipelineFixture, 'naive'),
      batched: simulatePipeline(pipelineFixture, 'batched'),
    }),
    [],
  );
  const current = results[design];
  const lit = useTicker(stages.length, STEP_MS, runId, reduced);
  const selected = stages.find((s) => s.id === selectedId);
  const selectedResult = current.stages.find((s) => s.id === selectedId);

  const switchDesign = (next: Design) => {
    setDesign(next);
    setRunId((n) => n + 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-ink m-0 font-medium">{document.title}</p>
          <p className="text-muted m-0 text-sm">
            {document.pages} pages · {document.requirements} requirements ·{' '}
            {document.standardsCodes} standards references · {document.languages} output languages
          </p>
        </div>
        <SimBadge note="illustrative cost model" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Pipeline design"
          value={design}
          options={designs}
          onChange={switchDesign}
        />
        <Button onClick={() => setRunId((n) => n + 1)}>Run again</Button>
      </div>

      <Counters
        calls={current.totals.calls}
        latencyMs={current.totals.latencyMs}
        costUnits={current.totals.costUnits}
        baseline={results.naive.totals}
        design={design}
        instant={reduced}
      />

      <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
        {stages.map((stage, i) => {
          const result = current.stages[i];
          const isLit = i < lit;
          const isSelected = stage.id === selectedId;
          return (
            <li key={stage.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(stage.id)}
                className={[
                  'w-full rounded-lg border p-3 text-left transition-[border-color,background-color,opacity] duration-300',
                  isLit ? 'opacity-100' : 'opacity-40',
                  isSelected
                    ? 'border-accent bg-accent/8'
                    : isLit
                      ? 'border-line bg-surface hover:bg-raised'
                      : 'border-line bg-surface',
                ].join(' ')}
              >
                <span className="text-faint block font-mono text-[11px]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-ink block text-sm font-medium">{stage.name}</span>
                <span className="text-muted block font-mono text-xs tabular-nums">
                  {result ? `${formatInt(result.calls)} calls` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {selected && selectedResult && (
        <StagePanel stage={selected} rule={selected[design]} doc={document} />
      )}
    </div>
  );
}

interface CountersProps {
  calls: number;
  latencyMs: number;
  costUnits: number;
  baseline: { calls: number; latencyMs: number; costUnits: number };
  design: Design;
  instant: boolean;
}

function Counters({ calls, latencyMs, costUnits, baseline, design, instant }: CountersProps) {
  const c = useAnimatedNumber(calls, instant);
  const l = useAnimatedNumber(latencyMs, instant);
  const k = useAnimatedNumber(costUnits, instant);
  const isBatched = design === 'batched';
  return (
    <dl className="m-0 grid grid-cols-3 gap-2 sm:gap-3">
      <Counter
        label="Model calls"
        value={formatInt(c)}
        delta={isBatched ? formatRatio(baseline.calls, calls) : undefined}
      />
      <Counter
        label="Wall-clock (est.)"
        value={formatDuration(l)}
        delta={isBatched ? formatRatio(baseline.latencyMs, latencyMs) : undefined}
      />
      <Counter
        label="Relative cost"
        value={formatInt(k)}
        delta={isBatched ? formatRatio(baseline.costUnits, costUnits) : undefined}
      />
    </dl>
  );
}

function Counter({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string | undefined;
}) {
  return (
    <div className="border-line bg-surface rounded-lg border px-3 py-3 sm:px-4">
      <dt className="text-faint font-mono text-[11px] tracking-wide uppercase">{label}</dt>
      <dd className="text-ink m-0 mt-1 flex items-baseline gap-2 text-xl font-semibold tabular-nums sm:text-2xl">
        {value}
        {delta && (
          <span className="text-ok font-mono text-xs font-medium">{delta} less than naive</span>
        )}
      </dd>
    </div>
  );
}

function StagePanel({
  stage,
  rule,
  doc,
}: {
  stage: PipelineStage;
  rule: CallRule;
  doc: typeof pipelineFixture.document;
}) {
  return (
    <Panel title={stage.name}>
      <dl className="m-0">
        <Definition term="What it does">{stage.summary}</Definition>
        <Definition term="Why it exists">{stage.why}</Definition>
        <Definition term="What it guards">{stage.guards}</Definition>
        <Definition term="Call rule in this design">
          <span className="font-mono text-xs">{describeRule(rule, doc)}</span>
        </Definition>
      </dl>
    </Panel>
  );
}
