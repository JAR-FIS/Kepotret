import { AdminSensitiveAccess } from '@/features/admin/privileged';
export default async function Page({ params }: { params: Promise<{ albumId: string }> }) { const { albumId } = await params; return <AdminSensitiveAccess albumId={albumId} />; }
