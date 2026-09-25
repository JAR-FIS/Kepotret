'use client';

import Link from 'next/link';
import { useAppLocale } from '@/providers/locale-provider';
import { getContent } from '@/features/marketing/content';

export function RouteError({ retry }: { retry: () => void }) {
  const { locale } = useAppLocale();
  const copy = getContent(locale).system;
  return <main className="grid min-h-screen place-items-center bg-[var(--color-background)] px-4 py-10 text-[var(--color-foreground)]">
    <section className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-muted-foreground)]">500</p>
      <h1 className="mt-3 font-[var(--font-display)] text-3xl font-bold">{copy.errorTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.errorDescription}</p>
      <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={retry} className="inline-flex min-h-11 items-center rounded-[10px] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)]">{copy.retry}</button><Link href="/" className="inline-flex min-h-11 items-center rounded-[10px] border border-[var(--color-border)] px-4 font-semibold">{copy.home}</Link></div>
    </section>
  </main>;
}
