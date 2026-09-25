import type { ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:brightness-95',
  ghost: 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
  danger: 'bg-[var(--color-destructive)] text-white hover:brightness-95',
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
      className={`relative inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-[transform,opacity,filter,background-color] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
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
