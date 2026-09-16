export function SimBadge({ note }: { note?: string }) {
  return (
    <p className="text-faint inline-flex items-center gap-2 font-mono text-[11px] tracking-wide uppercase">
      <span className="bg-warn inline-block h-1.5 w-1.5 rounded-full" aria-hidden="true" />
      Simulated — runs on fixture data{note ? ` · ${note}` : ''}
    </p>
  );
}
