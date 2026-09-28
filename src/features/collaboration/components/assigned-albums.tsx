'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1Albums } from '@/lib/api/browser';
import type { AlbumSummary } from '@/lib/api/generated/index.schemas';
import { hostRoutes } from '@/features/host/routes';
import { AlbumStatus, albumStatusKey } from '@/features/host/components/album-status';

type State = 'loading' | 'ready' | 'error' | 'unauthenticated' | 'forbidden';

function PermissionBadges({ album }: { album: AlbumSummary }) {
  const t = useTranslations('collaboration');
  const permissions = album.actor_access.collaborator_permissions;
  if (!permissions) return null;
  const labels = [
    ['can_setup', permissions.can_setup],
    ['can_moderate', permissions.can_moderate],
    ['can_export_zip', permissions.can_export_zip],
  ] as const;
  return <ul className="mt-3 flex flex-wrap gap-2" aria-label={t('assigned.permissions')}>
    {labels.filter(([, enabled]) => enabled).map(([key]) => <li key={key} className="rounded-full bg-[var(--color-muted)] px-3 py-1 text-xs font-semibold">{t(`capabilities.${key}`)}</li>)}
    {!labels.some(([, enabled]) => enabled) && <li className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs">{t('assigned.noExtraPermissions')}</li>}
  </ul>;
}

export function AssignedAlbums({ dashboard = false }: { dashboard?: boolean }) {
  const t = useTranslations('collaboration');
  const host = useTranslations('host');
  const locale = useLocale();
  const [state, setState] = useState<State>('loading');
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getApiV1Albums({ relationship: 'COLLABORATOR', limit: dashboard ? 5 : 25 }).then((result) => {
      if (!active) return;
      if (result.status === 200) {
        setAlbums(result.data.data);
        setCursor(result.data.meta.has_more ? result.data.meta.next_cursor ?? undefined : undefined);
        setState('ready');
      } else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [attempt, dashboard]);

  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const result = await getApiV1Albums({ relationship: 'COLLABORATOR', limit: 25, cursor });
      if (result.status === 401) { setState('unauthenticated'); return; }
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status !== 200) { setState('error'); return; }
      setAlbums((current) => [...current, ...result.data.data.filter((item) => !current.some((existing) => existing.album_id === item.album_id))]);
      setCursor(result.data.meta.has_more ? result.data.meta.next_cursor ?? undefined : undefined);
    } catch { setState('error'); }
    finally { setBusy(false); }
  }

  if (state === 'loading') return <LoadingState label={t('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={host('reauthTitle')} description={host('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={host('forbiddenTitle')} description={host('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={host('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;
  if (!albums.length) return <EmptyState title={t('assigned.emptyTitle')} description={t('assigned.emptyDescription')} icon={<CalendarDays size={25} />} action={<Link href={hostRoutes.createAlbum} className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]">{host('create')}</Link>} />;

  const visibleAlbums = dashboard ? albums.slice(0, 5) : albums;
  return <div className="space-y-4">
    <ul className="grid min-w-0 gap-3">
      {visibleAlbums.map((album) => <li key={album.album_id}>
        <Link href={hostRoutes.album(album.album_id)} className="group flex min-h-24 min-w-0 items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-muted)] sm:px-6">
          <div className="min-w-0">
            <p className="break-words text-lg font-semibold">{album.event_name ?? t('assigned.unnamed')}</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{album.capture_start && album.capture_end ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: album.timezone }).format(new Date(album.capture_start)) : t('assigned.scheduleNotSet')}</p>
            <div className="mt-3"><AlbumStatus album={album} label={host(`albums.${albumStatusKey(album)}`)} /></div>
            <PermissionBadges album={album} />
          </div>
          <ArrowRight aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-1" size={19} />
        </Link>
      </li>)}
    </ul>
    {dashboard && (cursor || albums.length >= 5) && <Link href={hostRoutes.assignedAlbums} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">{t('dashboard.allAssigned')}<ArrowRight aria-hidden="true" size={16} /></Link>}
    {!dashboard && cursor && <Button type="button" variant="secondary" loading={busy} onClick={() => void loadMore()}>{t('assigned.loadMore')}</Button>}
  </div>;
}
