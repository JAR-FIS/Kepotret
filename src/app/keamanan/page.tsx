import { getLocale } from 'next-intl/server';
import { PublicInfoPage } from '@/features/marketing/components/public-info-page';
import type { Locale } from '@/features/marketing/content';

export default async function SecurityPage() {
  return <PublicInfoPage locale={await getLocale() as Locale} kind="security" />;
}
