'use client';

import { useTranslations } from 'next-intl';

import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { AssignedAlbums } from '@/features/collaboration/components/assigned-albums';

export default function AssignedAlbumsPage() {
  const t = useTranslations('collaboration.dashboard');
  return <><HostPageTitle title={t('assignedTitle')} description={t('assignedDescription')} /><AssignedAlbums /></>;
}
