import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

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
  onResize: (width: number, height: number) => void;
  children: ReactNode;
}

const KEY_STEP = 24;

export function Window({
  win,
  title,
  active,
  onFocus,
  onClose,
  onZoom,
  onMove,
  onResize,
  children,
}: WindowProps) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

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

  const startResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    onFocus();
    resize.current = { x: e.clientX, y: e.clientY, width: win.width, height: win.height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = resize.current;
    if (!r) return;
    onResize(r.width + (e.clientX - r.x), r.height + (e.clientY - r.y));
  };
  const endResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    resize.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const keyResize = (e: KeyboardEvent<HTMLButtonElement>) => {
    const dx = e.key === 'ArrowRight' ? KEY_STEP : e.key === 'ArrowLeft' ? -KEY_STEP : 0;
    const dy = e.key === 'ArrowDown' ? KEY_STEP : e.key === 'ArrowUp' ? -KEY_STEP : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    onResize(win.width + dx, win.height + dy);
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
          aria-label={win.zoomed ? `Exit full screen for ${title}` : `Full screen ${title}`}
          onClick={onZoom}
        />
      </div>
      {children}
      <button
        type="button"
        className="os-window__grip"
        aria-label={`Resize ${title} (arrow keys)`}
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        onKeyDown={keyResize}
      />
    </section>
  );
}
