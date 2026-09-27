import { ExportCenterPage } from '@/features/host/components/fe6-pages';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { getTranslations } from 'next-intl/server';
export default async function Page({ params }: PageProps<'/album/[albumId]/ekspor'>) { const { albumId } = await params; const t = await getTranslations('host.export'); return <><HostPageTitle title={t('centerTitle')} /><ExportCenterPage albumId={albumId} /></>; }
