import { z } from 'zod';

const id = z.string().min(1);

export const modelTierSchema = z.enum(['cheap', 'strong', 'none']);

export const callRuleSchema = z.object({
  per: z.enum(['document', 'page', 'requirement', 'code', 'language', 'requirement-language']),
  model: modelTierSchema,
  calls: z.number().int().positive().default(1),
  batch: z.number().int().positive().optional(),
  concurrency: z.number().int().positive().default(1),
  fixedLatencyMs: z.number().nonnegative().default(0),
});

export const pipelineStageSchema = z.object({
  id,
  name: z.string(),
  summary: z.string(),
  why: z.string(),
  guards: z.string(),
  naive: callRuleSchema,
  batched: callRuleSchema,
});

export const pipelineFixtureSchema = z.object({
  document: z.object({
    id,
    title: z.string(),
    note: z.string(),
    pages: z.number().int().positive(),
    requirements: z.number().int().positive(),
    standardsCodes: z.number().int().nonnegative(),
    languages: z.number().int().positive(),
  }),
  costModel: z.object({
    batchOverhead: z.number().nonnegative(),
    tiers: z.record(
      z.enum(['cheap', 'strong']),
      z.object({ unitCost: z.number().positive(), latencyMs: z.number().positive() }),
    ),
  }),
  stages: z.array(pipelineStageSchema).min(1),
});

export const claimSchema = z.object({ id, text: z.string(), sourceIds: z.array(id) });

export const groundingFixtureSchema = z.object({
  corpus: z.array(z.object({ id, source: z.string(), text: z.string() })).min(1),
  questions: z
    .array(
      z.object({
        id,
        text: z.string(),
        topK: z.number().int().positive(),
        retrieval: z.array(z.object({ chunkId: id, score: z.number().min(0).max(1) })).min(1),
        draft: z.array(claimSchema).min(1),
        retry: z.array(claimSchema).min(1),
      }),
    )
    .min(1),
});

export const diagramNodeSchema = z.object({
  id,
  label: z.string(),
  sublabel: z.string().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
  card: z.object({ job: z.string(), guards: z.string(), tradeoff: z.string() }),
});

export const diagramEdgeSchema = z.object({
  id,
  from: id,
  to: id,
  label: z.string(),
  flow: z.string(),
});

export const diagramSpecSchema = z
  .object({
    width: z.number().positive(),
    height: z.number().positive(),
    nodes: z.array(diagramNodeSchema).min(1),
    edges: z.array(diagramEdgeSchema),
  })
  .superRefine((spec, ctx) => {
    const nodeIds = new Set(spec.nodes.map((n) => n.id));
    for (const edge of spec.edges) {
      for (const end of [edge.from, edge.to]) {
        if (!nodeIds.has(end)) {
          ctx.addIssue({ code: 'custom', message: `edge ${edge.id} references unknown node ${end}` });
        }
      }
    }
  });

export const scenarioIdSchema = z.enum([
  'happy-path',
  'malformed-output',
  'endpoint-timeout',
  'client-cancel',
  'provider-outage',
  'proxy-idle-kill',
]);

export const playgroundFixtureSchema = z.object({
  diagram: diagramSpecSchema,
  scenarios: z.array(
    z.object({
      id: scenarioIdSchema,
      label: z.string(),
      description: z.string(),
      guard: z.string(),
    }),
  ),
});

export const escrowFixtureSchema = z.object({
  diagram: diagramSpecSchema,
  tour: z.array(z.object({ nodeId: id, text: z.string() })).min(1),
});

export type ModelTier = z.infer<typeof modelTierSchema>;
export type CallRule = z.infer<typeof callRuleSchema>;
export type PipelineStage = z.infer<typeof pipelineStageSchema>;
export type PipelineFixture = z.infer<typeof pipelineFixtureSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type GroundingFixture = z.infer<typeof groundingFixtureSchema>;
export type GroundingQuestion = GroundingFixture['questions'][number];
export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;
export type DiagramSpec = z.infer<typeof diagramSpecSchema>;
export type ScenarioId = z.infer<typeof scenarioIdSchema>;
export type PlaygroundFixture = z.infer<typeof playgroundFixtureSchema>;
export type EscrowFixture = z.infer<typeof escrowFixtureSchema>;
