import { PaymentHistoryPage } from '@/features/host/components/fe6-pages';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { getTranslations } from 'next-intl/server';
export default async function Page({ params }: PageProps<'/album/[albumId]/pembayaran/[transactionId]'>) { const { albumId, transactionId } = await params; const t = await getTranslations('host.commerce'); return <><HostPageTitle title={t('detailTitle')} /><PaymentHistoryPage albumId={albumId} transactionId={transactionId} /></>; }
