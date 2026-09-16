/** Prefixes a root-relative path with the configured base (`/` at a user site, `/partfolio` at a project site). */
export const withBase = (path: string): string => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
};

export const site = {
  name: 'Asadulla Ravshanbekov',
  shortName: 'Asadulla',
  title: 'Asadulla Ravshanbekov — ML engineer, LLM systems',
  tagline: 'I build LLM systems that have to work in production — and the backends under them.',
  description:
    'Machine learning engineer in Munich. Production LLM pipelines, retrieval-grounded answers, reliability under long-running loads, and a marketplace with a real-money escrow ledger. Interactive case studies, not a wall of text.',
  location: 'Munich, Germany',
  email: 'asadullaravshanbekov04@gmail.com',
  github: 'https://github.com/asadiko',
  linkedin: 'https://www.linkedin.com/in/asadulla-ravshanbekov-1a1352259',
  cvPath: withBase('/Asadulla_Ravshanbekov_CV.pdf'),
} as const;

export const nav = [
  { href: withBase('/work'), label: 'Work' },
  { href: withBase('/journey'), label: 'Journey' },
  { href: withBase('/about'), label: 'About' },
  { href: withBase('/contact'), label: 'Contact' },
] as const;
