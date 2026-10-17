import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { getContent, type Locale } from '@/features/marketing/content';

export default async function NotFound() {
  const copy = getContent(await getLocale() as Locale).system;
  return <main className="grid min-h-[70vh] place-items-center px-4 py-12">
    <section className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 text-center">
      <span className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-full bg-[var(--color-muted)]"><SearchX size={28} aria-hidden="true" /></span>
      <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-muted-foreground)]">404</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{copy.notFoundTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.notFoundDescription}</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-primary-foreground)]"><ArrowLeft size={16} aria-hidden="true" />{copy.home}</Link>
    </section>
  </main>;
}
