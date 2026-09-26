'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1Packages } from '@/lib/api/browser';
import type { PackageOption } from '@/lib/api/generated/index.schemas';

export function PackageOptions() {
  const t = useTranslations('host.packages');
  const shared = useTranslations('host');
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1Packages().then((result) => {
      if (!active) return;
      if (result.status === 200) { setPackages(result.data.data); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [attempt]);

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <section className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <h2 className="font-semibold">{t('title')}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('provisional')}</p>
    {packages.length === 0 ? <p className="mt-4 text-sm">{t('empty')}</p> : <ul className="mt-4 grid gap-3 sm:grid-cols-2">{packages.map((option) => <li key={option.package_version_id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4"><p className="font-semibold">{t('quota', { count: option.quota_total })}</p><p className="mt-1 text-sm">{new Intl.NumberFormat(undefined, { style: 'currency', currency: option.currency }).format(option.price_amount)}</p><p className="mt-2 break-all text-xs text-[var(--color-muted-foreground)]">{option.package_version_id}</p></li>)}</ul>}
  </section>;
}
