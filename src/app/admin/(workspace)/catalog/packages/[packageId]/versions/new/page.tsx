import { AdminPackageVersionCreate } from '@/features/admin/data';
export default async function Page({ params }: { params: Promise<{ packageId: string }> }) { const { packageId } = await params; return <AdminPackageVersionCreate packageId={packageId} />; }
