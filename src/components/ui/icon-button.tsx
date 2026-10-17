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
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--color-foreground)] transition-colors enabled:hover:bg-[var(--color-muted)] active:enabled:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
