import { site } from '@/site';

const stats: [string, string][] = [
  ['Machine', 'AsadOS 1.0 · fixture build'],
  ['Operator', site.name],
  ['Location', site.location],
  ['Memory', '21,000+ test lines in a ~1,000-case suite'],
  ['Releases', '219 automated (v2 extraction service)'],
  ['Users', '10,000+ registered on Olber'],
  ['Languages', 'Python, TypeScript, SQL · EN, RU, UZ, DE (learning)'],
];

export function About({ html }: { html: string }) {
  return (
    <div className="os-window__body">
      <dl className="os-about__stats">
        {stats.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <article className="prose-site os-doc" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
