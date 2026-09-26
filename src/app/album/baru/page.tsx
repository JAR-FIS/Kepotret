'use client';

import { useTranslations } from 'next-intl';

import { CreateAlbumForm } from '@/features/host/components/create-album-form';
import { HostPageTitle } from '@/features/host/components/workspace-shell';

export default function CreateAlbumPage() {
  const t = useTranslations('host.createPage');
  return <><HostPageTitle title={t('title')} description={t('description')} /><CreateAlbumForm /></>;
}
