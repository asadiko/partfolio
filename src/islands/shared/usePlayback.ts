import { useEffect, useState } from 'react';

/**
 * Reveals timestamped items one by one, honouring the gaps between their `at` values.
 * Reveals everything at once when `instant` is set. Restarts on `runId`.
 */
export function usePlayback(items: readonly { at: number }[], runId: number, instant: boolean) {
  const [revealed, setRevealed] = useState(instant ? items.length : 0);

  useEffect(() => {
    if (instant) {
      setRevealed(items.length);
      return;
    }
    setRevealed(0);
    const timers = items.map((item, i) => window.setTimeout(() => setRevealed(i + 1), item.at));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [items, runId, instant]);

  return revealed;
}
