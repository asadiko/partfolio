import { useEffect, useState } from 'react';

/**
 * Advances `index` from 0 to `count` on a fixed cadence, or jumps straight to the end
 * when motion is reduced. Restarts whenever `runId` changes.
 */
export function useTicker(count: number, stepMs: number, runId: number, instant: boolean) {
  const [index, setIndex] = useState(instant ? count : 0);

  useEffect(() => {
    if (instant || count === 0) {
      setIndex(count);
      return;
    }
    setIndex(0);
    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setIndex(current);
      if (current >= count) window.clearInterval(timer);
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [count, stepMs, runId, instant]);

  return index;
}
