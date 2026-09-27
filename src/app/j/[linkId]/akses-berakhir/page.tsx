import { getTranslations } from 'next-intl/server';
import { GuestTerminal } from '@/features/guest/components/guest-gallery';

export default async function GuestAccessEndedPage() {
  const t = await getTranslations('guest.gallery');
  return <GuestTerminal title={t('endedTitle')} description={t('endedDescription')} />;
}
