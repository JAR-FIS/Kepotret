import { describe, expect, it } from 'vitest';

import { ScheduleWriteRequestRevealDelayDays, type ScheduleWriteRequest } from '@/lib/api/generated/index.schemas';
import { toEventWallTime, toScheduleTimestamp, validateSchedule } from '@/features/host/schedule-validation';

const zone = 'Asia/Jakarta';
const now = new Date('2026-01-31T10:00:00Z');
const todayStart = '2026-01-31T18:00';
const oneDayEnd = '2026-02-01T18:00';

describe('schedule validation in the saved album timezone', () => {
  it('accepts a valid start later today', () => {
    expect(validateSchedule(todayStart, oneDayEnd, 1, zone, now)).toBeNull();
  });

  it('rejects a start in the past', () => {
    expect(validateSchedule('2026-01-31T16:59', oneDayEnd, 1, zone, now)).toBe('startPast');
  });

  it('allows exactly three calendar months ahead with month-end clamping', () => {
    expect(validateSchedule('2026-04-30T17:00', '2026-05-01T17:00', 1, zone, now)).toBeNull();
  });

  it('rejects a start beyond three calendar months', () => {
    expect(validateSchedule('2026-04-30T17:01', '2026-05-01T17:01', 1, zone, now)).toBe('startTooFar');
  });

  it('accepts a valid one-day event', () => {
    expect(validateSchedule('2026-02-01T17:00', '2026-02-02T17:00', 1, zone, now)).toBeNull();
  });

  it('accepts exactly five days / 120 elapsed hours', () => {
    expect(validateSchedule('2026-02-01T17:00', '2026-02-06T17:00', 1, zone, now)).toBeNull();
  });

  it('rejects events longer than five days / 120 elapsed hours', () => {
    expect(validateSchedule('2026-02-01T17:00', '2026-02-06T17:01', 1, zone, now)).toBe('durationTooLong');
  });

  it('requires end to be after start', () => {
    expect(validateSchedule('2026-02-01T17:00', '2026-02-01T17:00', 1, zone, now)).toBe('endBeforeStart');
    expect(validateSchedule('2026-02-01T17:00', '2026-02-01T16:59', 1, zone, now)).toBe('endBeforeStart');
  });

  it('accepts only the generated D+1/D+3/D+5/D+7 values', () => {
    const request: ScheduleWriteRequest = {
      expected_revision: 1,
      capture_start: '2026-02-01T10:00:00Z',
      capture_end: '2026-02-02T10:00:00Z',
      reveal_delay_days: ScheduleWriteRequestRevealDelayDays.NUMBER_1,
    };
    for (const delay of Object.values(ScheduleWriteRequestRevealDelayDays)) {
      expect(validateSchedule(todayStart, oneDayEnd, delay, zone, now)).toBeNull();
    }
    expect(Object.values(ScheduleWriteRequestRevealDelayDays)).toEqual([1, 3, 5, 7]);
    expect(request.reveal_delay_days).toBe(1);
    expect(validateSchedule(todayStart, oneDayEnd, 2, zone, now)).toBe('revealDelay');
  });

  it('interprets and rehydrates wall time in the album zone, not browser local time', () => {
    expect(toScheduleTimestamp('2026-02-02T10:00', 'America/Los_Angeles')).toBe('2026-02-02T18:00:00Z');
    expect(toEventWallTime('2026-02-02T18:00:00Z', 'America/Los_Angeles')).toBe('2026-02-02T10:00');
  });

  it('rejects nonexistent and ambiguous daylight-saving wall times', () => {
    expect(validateSchedule('2026-03-08T02:30', '2026-03-09T02:30', 1, 'America/Los_Angeles', now)).toBe('localTimeInvalid');
    expect(validateSchedule('2026-11-01T01:30', '2026-11-02T01:30', 1, 'America/Los_Angeles', now)).toBe('localTimeInvalid');
  });
});
