'use client';

import { useAppLocale } from '@/providers/locale-provider';

export function LocaleControl({
  label,
  indonesianLabel,
  englishLabel,
}: {
  label: string;
  indonesianLabel: string;
  englishLabel: string;
}) {
  const { locale, setLocale } = useAppLocale();
  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        title={locale === 'id' ? indonesianLabel : englishLabel}
        className="min-h-11 w-[5rem] rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] sm:w-auto"
        value={locale}
        onChange={(event) => setLocale(event.target.value as 'id' | 'en')}
      >
        <option value="id">ID</option>
        <option value="en">ENG</option>
      </select>
    </label>
  );
}
