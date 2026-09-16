import type { AppId } from './apps';
import { apps } from './apps';

export interface Viewport {
  width: number;
  height: number;
}

export interface WindowFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState extends WindowFrame {
  id: AppId;
  z: number;
  zoomed: boolean;
  restore?: WindowFrame;
}

export interface WmState {
  windows: WindowState[];
  active: AppId | null;
  nextZ: number;
}

export type WmAction =
  | { type: 'open'; id: AppId; viewport: Viewport }
  | { type: 'close'; id: AppId }
  | { type: 'focus'; id: AppId }
  | { type: 'move'; id: AppId; x: number; y: number; viewport: Viewport }
  | { type: 'zoom'; id: AppId; viewport: Viewport }
  | { type: 'reset' };

export const initialState: WmState = { windows: [], active: null, nextZ: 1 };

const MENU_BAR = 22;
const CASCADE = 28;
const MIN_VISIBLE = 80;
const MOBILE_BREAKPOINT = 640;

function fit(id: AppId, viewport: Viewport, index: number): WindowFrame {
  const meta = apps[id];
  if (viewport.width < MOBILE_BREAKPOINT) {
    return { x: 0, y: MENU_BAR, width: viewport.width, height: viewport.height - MENU_BAR };
  }
  const width = Math.min(meta.width, viewport.width - 32);
  const height = Math.min(meta.height, viewport.height - MENU_BAR - 32);
  const offset = (index % 6) * CASCADE;
  return {
    x: Math.max(16, Math.round((viewport.width - width) / 2) + offset - CASCADE * 2),
    y: Math.max(MENU_BAR + 8, Math.round((viewport.height - height) / 2) + offset - CASCADE),
    width,
    height,
  };
}

function clamp(frame: WindowFrame, viewport: Viewport): WindowFrame {
  return {
    ...frame,
    x: Math.min(Math.max(frame.x, MIN_VISIBLE - frame.width), viewport.width - MIN_VISIBLE),
    y: Math.min(Math.max(frame.y, MENU_BAR), viewport.height - MIN_VISIBLE),
  };
}

const topMost = (windows: WindowState[]): AppId | null =>
  windows.reduce<WindowState | null>((top, w) => (!top || w.z > top.z ? w : top), null)?.id ?? null;

function raise(state: WmState, id: AppId): WmState {
  return {
    ...state,
    active: id,
    nextZ: state.nextZ + 1,
    windows: state.windows.map((w) => (w.id === id ? { ...w, z: state.nextZ } : w)),
  };
}

export function reduce(state: WmState, action: WmAction): WmState {
  switch (action.type) {
    case 'open': {
      if (state.windows.some((w) => w.id === action.id)) return raise(state, action.id);
      const frame = fit(action.id, action.viewport, state.windows.length);
      const win: WindowState = { id: action.id, ...frame, z: state.nextZ, zoomed: false };
      return { windows: [...state.windows, win], active: action.id, nextZ: state.nextZ + 1 };
    }
    case 'close': {
      const windows = state.windows.filter((w) => w.id !== action.id);
      return { ...state, windows, active: topMost(windows) };
    }
    case 'focus':
      return state.active === action.id ? state : raise(state, action.id);
    case 'move':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id
            ? { ...w, ...clamp({ ...w, x: action.x, y: action.y }, action.viewport) }
            : w,
        ),
      };
    case 'zoom':
      return {
        ...state,
        windows: state.windows.map((w) => {
          if (w.id !== action.id) return w;
          if (w.zoomed && w.restore) {
            const { restore, ...rest } = w;
            return { ...rest, ...restore, zoomed: false };
          }
          const { x, y, width, height } = w;
          return {
            ...w,
            zoomed: true,
            restore: { x, y, width, height },
            x: 0,
            y: MENU_BAR,
            width: action.viewport.width,
            height: action.viewport.height - MENU_BAR,
          };
        }),
      };
    case 'reset':
      return initialState;
  }
}
