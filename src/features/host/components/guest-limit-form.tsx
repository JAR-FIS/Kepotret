'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId, getApiV1AlbumsAlbumIdSettings, getApiV1SecurityCsrf, patchApiV1AlbumsAlbumIdSettings } from '@/lib/api/browser';
import { AlbumSettingsPatchRequestPerGuestLimit } from '@/lib/api/generated/index.schemas';

type Limit = AlbumSettingsPatchRequestPerGuestLimit;
type LoadState = 'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error';
const FREE_QUOTA = 30;

export function GuestLimitForm({ albumId }: { albumId: string }) {
  const locale = useLocale();
  const t = useTranslations('host.guestLimit');
  const [revision, setRevision] = useState<number | null>(null);
  const [quota, setQuota] = useState(FREE_QUOTA);
  const [limit, setLimit] = useState<Limit | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [message, setMessage] = useState<'saved' | 'conflict' | 'validation' | 'rateLimited' | 'error' | null>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([getApiV1AlbumsAlbumId(albumId), getApiV1AlbumsAlbumIdSettings(albumId)]).then(([album, settings]) => {
      if (!active) return;
      if (album.status === 401 || settings.status === 401) { setState('unauthenticated'); return; }
      if (album.status === 403 || settings.status === 403) { setState('forbidden'); return; }
      if (album.status !== 200 || settings.status !== 200) { setState('error'); return; }
      setQuota(album.data.data.quota_total ?? FREE_QUOTA);
      setRevision(settings.data.data.revision);
      setLimit(settings.data.data.per_guest_limit);
      setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || revision === null || limit === null || limit > quota) return;
    setPending(true);
    setMessage(null);
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) {
        if (csrf.status === 401) setState('unauthenticated');
        else if (csrf.status === 403) setState('forbidden');
        else setMessage(csrf.status === 429 ? 'rateLimited' : 'error');
        return;
      }
      const result = await patchApiV1AlbumsAlbumIdSettings(albumId, { expected_revision: revision, per_guest_limit: limit }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 200) {
        const current = await getApiV1AlbumsAlbumIdSettings(albumId);
        if (current.status === 200) {
          setRevision(current.data.data.revision);
          setLimit(current.data.data.per_guest_limit);
          setMessage('saved');
        } else if (current.status === 401) setState('unauthenticated');
        else if (current.status === 403) setState('forbidden');
        else setState('error');
      } else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else if (result.status === 409) setMessage('conflict');
      else if (result.status === 422) setMessage('validation');
      else if (result.status === 429) setMessage('rateLimited');
      else setMessage('error');
    } catch { setMessage('error'); }
    finally { setPending(false); }
  }

  if (state === 'loading') return <LoadingState label={t('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={t('reauthTitle')} description={t('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={t('forbiddenTitle')} description={t('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={t('errorTitle')} description={t('errorDescription')} retryLabel={t('retry')} onRetry={() => { setState('loading'); setAttempt(value => value + 1); }} />;

  return <form onSubmit={submit} className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{t('eyebrow')}</p>
    <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold tracking-tight">{t('label')}</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
    <fieldset className="mt-6"><legend className="text-sm font-semibold">{t('choose')}</legend><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Object.values(AlbumSettingsPatchRequestPerGuestLimit).map(value => {
        const unavailable = value > quota;
        return <label key={value} className={`relative flex min-h-20 cursor-pointer flex-col justify-center rounded-[var(--radius-md)] border px-4 py-3 transition-colors ${limit === value ? 'border-[var(--color-foreground)] bg-[var(--color-muted)]' : 'border-[var(--color-border)]'} ${unavailable ? 'cursor-not-allowed opacity-45' : 'hover:border-[var(--color-foreground)]'}`}><input type="radio" name="per-guest-limit" value={value} checked={limit === value} disabled={unavailable} onChange={() => { setLimit(value); setMessage(null); }} className="absolute right-3 top-3 size-4 accent-[var(--color-foreground)]" /><span className="font-[var(--font-display)] text-2xl font-bold">{value}</span><span className="text-xs text-[var(--color-muted-foreground)]">{t('photos')}</span>{value === 30 && !unavailable && <span className="mt-1 text-xs font-semibold">{t('recommended')}</span>}</label>;
      })}
    </div></fieldset>
    <p className="mt-5 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('quotaNote', { count: new Intl.NumberFormat(locale).format(quota) })}</p>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('distinction')}</p>
    {message && <p role="status" className="mt-4 text-sm">{t(message)}{message === 'conflict' && <> <button type="button" onClick={() => { setMessage(null); setState('loading'); setAttempt(value => value + 1); }} className="font-semibold underline">{t('reload')}</button></>}</p>}
    <Button type="submit" loading={pending} disabled={limit === null || limit > quota || revision === null} className="mt-6">{t('save')}</Button>
  </form>;
}
