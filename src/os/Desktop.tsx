import { useCallback, useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';

import { EscrowTour } from '@/islands/escrow/EscrowTour';
import { GroundingDemo } from '@/islands/grounding/GroundingDemo';
import { JourneyMap } from '@/islands/journey/JourneyMap';
import { PipelineExplorer } from '@/islands/pipeline/PipelineExplorer';
import { FailurePlayground } from '@/islands/playground/FailurePlayground';

import { Icon } from './Icon';
import { MenuBar } from './MenuBar';
import { Window } from './Window';
import { About } from './apps/About';
import { DemoWindow } from './apps/DemoWindow';
import { Mail } from './apps/Mail';
import { ReadMe } from './apps/ReadMe';
import { Terminal } from './apps/Terminal';
import type { AppId } from './apps';
import { appIds, apps } from './apps';
import type { TerminalAction } from './terminal';
import type { DesktopData } from './types';
import type { Viewport } from './windowManager';
import { initialState, reduce } from './windowManager';
import { withBase } from '@/site';

interface DesktopProps {
  data: DesktopData;
  onShutdown: () => void;
}

const viewport = (): Viewport => ({ width: window.innerWidth, height: window.innerHeight });

export function Desktop({ data, onShutdown }: DesktopProps) {
  const [state, dispatch] = useReducer(reduce, initialState);
  const open = useCallback((id: AppId) => dispatch({ type: 'open', id, viewport: viewport() }), []);
  const closeActive = () => state.active && dispatch({ type: 'close', id: state.active });

  useEffect(() => {
    open('readme');
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.active) {
        dispatch({ type: 'close', id: state.active });
        return;
      }
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'w' && state.active) {
        e.preventDefault();
        dispatch({ type: 'close', id: state.active });
      } else if (e.key === 't') {
        e.preventDefault();
        open('terminal');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.active, open]);

  const onTerminal = (action: TerminalAction) => {
    if (action.type === 'open') open(action.app);
    if (action.type === 'shutdown') onShutdown();
  };

  const content: Record<AppId, () => ReactNode> = {
    pipeline: () => <DemoWindow doc={data.docs.pipeline} demo={<PipelineExplorer />} />,
    grounding: () => <DemoWindow doc={data.docs.grounding} demo={<GroundingDemo />} />,
    playground: () => <DemoWindow doc={data.docs.playground} demo={<FailurePlayground />} />,
    escrow: () => <DemoWindow doc={data.docs.escrow} demo={<EscrowTour />} />,
    journey: () => (
      <div className="os-window__body">
        <JourneyMap milestones={data.milestones} />
      </div>
    ),
    about: () => <About html={data.aboutHtml} />,
    mail: () => <Mail />,
    terminal: () => (
      <div className="os-window__body os-window__body--flush">
        <Terminal onAction={onTerminal} />
      </div>
    ),
    readme: () => <ReadMe />,
  };

  return (
    <div className="os theme-light desk__fade">
      <MenuBar
        activeTitle={state.active ? apps[state.active].title : null}
        onOpen={open}
        onCloseActive={closeActive}
        onShutdown={onShutdown}
      />

      <ul className="os-desktop-icons" aria-label="Applications">
        {appIds.map((id) => (
          <li key={id}>
            <button
              type="button"
              className="os-icon"
              onClick={() => open(id)}
              aria-label={`Open ${apps[id].title}`}
            >
              <Icon id={id} />
              <span className="os-icon__label">{apps[id].label}</span>
            </button>
          </li>
        ))}
      </ul>

      {state.windows.map((win) => (
        <Window
          key={win.id}
          win={win}
          title={apps[win.id].title}
          active={state.active === win.id}
          onFocus={() => dispatch({ type: 'focus', id: win.id })}
          onClose={() => dispatch({ type: 'close', id: win.id })}
          onZoom={() => dispatch({ type: 'zoom', id: win.id, viewport: viewport() })}
          onMove={(x, y) => dispatch({ type: 'move', id: win.id, x, y, viewport: viewport() })}
          onResize={(width, height) =>
            dispatch({ type: 'resize', id: win.id, width, height, viewport: viewport() })
          }
        >
          {content[win.id]()}
        </Window>
      ))}

      <p className="os-caption">
        AsadOS · simulated — every app runs on fixture data ·{' '}
        <a href={withBase('/work')} style={{ color: 'inherit' }}>
          text version
        </a>
      </p>
    </div>
  );
}
