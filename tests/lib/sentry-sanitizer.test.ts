import { describe, expect, it, vi } from 'vitest';

import { sanitizeSentryEvent } from '@/lib/observability/sanitize-event';
import { isSentryEnabled, sentryPrivacyOptions } from '@/lib/observability/sentry-options';

describe('sanitizeSentryEvent', () => {
  it('removes private payload fields and scrubs URLs, bearer tokens, and data URLs', () => {
    const result = sanitizeSentryEvent({
      message: 'Could not fetch https://media.example/private/photo.jpg?token=secret Bearer abc.def.ghi',
      request: { cookies: 'session=private', data: 'body' },
      user: { id: 'guest-123' },
      extra: {
        photoBytes: new Uint8Array([1, 2, 3]),
        safeValue: 'data:image/jpeg;base64,AAAA',
        ordinary: 'visible diagnostic',
      },
    }) as Record<string, unknown>;

    expect(result).not.toHaveProperty('request');
    expect(result).not.toHaveProperty('user');
    expect(result.message).not.toContain('media.example');
    expect(result.message).not.toContain('abc.def.ghi');
    expect(result.extra).not.toHaveProperty('photoBytes');
    expect(result.extra).toHaveProperty('ordinary', 'visible diagnostic');
    expect(result.extra).toHaveProperty('safeValue', '[BINARY DATA REDACTED]');
  });

  it('scrubs inline PIN values and disables automatic collection of restricted payload classes', () => {
    const result = sanitizeSentryEvent({ message: 'PIN=1234; please retry' }) as Record<string, unknown>;
    expect(result.message).not.toContain('1234');
    expect(sentryPrivacyOptions.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      stackFrameVariables: false,
    });
    expect(sentryPrivacyOptions.tracesSampleRate).toBe(0);
  });
});

describe('Sentry opt-in', () => {
  it('requires both an explicit enable flag and a DSN', () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    expect(isSentryEnabled()).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.ingest.sentry.io/123');
    expect(isSentryEnabled()).toBe(true);
  });
});
