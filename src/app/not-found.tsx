import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { getContent, type Locale } from '@/features/marketing/content';

export default async function NotFound() {
  const copy = getContent(await getLocale() as Locale).system;
  return <main className="grid min-h-[70vh] place-items-center px-4 py-12">
    <section className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 text-center">
      <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-muted-foreground)]">404</p>
      <h1 className="mt-3 font-[var(--font-display)] text-3xl font-bold">{copy.notFoundTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.notFoundDescription}</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)]">{copy.home}</Link>
    </section>
  </main>;
}
