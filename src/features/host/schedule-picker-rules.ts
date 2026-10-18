import { Temporal } from '@js-temporal/polyfill';

import { toScheduleTimestamp } from './schedule-validation';
import { formatEventDateTime } from '@/lib/time/event-time';

export type PickerRules = {
  timeZone: string;
  start: string;
  end: string;
  earliestStart?: string | null;
  latestStart?: string | null;
  earliestStartInstant?: string | null;
  latestStartInstant?: string | null;
};

export function wallParts(value: string): [string, string] {
  const [date = '', time = ''] = value.split('T');
  return [date, time];
}

export function withWallPart(current: string, part: 'date' | 'time', value: string): string {
  const [date, time] = wallParts(current);
  return `${part === 'date' ? value : date}T${part === 'time' ? value : time}`;
}

export function instantForWallTime(value: string, timeZone: string): Temporal.Instant | null {
  try { return Temporal.Instant.from(toScheduleTimestamp(value, timeZone)); }
  catch { return null; }
}

export function isSelectableTime(date: string, time: string, kind: 'start' | 'end', rules: PickerRules): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false;
  const wall = `${date}T${time}`;
  // Cheap wall comparisons avoid most Temporal conversions while retaining instant-based DST checks.
  if (kind === 'start') {
    if (rules.earliestStart && wall < rules.earliestStart) return false;
    if (rules.latestStart && wall > rules.latestStart) return false;
  } else {
    if (!rules.start || wall <= rules.start) return false;
    const [startDate] = wallParts(rules.start);
    try {
      if (date > startDate && Temporal.PlainDate.compare(date, Temporal.PlainDate.from(startDate).add({ days: 5 })) > 0) return false;
    } catch { return false; }
  }
  const candidate = instantForWallTime(wall, rules.timeZone);
  if (!candidate) return false;
  if (kind === 'start') {
    const min = rules.earliestStartInstant ? Temporal.Instant.from(rules.earliestStartInstant) : rules.earliestStart && instantForWallTime(rules.earliestStart, rules.timeZone);
    const max = rules.latestStartInstant ? Temporal.Instant.from(rules.latestStartInstant) : rules.latestStart && instantForWallTime(rules.latestStart, rules.timeZone);
    return (!min || Temporal.Instant.compare(candidate, min) >= 0) && (!max || Temporal.Instant.compare(candidate, max) <= 0);
  }
  const start = instantForWallTime(rules.start, rules.timeZone);
  if (!start) return false;
  const duration = candidate.epochMilliseconds - start.epochMilliseconds;
  return duration > 0 && duration <= 120 * 60 * 60 * 1000;
}

export function isSelectableHour(date: string, hour: string, kind: 'start' | 'end', rules: PickerRules): boolean {
  if (!/^([01]\d|2[0-3])$/.test(hour) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const lastMinute = `${date}T${hour}:59`;
  const firstMinute = `${date}T${hour}:00`;
  if (kind === 'start' && ((rules.earliestStart && lastMinute < rules.earliestStart) || (rules.latestStart && firstMinute > rules.latestStart))) return false;
  if (kind === 'end' && (!rules.start || lastMinute <= rules.start)) return false;
  for (let minute = 0; minute < 60; minute++) {
    if (isSelectableTime(date, `${hour}:${String(minute).padStart(2, '0')}`, kind, rules)) return true;
  }
  return false;
}

export function initialStartBounds(timeZone: string, now = new Date()): { min: string; max: string; minInstant: string; maxInstant: string } | null {
  try {
    const zoned = Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(timeZone);
    const max = zoned.add({ months: 3 });
    return {
      min: zoned.toPlainDateTime().toString({ smallestUnit: 'minute' }),
      max: max.toPlainDateTime().toString({ smallestUnit: 'minute' }),
      minInstant: zoned.toInstant().toString(),
      maxInstant: max.toInstant().toString(),
    };
  } catch { return null; }
}

export function isEndDraftInvalid(rules: PickerRules): boolean {
  const [date, time] = wallParts(rules.end);
  return Boolean(date && time && !isSelectableTime(date, time, 'end', rules));
}

export function formatScheduleDraft(value: string, locale: string, timeZone: string, incomplete: string): string {
  if (!value) return incomplete;
  const instant = instantForWallTime(value, timeZone);
  if (instant) return formatEventDateTime(instant.toString(), locale, timeZone);
  const [date, time] = wallParts(value);
  let readableDate = '';
  try {
    const parsed = Temporal.PlainDate.from(date);
    if (parsed.toString() === date) readableDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)));
  } catch { /* Incomplete drafts retain a localized placeholder. */ }
  const readableTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '';
  return readableDate && readableTime ? `${readableDate}, ${readableTime} (${timeZone})` : incomplete;
}
