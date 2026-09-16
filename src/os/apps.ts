export const appIds = [
  'pipeline',
  'grounding',
  'playground',
  'escrow',
  'journey',
  'about',
  'mail',
  'terminal',
  'readme',
] as const;
export type AppId = (typeof appIds)[number];

export interface AppMeta {
  id: AppId;
  title: string;
  /** Desktop icon label; may differ from the window title. */
  label: string;
  width: number;
  height: number;
  aliases?: readonly string[];
}

export const apps: Record<AppId, AppMeta> = {
  pipeline: {
    id: 'pipeline',
    title: 'Pipeline Explorer',
    label: 'Pipeline',
    width: 960,
    height: 680,
  },
  grounding: {
    id: 'grounding',
    title: 'Grounding',
    label: 'Grounding',
    width: 960,
    height: 700,
    aliases: ['rag'],
  },
  playground: {
    id: 'playground',
    title: 'Failure Playground',
    label: 'Failures',
    width: 1000,
    height: 720,
    aliases: ['failures', 'chaos'],
  },
  escrow: {
    id: 'escrow',
    title: 'Escrow Ledger',
    label: 'Ledger',
    width: 960,
    height: 680,
    aliases: ['ledger', 'olber'],
  },
  journey: {
    id: 'journey',
    title: 'Journey',
    label: 'Journey',
    width: 980,
    height: 660,
    aliases: ['map'],
  },
  about: { id: 'about', title: 'About This Mac', label: 'About', width: 640, height: 560 },
  mail: { id: 'mail', title: 'Mail', label: 'Mail', width: 520, height: 400, aliases: ['contact'] },
  terminal: {
    id: 'terminal',
    title: 'Terminal',
    label: 'Terminal',
    width: 640,
    height: 400,
    aliases: ['sh', 'shell'],
  },
  readme: { id: 'readme', title: 'Read Me', label: 'Read Me', width: 560, height: 480 },
};

export function resolveApp(name: string): AppId | undefined {
  const needle = name.trim().toLowerCase();
  return appIds.find(
    (id) =>
      id === needle ||
      apps[id].label.toLowerCase() === needle ||
      apps[id].aliases?.includes(needle),
  );
}
