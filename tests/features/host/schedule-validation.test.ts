import { describe, expect, it } from 'vitest';

import { ScheduleWriteRequestRevealDelayDays, type ScheduleWriteRequest } from '@/lib/api/generated/index.schemas';
import { addCalendarMonths, validateSchedule } from '@/features/host/schedule-validation';

const now = new Date(2026, 0, 31, 10, 0, 0, 0);
const validStart = '2026-01-31T11:00';
const validEnd = '2026-02-01T11:00';

describe('schedule validation against the generated API request', () => {
  it('accepts a start later today', () => {
    expect(validateSchedule(validStart, validEnd, 1, now)).toBeNull();
  });

  it('rejects a start in the past', () => {
    expect(validateSchedule('2026-01-31T09:59', validEnd, 1, now)).toBe('startPast');
  });

  it('allows exactly three calendar months ahead and clamps month end', () => {
    const boundary = addCalendarMonths(now, 3);
    expect(boundary.getFullYear()).toBe(2026);
    expect(boundary.getMonth()).toBe(3);
    expect(boundary.getDate()).toBe(30);
    expect(validateSchedule('2026-04-30T10:00', '2026-05-01T10:00', 1, now)).toBeNull();
  });

  it('rejects a start beyond three calendar months', () => {
    expect(validateSchedule('2026-04-30T10:01', '2026-05-01T10:01', 1, now)).toBe('startTooFar');
  });

  it('handles a month-end transition without treating it as a 90-day window', () => {
    expect(addCalendarMonths(new Date(2026, 7, 31, 10), 3).getDate()).toBe(30);
    expect(addCalendarMonths(new Date(2026, 0, 31, 10), 1).getDate()).toBe(28);
  });

  it('accepts a valid one-day event', () => {
    expect(validateSchedule('2026-02-01T10:00', '2026-02-02T10:00', 1, now)).toBeNull();
  });

  it('accepts exactly five days / 120 hours', () => {
    expect(validateSchedule('2026-02-01T10:00', '2026-02-06T10:00', 1, now)).toBeNull();
  });

  it('rejects events longer than five days / 120 hours', () => {
    expect(validateSchedule('2026-02-01T10:00', '2026-02-06T10:01', 1, now)).toBe('durationTooLong');
  });

  it('requires end to be after start', () => {
    expect(validateSchedule('2026-02-01T10:00', '2026-02-01T10:00', 1, now)).toBe('endBeforeStart');
    expect(validateSchedule('2026-02-01T10:00', '2026-02-01T09:59', 1, now)).toBe('endBeforeStart');
  });

  it('supports only generated D+1, D+3, D+5, and D+7 values', () => {
    const request: ScheduleWriteRequest = {
      expected_revision: 1,
      capture_start: '2026-02-01T10:00:00Z',
      capture_end: '2026-02-02T10:00:00Z',
      reveal_delay_days: ScheduleWriteRequestRevealDelayDays.NUMBER_1,
    };
    for (const delay of Object.values(ScheduleWriteRequestRevealDelayDays)) {
      expect(validateSchedule(validStart, validEnd, delay, now)).toBeNull();
    }
    expect(request.reveal_delay_days).toBe(1);
    expect(Object.values(ScheduleWriteRequestRevealDelayDays)).toEqual([1, 3, 5, 7]);
  });

  it('rejects reveal delays that are absent from the generated contract', () => {
    expect(validateSchedule(validStart, validEnd, 2, now)).toBe('revealDelay');
  });
});
