'use client';

import { useTranslations } from 'next-intl';
import type { ScheduleWriteRequest } from '@/lib/api/generated/index.schemas';

type RevealDelay = ScheduleWriteRequest['reveal_delay_days'];
const delays: RevealDelay[] = [1, 3, 5, 7];

export function RevealDelayChoice({ label, name, value, onValueChange, disabled = false }: {
  label: string;
  name: string;
  value: number;
  onValueChange: (value: RevealDelay) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('host.schedule');

  return <fieldset disabled={disabled} className="min-w-0">
    <legend className="mb-3 text-sm font-semibold">{label}</legend>
    <div className="flex flex-wrap gap-2">
      {delays.map((days) => <label key={days} className={`relative inline-flex min-h-11 min-w-20 items-center justify-center rounded-full border px-4 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-focus)] ${value === days ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-[var(--color-primary)]'}`}>
        <input className="sr-only" type="radio" name={name} value={days} checked={value === days} disabled={disabled} onChange={() => onValueChange(days)} />
        {t('delay', { days })}
      </label>)}
    </div>
  </fieldset>;
}
