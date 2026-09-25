'use client';

import { useTranslations } from 'next-intl';

import { AlbumIndex, HostCreateButton } from '@/features/host/components/album-index';
import { HostPageTitle } from '@/features/host/components/workspace-shell';

export default function AlbumsPage() {
  const t = useTranslations('host.albums');
  return <>
    <HostPageTitle title={t('title')} description={t('description')} action={<HostCreateButton />} />
    <AlbumIndex />
  </>;
}
