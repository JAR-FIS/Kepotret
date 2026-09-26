'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId, getApiV1SecurityCsrf, patchApiV1AlbumsAlbumIdSettings } from '@/lib/api/browser';
import { AlbumSettingsPatchRequestPerGuestLimit } from '@/lib/api/generated/index.schemas';

type Limit = AlbumSettingsPatchRequestPerGuestLimit;

export function GuestLimitForm({ albumId }: { albumId: string }) {
  const t = useTranslations('host.guestLimit');
  const [revision, setRevision] = useState<number | null>(null);
  const [limit, setLimit] = useState<Limit | ''>('');
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumId(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) { setRevision(result.data.data.setup_revision); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || revision === null || limit === '') return;
    setPending(true);
    setMessage('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) {
        if (csrf.status === 401) setState('unauthenticated');
        else if (csrf.status === 403) setState('forbidden');
        else setMessage(t('error'));
        return;
      }
      const result = await patchApiV1AlbumsAlbumIdSettings(albumId, { expected_revision: revision, per_guest_limit: limit }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 200) setMessage(t('saved'));
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else if (result.status === 409) setMessage(t('conflict'));
      else setMessage(t('error'));
    } catch {
      setMessage(t('error'));
    } finally {
      setPending(false);
    }
  }

  if (state === 'loading') return <LoadingState label={t('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={t('reauthTitle')} description={t('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={t('forbiddenTitle')} description={t('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={t('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <form onSubmit={submit} className="max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
    <label htmlFor="per-guest-limit" className="mt-5 block text-sm font-semibold">{t('label')}</label>
    <select id="per-guest-limit" required value={limit} onChange={(event) => setLimit(event.target.value === '' ? '' : Number(event.target.value) as Limit)} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base">
      <option value="">{t('choose')}</option>
      {Object.values(AlbumSettingsPatchRequestPerGuestLimit).map((value) => <option key={value} value={value}>{t('limitValue', { count: value })}</option>)}
    </select>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('distinction')}</p>
    {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{message}{message === t('conflict') && <> <button type="button" onClick={() => { setState('loading'); setAttempt((value) => value + 1); }} className="font-semibold underline">{t('reload')}</button></>}</p>}
    <Button type="submit" loading={pending} disabled={limit === '' || revision === null} className="mt-6">{t('save')}</Button>
  </form>;
}
