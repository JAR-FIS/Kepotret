'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Clock3, ShieldAlert } from 'lucide-react';

import { LocaleControl } from '@/components/ui/locale-control';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function GuestTerminal({ kind }: { kind: 'ended' | 'post-event-ended' }) {
  const t = useTranslations('guest.gallery');
  const preferences = useTranslations('guest.preferences');
  const locale = useLocale();
  const ended = kind === 'ended';
  const Icon = ended ? ShieldAlert : Clock3;
  const actionHref = ended ? (locale === 'id' ? '/bantuan' : '/help') : '/cara-kerja';

  return <main className="grid min-h-screen place-items-center bg-[var(--color-surface-muted)] px-4 py-10 text-[var(--color-foreground)]">
    <div className="w-full max-w-lg">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" aria-label="Kepotret" className="flex w-fit shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">
          <Image src="/brand/logo.svg" alt="Kepotret" width={146} height={48} className="h-10 w-[132px] object-contain dark:hidden" />
          <Image src="/brand/logo_white.svg" alt="Kepotret" width={146} height={48} className="hidden h-10 w-[132px] object-contain dark:block" />
        </Link>
        <div className="flex items-center gap-2"><LocaleControl label={preferences('language')} indonesianLabel={preferences('indonesian')} englishLabel={preferences('english')} /><ThemeToggle lightLabel={preferences('light')} darkLabel={preferences('dark')} /></div>
      </header>
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-[var(--shadow-soft)] sm:p-9">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-foreground)]"><Icon size={23} aria-hidden="true" /></span>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight sm:text-[2rem]">{ended ? t('endedTitle') : t('postEventTitle')}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{ended ? t('endedDescription') : t('postEventDescription')}</p>
        <Link href={actionHref} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-[var(--color-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"><span>{ended ? t('endedAction') : t('postEventAction')}</span><ArrowRight size={17} aria-hidden="true" /></Link>
      </section>
      <Link href="/" className="mx-auto mt-5 flex min-h-11 w-fit items-center gap-2 rounded-full px-3 text-sm font-semibold text-[var(--color-muted-foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"><ArrowLeft size={17} aria-hidden="true" />{t('backHome')}</Link>
    </div>
  </main>;
}
