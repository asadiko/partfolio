import { describe, expect, it } from 'vitest';

import type { PipelineFixture, PipelineStage } from '@/lib/schemas';

import { simulatePipeline, unitCount } from './pipeline';

const document: PipelineFixture['document'] = {
  id: 'doc',
  title: 'Doc',
  note: '',
  pages: 10,
  requirements: 25,
  standardsCodes: 8,
  languages: 2,
};

const costModel: PipelineFixture['costModel'] = {
  batchOverhead: 0.1,
  tiers: {
    cheap: { unitCost: 1, latencyMs: 100 },
    strong: { unitCost: 10, latencyMs: 1000 },
  },
};

const stage = (overrides: Partial<PipelineStage> & Pick<PipelineStage, 'id'>): PipelineStage => ({
  name: overrides.id,
  summary: '',
  why: '',
  guards: '',
  naive: { per: 'requirement', model: 'strong', calls: 1, concurrency: 1, fixedLatencyMs: 0 },
  batched: {
    per: 'requirement',
    model: 'strong',
    calls: 1,
    batch: 10,
    concurrency: 1,
    fixedLatencyMs: 0,
  },
  ...overrides,
});

const fixture = (stages: PipelineStage[]): PipelineFixture => ({ document, costModel, stages });

describe('unitCount', () => {
  it('maps every unit kind onto the document profile', () => {
    expect(unitCount('document', document)).toBe(1);
    expect(unitCount('page', document)).toBe(10);
    expect(unitCount('requirement', document)).toBe(25);
    expect(unitCount('code', document)).toBe(8);
    expect(unitCount('language', document)).toBe(2);
    expect(unitCount('requirement-language', document)).toBe(50);
  });
});

describe('simulatePipeline', () => {
  it('charges one call per unit in the naive design', () => {
    const result = simulatePipeline(fixture([stage({ id: 'enrich' })]), 'naive');
    expect(result.stages[0]?.calls).toBe(25);
    expect(result.stages[0]?.costUnits).toBe(250);
    expect(result.stages[0]?.latencyMs).toBe(25_000);
  });

  it('rounds batches up and applies the batch overhead to cost', () => {
    const result = simulatePipeline(fixture([stage({ id: 'enrich' })]), 'batched');
    expect(result.stages[0]?.calls).toBe(3);
    expect(result.stages[0]?.costUnits).toBeCloseTo(3 * 10 * (1 + 10 * 0.1));
  });

  it('divides latency by concurrency in whole waves', () => {
    const s = stage({
      id: 'extract',
      naive: { per: 'page', model: 'strong', calls: 1, concurrency: 4, fixedLatencyMs: 0 },
    });
    const result = simulatePipeline(fixture([s]), 'naive');
    expect(result.stages[0]?.latencyMs).toBe(3 * 1000);
  });

  it('treats model "none" as zero calls with fixed latency', () => {
    const s = stage({
      id: 'scan',
      batched: { per: 'document', model: 'none', calls: 1, concurrency: 1, fixedLatencyMs: 40 },
    });
    const result = simulatePipeline(fixture([s]), 'batched');
    expect(result.stages[0]).toMatchObject({ calls: 0, costUnits: 0, latencyMs: 40 });
  });

  it('sums totals across stages', () => {
    const result = simulatePipeline(fixture([stage({ id: 'a' }), stage({ id: 'b' })]), 'naive');
    expect(result.totals).toEqual({ calls: 50, costUnits: 500, latencyMs: 50_000 });
  });

  it('never makes the batched design more expensive than the naive one on the real fixture', async () => {
    const { pipelineFixture } = await import('@/lib/fixtures');
    const naive = simulatePipeline(pipelineFixture, 'naive');
    const batched = simulatePipeline(pipelineFixture, 'batched');
    expect(batched.totals.calls).toBeLessThan(naive.totals.calls);
    expect(batched.totals.costUnits).toBeLessThan(naive.totals.costUnits);
    expect(batched.totals.latencyMs).toBeLessThan(naive.totals.latencyMs);
  });
});
