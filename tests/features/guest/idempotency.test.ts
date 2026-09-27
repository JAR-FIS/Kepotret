import { describe, expect, it } from 'vitest';
import { createUuidV7 } from '@/features/guest/lib/idempotency';

describe('createUuidV7', () => {
  it('encodes the supplied millisecond timestamp and RFC version/variant', () => {
    const value = createUuidV7(1_700_000_000_123);
    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(BigInt(`0x${value.replaceAll('-', '').slice(0, 12)}`)).toBe(BigInt(1_700_000_000_123));
  });
});
