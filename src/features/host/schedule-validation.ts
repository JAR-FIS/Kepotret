import { Temporal } from '@js-temporal/polyfill';

import { ScheduleWriteRequestRevealDelayDays, type ScheduleWriteRequest } from '@/lib/api/generated/index.schemas';

export type ScheduleValidationError = 'startRequired' | 'startPast' | 'startTooFar' | 'endRequired' | 'endBeforeStart' | 'durationTooLong' | 'revealDelay' | 'timezone' | 'localTimeInvalid';

function eventZonedDateTime(value: string, timeZone: string): Temporal.ZonedDateTime {
  const plainDateTime = Temporal.PlainDateTime.from(value);
  return plainDateTime.toZonedDateTime(timeZone, { disambiguation: 'reject' });
}

export function toScheduleTimestamp(value: string, timeZone: string): string {
  return eventZonedDateTime(value, timeZone).toInstant().toString();
}

export function toEventWallTime(instant: string, timeZone: string): string {
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO(timeZone)
    .toPlainDateTime()
    .toString({ smallestUnit: 'minute' });
}

/** Validates a reschedule proposal against bounds issued by the server, without deriving new bounds in the browser. */
export function isRescheduleWithinServerBounds(
  captureStart: string,
  captureEnd: string,
  timeZone: string,
  earliestCaptureStart: string | null,
  latestCaptureStart: string | null,
): boolean {
  if (!captureStart || !captureEnd) return false;
  try {
    const start = Temporal.Instant.from(toScheduleTimestamp(captureStart, timeZone));
    const end = Temporal.Instant.from(toScheduleTimestamp(captureEnd, timeZone));
    if (earliestCaptureStart && Temporal.Instant.compare(start, Temporal.Instant.from(earliestCaptureStart)) < 0) return false;
    if (latestCaptureStart && Temporal.Instant.compare(start, Temporal.Instant.from(latestCaptureStart)) > 0) return false;
    const duration = end.epochMilliseconds - start.epochMilliseconds;
    return duration > 0 && duration <= 120 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function validateSchedule(
  captureStart: string,
  captureEnd: string,
  revealDelay: number,
  timeZone: string,
  now = new Date(),
): ScheduleValidationError | null {
  if (!timeZone) return 'timezone';
  try {
    // Temporal validates IANA identifiers before interpreting either wall time.
    Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(timeZone);
  } catch {
    return 'timezone';
  }
  if (!captureStart) return 'startRequired';
  let start: Temporal.ZonedDateTime;
  try { start = eventZonedDateTime(captureStart, timeZone); }
  catch { return 'localTimeInvalid'; }
  const nowInstant = Temporal.Instant.fromEpochMilliseconds(now.getTime());
  if (Temporal.Instant.compare(start.toInstant(), nowInstant) < 0) return 'startPast';
  const maxStart = nowInstant.toZonedDateTimeISO(timeZone).add({ months: 3 });
  if (Temporal.Instant.compare(start.toInstant(), maxStart.toInstant()) > 0) return 'startTooFar';
  if (!captureEnd) return 'endRequired';
  let end: Temporal.ZonedDateTime;
  try { end = eventZonedDateTime(captureEnd, timeZone); }
  catch { return 'localTimeInvalid'; }
  const durationMs = end.epochMilliseconds - start.epochMilliseconds;
  if (durationMs <= 0) return 'endBeforeStart';
  if (durationMs > 120 * 60 * 60 * 1000) return 'durationTooLong';
  if (!Object.values(ScheduleWriteRequestRevealDelayDays).includes(revealDelay as ScheduleWriteRequest['reveal_delay_days'])) return 'revealDelay';
  return null;
}
