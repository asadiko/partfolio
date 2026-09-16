import { describe, expect, it } from 'vitest';

import { playgroundFixture } from '@/lib/fixtures';
import { scenarioIdSchema } from '@/lib/schemas';

import { runScenario } from './playground';

const { diagram } = playgroundFixture;
const nodeIds = new Set(diagram.nodes.map((n) => n.id));
const edgeIds = new Set(diagram.edges.map((e) => e.id));

describe('runScenario', () => {
  for (const id of scenarioIdSchema.options) {
    describe(id, () => {
      const events = runScenario(id, diagram);

      it('produces a non-empty, time-ordered event list', () => {
        expect(events.length).toBeGreaterThan(3);
        for (let i = 1; i < events.length; i++) {
          expect(events[i]?.at).toBeGreaterThanOrEqual(events[i - 1]?.at ?? 0);
        }
      });

      it('only targets nodes and edges that exist in the diagram', () => {
        for (const event of events) {
          if ('node' in event.target) expect(nodeIds.has(event.target.node)).toBe(true);
          else expect(edgeIds.has(event.target.edge)).toBe(true);
        }
      });

      it('ends with the client in a terminal state', () => {
        const last = events.at(-1);
        expect(last?.target).toEqual({ node: 'client' });
        expect(['ok', 'recover']).toContain(last?.kind);
      });
    });
  }

  it('keeps the happy path free of failures', () => {
    const kinds = runScenario('happy-path', diagram).map((e) => e.kind);
    expect(kinds).not.toContain('fail');
    expect(kinds).not.toContain('warn');
  });

  it('every failure scenario contains at least one fail and one recover event', () => {
    for (const id of scenarioIdSchema.options.filter((s) => s !== 'happy-path')) {
      const kinds = runScenario(id, diagram).map((e) => e.kind);
      expect(kinds, id).toContain('fail');
      expect(kinds, id).toContain('recover');
    }
  });

  it('throws on an unknown diagram node', () => {
    const broken = { ...diagram, nodes: diagram.nodes.filter((n) => n.id !== 'gateway') };
    expect(() => runScenario('happy-path', broken)).toThrow(/gateway/);
  });
});
