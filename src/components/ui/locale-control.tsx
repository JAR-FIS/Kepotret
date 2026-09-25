'use client';

import { useAppLocale } from '@/providers/locale-provider';

export function LocaleControl({
  label,
  indonesianLabel,
  englishLabel,
  indonesianShort,
  englishShort,
}: {
  label: string;
  indonesianLabel: string;
  englishLabel: string;
  indonesianShort?: string;
  englishShort?: string;
}) {
  const { locale, setLocale } = useAppLocale();
  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className={`min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-foreground)] ${indonesianShort && englishShort ? 'w-[4.5rem] sm:w-auto' : ''}`}
        value={locale}
        onChange={(event) => setLocale(event.target.value as 'id' | 'en')}
      >
        <option value="id">{indonesianShort ?? indonesianLabel}</option>
        <option value="en">{englishShort ?? englishLabel}</option>
      </select>
    </label>
  );
}
