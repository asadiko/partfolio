import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' };

export function Button({ variant = 'ghost', className = '', ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const look =
    variant === 'primary'
      ? 'bg-accent text-accent-ink hover:brightness-110'
      : 'border border-line bg-surface text-ink hover:bg-raised';
  return <button type="button" className={`${base} ${look} ${className}`} {...rest} />;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="border-line bg-raised inline-flex rounded-md border p-0.5"
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cx(
              'rounded px-3 py-1 text-sm transition-colors',
              checked ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Panel({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="border-line bg-surface rounded-lg border p-4 sm:p-5">
      <h3 className="text-ink mb-3 text-base font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <dt className="text-faint mb-0.5 font-mono text-[11px] tracking-wide uppercase">{term}</dt>
      <dd className="text-ink m-0 text-sm leading-relaxed">{children}</dd>
    </div>
  );
}
