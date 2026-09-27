import { ReschedulePage } from '@/features/host/components/fe6-pages';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { getTranslations } from 'next-intl/server';
export default async function Page({ params }: PageProps<'/album/[albumId]/jadwal-ulang'>) { const { albumId } = await params; const t = await getTranslations('host.lifecycle'); return <><HostPageTitle title={t('rescheduleTitle')} /><ReschedulePage albumId={albumId} /></>; }
