import { AdminUserDetailPage } from '@/features/admin/users';
export default async function Page({ params }: { params: Promise<{ userId: string }> }) { const { userId } = await params; return <AdminUserDetailPage userId={userId} />; }
