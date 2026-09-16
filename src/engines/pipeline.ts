import type { CallRule, PipelineFixture, PipelineStage } from '@/lib/schemas';

export type Design = 'naive' | 'batched';

export interface StageResult {
  id: string;
  calls: number;
  latencyMs: number;
  costUnits: number;
}

export interface PipelineResult {
  design: Design;
  stages: StageResult[];
  totals: Omit<StageResult, 'id'>;
}

type DocProfile = PipelineFixture['document'];
type CostModel = PipelineFixture['costModel'];

export function unitCount(per: CallRule['per'], doc: DocProfile): number {
  switch (per) {
    case 'document':
      return 1;
    case 'page':
      return doc.pages;
    case 'requirement':
      return doc.requirements;
    case 'code':
      return doc.standardsCodes;
    case 'language':
      return doc.languages;
    case 'requirement-language':
      return doc.requirements * doc.languages;
  }
}

function runStage(stage: PipelineStage, rule: CallRule, doc: DocProfile, cost: CostModel): StageResult {
  if (rule.model === 'none') {
    return { id: stage.id, calls: 0, latencyMs: rule.fixedLatencyMs, costUnits: 0 };
  }
  const tier = cost.tiers[rule.model];
  const units = unitCount(rule.per, doc);
  const groups = rule.batch ? Math.ceil(units / rule.batch) : units;
  const calls = groups * rule.calls;
  const waves = Math.ceil(calls / rule.concurrency);
  // A batched prompt carries more tokens than a single-item one; the overhead keeps the model honest.
  const promptFactor = rule.batch ? 1 + rule.batch * cost.batchOverhead : 1;
  return {
    id: stage.id,
    calls,
    latencyMs: waves * tier.latencyMs + rule.fixedLatencyMs,
    costUnits: calls * tier.unitCost * promptFactor,
  };
}

export function simulatePipeline(fixture: PipelineFixture, design: Design): PipelineResult {
  const stages = fixture.stages.map((stage) =>
    runStage(stage, stage[design], fixture.document, fixture.costModel),
  );
  const totals = stages.reduce(
    (acc, s) => ({
      calls: acc.calls + s.calls,
      latencyMs: acc.latencyMs + s.latencyMs,
      costUnits: acc.costUnits + s.costUnits,
    }),
    { calls: 0, latencyMs: 0, costUnits: 0 },
  );
  return { design, stages, totals };
}
