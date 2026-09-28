'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { useAppLocale } from '@/providers/locale-provider';
import { getContent } from '@/features/marketing/content';

type Reason = 'invalid' | 'expired' | 'used';
export function InvitationInvalidState({ reason = 'invalid' }: { reason?: Reason }) {
  const t = useTranslations('collaboration.invitation');
  const { locale } = useAppLocale();
  const copy = getContent(locale).auth;
  return <section role="status"><h1 className="font-[var(--font-display)] text-3xl font-bold">{t(`terminal.${reason}.title`)}</h1><p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{t(`terminal.${reason}.description`)}</p><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('contactOwner')}</p><Link href="/masuk" className="mt-5 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">{copy.signInTitle}</Link></section>;
}
