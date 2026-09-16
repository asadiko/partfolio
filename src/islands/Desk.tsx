import { useCallback, useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '@/lib/motion';
import { Desktop } from '@/os/Desktop';
import type { DesktopData } from '@/os/types';
import type { Room, Theme } from '@/scene/room';

import { Button } from './shared/ui';
import { cx } from '@/lib/cx';

type Phase = 'loading' | 'room' | 'booting' | 'desktop' | 'shutdown';

const currentTheme = (): Theme => {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'dark' || forced === 'light') return forced;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function Desk({ data }: { data: DesktopData }) {
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [ready, setReady] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const boot = useCallback(async () => {
    const room = roomRef.current;
    if (!room || phaseRef.current !== 'room') return;
    setPhase('booting');
    await room.focusScreen();
    room.screen.setMode('boot');
    await new Promise((r) => setTimeout(r, room.screen.bootDuration * 1000 + 200));
    room.pause();
    setPhase('desktop');
  }, []);

  const shutdown = async () => {
    const room = roomRef.current;
    if (!room) {
      window.location.assign('/work');
      return;
    }
    setPhase('shutdown');
    room.screen.setMode('off');
    room.resume();
    await room.unfocus();
    room.screen.setMode('saver');
    setPhase('room');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) {
      setPhase('desktop');
      return;
    }
    let disposed = false;
    let room: Room | null = null;
    (async () => {
      const { createRoom, isWebGLAvailable } = await import('@/scene/room');
      if (disposed) return;
      if (!isWebGLAvailable()) {
        setPhase('desktop');
        return;
      }
      room = createRoom(canvas, { theme: currentTheme(), onScreenClick: () => void boot() });
      roomRef.current = room;
      setReady(true);
      setPhase('room');
    })();
    const themeObserver = new MutationObserver(() => room?.setTheme(currentTheme()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      disposed = true;
      themeObserver.disconnect();
      room?.dispose();
      roomRef.current = null;
    };
  }, [reduced, boot]);

  useEffect(() => {
    if (phase !== 'room') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Enter' && void boot();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, boot]);

  return (
    <div className="desk">
      <canvas
        ref={canvasRef}
        className={cx('desk__canvas', ready && 'desk__canvas--ready')}
        aria-label="A 3D iMac on a desk. Click its screen to start."
        hidden={phase === 'desktop'}
      />

      {(phase === 'room' || phase === 'loading') && (
        <>
          <div className="desk__intro desk__fade">
            <p className="text-faint m-0 mb-2 font-mono text-xs tracking-wide uppercase">
              Asadulla Ravshanbekov · ML engineer · Munich
            </p>
            <h1 className="text-ink m-0 text-2xl font-semibold tracking-tight sm:text-3xl">
              I build LLM systems that have to work in production.
            </h1>
            <p className="text-muted mt-3 mb-0 max-w-md text-sm">
              Four of them are on that iMac. Turn it on.
            </p>
          </div>
          <div className="desk__hud">
            <Button variant="primary" onClick={() => void boot()} disabled={phase !== 'room'}>
              {phase === 'room' ? 'Turn on' : 'Loading…'}
            </Button>
            <a href="/work" className="text-muted text-sm underline underline-offset-4">
              Skip the 3D — text version
            </a>
          </div>
        </>
      )}

      {phase === 'desktop' && <Desktop data={data} onShutdown={() => void shutdown()} />}
    </div>
  );
}
