import { describe, expect, it } from 'vitest';

import type { Claim } from '@/lib/schemas';

import { groundAnswer, matchQuestion, retrievedIds } from './grounding';

const claim = (id: string, ...sourceIds: string[]): Claim => ({ id, text: id, sourceIds });
const retrieved = new Set(['c1', 'c2']);

describe('groundAnswer', () => {
  it('passes a fully supported draft through unchanged', () => {
    const draft = [claim('a', 'c1'), claim('b', 'c1', 'c2')];
    const result = groundAnswer(draft, retrieved, undefined, { enforce: true });
    expect(result.claims.map((c) => c.status)).toEqual(['supported', 'supported']);
    expect(result).toMatchObject({ retried: false, stripped: 0 });
  });

  it('strips claims citing sources outside the retrieved set and retries once', () => {
    const draft = [claim('a', 'c1'), claim('b', 'c9')];
    const retry = [claim('a', 'c1'), claim('b2', 'c2')];
    const result = groundAnswer(draft, retrieved, retry, { enforce: true });
    expect(result.retried).toBe(true);
    expect(result.stripped).toBe(1);
    expect(result.firstPass?.map((c) => c.status)).toEqual(['supported', 'stripped']);
    expect(result.claims.map((c) => c.id)).toEqual(['a', 'b2']);
  });

  it('strips again on the retry but does not retry a second time', () => {
    const draft = [claim('a', 'c9')];
    const retry = [claim('a', 'c9'), claim('b', 'c1')];
    const result = groundAnswer(draft, retrieved, retry, { enforce: true });
    expect(result.retried).toBe(true);
    expect(result.claims.map((c) => c.status)).toEqual(['stripped', 'supported']);
    expect(result.stripped).toBe(2);
  });

  it('treats a claim with no sources as unsupported', () => {
    const result = groundAnswer([claim('a')], retrieved, undefined, { enforce: true });
    expect(result.claims[0]?.status).toBe('stripped');
  });

  it('only flags unsupported claims when enforcement is off', () => {
    const draft = [claim('a', 'c1'), claim('b', 'c9')];
    const result = groundAnswer(draft, retrieved, [claim('x', 'c1')], { enforce: false });
    expect(result.claims.map((c) => c.status)).toEqual(['supported', 'unsupported']);
    expect(result.retried).toBe(false);
    expect(result.stripped).toBe(0);
  });
});

describe('retrievedIds', () => {
  it('keeps the top-k chunk ids by score', () => {
    const ids = retrievedIds(
      [
        { chunkId: 'low', score: 0.2 },
        { chunkId: 'high', score: 0.9 },
        { chunkId: 'mid', score: 0.5 },
      ],
      2,
    );
    expect([...ids]).toEqual(['high', 'mid']);
  });
});

describe('matchQuestion', () => {
  const questions = [
    { id: 'safe', text: 'Which HTTP methods are safe?' },
    { id: 'idempotent', text: 'Is DELETE idempotent?' },
  ];

  it('matches on token overlap ignoring case and punctuation', () => {
    expect(matchQuestion('is delete idempotent', questions)).toBe('idempotent');
    expect(matchQuestion('What are the SAFE methods?', questions)).toBe('safe');
  });

  it('returns undefined when nothing overlaps enough', () => {
    expect(matchQuestion('tell me about cookies', questions)).toBeUndefined();
    expect(matchQuestion('', questions)).toBeUndefined();
  });
});
