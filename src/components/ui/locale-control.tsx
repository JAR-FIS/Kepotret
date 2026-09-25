'use client';

import { useAppLocale } from '@/providers/locale-provider';

export function LocaleControl({ label }: { label: string }) {
  const { locale, setLocale } = useAppLocale();
  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)]"
        value={locale}
        onChange={(event) => setLocale(event.target.value as 'id' | 'en')}
      >
        <option value="id">ID</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
