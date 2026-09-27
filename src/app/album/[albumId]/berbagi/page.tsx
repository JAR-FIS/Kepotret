import { getTranslations } from 'next-intl/server';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { AlbumSharingPanel } from '@/features/host/components/album-sharing';

export default async function AlbumSharingPage({ params }: PageProps<'/album/[albumId]/berbagi'>) {
  const { albumId } = await params;
  const t = await getTranslations('host.sharing');
  return <><HostPageTitle title={t('title')} description={t('description')} /><AlbumSharingPanel albumId={albumId} /></>;
}
