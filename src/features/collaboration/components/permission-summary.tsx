'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId } from '@/lib/api/browser';
import type { AlbumDetail, CollaboratorPermissions } from '@/lib/api/generated/index.schemas';

type State = 'loading' | 'ready' | 'error' | 'unauthenticated' | 'forbidden';
const keys = ['can_setup', 'can_moderate', 'can_export_zip'] as const;

export function PermissionSummary({ albumId }: { albumId: string }) {
  const t = useTranslations('collaboration.permissions');
  const host = useTranslations('host');
  const [state, setState] = useState<State>('loading');
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
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

  if (state === 'loading') return <LoadingState label={host('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={host('reauthTitle')} description={host('reauthDescription')} />;
  if (state === 'forbidden' || album?.actor_access.relationship !== 'COLLABORATOR') return <ForbiddenState title={host('forbiddenTitle')} description={host('forbiddenDescription')} />;
  if (state === 'error' || !album) return <ErrorState title={host('errorTitle')} description={host('errorDescription')} retryLabel={host('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  const permissions: CollaboratorPermissions = album.actor_access.collaborator_permissions ?? { can_setup: false, can_moderate: false, can_export_zip: false };
  return <div className="max-w-4xl space-y-6">
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{t('eyebrow')}</p>
      <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">{t('title')}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description', { eventName: album.event_name ?? t('unnamed') })}</p>
      <ul className="mt-6 grid gap-3 md:grid-cols-3">
        {keys.map((key) => <li key={key} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${permissions[key] ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'}`}>{permissions[key] ? t('enabled') : t('notEnabled')}</span>
          <h3 className="mt-4 font-semibold">{t(`capabilities.${key}.title`)}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t(`capabilities.${key}.description`)}</p>
        </li>)}
      </ul>
    </section>
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
      <h2 className="font-semibold">{t('limitsTitle')}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('limitsDescription')}</p>
      <ul className="mt-4 grid gap-2 text-sm text-[var(--color-muted-foreground)] sm:grid-cols-2">{(['finalize', 'billing', 'collaborators', 'rotateLink', 'reschedule', 'restore', 'individualDownload', 'recovery'] as const).map((key) => <li key={key} className="flex gap-2"><span aria-hidden="true" className="font-bold">•</span><span>{t(`limits.${key}`)}</span></li>)}</ul>
    </section>
  </div>;
}
