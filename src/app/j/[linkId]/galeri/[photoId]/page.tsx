import { GuestGallery } from '@/features/guest/components/guest-gallery';

export default async function GuestPhotoPage({ params }: PageProps<'/j/[linkId]/galeri/[photoId]'>) {
  const { linkId, photoId } = await params;
  return <GuestGallery linkId={linkId} photoId={photoId} />;
}
