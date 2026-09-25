import type { HTMLAttributes, ReactNode } from 'react';

export type SystemStatus = 'success' | 'info' | 'warning' | 'error';

export function StatusIndicator({
  status,
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  status: SystemStatus;
  children: ReactNode;
}) {
  const role = status === 'error' ? 'alert' : 'status';
  return (
    <div
      data-state={status}
      role={role}
      className={`flex min-w-0 items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--state-soft)] p-4 text-[var(--state-accent)] ${className}`}
      {...props}
    >
      <span aria-hidden="true" className="mt-1 size-2 shrink-0 rounded-full bg-current" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
