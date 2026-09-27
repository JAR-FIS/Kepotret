import { RecoveryMediaPage } from '@/features/host/components/fe6-pages';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { getTranslations } from 'next-intl/server';
export default async function Page({ params }: PageProps<'/album/[albumId]/pemulihan/media'>) { const { albumId } = await params; const t = await getTranslations('host.lifecycle'); return <><HostPageTitle title={t('mediaTitle')} /><RecoveryMediaPage albumId={albumId} /></>; }
