'use client';

import { useTranslations } from 'next-intl';

import { HostCreateButton } from '@/features/host/components/album-index';
import { AlbumIndex } from '@/features/host/components/album-index';
import { HostPageTitle } from '@/features/host/components/workspace-shell';

export default function DashboardPage() {
  const t = useTranslations('host.dashboard');
  return <>
    <HostPageTitle title={t('title')} description={t('description')} action={<HostCreateButton />} />
    <AlbumIndex dashboard />
  </>;
}
