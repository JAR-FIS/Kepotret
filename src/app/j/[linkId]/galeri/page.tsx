import { GuestGallery } from '@/features/guest/components/guest-gallery';

export default async function GuestGalleryPage({ params }: PageProps<'/j/[linkId]/galeri'>) {
  const { linkId } = await params;
  return <GuestGallery linkId={linkId} />;
}
