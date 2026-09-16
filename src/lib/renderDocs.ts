import mdxRenderer from '@astrojs/mdx/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getCollection, getEntry, render } from 'astro:content';

import type { Milestone } from '@/islands/journey/types';
import type { DesktopData, Doc, DocId } from '@/os/types';

const docIds: Record<string, DocId> = {
  'batched-pipeline': 'pipeline',
  'grounded-answers': 'grounding',
  'long-running-streams': 'playground',
  'escrow-ledger': 'escrow',
};

/** Renders the MDX content to HTML at build time so the desktop can show it inside React windows. */
export async function loadDesktopData(): Promise<DesktopData> {
  const container = await AstroContainer.create();
  container.addServerRenderer({ name: 'astro:jsx', renderer: mdxRenderer });
  const docs = {} as Record<DocId, Doc>;

  for (const entry of await getCollection('caseStudies')) {
    const id = docIds[entry.id];
    if (!id) throw new Error(`case study ${entry.id} has no desktop app mapping`);
    const { Content } = await render(entry);
    docs[id] = {
      id,
      title: entry.data.title,
      summary: entry.data.summary,
      context: entry.data.context,
      html: await container.renderToString(Content),
    };
  }

  const about = await getEntry('pages', 'about');
  if (!about) throw new Error('missing pages/about');
  const aboutHtml = await container.renderToString((await render(about)).Content);

  const milestones: Milestone[] = (await getCollection('journey'))
    .sort((a, b) => a.data.order - b.data.order)
    .map((e) => ({
      id: e.id,
      title: e.data.title,
      date: e.data.date,
      city: e.data.city,
      kind: e.data.kind,
      body: (e.body ?? '').trim(),
    }));

  return { docs, aboutHtml, milestones };
}
