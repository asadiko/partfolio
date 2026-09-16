import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 600;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Tweens towards `target` with requestAnimationFrame; snaps when motion is reduced. */
export function useAnimatedNumber(target: number, instant: boolean): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    if (instant) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const next = from + (target - from) * easeOut(t);
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, instant]);

  return value;
}
