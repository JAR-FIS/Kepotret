'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Plus } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { getApiV1Albums } from '@/lib/api/browser';
import type { AlbumSummary } from '@/lib/api/generated/index.schemas';
import { hostRoutes } from '@/features/host/routes';
import { AlbumStatus, albumStatusKey } from '@/features/host/components/album-status';

type AlbumsState = { kind: 'loading' } | { kind: 'ready'; albums: AlbumSummary[] } | { kind: 'error' } | { kind: 'unauthenticated' } | { kind: 'forbidden' };

export function AlbumIndex({ dashboard = false }: { dashboard?: boolean }) {
  const t = useTranslations('host');
  const locale = useLocale();
  const [state, setState] = useState<AlbumsState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1Albums().then((result) => {
      if (!active) return;
      if (result.status === 200) setState({ kind: 'ready', albums: result.data.data });
      else if (result.status === 401) setState({ kind: 'unauthenticated' });
      else if (result.status === 403) setState({ kind: 'forbidden' });
      else setState({ kind: 'error' });
    }).catch(() => { if (active) setState({ kind: 'error' }); });
    return () => { active = false; };
  }, [attempt]);

  if (state.kind === 'loading') return <LoadingState label={t('loading')} />;
  if (state.kind === 'unauthenticated') return <ReauthState title={t('reauthTitle')} description={t('reauthDescription')} action={<Link href="/masuk-ulang" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]">{t('reauthTitle')}</Link>} />;
  if (state.kind === 'forbidden') return <ForbiddenState title={t('forbiddenTitle')} description={t('forbiddenDescription')} />;
  if (state.kind === 'error') return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={t('retry')} onRetry={() => { setState({ kind: 'loading' }); setAttempt((value) => value + 1); }} />;

  if (!state.albums.length) return <EmptyState title={dashboard ? t('dashboard.newAlbum') : t('albums.empty')} description={dashboard ? t('dashboard.newAlbumDescription') : t('albums.emptyDescription')} icon={<Plus size={25} />} action={<Link href={hostRoutes.createAlbum} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]"><Plus size={17} aria-hidden="true" />{t('create')}</Link>} />;

  const albums = dashboard ? state.albums.slice(0, 5) : state.albums;
  const counts = state.albums.reduce((result, album) => {
    const key = albumStatusKey(album);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {} as Record<string, number>);

  return <div className="space-y-6">
    {dashboard && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {(['draft', 'ready', 'ended'] as const).map((status) => <section key={status} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><p className="text-sm text-[var(--color-muted-foreground)]">{t(`dashboard.${status}`)}</p><p className="mt-2 font-[var(--font-display)] text-2xl font-bold">{counts[status] ?? 0}</p></section>)}
    </div>}
    <ul className="grid min-w-0 gap-3">
      {albums.map((album) => {
        const statusKey = albumStatusKey(album);
        return <li key={album.album_id}>
          <Link href={hostRoutes.album(album.album_id)} className="group flex min-h-24 min-w-0 items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-muted)] sm:px-6">
            <div className="min-w-0"><p className="text-lg font-semibold">{album.event_name ?? t('albums.unnamed')}</p><p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{t('albums.id')}</p><p className="mt-1 break-all font-mono text-sm">{album.album_id}</p><div className="mt-3"><AlbumStatus album={album} label={t(`albums.${statusKey}`)} /></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-muted-foreground)]">{album.capture_start && album.capture_end ? <span>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: album.timezone }).format(new Date(album.capture_start))} – {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: album.timezone }).format(new Date(album.capture_end))}</span> : <span>{t('albums.scheduleNotSet')}</span>}{album.quota_total !== null && album.committed_count !== null && <span>{t('albums.quota', { committed: album.committed_count, quota: album.quota_total })}</span>}{album.guest_count_final !== null && <span>{t('albums.guests', { count: album.guest_count_final })}</span>}</div></div>
            <ArrowRight aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-1" size={19} />
          </Link>
        </li>;
      })}
    </ul>
    {dashboard && state.albums.length > 5 && <Link href={hostRoutes.albums} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">{t('dashboard.albums')}<ArrowRight aria-hidden="true" size={16} /></Link>}
  </div>;
}

export function HostCreateButton() {
  const t = useTranslations('host');
  return <Link href={hostRoutes.createAlbum} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]"><Plus aria-hidden="true" size={17} />{t('create')}</Link>;
}
