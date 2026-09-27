import { CheckoutPage } from '@/features/host/components/fe6-pages';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { getTranslations } from 'next-intl/server';
export default async function Page({ params }: PageProps<'/album/[albumId]/checkout/[packageVersionId]'>) { const { albumId, packageVersionId } = await params; const t = await getTranslations('host.commerce'); return <><HostPageTitle title={t('checkoutTitle')} /><CheckoutPage albumId={albumId} packageVersionId={packageVersionId} /></>; }
