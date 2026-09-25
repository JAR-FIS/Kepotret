import { getLocale } from 'next-intl/server';
import { SystemPage } from '@/features/system/components/system-page';
import type { Locale } from '@/features/marketing/content';

export default async function MaintenancePage() {
  return <SystemPage locale={await getLocale() as Locale} kind="maintenance" />;
}
