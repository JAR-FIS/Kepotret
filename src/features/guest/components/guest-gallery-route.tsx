'use client';

import { useParams } from 'next/navigation';
import { GuestGallery } from './guest-gallery';

/** The Gallery layout persists while its photo child route changes. */
export function GuestGalleryRoute({ linkId }: { linkId: string }) {
  const { photoId } = useParams<{ photoId?: string }>();
  return <GuestGallery linkId={linkId} photoId={photoId} />;
}
