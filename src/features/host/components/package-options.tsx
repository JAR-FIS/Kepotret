'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId, getApiV1Packages, getApiV1SecurityCsrf, putApiV1AlbumsAlbumIdSetupPackage } from '@/lib/api/browser';
import type { PackageOption } from '@/lib/api/generated/index.schemas';

export function PackageOptions({ albumId }: { albumId: string }) {
  const t = useTranslations('host.packages');
  const shared = useTranslations('host');
  const locale = useLocale();
  const [revision, setRevision] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [message, setMessage] = useState<'saved' | 'conflict' | 'validation' | 'error' | null>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([getApiV1AlbumsAlbumId(albumId), getApiV1Packages()]).then(([albumResult, packageResult]) => {
      if (!active) return;
      if (albumResult.status === 401 || packageResult.status === 401) { setState('unauthenticated'); return; }
      if (albumResult.status === 403 || packageResult.status === 403) { setState('forbidden'); return; }
      if (albumResult.status !== 200 || packageResult.status !== 200) { setState('error'); return; }
      setRevision(albumResult.data.data.setup_revision);
      setSelectedPackage(albumResult.data.data.selected_package_version_id);
      setPackages(packageResult.data.data);
      setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || revision === null) return;
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
      const result = await putApiV1AlbumsAlbumIdSetupPackage(albumId, {
        expected_revision: revision,
        package_version_id: selectedPackage,
      }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 200) { setRevision(result.data.data.setup_revision); setMessage('saved'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else if (result.status === 409) setMessage('conflict');
      else if (result.status === 422) setMessage('validation');
      else setMessage('error');
    } catch { setMessage('error'); }
    finally { setPending(false); }
  }

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <form onSubmit={submit} className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <h2 className="font-semibold">{t('title')}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
    <fieldset className="mt-5 space-y-3">
      <legend className="sr-only">{t('choose')}</legend>
      <label className={`flex cursor-pointer gap-3 rounded-[var(--radius-md)] border p-4 ${selectedPackage === null ? 'border-[var(--color-primary)] bg-[var(--color-muted)]' : 'border-[var(--color-border)]'}`}>
        <input type="radio" name="setup-package" value="FREE30" checked={selectedPackage === null} onChange={() => setSelectedPackage(null)} />
        <span><span className="block font-semibold">{t('freeTitle')}</span><span className="mt-1 block text-sm text-[var(--color-muted-foreground)]">{t('freeDescription')}</span></span>
      </label>
      {packages.map((option) => <label key={option.package_version_id} className={`flex cursor-pointer gap-3 rounded-[var(--radius-md)] border p-4 ${selectedPackage === option.package_version_id ? 'border-[var(--color-primary)] bg-[var(--color-muted)]' : 'border-[var(--color-border)]'}`}>
        <input type="radio" name="setup-package" value={option.package_version_id} checked={selectedPackage === option.package_version_id} onChange={() => setSelectedPackage(option.package_version_id)} />
        <span className="min-w-0"><span className="block font-semibold">{option.name} <span className="font-normal text-[var(--color-muted-foreground)]">({option.code})</span></span><span className="mt-1 block text-sm">{new Intl.NumberFormat(locale, { style: 'currency', currency: option.currency }).format(option.price_amount)} · {t('quota', { count: option.quota_total })}</span></span>
      </label>)}
    </fieldset>
    <p className="mt-4 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('selectionIsDraft')}</p>
    {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{t(message)}{message === 'conflict' && <> <button type="button" onClick={() => { setMessage(null); setState('loading'); setAttempt((value) => value + 1); }} className="font-semibold underline">{t('reload')}</button></>}</p>}
    <Button type="submit" loading={pending} disabled={revision === null} className="mt-6">{t('save')}</Button>
  </form>;
}
