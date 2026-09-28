import { getTranslations } from 'next-intl/server';

import { PermissionSummary } from '@/features/collaboration/components/permission-summary';
import { HostPageTitle } from '@/features/host/components/workspace-shell';

export default async function CollaboratorPermissionsPage({ params }: PageProps<'/album/[albumId]/izin'>) {
  const { albumId } = await params;
  const t = await getTranslations('collaboration.permissions');
  return <><HostPageTitle title={t('title')} description={t('descriptionShort')} /><PermissionSummary albumId={albumId} /></>;
}
