'use client';

import { Temporal } from '@js-temporal/polyfill';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DatePicker, TimePicker } from '@/components/ui/schedule-pickers';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/error-state';
import { ForbiddenState, ReauthState } from '@/components/ui/access-state';
import { LoadingState } from '@/components/ui/loading-state';
import { createUuidV7 } from '@/features/guest/lib/idempotency';
import { formatScheduleDraft, isEndDraftInvalid, isSelectableHour, isSelectableTime, wallParts, withWallPart } from '@/features/host/schedule-picker-rules';
import { hostRoutes } from '@/features/host/routes';
import { isRescheduleWithinServerBounds, toEventWallTime, toScheduleTimestamp } from '@/features/host/schedule-validation';
import { useConnectivity } from '@/hooks/use-connectivity';
import {
  getApiV1AlbumsAlbumIdEntitlement, getApiV1AlbumsAlbumIdLifecycle,
  getApiV1AlbumsAlbumIdPackageOptions, getApiV1AlbumsAlbumIdSchedule,
  getApiV1SecurityCsrf, postApiV1AlbumsAlbumIdReschedule,
} from '@/lib/api/browser';
import type { AlbumPackageOptions, AlbumSchedule } from '@/lib/api/generated/index.schemas';
import { formatEventDateTime } from '@/lib/time/event-time';

type LoadState = 'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'error';
const persistedDelays = ['1', '3', '5', '7'] as const;

function rescheduleKey(albumId: string) {
  const slot = `kepotret:reschedule:${albumId}`;
  let value = sessionStorage.getItem(slot);
  if (!value) { value = createUuidV7(); sessionStorage.setItem(slot, value); }
  return value;
}

export function ReschedulePage({ albumId }: { albumId: string }) {
  const t = useTranslations('host.lifecycle');
  const shared = useTranslations('host');
  const commerce = useTranslations('host.commerce');
  const scheduleCopy = useTranslations('host.schedule');
  const picker = useTranslations('host.picker');
  const locale = useLocale();
  const online = useConnectivity();
  const [schedule, setSchedule] = useState<AlbumSchedule | null>(null);
  const [billing, setBilling] = useState<AlbumPackageOptions | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [days, setDays] = useState<string>('1');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    try {
      const [result, packages] = await Promise.all([
        getApiV1AlbumsAlbumIdSchedule(albumId), getApiV1AlbumsAlbumIdPackageOptions(albumId),
        getApiV1AlbumsAlbumIdLifecycle(albumId), getApiV1AlbumsAlbumIdEntitlement(albumId),
      ]);
      if (result.status === 401) { setState('unauthenticated'); return; }
      if (result.status === 403) { setState('forbidden'); return; }
      if (result.status !== 200) { setState('error'); return; }
      const current = result.data.data;
      setSchedule(current);
      setStart(toEventWallTime(current.capture_start, current.timezone));
      setEnd(toEventWallTime(current.capture_end, current.timezone));
      setDays(String(current.reveal_delay_days));
      if (packages.status === 200) setBilling(packages.data.data);
      setState('ready');
    } catch { setState('error'); }
  }, [albumId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Load projects the server-owned schedule.
  useEffect(() => { void load(); }, [load, attempt]);

  const within = useMemo(() => !!schedule?.can_reschedule && isRescheduleWithinServerBounds(start, end, schedule.timezone, schedule.earliest_capture_start, schedule.latest_capture_start), [schedule, start, end]);
  const supportedDelay = persistedDelays.some((value) => value === days);

  async function save() {
    if (!schedule || !within || !supportedDelay || busy || !online) return;
    setBusy(true); setError('');
    try {
      const csrf = await getApiV1SecurityCsrf();
      if (csrf.status === 401) { setState('unauthenticated'); return; }
      if (csrf.status === 403) { setState('forbidden'); return; }
      if (csrf.status !== 200) { setError(t(csrf.status === 429 ? 'rateLimited' : 'saveError')); return; }
      const result = await postApiV1AlbumsAlbumIdReschedule(albumId, {
        expected_schedule_version: schedule.schedule_version,
        capture_start: toScheduleTimestamp(start, schedule.timezone),
        capture_end: toScheduleTimestamp(end, schedule.timezone),
        reveal_delay_days: Number(days) as 1 | 3 | 5 | 7,
      }, { headers: { 'X-CSRF-Token': csrf.data.data.csrf_token, 'Idempotency-Key': rescheduleKey(albumId) } });
      if (result.status === 200) {
        sessionStorage.removeItem(`kepotret:reschedule:${albumId}`);
        setConfirm(false);
        await load();
      } else if (result.status === 409) {
        setError(t('stale')); setConfirm(false);
        const current = await getApiV1AlbumsAlbumIdSchedule(albumId);
        if (current.status === 200) setSchedule(current.data.data);
      } else if (result.status === 401) setState('unauthenticated');
      else if (result.status === 403) setState('forbidden');
      else setError(t(result.status === 429 ? 'rateLimited' : 'saveError'));
    } catch { setError(t('saveError')); }
    finally { setBusy(false); }
  }

  if (state === 'loading') return <LoadingState label={shared('loading')} />;
  if (state === 'unauthenticated') return <ReauthState title={shared('reauthTitle')} description={shared('reauthDescription')} />;
  if (state === 'forbidden') return <ForbiddenState title={shared('forbiddenTitle')} description={shared('forbiddenDescription')} />;
  if (state === 'error' || !schedule) return <ErrorState title={shared('errorTitle')} description={shared('errorDescription')} retryLabel={shared('retry')} onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />;

  const [startDate, startTime] = wallParts(start);
  const [endDate, endTime] = wallParts(end);
  const earliest = schedule.earliest_capture_start ? toEventWallTime(schedule.earliest_capture_start, schedule.timezone) : null;
  const latest = schedule.latest_capture_start ? toEventWallTime(schedule.latest_capture_start, schedule.timezone) : null;
  const rules = {
    timeZone: schedule.timezone, start, end,
    earliestStart: earliest, latestStart: latest,
    earliestStartInstant: schedule.earliest_capture_start,
    latestStartInstant: schedule.latest_capture_start,
  };
  let latestEndDate: string | undefined;
  let todayInEventZone: string | undefined;
  try { todayInEventZone = Temporal.Now.instant().toZonedDateTimeISO(schedule.timezone).toPlainDate().toString(); }
  catch { /* Server validation remains authoritative if its timezone is invalid. */ }
  try { if (startDate) latestEndDate = Temporal.PlainDate.from(startDate).add({ days: 5 }).toString(); }
  catch { /* Invalid drafts are handled without throwing during render. */ }
  const endInvalid = isEndDraftInvalid(rules);
  const startInvalid = Boolean(startDate && startTime && !isSelectableTime(startDate, startTime, 'start', rules));
  const proposal = `${formatScheduleDraft(start, locale, schedule.timezone, picker('incomplete'))} – ${formatScheduleDraft(end, locale, schedule.timezone, picker('incomplete'))}`;

  return <>
    <section className="mb-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <p className="text-sm text-[var(--color-muted-foreground)]">{t('timezone')}: <strong className="text-[var(--color-foreground)]">{schedule.timezone}</strong></p>
      {billing?.active_checkout && <p className="mt-2 rounded bg-[var(--color-muted)] p-3">{commerce('activeCheckout')} <Link className="underline" href={hostRoutes.paymentStatus(albumId, billing.active_checkout.transaction_id)}>{commerce('viewStatus')}</Link></p>}
      <div className="mt-5 space-y-5">
        <fieldset><legend className="font-[family-name:var(--font-display)] text-lg font-bold">{t('captureStart')}</legend><div className="mt-3 grid gap-3 sm:grid-cols-2"><DatePicker label={scheduleCopy('startDate')} value={startDate} onChange={(value) => setStart(withWallPart(start, 'date', value))} min={earliest?.slice(0, 10)} max={latest?.slice(0, 10)} today={todayInEventZone} disabled={!schedule.can_reschedule} required /><TimePicker label={scheduleCopy('startTime')} value={startTime} onChange={(value) => setStart(withWallPart(start, 'time', value))} isTimeDisabled={(value) => !isSelectableTime(startDate, value, 'start', rules)} isHourDisabled={(value) => !isSelectableHour(startDate, value, 'start', rules)} disabled={!schedule.can_reschedule} required /></div>{startInvalid && <p role="status" className="mt-2 text-sm text-[var(--color-muted-foreground)]">{picker('startInvalid')}</p>}</fieldset>
        <fieldset><legend className="font-[family-name:var(--font-display)] text-lg font-bold">{t('captureEnd')}</legend><div className="mt-3 grid gap-3 sm:grid-cols-2"><DatePicker label={scheduleCopy('endDate')} value={endDate} onChange={(value) => setEnd(withWallPart(end, 'date', value))} min={startDate || undefined} max={latestEndDate} today={todayInEventZone} disabled={!schedule.can_reschedule} required /><TimePicker label={scheduleCopy('endTime')} value={endTime} onChange={(value) => setEnd(withWallPart(end, 'time', value))} isTimeDisabled={(value) => !isSelectableTime(endDate, value, 'end', rules)} isHourDisabled={(value) => !isSelectableHour(endDate, value, 'end', rules)} disabled={!schedule.can_reschedule} required /></div>{endInvalid && <p role="status" className="mt-2 text-sm text-[var(--color-muted-foreground)]">{picker('endInvalid')}</p>}</fieldset>
      </div>
      <label htmlFor="reschedule-reveal" className="mt-5 block text-sm font-semibold">{t('revealDelay')}</label>
      <Select id="reschedule-reveal" label={t('revealDelay')} value={days} onValueChange={setDays} disabled={!schedule.can_reschedule} className="mt-2 max-w-sm" options={[...persistedDelays.map((value) => ({ value, label: scheduleCopy('delay', { days: Number(value) }) })), { value: 'live', label: `LIVE · ${scheduleCopy('livePreview')}` }]} />
      {days === 'live' && <p role="status" className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-sm leading-6">{scheduleCopy('liveUnsupported')}</p>}
      <section aria-label={t('proposalReview')} className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-muted)] p-4"><h2 className="font-semibold">{t('proposalReview')}</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('currentSchedule')}</dt><dd>{formatEventDateTime(schedule.capture_start, locale, schedule.timezone)} – {formatEventDateTime(schedule.capture_end, locale, schedule.timezone)} · D+{schedule.reveal_delay_days}</dd></div><div><dt className="text-sm text-[var(--color-muted-foreground)]">{t('proposedSchedule')}</dt><dd>{proposal} · {days === 'live' ? 'LIVE' : `D+${days}`}</dd></div></dl></section>
      <p className="mt-4 text-sm">{t('cutoff')}: {formatEventDateTime(schedule.payment_cutoff_at, locale, schedule.timezone)} · {schedule.reschedule_cutoff_at && `${t('lockedCutoff')}: ${formatEventDateTime(schedule.reschedule_cutoff_at, locale, schedule.timezone)} · `}{t('previewOnly')}</p>
      {!online && <p role="status" className="mt-2">{t('offline')}</p>}
      {error && <p role="alert">{error}</p>}
      <Button className="mt-5 rounded-full font-bold" disabled={!within || !supportedDelay || !online || busy} onClick={() => setConfirm(true)}>{t('reviewChange')}</Button>
    </section>
    <ConfirmDialog open={confirm} title={t('rescheduleConfirmTitle')} description={billing?.active_checkout ? t('reschedulePendingConfirmDescription') : t('rescheduleConfirmDescription')} confirmLabel={t('save')} cancelLabel={t('cancel')} disabled={!online || busy || !within || !supportedDelay} onCancel={() => setConfirm(false)} onConfirm={() => void save()} />
  </>;
}
