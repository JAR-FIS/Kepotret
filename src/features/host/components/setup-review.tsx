'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumIdReview, getApiV1SecurityCsrf, postApiV1AlbumsAlbumIdConfirmSetup } from '@/lib/api/browser';
import type { AlbumReadiness, SetupReview as SetupReviewData } from '@/lib/api/generated/index.schemas';
import { hostRoutes } from '@/features/host/routes';

export function SetupReview({ albumId }: { albumId: string }) {
  const t = useTranslations('host.review');
  const shared = useTranslations('host');
  const [review, setReview] = useState<SetupReviewData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [message, setMessage] = useState<'conflict' | 'validation' | 'error' | null>(null);
  const [confirmedReadiness, setConfirmedReadiness] = useState<AlbumReadiness | null>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void getApiV1AlbumsAlbumIdReview(albumId).then((result) => {
      if (!active) return;
      if (result.status === 200) { setReview(result.data.data); setState('ready'); }
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setState('error');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [albumId, attempt]);

  async function confirmSetup() {
    if (pending || !review?.complete) return;
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
      const result = await postApiV1AlbumsAlbumIdConfirmSetup(albumId, { expected_setup_revision: review.setup_revision }, {
        headers: {
          'X-CSRF-Token': csrf.data.data.csrf_token,
          'Idempotency-Key': crypto.randomUUID(),
        },
      });
      if (result.status === 200) setConfirmedReadiness(result.data.data.readiness);
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
  if (state === 'error' || !review) return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  const snapshot = review.snapshot;
  const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: snapshot.event_basics.timezone }).format(new Date(value));

  return <section className="max-w-3xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <h2 className="font-semibold">{t('title')}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{review.complete ? t('complete') : t('incomplete')}</p>
    <dl className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('eventName')}</dt><dd className="font-medium">{snapshot.event_basics.event_name}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('eventLocation')}</dt><dd>{snapshot.event_basics.event_location}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('eventCategory')}</dt><dd className="break-all">{snapshot.event_basics.event_category_id}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('timezone')}</dt><dd>{snapshot.event_basics.timezone}</dd></div>
      {snapshot.schedule && <><div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('captureStart')}</dt><dd>{formatTime(snapshot.schedule.capture_start)}</dd></div><div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('captureEnd')}</dt><dd>{formatTime(snapshot.schedule.capture_end)}</dd></div><div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('reveal')}</dt><dd>{t('delay', { days: snapshot.schedule.reveal_delay_days })}</dd></div></>}
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('pin')}</dt><dd>{snapshot.access.pin_enabled ? t('enabled') : t('disabled')}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('guestLimit')}</dt><dd>{snapshot.settings.per_guest_limit ?? t('notSet')}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('cover')}</dt><dd>{snapshot.design.cover_asset_id ?? t('notSet')}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('package')}</dt><dd>{snapshot.selected_package_version_id ?? t('free')}</dd></div>
      <div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('collaborators')}</dt><dd>{snapshot.collaborator_count}</dd></div>
    </dl>
    {review.issues.length > 0 && <div className="mt-6"><h3 className="font-semibold">{t('issues')}</h3><ul className="mt-3 space-y-2">{review.issues.map((issue, index) => <li key={`${issue.code}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"><span className="text-sm">{t('issueFallback', { code: issue.message_key ?? issue.code })} <span className="text-xs text-[var(--color-muted-foreground)]">({issue.severity})</span></span><Link className="font-semibold underline" href={hostRoutes.setup(albumId, issue.section)}>{t('fixSection')}</Link></li>)}</ul></div>}
    {message && <p role="alert" className="mt-4 text-sm text-[var(--color-muted-foreground)]">{t(message)}{message === 'conflict' && <> <button type="button" onClick={() => { setMessage(null); setConfirmedReadiness(null); setState('loading'); setAttempt((value) => value + 1); }} className="font-semibold underline">{shared('retry')}</button></>}</p>}
    {confirmedReadiness && <div role="status" className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-muted)] p-4"><p className="font-semibold">{confirmedReadiness === 'READY' ? t('ready') : confirmedReadiness === 'PAYMENT_PENDING' ? t('paymentPending') : t('stillDraft')}</p><p className="mt-1 text-sm">{confirmedReadiness === 'READY' ? t('confirmedReady') : confirmedReadiness === 'PAYMENT_PENDING' ? t('confirmedPayment') : t('confirmedDraft')}</p></div>}
    <Button type="button" loading={pending} disabled={!review.complete || !!confirmedReadiness} onClick={confirmSetup} className="mt-6">{t('confirm')}</Button>
  </section>;
}
