import { useEffect, useId, useRef, useState } from 'react';

import type { AppId } from './apps';
import { apps } from './apps';

interface MenuItem {
  label: string;
  hint?: string;
  action?: () => void;
  disabled?: boolean;
}

interface Menu {
  label: string;
  items: (MenuItem | 'separator')[];
}

interface MenuBarProps {
  activeTitle: string | null;
  onOpen: (id: AppId) => void;
  onCloseActive: () => void;
  onShutdown: () => void;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MenuBar({ activeTitle, onOpen, onCloseActive, onShutdown }: MenuBarProps) {
  const [open, setOpen] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const clock = useClock();
  const baseId = useId();

  useEffect(() => {
    if (open === null) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  const menus: Menu[] = [
    {
      label: '◆',
      items: [
        { label: 'About This Mac…', action: () => onOpen('about') },
        'separator',
        { label: 'Read Me', action: () => onOpen('readme') },
        { label: 'Terminal', hint: '⌘T', action: () => onOpen('terminal') },
      ],
    },
    {
      label: 'File',
      items: [
        ...(['pipeline', 'grounding', 'playground', 'escrow', 'journey'] as const).map((id) => ({
          label: `Open ${apps[id].title}`,
          action: () => onOpen(id),
        })),
        'separator',
        { label: 'Close Window', hint: '⌘W', action: onCloseActive, disabled: !activeTitle },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Text version of this site', action: () => window.location.assign('/work') },
        {
          label: 'Résumé (PDF)',
          action: () => window.open('/Asadulla_Ravshanbekov_CV.pdf', '_blank', 'noopener'),
        },
      ],
    },
    {
      label: 'Special',
      items: [
        { label: 'Send Mail…', action: () => onOpen('mail') },
        'separator',
        { label: 'Shut Down', action: onShutdown },
      ],
    },
  ];

  const run = (item: MenuItem) => {
    setOpen(null);
    item.action?.();
  };

  return (
    <div ref={rootRef} className="os-menubar" role="menubar" aria-label="AsadOS menu">
      {menus.map((menu, i) => {
        const expanded = open === i;
        const id = `${baseId}-${i}`;
        return (
          <div key={menu.label} style={{ position: 'relative', display: 'flex' }}>
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={expanded}
              aria-controls={id}
              className="os-menubar__item"
              onPointerDown={(e) => {
                e.preventDefault();
                setOpen(expanded ? null : i);
              }}
              onPointerEnter={() => open !== null && setOpen(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  setOpen(i);
                }
              }}
            >
              {menu.label}
            </button>
            {expanded && (
              <div id={id} className="os-menu" role="menu">
                {menu.items.map((item, j) =>
                  item === 'separator' ? (
                    <div key={j} role="separator" className="os-menu__separator" />
                  ) : (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      className="os-menu__item"
                      disabled={item.disabled}
                      onClick={() => run(item)}
                    >
                      <span>{item.label}</span>
                      {item.hint && <span>{item.hint}</span>}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        );
      })}
      <span className="os-menubar__item" aria-hidden="true" style={{ fontWeight: 400 }}>
        {activeTitle ?? 'Desktop'}
      </span>
      <span className="os-menubar__spacer" />
      <span className="os-menubar__clock" aria-label={`Clock: ${clock}`}>
        {clock}
      </span>
    </div>
  );
}
