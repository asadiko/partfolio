import { useMemo, useState } from 'react';

import type { Design } from '@/engines/pipeline';
import { simulatePipeline, unitCount } from '@/engines/pipeline';
import { pipelineFixture } from '@/lib/fixtures';
import { formatDuration, formatInt, formatRatio } from '@/lib/format';
import { usePrefersReducedMotion } from '@/lib/motion';
import type { CallRule, DiagramSpec, PipelineNode } from '@/lib/schemas';

import type { NodeStatus } from '../diagram/Diagram';
import { Diagram } from '../diagram/Diagram';
import { SimBadge } from '../shared/SimBadge';
import { Button, Definition, Panel, Segmented } from '../shared/ui';
import { useAnimatedNumber } from '../shared/useAnimatedNumber';
import { useTicker } from '../shared/useTicker';

const STEP_MS = 380;
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

type Doc = typeof pipelineFixture.document;

function describeRule(rule: CallRule, doc: Doc): string {
  if (rule.model === 'none') {
    return rule.fixedLatencyMs
      ? `no model call · ${formatDuration(rule.fixedLatencyMs)} of deterministic work`
      : 'no model call';
  }
  const units = Math.round(unitCount(rule.per, doc) * rule.fraction);
  const per = unitLabel[rule.per];
  const model = rule.model === 'cheap' ? 'cheap model' : 'strong model';
  const calls = rule.calls === 1 ? '1 call' : `${rule.calls} calls`;
  const share =
    rule.fraction < 1 ? ` (${Math.round(rule.fraction * 100)}% of ${per}s touched)` : '';
  if (rule.batch) {
    return `${calls} per batch of ${rule.batch} ${per}s over ${formatInt(units)}${share} · ${model} · ${rule.concurrency} concurrent`;
  }
  return `${calls} per ${per} × ${formatInt(units)}${share} · ${model} · ${rule.concurrency} concurrent`;
}

const toDiagram = (nodes: PipelineNode[]): DiagramSpec => ({
  width: pipelineFixture.width,
  height: pipelineFixture.height,
  edges: pipelineFixture.edges,
  nodes: nodes.map((n) => ({
    id: n.id,
    label: n.label,
    sublabel: n.sublabel,
    kind: n.kind,
    x: n.x,
    y: n.y,
    w: n.w,
    h: n.h,
    card: { job: n.summary, guards: n.guards, tradeoff: n.why },
  })),
});

export function PipelineExplorer() {
  const reduced = usePrefersReducedMotion();
  const [design, setDesign] = useState<Design>('naive');
  const [runId, setRunId] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>('enrich');

  const { document, nodes } = pipelineFixture;
  const spec = useMemo(() => toDiagram(nodes), [nodes]);
  const results = useMemo(
    () => ({
      naive: simulatePipeline(pipelineFixture, 'naive'),
      batched: simulatePipeline(pipelineFixture, 'batched'),
    }),
    [],
  );
  const current = results[design];
  const lit = useTicker(nodes.length, STEP_MS, runId, reduced);

  const status = useMemo(() => {
    const s: Record<string, NodeStatus> = {};
    nodes
      .slice(0, lit)
      .forEach((n, i) => (s[n.id] = i === lit - 1 && lit < nodes.length ? 'info' : 'ok'));
    return s;
  }, [nodes, lit]);
  const activeEdges = useMemo(() => {
    const litIds = new Set(nodes.slice(0, lit).map((n) => n.id));
    const latest = nodes[lit - 1]?.id;
    return new Set(
      spec.edges.filter((e) => e.to === latest && litIds.has(e.from)).map((e) => e.id),
    );
  }, [nodes, lit, spec.edges]);
  const badges = useMemo(
    () =>
      Object.fromEntries(
        current.stages.map((s) => [
          s.id,
          s.calls === 0 ? '0 calls' : `${formatInt(s.calls)} calls`,
        ]),
      ),
    [current],
  );

  const selected = nodes.find((n) => n.id === selectedId);
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
        totals={current.totals}
        baseline={results.naive.totals}
        design={design}
        instant={reduced}
      />

      <div className="border-line bg-surface overflow-x-auto rounded-lg border p-3 sm:p-4">
        <div className="min-w-[760px]">
          <Diagram
            spec={spec}
            title="Document pipeline as a directed graph, from ingest to streamed result"
            status={status}
            badges={badges}
            activeEdges={activeEdges}
            selected={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      {selected ? (
        <StagePanel stage={selected} rule={selected[design]} doc={document} />
      ) : (
        <Panel title="Stage details">
          <p className="text-muted m-0 text-sm">Select a stage in the graph.</p>
        </Panel>
      )}
    </div>
  );
}

interface Totals {
  calls: number;
  latencyMs: number;
  costUnits: number;
}

function Counters({
  totals,
  baseline,
  design,
  instant,
}: {
  totals: Totals;
  baseline: Totals;
  design: Design;
  instant: boolean;
}) {
  const c = useAnimatedNumber(totals.calls, instant);
  const l = useAnimatedNumber(totals.latencyMs, instant);
  const k = useAnimatedNumber(totals.costUnits, instant);
  const isBatched = design === 'batched';
  return (
    <dl className="m-0 grid grid-cols-3 gap-2 sm:gap-3">
      <Counter
        label="Model calls"
        value={formatInt(c)}
        delta={isBatched ? formatRatio(baseline.calls, totals.calls) : undefined}
      />
      <Counter
        label="Wall-clock (est.)"
        value={formatDuration(l)}
        delta={isBatched ? formatRatio(baseline.latencyMs, totals.latencyMs) : undefined}
      />
      <Counter
        label="Relative cost"
        value={formatInt(k)}
        delta={isBatched ? formatRatio(baseline.costUnits, totals.costUnits) : undefined}
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
    <div className="border-line bg-surface min-w-0 rounded-lg border px-3 py-3 sm:px-4">
      <dt className="text-faint font-mono text-[11px] tracking-wide uppercase">{label}</dt>
      <dd className="text-ink m-0 mt-1 flex flex-wrap items-baseline gap-x-2 text-xl font-semibold tabular-nums sm:text-2xl">
        {value}
        {delta && (
          <span className="text-ok font-mono text-xs font-medium">{delta} less than naive</span>
        )}
      </dd>
    </div>
  );
}

function StagePanel({ stage, rule, doc }: { stage: PipelineNode; rule: CallRule; doc: Doc }) {
  return (
    <Panel title={stage.label}>
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
