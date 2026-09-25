'use client';

import Link from 'next/link';
import { useAppLocale } from '@/providers/locale-provider';
import { getContent, type Locale } from '@/features/marketing/content';
import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import { AuthPreferences } from '@/features/auth/components/auth-preferences';

export function AuthContent({ kind }: { kind: 'sign-in' | 'processing' | 'failed' | 'reauth' | 'invite-invalid' }) {
  const { locale } = useAppLocale();
  const copy = getContent(locale);

  if (kind === 'sign-in' || kind === 'reauth') {
    const reauth = kind === 'reauth';
    return <><AuthPreferences /><h1 className="font-[var(--font-display)] text-3xl font-bold">{reauth ? copy.auth.reauthTitle : copy.auth.signInTitle}</h1><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{reauth ? copy.auth.reauthDescription : copy.auth.signInDescription}</p><div className="mt-7"><GoogleSignInButton locale={locale as Locale} /></div></>;
  }

  if (kind === 'processing') return <><AuthPreferences /><div role="status" aria-live="polite"><span className="mb-5 inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-foreground)] motion-reduce:animate-none" /><h1 className="font-[var(--font-display)] text-3xl font-bold">{copy.auth.processingTitle}</h1><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.auth.processingDescription}</p></div></>;

  if (kind === 'failed') return <><AuthPreferences /><h1 className="font-[var(--font-display)] text-3xl font-bold">{copy.auth.failedTitle}</h1><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.auth.failedDescription}</p><div className="mt-7"><GoogleSignInButton locale={locale as Locale} /><Link href="/masuk" className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{copy.auth.retry}</Link></div></>;

  return <><AuthPreferences /><h1 className="font-[var(--font-display)] text-3xl font-bold">{copy.auth.inviteInvalid}</h1><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{copy.auth.inviteInvalid}</p><Link href="/masuk" className="mt-6 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{copy.auth.signInTitle}</Link></>;
}
