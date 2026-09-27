import { getTranslations } from 'next-intl/server';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { AlbumGalleryManagement } from '@/features/host/components/gallery-management';

export default async function HostPhotoPage({ params }: PageProps<'/album/[albumId]/galeri/[photoId]'>) {
  const { albumId, photoId } = await params;
  const t = await getTranslations('host.gallery');
  return <><HostPageTitle title={t('detailTitle')} /><AlbumGalleryManagement albumId={albumId} photoId={photoId} /></>;
}
