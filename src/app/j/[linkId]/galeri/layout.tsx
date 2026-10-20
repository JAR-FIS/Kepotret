import { GuestGalleryRoute } from '@/features/guest/components/guest-gallery-route';

export default async function GalleryLayout({ children, params }: LayoutProps<'/j/[linkId]/galeri'>) {
  const { linkId } = await params;
  return <><GuestGalleryRoute linkId={linkId} />{children}</>;
}
