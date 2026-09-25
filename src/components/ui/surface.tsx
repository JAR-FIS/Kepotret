import type { HTMLAttributes } from 'react';

export function Surface({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] ${className}`}
      {...props}
    />
  );
}
