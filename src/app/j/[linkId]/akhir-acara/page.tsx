import { getTranslations } from 'next-intl/server';
import { GuestTerminal } from '@/features/guest/components/guest-gallery';

export default async function GuestPostEventEndedPage() {
  const t = await getTranslations('guest.gallery');
  return <GuestTerminal title={t('postEventTitle')} description={t('postEventDescription')} />;
}
