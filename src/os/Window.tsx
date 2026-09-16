import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import type { WindowState } from './windowManager';
import { cx } from '@/lib/cx';

interface WindowProps {
  win: WindowState;
  title: string;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onZoom: () => void;
  onMove: (x: number, y: number) => void;
  children: ReactNode;
}

export function Window({
  win,
  title,
  active,
  onFocus,
  onClose,
  onZoom,
  onMove,
  children,
}: WindowProps) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (active) ref.current?.focus({ preventScroll: true });
  }, [active]);

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onFocus();
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    onMove(e.clientX - drag.current.dx, e.clientY - drag.current.dy);
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <section
      ref={ref}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      className={cx('os-window', active && 'os-window--active')}
      style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z }}
      onPointerDownCapture={onFocus}
    >
      {/* Dragging is pointer-only by design; keyboard users zoom instead (jsx-a11y rule relaxed). */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="os-window__title"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onZoom}
      >
        <button
          type="button"
          className="os-window__box"
          aria-label={`Close ${title}`}
          onClick={onClose}
        />
        <span className="os-window__name">{title}</span>
        <button
          type="button"
          className="os-window__box os-window__box--zoom"
          aria-label={win.zoomed ? `Restore ${title}` : `Zoom ${title}`}
          onClick={onZoom}
        />
      </div>
      {children}
    </section>
  );
}
