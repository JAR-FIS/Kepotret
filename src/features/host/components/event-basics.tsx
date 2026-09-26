'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId, getApiV1SecurityCsrf, patchApiV1AlbumsAlbumId } from '@/lib/api/browser';

export function EventBasics({ albumId }: { albumId: string }) {
  const t = useTranslations('host.eventBasics');
  const shared = useTranslations('host');
  const [revision, setRevision] = useState<number | null>(null);
  const [timezone, setTimezone] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [message, setMessage] = useState<'saved' | 'conflict' | 'error' | 'invalid' | null>(null);
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
    if (pending || revision === null) return;
    try { new Intl.DateTimeFormat(undefined, { timeZone: timezone }).format(); }
    catch { setMessage('invalid'); return; }
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
      const result = await patchApiV1AlbumsAlbumId(albumId, { expected_revision: revision, timezone }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 200) setMessage('saved');
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else if (result.status === 409) setMessage('conflict');
      else setMessage('error');
    } catch { setMessage('error'); }
    finally { setPending(false); }
  }

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <form onSubmit={submit} className="max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <h2 className="font-semibold">{t('limitedTitle')}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('limitedDescription')}</p>
    <label htmlFor="event-timezone" className="mt-5 block text-sm font-semibold">{t('timezone')}</label>
    <input id="event-timezone" required value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Asia/Jakarta" className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base" />
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('timezoneHelp')}</p>
    {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t(message)}</p>}
    <Button type="submit" loading={pending} disabled={!timezone.trim() || revision === null} className="mt-6">{t('save')}</Button>
  </form>;
}
