import { getLocale } from 'next-intl/server';
import { HostGuideContent } from '@/features/help/host-guide';
import type { HelpLocale } from '@/features/help/content';

export default async function HostGuidePage() {
  const locale = await getLocale() as HelpLocale;
  return <HostGuideContent locale={locale} />;
}
