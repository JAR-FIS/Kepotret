import { AdminAuditDetail } from '@/features/admin/data';
export default async function Page({ params }: { params: Promise<{ auditId: string }> }) { const { auditId } = await params; return <AdminAuditDetail auditId={auditId} />; }
