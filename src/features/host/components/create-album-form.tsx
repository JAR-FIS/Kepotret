'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { getApiV1SecurityCsrf, postApiV1Albums } from '@/lib/api/browser';
import { hostRoutes } from '@/features/host/routes';

export function CreateAlbumForm() {
  const t = useTranslations('host.createPage');
  const router = useRouter();
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const idempotencyKey = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      setError(t('validation'));
      return;
    }
    setPending(true);
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) {
        setError(csrf.status === 401 ? t('reauth') : csrf.status === 403 ? t('denied') : t('error'));
        return;
      }
      const result = await postApiV1Albums(
        { timezone },
        { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token, 'Idempotency-Key': idempotencyKey.current ?? (idempotencyKey.current = crypto.randomUUID()) } },
      );
      if (result.status === 201) {
        idempotencyKey.current = null;
        router.push(hostRoutes.setup(result.data.data.album_id, 'acara'));
        return;
      }
      if (result.status === 401) setError(t('reauth'));
      else if (result.status === 403) setError(t('denied'));
      else if (result.status === 409) setError(t('conflict'));
      else setError(t('error'));
    } catch {
      setError(t('error'));
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="max-w-xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <label htmlFor="album-timezone" className="block text-sm font-semibold">{t('timezone')}</label>
    <input id="album-timezone" name="timezone" autoComplete="off" required value={timezone} onChange={(event) => setTimezone(event.target.value)} aria-invalid={!!error} aria-describedby={error ? 'create-album-error' : undefined} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base" />
    {error && <p id="create-album-error" role="alert" className="mt-3 text-sm text-[var(--color-destructive)]">{error}{error === t('reauth') && <> <Link href="/masuk-ulang" className="font-semibold underline">{t('signIn')}</Link></>}</p>}
    <Button type="submit" loading={pending} className="mt-6 w-full">{t('submit')}</Button>
  </form>;
}
