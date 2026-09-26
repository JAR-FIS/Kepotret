'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumIdDesign, getApiV1SecurityCsrf, patchApiV1AlbumsAlbumIdDesign } from '@/lib/api/browser';
import type { AlbumDesign } from '@/lib/api/generated/index.schemas';

export function DesignSetup({ albumId }: { albumId: string }) {
  const t = useTranslations('host.design');
  const shared = useTranslations('host');
  const [design, setDesign] = useState<AlbumDesign | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [message, setMessage] = useState<'saved' | 'conflict' | 'error' | null>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumIdDesign(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) { setDesign(result.data.data); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  async function clearCover() {
    if (pending || !design?.cover_asset_id) return;
    setPending(true);
    setMessage(null);
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) {
        if (csrf.status === 401) setState('unauthenticated');
        else if (csrf.status === 403) setState('forbidden');
        else setMessage('error');
        return;
      }
      const result = await patchApiV1AlbumsAlbumIdDesign(albumId, { expected_revision: design.setup_revision, cover_asset_id: null }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 200) {
        const refreshed = await getApiV1AlbumsAlbumIdDesign(albumId);
        if (refreshed.status === 200) { setDesign(refreshed.data.data); setMessage('saved'); }
        else setMessage('error');
      } else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else if (result.status === 409) setMessage('conflict');
      else setMessage('error');
    } catch { setMessage('error'); }
    finally { setPending(false); }
  }

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error' || !design) return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <section className="max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <h2 className="font-semibold">{t('title')}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
    {design.cover_asset_id ? <><p className="mt-5 text-sm font-semibold">{t('coverSet')}</p><p className="mt-2 break-all font-mono text-xs text-[var(--color-muted-foreground)]">{design.cover_asset_id}</p><Button type="button" variant="secondary" loading={pending} onClick={clearCover} className="mt-5">{t('clear')}</Button></> : <p className="mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted-foreground)]">{t('empty')}</p>}
    {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t(message)}{message === 'conflict' && <> <button type="button" onClick={() => { setMessage(null); setState('loading'); setAttempt((value) => value + 1); }} className="font-semibold underline">{shared('retry')}</button></>}</p>}
  </section>;
}
