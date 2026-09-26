import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { AlbumOverview } from '@/features/host/components/album-overview';
import { getTranslations } from 'next-intl/server';

export default async function AlbumOverviewPage({ params }: PageProps<'/album/[albumId]'>) {
  const { albumId } = await params;
  const t = await getTranslations('host');
  return <><HostPageTitle title={t('detail.title')} /><AlbumOverview albumId={albumId} /></>;
}
