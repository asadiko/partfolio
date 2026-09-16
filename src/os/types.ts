import type { Milestone } from '@/islands/journey/types';

export type DocId = 'pipeline' | 'grounding' | 'playground' | 'escrow';

export interface Doc {
  id: DocId;
  title: string;
  summary: string;
  context: string;
  html: string;
}

export interface DesktopData {
  docs: Record<DocId, Doc>;
  aboutHtml: string;
  milestones: Milestone[];
}
