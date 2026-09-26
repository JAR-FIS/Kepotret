'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId, getApiV1AlbumsAlbumIdSchedule, getApiV1SecurityCsrf, putApiV1AlbumsAlbumIdSchedule } from '@/lib/api/browser';
import { ScheduleWriteRequestRevealDelayDays, type AlbumSchedule, type ScheduleWriteRequest } from '@/lib/api/generated/index.schemas';
import { toEventWallTime, toScheduleTimestamp, validateSchedule, type ScheduleValidationError } from '@/features/host/schedule-validation';

export function ScheduleSetup({ albumId }: { albumId: string }) {
  const t = useTranslations('host.schedule');
  const shared = useTranslations('host');
  const [revision, setRevision] = useState<number | null>(null);
  const [timeZone, setTimeZone] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [delay, setDelay] = useState<ScheduleWriteRequest['reveal_delay_days'] | ''>('');
  const [state, setState] = useState<'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error'>('loading');
  const [error, setError] = useState<ScheduleValidationError | 'conflict' | 'error' | 'saved' | 'validation' | null>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const albumResult = await getApiV1AlbumsAlbumId(albumId);
        if (!active) return;
        if (albumResult.status === 401) { setState('unauthenticated'); return; }
        if (albumResult.status === 403) { setState('forbidden'); return; }
        if (albumResult.status !== 200) { setState('error'); return; }
        const album = albumResult.data.data;
        setRevision(album.setup_revision);
        setTimeZone(album.timezone);
        const scheduleResult = await getApiV1AlbumsAlbumIdSchedule(albumId);
        if (!active) return;
        if (scheduleResult.status === 401) { setState('unauthenticated'); return; }
        if (scheduleResult.status === 403) { setState('forbidden'); return; }
        if (scheduleResult.status === 200) {
          const schedule = scheduleResult.data.data;
          setStart(toEventWallTime(schedule.capture_start, album.timezone));
          setEnd(toEventWallTime(schedule.capture_end, album.timezone));
          setDelay(schedule.reveal_delay_days);
        } else if (scheduleResult.status !== 404) { setState('error'); return; }
        setState('ready');
      } catch { if (active) setState('error'); }
    })();
    return () => { active = false; };
  }, [albumId, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || revision === null || delay === '') return;
    const validation = validateSchedule(start, end, delay, timeZone);
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
        capture_start: toScheduleTimestamp(start, timeZone),
        capture_end: toScheduleTimestamp(end, timeZone),
        reveal_delay_days: delay,
      }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token } });
      if (result.status === 200) {
        const schedule: AlbumSchedule = result.data.data;
        setStart(toEventWallTime(schedule.capture_start, timeZone));
        setEnd(toEventWallTime(schedule.capture_end, timeZone));
        setDelay(schedule.reveal_delay_days);
        setError('saved');
      }
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
    startRequired: 1, startPast: 1, startTooFar: 1, endRequired: 1, endBeforeStart: 1, durationTooLong: 1, revealDelay: 1, timezone: 1, localTimeInvalid: 1,
  } ? t(`validation.${error as ScheduleValidationError}`) : t(error === 'validation' ? 'serverValidation' : error as 'conflict' | 'error' | 'saved') : '';

  return <form onSubmit={submit} className="max-w-2xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p>
    <p className="mt-2 text-sm font-medium">{t('timezoneLabel', { timeZone })}</p>
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
