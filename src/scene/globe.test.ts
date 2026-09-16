import { describe, expect, it } from 'vitest';

import { shortestTurn } from './globe';

describe('shortestTurn', () => {
  it('keeps small deltas', () => {
    expect(shortestTurn(0.5)).toBeCloseTo(0.5);
    expect(shortestTurn(-0.5)).toBeCloseTo(-0.5);
  });
  it('wraps long turns to the short way round', () => {
    expect(shortestTurn(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
    expect(shortestTurn(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
    expect(shortestTurn(Math.PI * 4 + 0.1)).toBeCloseTo(0.1);
  });
});
