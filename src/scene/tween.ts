export type Ease = (t: number) => number;

export const easeInOutCubic: Ease = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

interface Tween {
  elapsed: number;
  duration: number;
  ease: Ease;
  update: (t: number) => void;
  resolve: () => void;
}

/** Minimal tween scheduler driven by the render loop, so animations pause with it. */
export class Tweens {
  private readonly active = new Set<Tween>();

  run(duration: number, update: (t: number) => void, ease: Ease = easeInOutCubic): Promise<void> {
    return new Promise((resolve) => {
      if (duration <= 0) {
        update(1);
        resolve();
        return;
      }
      this.active.add({ elapsed: 0, duration, ease, update, resolve });
    });
  }

  step(dt: number) {
    for (const tween of this.active) {
      tween.elapsed += dt;
      const t = Math.min(1, tween.elapsed / tween.duration);
      tween.update(tween.ease(t));
      if (t >= 1) {
        this.active.delete(tween);
        tween.resolve();
      }
    }
  }

  get size() {
    return this.active.size;
  }
}
