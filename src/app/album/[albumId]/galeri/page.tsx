import { getTranslations } from 'next-intl/server';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { AlbumGalleryManagement } from '@/features/host/components/gallery-management';

export default async function HostGalleryPage({ params }: PageProps<'/album/[albumId]/galeri'>) {
  const { albumId } = await params;
  const t = await getTranslations('host.gallery');
  return <><HostPageTitle title={t('title')} description={t('description')} /><AlbumGalleryManagement albumId={albumId} /></>;
}
