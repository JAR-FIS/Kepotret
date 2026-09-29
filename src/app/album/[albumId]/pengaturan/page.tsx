import { getTranslations } from 'next-intl/server';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { GallerySettings } from '@/features/host/components/gallery-settings';

export default async function AlbumSettingsPage({ params }: PageProps<'/album/[albumId]/pengaturan'>) {
  const { albumId } = await params;
  const t = await getTranslations('host.settingsPage');
  return <><HostPageTitle title={t('title')} description={t('description')} /><GallerySettings albumId={albumId} /></>;
}
