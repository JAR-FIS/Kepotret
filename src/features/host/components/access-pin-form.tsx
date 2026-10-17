'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { getApiV1SecurityCsrf, putApiV1AlbumsAlbumIdAccessPin } from '@/lib/api/browser';

export function AccessPinForm({ albumId }: { albumId: string }) {
  const t = useTranslations('host.accessPin');
  const [pin, setPin] = useState('');
  const [visible, setVisible] = useState(false);
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
    <div className="relative mt-2"><input id="album-pin" type={visible ? 'text' : 'password'} autoComplete="new-password" required value={pin} onChange={(event) => setPin(event.target.value)} aria-describedby="album-pin-help" className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 pr-12 text-base" /><button type="button" aria-label={visible ? t('hidePin') : t('showPin')} aria-pressed={visible} onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 right-1 inline-flex w-10 items-center justify-center rounded-full hover:bg-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">{visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}</button></div>
    <p id="album-pin-help" className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('help')}</p>
    {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{message}</p>}
    <Button type="submit" loading={pending} className="mt-6 rounded-full font-bold">{t('submit')}</Button>
  </form>;
}
