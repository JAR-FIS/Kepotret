import { getTranslations } from 'next-intl/server';

import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { ActivationResult } from '@/features/host/components/activation-result';

export default async function AlbumReadyPage({ params }: PageProps<'/album/[albumId]/siap'>) {
  const { albumId } = await params;
  const t = await getTranslations('host.readyPage');
  return <><HostPageTitle title={t('title')} /><ActivationResult albumId={albumId} /></>;
}
