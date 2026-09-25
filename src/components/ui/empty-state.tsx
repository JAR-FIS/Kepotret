import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center">
      {icon && <div aria-hidden="true" className="text-[var(--color-muted-foreground)]">{icon}</div>}
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-prose text-sm leading-6 text-[var(--color-muted-foreground)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
