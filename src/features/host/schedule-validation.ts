import { ScheduleWriteRequestRevealDelayDays, type ScheduleWriteRequest } from '@/lib/api/generated/index.schemas';

export type ScheduleValidationError = 'startRequired' | 'startPast' | 'startTooFar' | 'endRequired' | 'endBeforeStart' | 'durationTooLong' | 'revealDelay';

export function addCalendarMonths(date: Date, months: number): Date {
  const targetMonth = date.getMonth() + months;
  const firstOfTarget = new Date(date.getFullYear(), targetMonth, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  const finalDay = new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth() + 1, 0).getDate();
  firstOfTarget.setDate(Math.min(date.getDate(), finalDay));
  return firstOfTarget;
}

export function validateSchedule(
  captureStart: string,
  captureEnd: string,
  revealDelay: number,
  now = new Date(),
): ScheduleValidationError | null {
  if (!captureStart) return 'startRequired';
  const start = new Date(captureStart);
  if (Number.isNaN(start.getTime())) return 'startRequired';
  if (start < now) return 'startPast';
  if (start > addCalendarMonths(now, 3)) return 'startTooFar';
  if (!captureEnd) return 'endRequired';
  const end = new Date(captureEnd);
  if (Number.isNaN(end.getTime())) return 'endRequired';
  if (end <= start) return 'endBeforeStart';
  if (end.getTime() - start.getTime() > 120 * 60 * 60 * 1000) return 'durationTooLong';
  if (!Object.values(ScheduleWriteRequestRevealDelayDays).includes(revealDelay as ScheduleWriteRequest['reveal_delay_days'])) return 'revealDelay';
  return null;
}

export function toScheduleTimestamp(value: string): string {
  return new Date(value).toISOString();
}
