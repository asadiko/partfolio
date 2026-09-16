import { describe, expect, it } from 'vitest';

import { initialState, reduce } from './windowManager';

const viewport = { width: 1400, height: 900 };
const open = (state = initialState, id: 'pipeline' | 'mail' | 'about' = 'pipeline') =>
  reduce(state, { type: 'open', id, viewport });

describe('windowManager', () => {
  it('opens a window centred with cascade offset and makes it active', () => {
    const s = open();
    expect(s.windows).toHaveLength(1);
    expect(s.active).toBe('pipeline');
    const w = s.windows[0];
    expect(w?.x).toBeGreaterThan(0);
    expect(w?.x).toBeLessThan(viewport.width - (w?.width ?? 0));
  });

  it('cascades subsequent windows and assigns increasing z-order', () => {
    const s = open(open(), 'mail');
    const [first, second] = s.windows;
    expect(second?.z).toBeGreaterThan(first?.z ?? 0);
    expect(second?.x).not.toBe(first?.x);
    expect(s.active).toBe('mail');
  });

  it('re-opening an app focuses it instead of duplicating', () => {
    const s = open(open(open(), 'mail'), 'pipeline');
    expect(s.windows).toHaveLength(2);
    expect(s.active).toBe('pipeline');
    const pipeline = s.windows.find((w) => w.id === 'pipeline');
    const mail = s.windows.find((w) => w.id === 'mail');
    expect(pipeline?.z).toBeGreaterThan(mail?.z ?? 0);
  });

  it('closing hands focus to the top-most remaining window', () => {
    let s = open(open(open(), 'mail'), 'about');
    s = reduce(s, { type: 'close', id: 'about' });
    expect(s.windows.map((w) => w.id)).toEqual(['pipeline', 'mail']);
    expect(s.active).toBe('mail');
    s = reduce(reduce(s, { type: 'close', id: 'mail' }), { type: 'close', id: 'pipeline' });
    expect(s.active).toBeNull();
  });

  it('moves a window but keeps its title bar reachable', () => {
    let s = open();
    s = reduce(s, { type: 'move', id: 'pipeline', x: -5000, y: -5000, viewport });
    const w = s.windows[0];
    expect(w?.x).toBeGreaterThanOrEqual(-(w?.width ?? 0) + 80);
    expect(w?.y).toBeGreaterThanOrEqual(0);
  });

  it('docks windows to the bottom on phones, leaving the icons visible', () => {
    const s = reduce(initialState, {
      type: 'open',
      id: 'pipeline',
      viewport: { width: 390, height: 700 },
    });
    const w = s.windows[0];
    expect(w?.width).toBe(390 - 16);
    expect(w?.y).toBeGreaterThan(200);
    expect((w?.y ?? 0) + (w?.height ?? 0)).toBeLessThanOrEqual(700);
  });

  it('resizes within the viewport and enforces a minimum size', () => {
    let s = open();
    s = reduce(s, { type: 'resize', id: 'pipeline', width: 10, height: 10, viewport });
    expect(s.windows[0]).toMatchObject({ width: 280, height: 160 });
    s = reduce(s, { type: 'resize', id: 'pipeline', width: 9999, height: 9999, viewport });
    const w = s.windows[0];
    expect((w?.x ?? 0) + (w?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
    expect((w?.y ?? 0) + (w?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
  });

  it('toggles zoom and restores the previous frame', () => {
    let s = open();
    const before = s.windows[0];
    s = reduce(s, { type: 'zoom', id: 'pipeline', viewport });
    expect(s.windows[0]?.zoomed).toBe(true);
    expect(s.windows[0]?.width).toBe(viewport.width);
    s = reduce(s, { type: 'zoom', id: 'pipeline', viewport });
    expect(s.windows[0]).toMatchObject({ zoomed: false, x: before?.x, width: before?.width });
  });

  it('closes everything on reset', () => {
    const s = reduce(open(open(), 'mail'), { type: 'reset' });
    expect(s).toEqual(initialState);
  });
});
