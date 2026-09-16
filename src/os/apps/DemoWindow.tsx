import { useState } from 'react';
import type { ReactNode } from 'react';

import type { Doc } from '../types';

export function DemoWindow({ doc, demo }: { doc: Doc; demo: ReactNode }) {
  const [tab, setTab] = useState<'demo' | 'readme'>('demo');
  return (
    <>
      <div className="os-tabs" role="tablist" aria-label={doc.title}>
        {(['demo', 'readme'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="os-tab"
            onClick={() => setTab(t)}
          >
            {t === 'demo' ? 'Demo' : 'Read me'}
          </button>
        ))}
      </div>
      <div className="os-window__body" role="tabpanel">
        {tab === 'demo' ? (
          <div className="os-demo">
            <p className="os-demo__lede">{doc.summary}</p>
            {demo}
          </div>
        ) : (
          <article className="prose-site os-doc">
            <h1 className="os-doc__title">{doc.title}</h1>
            <p className="os-doc__context">{doc.context}</p>
            <div dangerouslySetInnerHTML={{ __html: doc.html }} />
          </article>
        )}
      </div>
    </>
  );
}
