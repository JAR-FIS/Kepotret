import { createUuidV7 } from '@/features/guest/lib/idempotency';

/** Reuse a request key only while its semantic intent remains the same. */
export function intentKey(slot: string, identity: string) {
  const storageKey = `kepotret:${slot}`;
  const saved = sessionStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as { identity?: string; key?: string };
      if (parsed.identity === identity && parsed.key) return parsed.key;
    } catch { /* Replace malformed or obsolete intent state. */ }
  }
  const key = createUuidV7();
  sessionStorage.setItem(storageKey, JSON.stringify({ identity, key }));
  return key;
}
