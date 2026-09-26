'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumIdReview } from '@/lib/api/browser';
import type { AlbumDetail } from '@/lib/api/generated/index.schemas';

export function SetupReview({ albumId }: { albumId: string }) {
  const t = useTranslations('host.review');
  const shared = useTranslations('host');
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumIdReview(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) { setAlbum(result.data.data); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;
  if (!album) return null;

  return <section className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <h2 className="font-semibold">{t('title')}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('limited')}</p>
    <dl className="mt-5 grid gap-3 sm:grid-cols-2">
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('readiness')}</dt><dd className="font-semibold">{album.readiness}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('setupRevision')}</dt><dd>{album.setup_revision}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('scheduleVersion')}</dt><dd>{album.schedule_version}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('confirmedSetupRevision')}</dt><dd>{album.confirmed_setup_revision ?? t('notConfirmed')}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('confirmedScheduleVersion')}</dt><dd>{album.confirmed_schedule_version ?? t('notConfirmed')}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('confirmedPackage')}</dt><dd className="break-all">{album.confirmed_package_version_id ?? t('notConfirmed')}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('confirmedAt')}</dt><dd>{album.setup_confirmed_at ?? t('notConfirmed')}</dd></div>
    </dl>
  </section>;
}
