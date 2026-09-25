import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
