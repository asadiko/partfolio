import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode, WheelEvent } from 'react';

import { Button } from './ui';

const STEPS = [0.6, 0.8, 1, 1.25, 1.5, 2] as const;
const DRAG_THRESHOLD = 4;

/** Scrollable pane for large diagrams: zoom buttons, ⌘/Ctrl+wheel zoom, drag to pan. */
export function ZoomPane({
  children,
  minWidth,
  label,
}: {
  children: ReactNode;
  minWidth: number;
  label: string;
}) {
  const [step, setStep] = useState(2);
  const [panning, setPanning] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(
    null,
  );
  const scale = STEPS[step] ?? 1;
  const zoom = (delta: number) =>
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + delta)));

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1 : -1);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = viewport.current;
    if (!el || e.button !== 0) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
    };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = viewport.current;
    const d = drag.current;
    if (!el || !d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setPanning(true);
    el.scrollLeft = d.left - dx;
    el.scrollTop = d.top - dy;
  };
  const onPointerUp = () => {
    drag.current = null;
    setPanning(false);
  };

  return (
    <div className="border-line bg-surface rounded-lg border">
      <div className="border-line flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-faint font-mono text-[11px] tracking-wide uppercase">{label}</span>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <Button onClick={() => zoom(-1)} disabled={step === 0} aria-label="Zoom out">
            −
          </Button>
          <span className="text-muted w-12 text-center font-mono text-xs tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <Button onClick={() => zoom(1)} disabled={step === STEPS.length - 1} aria-label="Zoom in">
            +
          </Button>
          <Button onClick={() => setStep(2)} disabled={step === 2}>
            Reset
          </Button>
        </div>
      </div>
      <div
        ref={viewport}
        className={`max-h-[80vh] overflow-auto p-3 sm:p-4 ${panning ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div style={{ zoom: scale, minWidth }}>{children}</div>
      </div>
    </div>
  );
}
