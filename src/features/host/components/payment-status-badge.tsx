'use client';

import { CircleCheck, CircleHelp, CircleX, Clock3, Hourglass, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PaymentTransaction } from '@/lib/api/generated/index.schemas';

const presentations: Record<PaymentTransaction['status'], { icon: LucideIcon; tone: string }> = {
  PENDING: { icon: Clock3, tone: 'border-amber-700 bg-amber-100 text-amber-950 dark:border-amber-300 dark:bg-amber-950 dark:text-amber-100' },
  SUCCESS: { icon: CircleCheck, tone: 'border-green-700 bg-green-100 text-green-950 dark:border-green-300 dark:bg-green-950 dark:text-green-100' },
  FAILURE: { icon: CircleX, tone: 'border-red-700 bg-red-100 text-red-950 dark:border-red-300 dark:bg-red-950 dark:text-red-100' },
  EXPIRED: { icon: Hourglass, tone: 'border-red-700 bg-red-100 text-red-950 dark:border-red-300 dark:bg-red-950 dark:text-red-100' },
};

export function PaymentStatusBadge({ status }: { status: PaymentTransaction['status'] }) {
  const t = useTranslations('host.commerce.paymentStatus');
  const presentation = presentations[status];
  const Icon = presentation?.icon ?? CircleHelp;
  return <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${presentation?.tone ?? 'border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-foreground)]'}`}>
    <Icon size={14} aria-hidden="true" />{presentation ? t(status) : String(status)}
  </span>;
}
