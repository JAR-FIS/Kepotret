'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId } from '@/lib/api/browser';
import { hostRoutes } from '@/features/host/routes';

export function ActivationResult({ albumId }: { albumId: string }) {
  const t = useTranslations('host.readyPage');
  const shared = useTranslations('host');
  const [state, setState] = useState<'loading' | 'ready' | 'draft' | 'error' | 'unauthenticated' | 'forbidden'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumId(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) setState(result.data.data.readiness === 'READY' ? 'ready' : 'draft');
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} action={<Link href="/masuk-ulang" className="underline">{shared('reauthTitle')}</Link>} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  return <section className="max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
    <h2 className="font-[var(--font-display)] text-2xl font-bold">{state === 'ready' ? t('complete') : t('pending')}</h2>
    <p className="mt-3 text-sm leading-6 text-[var(--color-muted-foreground)]">{state === 'ready' ? t('completeDescription') : t('pendingDescription')}</p>
    {state === 'ready' && <Link href={hostRoutes.albums} className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]">{t('dashboard')}</Link>}
  </section>;
}
