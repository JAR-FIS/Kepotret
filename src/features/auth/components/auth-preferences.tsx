'use client';

import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAppLocale } from '@/providers/locale-provider';
import { getContent } from '@/features/marketing/content';

export function AuthPreferences() {
  const { locale } = useAppLocale();
  const copy = getContent(locale).nav;
  return <div className="mb-5 flex justify-end gap-2">
    <LocaleControl label={copy.language} indonesianLabel={copy.indonesian} englishLabel={copy.english} />
    <ThemeToggle lightLabel={copy.switchToLight} darkLabel={copy.switchToDark} />
  </div>;
}
