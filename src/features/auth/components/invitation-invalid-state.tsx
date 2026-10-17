'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, CircleAlert } from 'lucide-react';

import { useAppLocale } from '@/providers/locale-provider';
import { getContent } from '@/features/marketing/content';

type Reason = 'invalid' | 'expired' | 'used';
export function InvitationInvalidState({ reason = 'invalid' }: { reason?: Reason }) {
  const t = useTranslations('collaboration.invitation');
  const { locale } = useAppLocale();
  const copy = getContent(locale).auth;
  return <section role="status" className="text-center">
    <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[var(--color-muted)]"><CircleAlert size={24} aria-hidden="true" /></span>
    <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">{t(`terminal.${reason}.title`)}</h1>
    <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{t(`terminal.${reason}.description`)}</p>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('contactOwner')}</p>
    <Link href="/masuk" className="mx-auto mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-primary-foreground)]">{copy.signInTitle}<ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}
