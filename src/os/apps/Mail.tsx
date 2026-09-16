import { site } from '@/site';

export function Mail() {
  return (
    <div className="os-window__body">
      <p style={{ margin: '0 0 12px' }}>
        Open to ML / applied-AI engineering roles in Germany and remote EU. Email is fastest; there
        is no form because this site has no backend.
      </p>
      <dl className="os-about__stats" style={{ marginTop: 0 }}>
        <dt>To</dt>
        <dd>
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </dd>
        <dt>GitHub</dt>
        <dd>
          <a href={site.github} rel="me noopener">
            github.com/asadiko
          </a>
        </dd>
        <dt>LinkedIn</dt>
        <dd>
          <a href={site.linkedin} rel="me noopener">
            linkedin.com/in/asadulla-ravshanbekov
          </a>
        </dd>
        <dt>Résumé</dt>
        <dd>
          <a href={site.cvPath} target="_blank" rel="noopener">
            PDF, two pages
          </a>
        </dd>
      </dl>
    </div>
  );
}
