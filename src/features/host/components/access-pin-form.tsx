'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { getApiV1SecurityCsrf, putApiV1AlbumsAlbumIdAccessPin } from '@/lib/api/browser';

export function AccessPinForm({ albumId }: { albumId: string }) {
  const t = useTranslations('host.accessPin');
  const [pin, setPin] = useState('');
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<'ready' | 'unauthenticated' | 'forbidden'>('ready');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !pin) return;
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
      const result = await putApiV1AlbumsAlbumIdAccessPin(albumId, { pin }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 200) {
        setPin('');
        setMessage(t('saved'));
      } else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setMessage(t('error'));
    } catch {
      setMessage(t('error'));
    } finally {
      setPending(false);
    }
  }

  if (state === 'unauthenticated') return <ReauthState title={t('reauthTitle')} description={t('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={t('forbiddenTitle')} description={t('forbiddenDescription')} />;

  return <form onSubmit={submit} className="max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
    <label htmlFor="album-pin" className="mt-5 block text-sm font-semibold">{t('label')}</label>
    <input id="album-pin" type="password" autoComplete="new-password" required value={pin} onChange={(event) => setPin(event.target.value)} aria-describedby="album-pin-help" className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base" />
    <p id="album-pin-help" className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('help')}</p>
    {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{message}</p>}
    <Button type="submit" loading={pending} className="mt-6">{t('submit')}</Button>
  </form>;
}
