'use client';

import type { ReactNode } from 'react';

import { HostShell } from '@/features/host/components/workspace-shell';

export function AccountPageFrame({ children }: { children: ReactNode }) {
  return <HostShell><section className="max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-8">{children}</section></HostShell>;
}
