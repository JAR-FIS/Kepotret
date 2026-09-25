import { LoaderCircle } from 'lucide-react';

export function LoadingState({
  label,
  description,
  className = '',
}: {
  label: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      aria-live="polite"
      role="status"
      className={`flex min-h-20 min-w-0 items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-4 text-[var(--color-foreground)] ${className}`}
    >
      <LoaderCircle size={20} aria-hidden="true" className="shrink-0 animate-spin motion-reduce:animate-none" />
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        {description && <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>}
      </div>
    </div>
  );
}
