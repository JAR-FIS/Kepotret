import { getTranslations } from 'next-intl/server';

import { InvitationHistory } from '@/features/collaboration/components/invitation-history';
import { HostPageTitle } from '@/features/host/components/workspace-shell';

export default async function InvitationHistoryPage({ params }: PageProps<'/album/[albumId]/kolaborator/undangan'>) {
  const { albumId } = await params;
  const t = await getTranslations('collaboration.history');
  return <><HostPageTitle title={t('title')} description={t('description')} /><InvitationHistory albumId={albumId} /></>;
}
