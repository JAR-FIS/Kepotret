'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId, getApiV1Packages } from '@/lib/api/browser';
import type { AlbumDetail, PackageOption } from '@/lib/api/generated/index.schemas';
import { hostRoutes } from '@/features/host/routes';
import { AlbumStatus, albumStatusKey } from '@/features/host/components/album-status';
import { formatEventDateTime } from '@/lib/time/event-time';
import { LiveEventDashboard } from '@/features/host/components/live-event-dashboard';

type OverviewState =
  | { albumId: string; kind: 'loading' | 'error' | 'unauthenticated' | 'forbidden' }
  | { albumId: string; kind: 'ready'; album: AlbumDetail };

export function AlbumOverview({ albumId }: { albumId: string }) {
  const t = useTranslations('host');
  const locale = useLocale();
  const [packages, setPackages] = useState<{ albumId: string; options: PackageOption[] } | null>(null);
  const [state, setState] = useState<OverviewState>({ albumId, kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumId(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) {
        const detail = result.data.data;
        setPackages(null);
        setState({ albumId, kind: 'ready', album: detail });
        if (detail.actor_access.relationship === 'OWNER' && detail.selected_package_version_id !== null) {
          void getApiV1Packages().then((catalog) => {
            if (active && catalog.status === 200) setPackages({ albumId, options: catalog.data.data });
          }).catch(() => { /* Package metadata is optional; album detail remains authoritative. */ });
        }
      }
      else if (result.status === 401) setState({ albumId, kind: 'unauthenticated' });
      else if (result.status === 403) setState({ albumId, kind: 'forbidden' });
      else setState({ albumId, kind: 'error' });
    }).catch(() => { if (active) setState({ albumId, kind: 'error' }); });
    return () => { active = false; };
  }, [albumId, attempt]);

  if (state.albumId !== albumId || state.kind === 'loading') return <LoadingState label={t('loading')} />;
  if (state.kind === 'unauthenticated') return <ReauthState title={t('reauthTitle')} description={t('reauthDescription')} action={<Link href="/masuk-ulang" className="underline">{t('reauthTitle')}</Link>} />;
  if (state.kind === 'forbidden') return <ForbiddenState title={t('forbiddenTitle')} description={t('forbiddenDescription')} />;
  if (state.kind !== 'ready') return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={t('retry')} onRetry={() => { setState({ albumId, kind: 'loading' }); setAttempt((value) => value + 1); }} />;
  const album = state.album;
  if (album.readiness === 'READY') return <LiveEventDashboard albumId={albumId} />;

  const summary = album;
  const isOwner = album.actor_access.relationship === 'OWNER';
  const canModerate = album.actor_access.relationship === 'COLLABORATOR'
    && album.actor_access.collaborator_permissions?.can_moderate === true;
  const selectedPackage = packages?.albumId === albumId ? packages.options.find((option) => option.package_version_id === album.selected_package_version_id) : undefined;
  const formatTime = (value: string) => formatEventDateTime(value, locale, album.timezone);
  return <div className="space-y-5">
    <nav aria-label={t('nav.albumLabel')} className="grid gap-3 sm:grid-cols-2">{(isOwner || canModerate) && <Link href={hostRoutes.gallery(albumId)} className="flex min-h-14 items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold hover:bg-[var(--color-muted)]">{t('gallery.title')}<ArrowRight aria-hidden="true" size={17} /></Link>}<Link href={hostRoutes.sharing(albumId)} className="flex min-h-14 items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold hover:bg-[var(--color-muted)]">{t('sharing.title')}<ArrowRight aria-hidden="true" size={17} /></Link></nav>
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-[family-name:var(--font-display)] text-xl font-bold">{t(`detail.${album.readiness === 'PAYMENT_PENDING' ? 'paymentPending' : 'draft'}`)}</h2><AlbumStatus album={summary} label={t(`albums.${albumStatusKey(summary)}`)} /></div>
      <p className="mt-4 text-xl font-semibold">{album.event_name ?? t('detail.eventNameMissing')}</p>
      {album.event_location && <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('detail.location')}: {album.event_location}</p>}
      <p className="mt-4 flex min-w-0 flex-wrap items-baseline gap-x-2 text-xs text-[var(--color-muted-foreground)]"><span>{t('detail.id')}</span><span className="break-all font-mono text-sm text-[var(--color-foreground)]">{album.album_id}</span></p>
      <div className="mt-6 border-t border-[var(--color-border)] pt-5"><p className="text-sm font-semibold">{album.capture_state === 'CLOSED' ? t('detail.captureClosed') : t('detail.notStarted')}</p></div>
      {album.capture_start && album.capture_end && <><p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t('detail.scheduleRange', { start: formatTime(album.capture_start), end: formatTime(album.capture_end) })} ({album.timezone})</p><p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{t('detail.captureDuringEvent')}</p></>}
      {isOwner && <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
        <h3 className="font-semibold">{t('detail.packageTitle')}</h3>
        <p className="mt-2">{album.selected_package_version_id === null ? t('packages.freeTitle') : selectedPackage ? `${selectedPackage.name} (${selectedPackage.code})` : t('detail.packageUnavailable')}</p>
        {selectedPackage && <p className="mt-1 text-[var(--color-muted-foreground)]">{t('detail.selectedCapacity', { count: new Intl.NumberFormat(locale).format(selectedPackage.quota_total) })}</p>}
        <p className="mt-1 text-[var(--color-muted-foreground)]">{album.quota_total === null ? t('detail.capacityUnavailable') : t('detail.currentCapacity', { count: new Intl.NumberFormat(locale).format(album.quota_total) })}</p>
        {selectedPackage && <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{t('detail.selectionNotEntitlement')}</p>}
      </div>}
      {isOwner && album.quota_total !== null && album.committed_count !== null && <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t('albums.quota', { committed: album.committed_count, quota: album.quota_total })}</p>}
    </section>
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7"><h2 className="text-sm font-semibold">{t('detail.guestCount')}</h2><p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">{album.guest_count_final ?? '—'}</p>{album.guest_count_final == null && <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('detail.guestCountUnavailable')}</p>}</section>
    {(isOwner || (album.actor_access.relationship === 'COLLABORATOR' && album.actor_access.collaborator_permissions?.can_setup)) && album.readiness === 'DRAFT' && <Link href={hostRoutes.setup(albumId, 'acara')}><Button type="button" className="rounded-full font-bold">{t('detail.setup')}<ArrowRight aria-hidden="true" size={17} /></Button></Link>}
  </div>;
}
