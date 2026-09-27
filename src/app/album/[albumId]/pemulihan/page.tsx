import { LifecyclePage } from '@/features/host/components/fe6-pages';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { getTranslations } from 'next-intl/server';
export default async function Page({ params }: PageProps<'/album/[albumId]/pemulihan'>) { const { albumId } = await params; const t = await getTranslations('host.lifecycle'); return <><HostPageTitle title={t('recoveryTitle')} /><LifecyclePage albumId={albumId} /></>; }
