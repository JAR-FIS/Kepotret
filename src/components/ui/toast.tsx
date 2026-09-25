'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import type { SystemStatus } from './status-indicator';

export function Toast({
  status = 'info',
  children,
  className = '',
  duration = 5000,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  status?: SystemStatus;
  children: ReactNode;
  duration?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), Math.max(1, duration));
    return () => window.clearTimeout(timeout);
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      data-state={status}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      className={`max-w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-foreground)] shadow-[var(--shadow-soft)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
