import { getTranslations } from 'next-intl/server';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { AlbumSharingPanel } from '@/features/host/components/album-sharing';

export default async function AlbumPreparationPage({ params }: PageProps<'/album/[albumId]/berbagi/panduan'>) {
  const { albumId } = await params;
  const t = await getTranslations('host.sharing');
  return <><HostPageTitle title={t('preparation')} description={t('description')} /><AlbumSharingPanel albumId={albumId} preparation /></>;
}
