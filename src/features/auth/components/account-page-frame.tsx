'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getContent } from '@/features/marketing/content';
import { useAppLocale } from '@/providers/locale-provider';

export function AccountPageFrame({ children }: { children: ReactNode }) {
  const { locale } = useAppLocale();
  const copy = getContent(locale);

  return <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex min-h-[72px] max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Kepotret" className="shrink-0 rounded-sm">
          <Image src="/brand/logo.svg" alt="Kepotret" width={138} height={44} className="h-9 w-[112px] object-contain object-left dark:invert sm:w-[130px]" />
        </Link>
        <nav aria-label={copy.auth.accountTitle} className="flex items-center gap-2 sm:gap-4">
          <Link href="/akun" aria-current="page" className="hidden min-h-11 items-center text-sm font-semibold underline underline-offset-4 sm:inline-flex">{copy.auth.accountTitle}</Link>
          <LocaleControl label={copy.nav.language} indonesianLabel={copy.nav.indonesian} englishLabel={copy.nav.english} />
          <ThemeToggle lightLabel={copy.nav.switchToLight} darkLabel={copy.nav.switchToDark} />
        </nav>
      </div>
    </header>
    <main className="mx-auto min-h-[calc(100vh-4.5rem)] max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-8">{children}</section>
    </main>
  </div>;
}
