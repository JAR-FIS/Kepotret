'use client';

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group min-w-0 border-b border-[var(--color-border)]"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold focus-visible:rounded-[var(--radius-sm)] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{title}</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="pb-4 pr-8 text-sm leading-6 text-[var(--color-muted-foreground)]">{children}</div>
    </details>
  );
}
