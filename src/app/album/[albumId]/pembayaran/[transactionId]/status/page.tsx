import { PaymentStatusPage } from '@/features/host/components/fe6-pages';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { getTranslations } from 'next-intl/server';
export default async function Page({ params }: PageProps<'/album/[albumId]/pembayaran/[transactionId]/status'>) { const { albumId, transactionId } = await params; const t = await getTranslations('host.commerce'); return <><HostPageTitle title={t('statusTitle')} /><PaymentStatusPage albumId={albumId} transactionId={transactionId} /></>; }
