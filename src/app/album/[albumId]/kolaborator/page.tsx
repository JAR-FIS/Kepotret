import { getTranslations } from 'next-intl/server';

import { OwnerCollaborators } from '@/features/collaboration/components/owner-collaborators';
import { HostPageTitle } from '@/features/host/components/workspace-shell';

export default async function CollaboratorsManagementPage({ params }: PageProps<'/album/[albumId]/kolaborator'>) {
  const { albumId } = await params;
  const t = await getTranslations('collaboration.owner');
  return <><HostPageTitle title={t('title')} description={t('description')} /><OwnerCollaborators albumId={albumId} /></>;
}
