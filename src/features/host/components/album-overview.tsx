'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId } from '@/lib/api/browser';
import type { AlbumDetail } from '@/lib/api/generated/index.schemas';
import { hostRoutes } from '@/features/host/routes';
import { AlbumStatus, albumStatusKey } from '@/features/host/components/album-status';

export function AlbumOverview({ albumId }: { albumId: string }) {
  const t = useTranslations('host');
  const locale = useLocale();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'unauthenticated' | 'forbidden'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumId(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) { setAlbum(result.data.data); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  if (state === 'loading') return <LoadingState label={t('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={t('reauthTitle')} description={t('reauthDescription')} action={<Link href="/masuk-ulang" className="underline">{t('reauthTitle')}</Link>} />;
  if (state === 'forbidden') return <ForbiddenState title={t('forbiddenTitle')} description={t('forbiddenDescription')} />;
  if (state === 'error' || !album) return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={t('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  const summary = album;
  const formatTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: album.timezone }).format(new Date(value));
  return <div className="space-y-5">
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-[var(--font-display)] text-xl font-bold">{t(`detail.${album.readiness === 'READY' ? 'ready' : album.readiness === 'PAYMENT_PENDING' ? 'paymentPending' : 'draft'}`)}</h2><AlbumStatus album={summary} label={t(`albums.${albumStatusKey(summary)}`)} /></div>
      <p className="mt-4 text-xl font-semibold">{album.event_name ?? t('detail.eventNameMissing')}</p>
      {album.event_location && <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{t('detail.location')}: {album.event_location}</p>}
      <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">{t('detail.id')}</p><p className="mt-1 break-all font-mono text-sm">{album.album_id}</p>
      <div className="mt-6 border-t border-[var(--color-border)] pt-5"><p className="text-sm font-semibold">{album.capture_state === 'OPEN' ? t('detail.captureOpen') : album.capture_state === 'CLOSED' ? t('detail.captureClosed') : t('detail.notStarted')}</p></div>
      {album.capture_start && album.capture_end && <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{formatTime(album.capture_start)} – {formatTime(album.capture_end)} ({album.timezone})</p>}
      {album.quota_total !== null && album.committed_count !== null && <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t('albums.quota', { committed: album.committed_count, quota: album.quota_total })}</p>}
    </section>
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7"><h2 className="text-sm font-semibold">{t('detail.guestCount')}</h2><p className="mt-2 font-[var(--font-display)] text-3xl font-bold">{album.guest_count_final ?? '—'}</p>{album.guest_count_final == null && <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('detail.guestCountUnavailable')}</p>}</section>
    {album.readiness === 'DRAFT' && <Link href={hostRoutes.setup(albumId, 'acara')}><Button type="button">{t('detail.setup')}<ArrowRight aria-hidden="true" size={17} /></Button></Link>}
  </div>;
}
