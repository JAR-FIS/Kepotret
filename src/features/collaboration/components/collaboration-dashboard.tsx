'use client';

import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { HostCreateButton } from '@/features/host/components/album-index';
import { HostPageTitle } from '@/features/host/components/workspace-shell';
import { hostRoutes } from '@/features/host/routes';
import { AssignedAlbums } from './assigned-albums';

export function CollaborationDashboard() {
  const t = useTranslations('collaboration.dashboard');
  const common = useTranslations('collaboration');
  return <>
    <HostPageTitle title={t('title')} description={t('description')} action={<HostCreateButton />} />
    <section className="mb-7 flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{t('eyebrow')}</p><h2 className="mt-2 font-[var(--font-display)] text-xl font-bold">{t('workspaceTitle')}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">{t('workspaceDescription')}</p></div>
      <Link href={hostRoutes.assignedAlbums} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-semibold hover:bg-[var(--color-muted)]">{t('allAssigned')}<ArrowRight size={17} aria-hidden="true" /></Link>
    </section>
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-[var(--font-display)] text-xl font-bold">{t('assignedTitle')}</h2><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('assignedDescription')}</p></div><Link href={hostRoutes.createAlbum} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"><Plus size={17} aria-hidden="true" />{common('createOwnAlbum')}</Link></div>
    <AssignedAlbums dashboard />
  </>;
}
