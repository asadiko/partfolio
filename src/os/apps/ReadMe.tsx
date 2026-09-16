import { site, withBase } from '@/site';

export function ReadMe() {
  return (
    <div className="os-window__body prose-site os-doc">
      <p>
        <strong>{site.name}</strong> — {site.tagline}
      </p>
      <p>{site.description}</p>
      <p>
        Tap an icon to open an app. Each demo window has a <em>Read me</em> tab with the full case
        study. The Terminal understands <code>help</code>, <code>ls ~/work</code> and{' '}
        <code>open &lt;app&gt;</code>. <em>Special → Shut Down</em> takes you back to the desk.
      </p>
      <p>
        Everything runs on fixture data shipped with the page. Nothing calls a model or a server.
        Prefer plain pages? <a href={withBase('/work')}>Text version</a>.
      </p>
    </div>
  );
}
