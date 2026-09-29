import { getTranslations } from 'next-intl/server';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { GuestPreview } from '@/features/host/components/guest-preview';

export default async function GuestPreviewPage({ params }: PageProps<'/album/[albumId]/preview-tamu'>) {
  const { albumId } = await params;
  const t = await getTranslations('host.guestPreview');
  return <><HostPageTitle title={t('title')} description={t('description')} /><GuestPreview albumId={albumId} /></>;
}
