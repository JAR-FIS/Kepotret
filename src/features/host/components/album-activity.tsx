'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { getApiV1AlbumsAlbumIdActivity } from '@/lib/api/browser';
import type { AlbumActivityItem } from '@/lib/api/generated/index.schemas';
import { useConnectivity } from '@/hooks/use-connectivity';

const PAGE_SIZE = 25;

export function AlbumActivity({ albumId }: { albumId: string }) {
  const t = useTranslations('host.activity');
  const shared = useTranslations('host');
  const locale = useLocale();
  const online = useConnectivity();
  const [items, setItems] = useState<AlbumActivityItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (nextCursor?: string) => {
    setBusy(true);
    try {
      const result = await getApiV1AlbumsAlbumIdActivity(albumId, { limit: PAGE_SIZE, cursor: nextCursor });
      if (result.status === 401) { setState('unauthenticated'); return; }
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status !== 200) { setState('error'); return; }
      setItems((current) => nextCursor ? [...current, ...result.data.data.filter((item) => !current.some((known) => known.activity_id === item.activity_id))] : result.data.data);
      setCursor(result.data.meta.next_cursor ?? null);
      setHasMore(result.data.meta.has_more);
      setState('ready');
    } catch { setState('error'); }
    finally { setBusy(false); }
  }, [albumId]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={t('errorTitle')} description={!online ? t('offline') : t('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); void load(); }} />;

  if (!items.length) return <EmptyState title={t('emptyTitle')} description={!online ? t('offline') : t('emptyDescription')} action={online ? <Button variant="secondary" loading={busy} onClick={() => void load()}>{t('refresh')}</Button> : undefined} />;
  return <section aria-label={t('title')} className="space-y-4">
    {!online && <p role="status" className="rounded-xl border border-[var(--color-border)] p-3 text-sm">{t('offline')}</p>}
    <ol className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5">
      {items.map((item) => <li key={item.activity_id} className="py-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold">{t(`codes.${item.activity_code}`)}</h2><time className="text-xs text-[var(--color-muted-foreground)]" dateTime={item.occurred_at}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.occurred_at))}</time></div>{item.actor_label && <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('by', { actor: item.actor_label })}</p>}</li>)}
    </ol>
    {hasMore && cursor && <Button variant="secondary" loading={busy} disabled={!online} onClick={() => void load(cursor)}>{t('loadMore')}</Button>}
  </section>;
}
