import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { HelpLocale } from './content';
import { helpContent } from './content';

export function HelpFrame({ locale, children }: { locale: HelpLocale; children: ReactNode }) {
  const copy = helpContent[locale].navigation;
  return <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]"><div className="mx-auto flex min-h-17 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
      <Link href="/help" aria-label={copy.home} className="inline-flex min-h-11 items-center"><span className="rounded bg-white px-2 py-1"><Image src="/brand/logo.svg" alt="Kepotret" width={105} height={35} priority /></span></Link>
      <div className="flex items-center gap-1 sm:gap-3"><Link href="/help/host" className="hidden min-h-11 items-center px-2 text-sm font-semibold hover:underline sm:inline-flex">{copy.host}</Link><LocaleControl label={copy.language} indonesianLabel={copy.indonesian} englishLabel={copy.english} indonesianShort="ID" englishShort="EN" /><ThemeToggle lightLabel={copy.switchToLight} darkLabel={copy.switchToDark} /></div>
    </div></header>
    {children}
  </div>;
}
