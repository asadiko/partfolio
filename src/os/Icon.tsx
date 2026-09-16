import type { AppId } from './apps';

const glyphs: Record<AppId, string> = {
  // 16×16 pixel-art paths drawn once; scaled by the SVG viewBox.
  pipeline: 'M2 3h12v3H2zM2 7h12v3H2zM2 11h12v3H2z',
  grounding: 'M3 2h7v2H3zM2 4h2v6H2zM10 4h2v6h-2zM3 10h7v2H3zM9 11h2v2H9zM11 13h3v2h-3z',
  playground: 'M9 1h3L8 7h4l-7 8 2-6H4z',
  escrow: 'M3 3h10v2H3zM3 6h10v1H3zM3 8h10v1H3zM3 10h10v1H3zM3 12h10v2H3z',
  journey: 'M8 1a4 4 0 0 1 4 4c0 3-4 9-4 9S4 8 4 5a4 4 0 0 1 4-4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  about: 'M7 2h2v2H7zM6 5h3v6h2v2H5v-2h2V7H6z',
  mail: 'M1 3h14v10H1zM2 4l6 5 6-5v1l-6 5-6-5z',
  terminal: 'M1 2h14v12H1zM3 5l3 2-3 2v1l4-3-4-3zM8 9h5v1H8z',
  readme: 'M3 1h7l3 3v11H3zM5 6h6v1H5zM5 8h6v1H5zM5 10h6v1H5zM5 12h4v1H5z',
};

export function Icon({ id }: { id: AppId }) {
  const isDoc = id === 'readme' || id === 'about';
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="0.5" y="0.5" width="15" height="15" rx={isDoc ? 0 : 2} fill="#fff" stroke="#000" />
      <path d={glyphs[id]} fill={isDoc ? '#000' : '#1c6f8a'} fillRule="evenodd" />
    </svg>
  );
}
