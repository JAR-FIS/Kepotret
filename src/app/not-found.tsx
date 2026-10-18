import Link from 'next/link';
import { Home, SearchX } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { getContent, type Locale } from '@/features/marketing/content';
import { AuthPageFrame } from '@/features/auth/components/auth-page-frame';

export default async function NotFound() {
  const copy = getContent(await getLocale() as Locale).system;
  return <AuthPageFrame>
    <div className="text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[var(--color-muted)]"><SearchX size={23} aria-hidden="true" /></span>
      <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-muted-foreground)]">404</p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight sm:text-[2rem]">{copy.notFoundTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.notFoundDescription}</p>
      <div className="mt-6 flex justify-center"><Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-primary-foreground)]"><Home size={16} aria-hidden="true" />{copy.home}</Link></div>
    </div>
  </AuthPageFrame>;
}
