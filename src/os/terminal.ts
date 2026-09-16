import type { AppId } from './apps';
import { appIds, apps, resolveApp } from './apps';

export type TerminalAction =
  { type: 'open'; app: AppId } | { type: 'clear' } | { type: 'shutdown' };

export interface TerminalResult {
  output: string[];
  action?: TerminalAction;
}

const BOOTED_AT = Date.now();

const helpText = [
  'AsadOS shell. Commands:',
  '  ls [~/work]        list apps and documents',
  '  open <app>         open a window, e.g. open grounding',
  '  cat readme         print the read-me',
  '  whoami · uptime · echo · clear · shutdown',
];

const readme = [
  'Asadulla Ravshanbekov — machine learning engineer, Munich.',
  'Production LLM pipelines, retrieval with citations, reliability.',
  'Everything on this desk runs on fixture data. No servers, no keys.',
];

function uptime(): string {
  const s = Math.floor((Date.now() - BOOTED_AT) / 1000);
  return `up ${Math.floor(s / 60)} min ${s % 60} s, load average: 0.00 0.00 0.00`;
}

export function runCommand(line: string): TerminalResult {
  const [cmd = '', ...rest] = line.trim().split(/\s+/).filter(Boolean);
  const arg = rest.join(' ');
  switch (cmd.toLowerCase()) {
    case '':
      return { output: [] };
    case 'help':
      return { output: helpText };
    case 'ls':
      return {
        output: arg.includes('work')
          ? appIds.filter((id) => id !== 'terminal').map((id) => `${id}/`)
          : ['work/', 'readme.txt', 'resume.pdf'],
      };
    case 'open': {
      const app = resolveApp(arg);
      if (!app) return { output: [`open: no such app: ${arg || '(none)'}. Try: ls ~/work`] };
      return { output: [`Opening ${apps[app].title}…`], action: { type: 'open', app } };
    }
    case 'cat':
      return { output: /readme/i.test(arg) ? readme : [`cat: ${arg || '(none)'}: no such file`] };
    case 'pwd':
      return { output: ['/Users/asadulla'] };
    case 'whoami':
      return { output: ['asadulla'] };
    case 'uptime':
      return { output: [uptime()] };
    case 'echo':
      return { output: [arg] };
    case 'clear':
      return { output: [], action: { type: 'clear' } };
    case 'shutdown':
    case 'exit':
      return { output: ['Shutting down…'], action: { type: 'shutdown' } };
    default:
      return { output: [`${cmd}: command not found. Type help.`] };
  }
}
