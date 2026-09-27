'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, CircleStop, Clock3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { getApiV1AlbumsAlbumId, getApiV1AlbumsAlbumIdSchedule, getApiV1SecurityCsrf, putApiV1AlbumsAlbumIdSchedule } from '@/lib/api/browser';
import { ScheduleWriteRequestRevealDelayDays, type AlbumSchedule, type ScheduleWriteRequest } from '@/lib/api/generated/index.schemas';
import { toEventWallTime, toScheduleTimestamp, validateSchedule, type ScheduleValidationError } from '@/features/host/schedule-validation';

function wallTimePart(current: string, part: 'date' | 'time', value: string) {
  const [date = '', time = ''] = current.split('T');
  return part === 'date' ? `${value}T${time}` : `${date}T${value}`;
}

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

  const [startDate = '', startTime = ''] = start.split('T');
  const [endDate = '', endTime = ''] = end.split('T');
  const inputClass = 'mt-2 min-h-11 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-base';

  return <form onSubmit={submit} className="max-w-3xl space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--color-muted-foreground)]">{t('eyebrow')}</p><h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold tracking-tight">{t('heading')}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">{t('description')}</p></div>
    <section aria-label={t('windowLabel')} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-7">
      <p className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1.5 text-xs font-semibold"><Clock3 size={14} aria-hidden="true" />{t('timezoneLabel', { timeZone })}</p>
      <div className="relative mt-6 space-y-6 before:absolute before:bottom-10 before:left-[11px] before:top-7 before:w-px before:bg-[var(--color-border)]">
        <fieldset className="relative pl-9"><legend className="flex items-center gap-3 font-semibold"><span className="absolute left-0 inline-flex size-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"><Camera size={13} aria-hidden="true" /></span>{t('start')}</legend><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('startHint')}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">{t('startDate')}<input type="date" required value={startDate} onChange={event => setStart(wallTimePart(start, 'date', event.target.value))} className={inputClass} /></label><label className="block text-sm font-medium">{t('startTime')}<input type="time" required value={startTime} onChange={event => setStart(wallTimePart(start, 'time', event.target.value))} className={inputClass} /></label></div></fieldset>
        <fieldset className="relative pl-9"><legend className="flex items-center gap-3 font-semibold"><span className="absolute left-0 inline-flex size-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"><CircleStop size={14} aria-hidden="true" /></span>{t('end')}</legend><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t('endHint')}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">{t('endDate')}<input type="date" required value={endDate} onChange={event => setEnd(wallTimePart(end, 'date', event.target.value))} className={inputClass} /></label><label className="block text-sm font-medium">{t('endTime')}<input type="time" required value={endTime} onChange={event => setEnd(wallTimePart(end, 'time', event.target.value))} className={inputClass} /></label></div></fieldset>
      </div>
      <p className="mt-7 border-t border-[var(--color-border)] pt-4 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('windowConsequence')}</p>
    </section>
    <section aria-labelledby="reveal-heading" className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7"><h3 id="reveal-heading" className="font-[var(--font-display)] text-xl font-bold">{t('revealHeading')}</h3><p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">{t('revealDescription')}</p><label htmlFor="reveal-delay" className="mt-4 block text-sm font-semibold">{t('reveal')}</label><select id="reveal-delay" required value={delay} onChange={(event) => setDelay(event.target.value === '' ? '' : Number(event.target.value) as ScheduleWriteRequest['reveal_delay_days'])} className={inputClass}><option value="">{t('choose')}</option>{Object.values(ScheduleWriteRequestRevealDelayDays).map((value) => <option key={value} value={value}>{t('delay', { days: value })}</option>)}</select></section>
    <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">{t('serverRule')}</p>
    {message && <p role="status" className="mt-3 text-sm text-[var(--color-muted-foreground)]">{message}{error === 'conflict' && <> <button type="button" onClick={() => { setError(null); setState('loading'); setAttempt((value) => value + 1); }} className="font-semibold underline">{t('reload')}</button></>}</p>}
    <Button type="submit" loading={pending} disabled={revision === null || !startDate || !startTime || !endDate || !endTime || delay === ''}>{t('save')}</Button>
  </form>;
}
