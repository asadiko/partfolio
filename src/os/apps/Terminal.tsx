import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import type { TerminalAction } from '../terminal';
import { runCommand } from '../terminal';

const PROMPT = 'asadulla@imac ~ %';
const banner = ['AsadOS 1.0 (fixture build). Type help.', ''];

export function Terminal({ onAction }: { onAction: (action: TerminalAction) => void }) {
  const [lines, setLines] = useState<string[]>(banner);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const { output, action } = runCommand(input);
    setLines((prev) =>
      action?.type === 'clear' ? [] : [...prev, `${PROMPT} ${input}`, ...output],
    );
    if (input.trim()) setHistory((h) => [input, ...h].slice(0, 50));
    setCursor(-1);
    setInput('');
    if (action && action.type !== 'clear') onAction(action);
  };

  const recall = (delta: number) => {
    const next = Math.min(history.length - 1, Math.max(-1, cursor + delta));
    setCursor(next);
    setInput(next === -1 ? '' : (history[next] ?? ''));
  };

  return (
    <div className="os-terminal" onClick={() => inputRef.current?.focus()} role="presentation">
      <div aria-live="polite">
        {lines.map((line, i) => (
          <div key={i}>{line || ' '}</div>
        ))}
      </div>
      <form onSubmit={submit} className="os-terminal__input">
        <label htmlFor="os-terminal-input">{PROMPT}</label>
        <input
          id="os-terminal-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              recall(1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              recall(-1);
            }
          }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Command"
        />
      </form>
      <div ref={endRef} />
    </div>
  );
}
