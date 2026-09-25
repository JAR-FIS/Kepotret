import { getLocale } from 'next-intl/server';
import { AccountPageFrame } from '@/features/auth/components/account-page-frame';
import { AccountPanel } from '@/features/auth/components/account-panel';
import { getContent, type Locale } from '@/features/marketing/content';

export default async function AccountPage() {
  const copy = getContent(await getLocale() as Locale);
  return <AccountPageFrame><h1 className="font-[var(--font-display)] text-3xl font-bold">{copy.auth.accountTitle}</h1><div className="mt-5"><AccountPanel /></div></AccountPageFrame>;
}
