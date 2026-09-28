import { AdminAlbumDetailPage } from '@/features/admin/albums';
export default async function Page({ params }: { params: Promise<{ albumId: string }> }) { const { albumId } = await params; return <AdminAlbumDetailPage albumId={albumId} />; }
