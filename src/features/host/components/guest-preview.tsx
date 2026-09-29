'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import {
  getApiV1AlbumsAlbumId,
  getApiV1AlbumsAlbumIdDesign,
  getApiV1AlbumsAlbumIdSchedule,
  getApiV1AlbumsAlbumIdSettings,
} from '@/lib/api/browser';
import type { AlbumDetail, AlbumDesign, AlbumSchedule, AlbumSettings } from '@/lib/api/generated/index.schemas';

type PreviewData = { album: AlbumDetail; schedule: AlbumSchedule; design: AlbumDesign; settings: AlbumSettings };

function formatDate(value: string, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

function useServerCountdown(schedule: AlbumSchedule | null) {
  const [elapsed, setElapsed] = useState(0);
  const serverTime = schedule?.server_time;
  useEffect(() => {
    if (!serverTime) return;
    const start = performance.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((performance.now() - start) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [serverTime]);
  if (!schedule) return 0;
  const remaining = Math.max(0, Date.parse(schedule.reveal_at) - Date.parse(schedule.server_time) - elapsed * 1000);
  return Math.floor(remaining / 1000);
}

export function GuestPreview({ albumId }: { albumId: string }) {
  const t = useTranslations('host.guestPreview');
  const shared = useTranslations('host');
  const locale = useLocale();
  const [data, setData] = useState<PreviewData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const revealSeconds = useServerCountdown(data?.schedule ?? null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getApiV1AlbumsAlbumId(albumId),
      getApiV1AlbumsAlbumIdSchedule(albumId),
      getApiV1AlbumsAlbumIdDesign(albumId),
      getApiV1AlbumsAlbumIdSettings(albumId),
    ]).then(([albumResult, scheduleResult, designResult, settingsResult]) => {
      if (!active) return;
      const results = [albumResult, scheduleResult, designResult, settingsResult];
      if (results.some((result) => result.status === 401)) { setState('unauthenticated'); return; }
      if (results.some((result) => result.status === 403)) { setState('forbidden'); return; }
      if (albumResult.status !== 200 || scheduleResult.status !== 200 || designResult.status !== 200 || settingsResult.status !== 200) { setState('error'); return; }
      setData({ album: albumResult.data.data, schedule: scheduleResult.data.data, design: designResult.data.data, settings: settingsResult.data.data });
      setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error' || !data) return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  const { album, schedule, design, settings } = data;
  const captureState = album.capture_state;
  const revealState = album.reveal_state;
  const revealCopy = revealState === 'REVEALED'
    ? t('revealReady')
    : revealSeconds > 0 ? t('revealCountdown') : t('revealHidden');

  return <div className="space-y-5">
    <p role="note" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-sm font-medium">{t('notice')}</p>
    <section aria-label={t('previewLabel')} className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div className="relative grid min-h-64 place-items-center bg-[var(--color-muted)] p-6 text-center">
        {design.cover_preview && <Image src={design.cover_preview.url} unoptimized fill sizes="(max-width: 36rem) 100vw, 36rem" alt={t('coverAlt')} className="object-cover" />}
        <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
        <div className="relative z-10 text-white">
          <p className="mb-3 inline-flex rounded-full border border-white/70 bg-black/35 px-3 py-1 text-xs font-bold uppercase tracking-wide">{t('previewBadge')}</p>
          <p className="text-xs font-bold uppercase tracking-[.15em]">{t('album')}</p>
          <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{album.event_name ?? t('unnamed')}</h2>
          {album.event_location && <p className="mt-1 text-sm">{album.event_location}</p>}
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-7">
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="font-semibold">{captureState === 'OPEN' ? t('captureOpen') : captureState === 'CLOSED' ? t('captureClosed') : t('captureNotStarted')}</p>
          {captureState === 'NOT_STARTED' && <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('waiting')}</p>}
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('revealAt', { time: formatDate(schedule.reveal_at, locale, schedule.timezone) })}</p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('captureWindow', { start: formatDate(schedule.capture_start, locale, schedule.timezone), end: formatDate(schedule.capture_end, locale, schedule.timezone) })}</p>
          {revealState === 'HIDDEN' && revealSeconds > 0 && <p role="timer" aria-label={t('revealCountdown')} className="mt-1 text-sm font-medium">{`${Math.floor(revealSeconds / 86400)}d ${Math.floor((revealSeconds % 86400) / 3600)}h ${Math.floor((revealSeconds % 3600) / 60)}m ${revealSeconds % 60}s`}</p>}
          <p className="mt-2 text-sm">{revealCopy}</p>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">{settings.visibility === 'GUEST' ? t('guestVisible') : t('hidden')}</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">{settings.moderation_mode === 'APPROVAL' ? t('approval') : t('instant')}</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">{settings.likes_enabled ? t('likesEnabled') : t('likesDisabled')}</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">{settings.downloads_enabled ? t('downloadsEnabled') : t('downloadsDisabled')}</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">{settings.share_enabled ? t('sharingEnabled') : t('sharingDisabled')}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">{t('pinNotice')}</p>
        <button type="button" disabled className="min-h-11 w-full rounded-xl bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-primary-foreground)] opacity-60">{t('guestCta')}</button>
        <p className="text-center text-xs text-[var(--color-muted-foreground)]">{t('cameraPreview')}</p>
      </div>
    </section>
  </div>;
}
