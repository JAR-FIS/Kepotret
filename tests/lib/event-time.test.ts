import { describe, expect, it } from 'vitest';
import { formatEventDateTime } from '@/lib/time/event-time';

describe('formatEventDateTime', () => {
  it('renders Indonesian event wall time with its named zone', () => {
    expect(formatEventDateTime('2026-10-17T02:00:00Z', 'id', 'Asia/Jakarta')).toMatch(/WIB/);
  });

  it('uses the event zone rather than the browser default', () => {
    const jakarta = formatEventDateTime('2026-10-17T02:00:00Z', 'en', 'Asia/Jakarta');
    const makassar = formatEventDateTime('2026-10-17T02:00:00Z', 'en', 'Asia/Makassar');
    expect(jakarta).toContain('9:00');
    expect(makassar).toContain('10:00');
  });

  it('labels missing or invalid authoritative zones as UTC', () => {
    expect(formatEventDateTime('2026-10-17T02:00:00Z', 'en')).toMatch(/UTC/);
    expect(formatEventDateTime('2026-10-17T02:00:00Z', 'en', 'not-a-time-zone')).toMatch(/UTC/);
  });
});
