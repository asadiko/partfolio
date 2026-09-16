import { describe, expect, it } from 'vitest';

import { Tweens, easeInOutCubic } from './tween';

describe('Tweens', () => {
  it('drives update from 0 to 1 over the duration and resolves once', async () => {
    const tweens = new Tweens();
    const seen: number[] = [];
    const done = tweens.run(
      1,
      (t) => seen.push(t),
      (t) => t,
    );
    tweens.step(0.25);
    tweens.step(0.25);
    tweens.step(0.6);
    await done;
    expect(seen).toEqual([0.25, 0.5, 1]);
    expect(tweens.size).toBe(0);
  });

  it('completes immediately for a zero duration', async () => {
    const tweens = new Tweens();
    let value = 0;
    await tweens.run(0, (t) => (value = t));
    expect(value).toBe(1);
  });

  it('eases symmetrically', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });
});
