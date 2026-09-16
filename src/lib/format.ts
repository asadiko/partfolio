const compact = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

export const formatInt = (n: number) => compact.format(Math.round(n));

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 90) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s - m * 60);
  return rest === 0 ? `${m} min` : `${m} min ${rest} s`;
}

export const formatRatio = (a: number, b: number) => (b === 0 ? '—' : `${(a / b).toFixed(1)}×`);
