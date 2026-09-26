'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId, getApiV1SecurityCsrf, putApiV1AlbumsAlbumIdSchedule } from '@/lib/api/browser';
import { ScheduleWriteRequestRevealDelayDays, type ScheduleWriteRequest } from '@/lib/api/generated/index.schemas';
import { toScheduleTimestamp, validateSchedule, type ScheduleValidationError } from '@/features/host/schedule-validation';

export function ScheduleSetup({ albumId }: { albumId: string }) {
  const t = useTranslations('host.schedule');
  const shared = useTranslations('host');
  const [revision, setRevision] = useState<number | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [delay, setDelay] = useState<ScheduleWriteRequest['reveal_delay_days'] | ''>('');
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [error, setError] = useState<ScheduleValidationError | 'conflict' | 'error' | 'saved' | 'validation' | null>(null);
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
    if (pending || revision === null || delay === '') return;
    const validation = validateSchedule(start, end, delay);
    if (validation) { setError(validation); return; }
    setPending(true);
    setError(null);
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status !== 200) {
        if (csrf.status === 401) setState('unauthenticated');
        else if (csrf.status === 403) setState('forbidden');
        else setError('error');
        return;
      }
      const result = await putApiV1AlbumsAlbumIdSchedule(albumId, {
        expected_revision: revision,
        capture_start: toScheduleTimestamp(start),
        capture_end: toScheduleTimestamp(end),
        reveal_delay_days: delay,
      }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 200) setError('saved');
      else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else if (result.status === 409) setError('conflict');
      else if (result.status === 422) setError('validation');
      else setError('error');
    } catch {
      setError('error');
    } finally {
      setPending(false);
    }
  }

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error') return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  const message = error ? error in {
    startRequired: 1, startPast: 1, startTooFar: 1, endRequired: 1, endBeforeStart: 1, durationTooLong: 1, revealDelay: 1,
  } ? t(`validation.${error as ScheduleValidationError}`) : t(error === 'validation' ? 'serverValidation' : error as 'conflict' | 'error' | 'saved') : '';

  return <form onSubmit={submit} className="max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
    <label htmlFor="capture-start" className="mt-5 block text-sm font-semibold">{t('start')}</label>
    <input id="capture-start" type="datetime-local" required value={start} onChange={(event) => setStart(event.target.value)} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base" />
    <label htmlFor="capture-end" className="mt-4 block text-sm font-semibold">{t('end')}</label>
    <input id="capture-end" type="datetime-local" required value={end} onChange={(event) => setEnd(event.target.value)} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base" />
    <label htmlFor="reveal-delay" className="mt-4 block text-sm font-semibold">{t('reveal')}</label>
    <select id="reveal-delay" required value={delay} onChange={(event) => setDelay(event.target.value === '' ? '' : Number(event.target.value) as ScheduleWriteRequest['reveal_delay_days'])} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base">
      <option value="">{t('choose')}</option>
      {Object.values(ScheduleWriteRequestRevealDelayDays).map((value) => <option key={value} value={value}>{t('delay', { days: value })}</option>)}
    </select>
    {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{message}{error === 'conflict' && <> <button type="button" onClick={() => { setError(null); setState('loading'); setAttempt((value) => value + 1); }} className="font-semibold underline">{t('reload')}</button></>}</p>}
    <Button type="submit" loading={pending} disabled={revision === null || !start || !end || delay === ''} className="mt-6">{t('save')}</Button>
  </form>;
}
