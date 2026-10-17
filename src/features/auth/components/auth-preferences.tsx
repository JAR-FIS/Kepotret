'use client';

import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAppLocale } from '@/providers/locale-provider';
import { getContent } from '@/features/marketing/content';

export function AuthPreferences({ compact = false }: { compact?: boolean }) {
  const { locale } = useAppLocale();
  const copy = getContent(locale).nav;
  return <div className={`flex justify-end gap-2 ${compact ? 'shrink-0' : 'mb-5'}`}>
    <LocaleControl label={copy.language} indonesianLabel={copy.indonesian} englishLabel={copy.english} />
    <ThemeToggle lightLabel={copy.switchToLight} darkLabel={copy.switchToDark} />
  </div>;
}
