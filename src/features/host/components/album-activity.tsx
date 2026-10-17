'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { getApiV1AlbumsAlbumId, getApiV1AlbumsAlbumIdActivity } from '@/lib/api/browser';
import type { AlbumActivityItem } from '@/lib/api/generated/index.schemas';
import { useConnectivity } from '@/hooks/use-connectivity';
import { formatEventDateTime } from '@/lib/time/event-time';

const PAGE_SIZE = 25;
type ActivityViewState = 'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error';
type ActivityPage = { albumId: string; items: AlbumActivityItem[]; cursor: string | null; hasMore: boolean };

export function AlbumActivity({ albumId }: { albumId: string }) {
  const t = useTranslations('host.activity');
  const shared = useTranslations('host');
  const locale = useLocale();
  const online = useConnectivity();
  const [page, setPage] = useState<ActivityPage>({ albumId, items: [], cursor: null, hasMore: false });
  const [view, setView] = useState<{ albumId: string; state: ActivityViewState }>({ albumId, state: 'loading' });
  const [busyState, setBusy] = useState<{ albumId: string; busy: boolean }>({ albumId, busy: false });
  const [zone, setZone] = useState<{ albumId: string; timeZone: string | null }>({ albumId, timeZone: null });
  const blockedAlbumId = useRef<string | null>(null);
  const activeAlbumId = useRef(albumId);
  const requestGeneration = useRef(0);
  const items = page.albumId === albumId ? page.items : [];
  const cursor = page.albumId === albumId ? page.cursor : null;
  const hasMore = page.albumId === albumId && page.hasMore;
  const state = view.albumId === albumId ? view.state : 'loading';
  const busy = busyState.albumId === albumId && busyState.busy;
  const timeZone = zone.albumId === albumId ? zone.timeZone : null;

  const load = useCallback(async (nextCursor?: string) => {
    if (activeAlbumId.current !== albumId || blockedAlbumId.current === albumId) return;
    const generation = requestGeneration.current;
    const isCurrentRequest = () => activeAlbumId.current === albumId && requestGeneration.current === generation;
    setBusy({ albumId, busy: true });
    try {
      const result = await getApiV1AlbumsAlbumIdActivity(albumId, { limit: PAGE_SIZE, cursor: nextCursor });
      if (!isCurrentRequest()) return;
      if (blockedAlbumId.current === albumId) return;
      if (result.status === 401 || result.status === 403) {
        blockedAlbumId.current = albumId;
        setPage({ albumId, items: [], cursor: null, hasMore: false });
        setView({ albumId, state: result.status === 401 ? 'unauthenticated' : 'forbidden' });
        return;
      }
      if (result.status !== 200) { setView({ albumId, state: 'error' }); return; }
      setPage((current) => {
        if (!isCurrentRequest()) return current;
        const currentItems = current.albumId === albumId ? current.items : [];
        const nextItems = nextCursor
          ? [...currentItems, ...result.data.data.filter((item) => !currentItems.some((known) => known.activity_id === item.activity_id))]
          : result.data.data;
        return { albumId, items: nextItems, cursor: result.data.meta.next_cursor ?? null, hasMore: result.data.meta.has_more };
      });
      setView({ albumId, state: 'ready' });
    } catch {
      if (isCurrentRequest() && blockedAlbumId.current !== albumId) setView({ albumId, state: 'error' });
    }
    finally { if (isCurrentRequest()) setBusy({ albumId, busy: false }); }
  }, [albumId]);
  useLayoutEffect(() => {
    activeAlbumId.current = albumId;
    requestGeneration.current += 1;
    blockedAlbumId.current = null;
    return () => {
      if (activeAlbumId.current === albumId) {
        activeAlbumId.current = '';
        requestGeneration.current += 1;
      }
    };
  }, [albumId]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [albumId, load]);
  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumId(albumId).then((result) => {
      if (!active) return;
      if (result.status === 401 || result.status === 403) {
        blockedAlbumId.current = albumId;
        setPage({ albumId, items: [], cursor: null, hasMore: false });
        setView({ albumId, state: result.status === 401 ? 'unauthenticated' : 'forbidden' });
      } else if (result.status === 200) {
        setZone({ albumId, timeZone: result.data.data.timezone });
      }
    }).catch(() => {
      if (active) setZone({ albumId, timeZone: null });
    });
    return () => { active = false; };
  }, [albumId]);

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={t('errorTitle')} description={!online ? t('offline') : t('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setView({ albumId, state: 'loading' }); void load(); }} />;

  if (!items.length) return <EmptyState title={t('emptyTitle')} description={!online ? t('offline') : t('emptyDescription')} action={online ? <Button variant="secondary" loading={busy} onClick={() => void load()}>{t('refresh')}</Button> : undefined} />;
  return <section aria-label={t('title')} className="space-y-4">
    {!online && <p role="status" className="rounded-xl border border-[var(--color-border)] p-3 text-sm">{t('offline')}</p>}
    <ol className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5">
      {items.map((item) => <li key={item.activity_id} className="py-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold">{t(`codes.${item.activity_code}`)}</h2><time className="text-xs text-[var(--color-muted-foreground)]" dateTime={item.occurred_at}>{formatEventDateTime(item.occurred_at, locale, timeZone)}</time></div>{item.actor_label && <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('by', { actor: item.actor_label })}</p>}</li>)}
    </ol>
    {hasMore && cursor && <Button variant="secondary" loading={busy} disabled={!online} onClick={() => void load(cursor)}>{t('loadMore')}</Button>}
  </section>;
}
