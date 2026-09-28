import { AdminPaymentDetail } from '@/features/admin/data';
export default async function Page({ params }: { params: Promise<{ transactionId: string }> }) { const { transactionId } = await params; return <AdminPaymentDetail transactionId={transactionId} />; }
