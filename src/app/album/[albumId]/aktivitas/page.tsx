import { getTranslations } from 'next-intl/server';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { AlbumActivity } from '@/features/host/components/album-activity';

export default async function AlbumActivityPage({ params }: PageProps<'/album/[albumId]/aktivitas'>) {
  const { albumId } = await params;
  const t = await getTranslations('host.activity');
  return <><HostPageTitle title={t('title')} description={t('description')} /><AlbumActivity albumId={albumId} /></>;
}
