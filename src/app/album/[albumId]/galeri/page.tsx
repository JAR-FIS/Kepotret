import { getTranslations } from 'next-intl/server';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { AlbumGalleryManagement } from '@/features/host/components/gallery-management';
import { GallerySettings } from '@/features/host/components/gallery-settings';

export default async function HostGalleryPage({ params }: PageProps<'/album/[albumId]/galeri'>) {
  const { albumId } = await params;
  const t = await getTranslations('host.gallery');
  return <><HostPageTitle title={t('title')} description={t('description')} /><div className="space-y-6"><GallerySettings albumId={albumId} /><AlbumGalleryManagement albumId={albumId} /></div></>;
}
