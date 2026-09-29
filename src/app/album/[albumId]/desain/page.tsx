import { getTranslations } from 'next-intl/server';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { DesignSetup } from '@/features/host/components/design-setup';

export default async function AlbumDesignPage({ params }: PageProps<'/album/[albumId]/desain'>) {
  const { albumId } = await params;
  const t = await getTranslations('host.designPage');
  return <><HostPageTitle title={t('title')} description={t('description')} /><DesignSetup albumId={albumId} /></>;
}
