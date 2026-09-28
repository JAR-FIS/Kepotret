import { AdminIssueDetail } from '@/features/admin/data';
export default async function Page({ params }: { params: Promise<{ issueId: string }> }) { const { issueId } = await params; return <AdminIssueDetail issueId={issueId} />; }
