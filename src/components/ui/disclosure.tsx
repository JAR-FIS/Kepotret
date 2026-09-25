'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';

export function Disclosure({
  title,
  children,
  defaultOpen = false,
  id,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const contentId = id ?? `disclosure-${generatedId}`;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="group min-w-0 border-b border-[var(--color-border)]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 py-3 text-left font-semibold focus-visible:rounded-[var(--radius-sm)]"
        >
        <span className="min-w-0">{title}</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
        </button>
      </h3>
      <div
        id={contentId}
        hidden={!open}
        className="pb-4 pr-8 text-sm leading-6 text-[var(--color-muted-foreground)]"
      >
        {children}
      </div>
    </div>
  );
}
