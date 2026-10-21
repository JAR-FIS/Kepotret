import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { HelpLocale } from './content';
import { helpContent } from './content';

export function HelpFrame({ locale, children }: { locale: HelpLocale; children: ReactNode }) {
  const copy = helpContent[locale].navigation;
  const footer = helpContent[locale].footer;
  return <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]"><div className="mx-auto flex min-h-17 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
      <Link href="/help" aria-label={copy.home} className="inline-flex min-h-11 items-center"><span className="rounded bg-white px-2 py-1"><Image src="/brand/logo.svg" alt="Kepotret" width={105} height={35} priority /></span></Link>
      <div className="flex items-center gap-1 sm:gap-3"><Link href="/help/host" className="hidden min-h-11 items-center px-2 text-sm font-semibold hover:underline sm:inline-flex">{copy.host}</Link><Link href="/help/collaborator" className="hidden min-h-11 items-center px-2 text-sm font-semibold hover:underline md:inline-flex">{copy.collaborator}</Link><LocaleControl label={copy.language} indonesianLabel={copy.indonesian} englishLabel={copy.english} /><ThemeToggle lightLabel={copy.switchToLight} darkLabel={copy.switchToDark} /></div>
    </div></header>
    {children}
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)]"><div className="mx-auto flex max-w-6xl flex-col items-start gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-6">
      <p className="font-[family-name:var(--font-display)] text-sm font-bold">Kepotret</p>
      <nav aria-label={footer.navigation} className="flex flex-wrap items-center gap-1 text-sm"><Link href="/" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">{footer.home}</Link><Link href="/help" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">{copy.home}</Link></nav>
    </div></footer>
  </div>;
}
