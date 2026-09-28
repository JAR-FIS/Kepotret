import { AdminOperationalHold } from '@/features/admin/privileged';
export default async function Page({ params }: { params: Promise<{ albumId: string }> }) { const { albumId } = await params; return <AdminOperationalHold albumId={albumId} />; }
