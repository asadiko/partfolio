import { describe, expect, it } from 'vitest';

import { runCommand } from './terminal';

describe('runCommand', () => {
  it('lists apps and documents', () => {
    const { output } = runCommand('ls ~/work');
    expect(output.join(' ')).toMatch(/pipeline/);
    expect(output.join(' ')).toMatch(/escrow/);
  });

  it('opens an app by id, label or alias', () => {
    expect(runCommand('open grounding').action).toEqual({ type: 'open', app: 'grounding' });
    expect(runCommand('open Failures').action).toEqual({ type: 'open', app: 'playground' });
    expect(runCommand('open ledger').action).toEqual({ type: 'open', app: 'escrow' });
  });

  it('reports unknown apps and commands without crashing', () => {
    expect(runCommand('open nonsense').output[0]).toMatch(/no such app/);
    expect(runCommand('frobnicate').output[0]).toMatch(/command not found/);
    expect(runCommand('').output).toEqual([]);
  });

  it('supports help, whoami, clear and shutdown', () => {
    expect(runCommand('help').output.length).toBeGreaterThan(3);
    expect(runCommand('whoami').output[0]).toMatch(/asadulla/i);
    expect(runCommand('clear').action).toEqual({ type: 'clear' });
    expect(runCommand('shutdown').action).toEqual({ type: 'shutdown' });
  });

  it('echoes and ignores surrounding whitespace', () => {
    expect(runCommand('   echo   hello world ').output).toEqual(['hello world']);
  });
});
