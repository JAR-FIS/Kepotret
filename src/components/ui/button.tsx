import type { ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
  ghost: 'text-[var(--color-foreground)] enabled:hover:bg-[var(--color-muted)]',
  danger: 'bg-[var(--color-destructive)] text-white',
};

export function Button({
  className = '',
  children,
  disabled,
  variant = 'primary',
  loading = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      aria-busy={loading || undefined}
      className={`relative inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-[transform,opacity,filter,background-color] enabled:hover:brightness-95 active:enabled:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 ${variants[variant]} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      <span className={`inline-flex items-center gap-2 ${loading ? 'opacity-0' : ''}`}>{children}</span>
      {loading && (
        <LoaderCircle
          size={16}
          aria-hidden="true"
          className="absolute animate-spin motion-reduce:animate-none"
        />
      )}
    </button>
  );
}
