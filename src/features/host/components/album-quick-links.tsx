'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { getApiV1AlbumsAlbumIdPackageOptions, getApiV1AlbumsAlbumIdSchedule } from '@/lib/api/browser';
import type { AlbumActorAccess, AlbumReadiness } from '@/lib/api/generated/index.schemas';
import { hostRoutes } from '@/features/host/routes';

type LinkItem = { href: string; label: string };
type Eligibility = { albumId: string; canReschedule: boolean; canUpgrade: boolean; upgradeKnown: boolean };

export function AlbumQuickLinks({ albumId, actorAccess, readiness }: { albumId: string; actorAccess: AlbumActorAccess; readiness: AlbumReadiness }) {
  const t = useTranslations('host.quickLinks');
  const isOwner = actorAccess.relationship === 'OWNER';
  const permissions = actorAccess.collaborator_permissions;
  const canSetup = !isOwner && readiness === 'DRAFT' && permissions?.can_setup === true;
  const canModerate = isOwner || permissions?.can_moderate === true;
  const canExport = isOwner || permissions?.can_export_zip === true;
  const canViewActivity = isOwner || Boolean(permissions && Object.values(permissions).some(Boolean));
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    void Promise.allSettled([
      Promise.resolve().then(() => getApiV1AlbumsAlbumIdSchedule(albumId)),
      Promise.resolve().then(() => getApiV1AlbumsAlbumIdPackageOptions(albumId)),
    ]).then(([schedule, packages]) => {
      if (!active) return;
      setEligibility({
        albumId,
        canReschedule: schedule.status === 'fulfilled' && schedule.value.status === 200 && schedule.value.data.data.can_reschedule,
        canUpgrade: packages.status === 'fulfilled' && packages.value.status === 200 && packages.value.data.data.can_create_checkout && !packages.value.data.data.active_checkout && packages.value.data.data.options.length > 0,
        upgradeKnown: packages.status === 'fulfilled' && packages.value.status === 200,
      });
    });
    return () => { active = false; };
  }, [albumId, isOwner]);

  const documentation: LinkItem[] = [
    ...(canModerate ? [{ href: hostRoutes.gallery(albumId), label: t('gallery') }] : []),
    { href: hostRoutes.sharing(albumId), label: t('sharing') },
    ...(isOwner ? [{ href: hostRoutes.guestPreview(albumId), label: t('guestPreview') }] : []),
    ...(isOwner || canSetup ? [{ href: hostRoutes.design(albumId), label: t('design') }] : []),
    ...(canExport ? [{ href: hostRoutes.exports(albumId), label: t('exports') }] : []),
  ];
  const event: LinkItem[] = [
    ...(isOwner ? [{ href: hostRoutes.reschedule(albumId), label: eligibility?.albumId === albumId && eligibility.canReschedule ? t('reschedule') : t('schedule') }] : []),
    ...(canViewActivity ? [{ href: hostRoutes.activity(albumId), label: t('activity') }] : []),
    ...(isOwner ? [{ href: hostRoutes.lifecycle(albumId), label: t('lifecycle') }] : []),
  ];
  const settings: LinkItem[] = [
    ...(isOwner || canSetup ? [{ href: hostRoutes.settings(albumId), label: t('settings') }] : []),
    ...(isOwner ? [{ href: hostRoutes.collaborators(albumId), label: t('collaborators') }] : [{ href: hostRoutes.permissions(albumId), label: t('permissions') }]),
  ];
  const payments: LinkItem[] = isOwner ? [
    { href: hostRoutes.payments(albumId), label: t('paymentHistory') },
    ...(eligibility?.albumId === albumId && eligibility.canUpgrade ? [{ href: hostRoutes.upgrade(albumId), label: t('upgrade') }] : []),
  ] : [];
  const groups = [
    { key: 'documentation', links: documentation },
    { key: 'event', links: event },
    { key: 'settings', links: settings },
    { key: 'payments', links: payments },
  ] as const;

  return <nav aria-label={t('label')} className="grid gap-4 md:grid-cols-2">
    {groups.filter((group) => group.links.length > 0).map((group) => <section key={group.key} className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{t(group.key)}</h2>
      <ul className="mt-3 space-y-1">{group.links.map((item) => <li key={item.href}><Link href={item.href} className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"><span className="min-w-0 break-words">{item.label}</span><ArrowRight aria-hidden="true" size={16} className="shrink-0" /></Link></li>)}</ul>
      {group.key === 'payments' && eligibility?.albumId === albumId && eligibility.upgradeKnown && !eligibility.canUpgrade && <p className="mt-2 px-3 text-xs text-[var(--color-muted-foreground)]">{t('upgradeUnavailable')}</p>}
    </section>)}
  </nav>;
}
