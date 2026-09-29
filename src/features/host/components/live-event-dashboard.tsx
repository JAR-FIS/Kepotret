'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumIdLiveOverview } from '@/lib/api/browser';
import type { AlbumLiveOverview } from '@/lib/api/generated/index.schemas';
import { hostRoutes } from '@/features/host/routes';

export function LiveEventDashboard({ albumId }: { albumId: string }) {
  const t = useTranslations('host.liveDashboard');
  const shared = useTranslations('host');
  const locale = useLocale();
  const [overview, setOverview] = useState<AlbumLiveOverview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [serverElapsed, setServerElapsed] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumIdLiveOverview(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) { setOverview(result.data.data); setServerElapsed(0); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);
  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => setServerElapsed(Math.floor((performance.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [overview]);

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error' || !overview) return <ErrorState title={shared('errorTitle')} description={t('unavailable')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  const countdown = overview.capture_end ? Math.max(0, Math.floor((Date.parse(overview.capture_end) - Date.parse(overview.server_time)) / 1000) - serverElapsed) : null;
  const isOwner = overview.actor_access.relationship === 'OWNER';
  const canModerate = overview.actor_access.collaborator_permissions?.can_moderate === true;
  const canExport = isOwner || overview.actor_access.collaborator_permissions?.can_export_zip === true;
  const formatTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: overview.timezone }).format(new Date(value));
  return <section aria-labelledby="live-dashboard-title" className="space-y-5">
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--color-muted-foreground)]">{t('eyebrow')}</p>
      <h2 id="live-dashboard-title" className="mt-2 font-[var(--font-display)] text-2xl font-bold">{overview.event_name ?? t('unnamed')}</h2>
      <p className="mt-2 text-sm">{overview.capture_state === 'OPEN' ? t('captureOpen') : t('captureClosed')}</p>
      {overview.event_location && <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{overview.event_location}</p>}
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('serverTime', { time: formatTime(overview.server_time) })}</p>
      {overview.capture_start && <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t('captureWindow', { start: formatTime(overview.capture_start), end: overview.capture_end ? formatTime(overview.capture_end) : t('unknown') })}</p>}
      {countdown !== null && <p role="timer" className="mt-3 text-lg font-semibold">{t('countdown', { minutes: Math.floor(countdown / 60), seconds: String(countdown % 60).padStart(2, '0') })}</p>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Metric title={t('quota')} value={overview.quota_total === null || overview.committed_count === null ? t('unknown') : t('quotaValue', { committed: overview.committed_count, quota: overview.quota_total })} description={overview.reserved_current_count === null ? undefined : t('reservedUsage', { count: overview.reserved_current_count })} />
      <Metric title={overview.guest_count_final === null ? t('liveGuests') : t('finalGuests')} value={overview.guest_count_final ?? overview.live_guest_session_count ?? t('unknown')} />
      <Metric title={t('reveal')} value={overview.reveal_at ? formatTime(overview.reveal_at) : t(`revealState.${overview.reveal_state}`)} />
      <Metric title={t('status')} value={t(`readiness.${overview.readiness}`)} />
    </div>
    <nav aria-label={t('actions')} className="flex flex-wrap gap-3">
      {(isOwner || canModerate) && <Link className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold hover:bg-[var(--color-muted)]" href={hostRoutes.gallery(albumId)}>{t('gallery')}</Link>}
      <Link className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold hover:bg-[var(--color-muted)]" href={hostRoutes.sharing(albumId)}>{t('sharing')}</Link>
      {canExport && <Link className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold hover:bg-[var(--color-muted)]" href={hostRoutes.exports(albumId)}>{t('exports')}</Link>}
    </nav>
  </section>;
}

function Metric({ title, value, description }: { title: string; value: React.ReactNode; description?: string }) {
  return <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h3 className="text-sm font-medium text-[var(--color-muted-foreground)]">{title}</h3><p className="mt-2 text-xl font-bold">{value}</p>{description && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{description}</p>}</div>;
}
