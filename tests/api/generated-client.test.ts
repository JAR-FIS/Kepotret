import { postApiV1Albums } from '@/lib/api/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('generated browser API client boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes cookies and preserves contract security headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers(),
      status: 201,
      text: vi.fn().mockResolvedValue('{"data":{}}'),
    });
    vi.stubGlobal('fetch', fetchMock);

    await postApiV1Albums(
      {},
      {
        headers: {
          'X-CSRF-Token': 'csrf-token-from-session',
          'Idempotency-Key': '00000000-0000-4000-8000-000000000000',
        },
      },
    );

    const [, requestInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = new Headers(requestInit.headers);

    expect(requestInit.credentials).toBe('include');
    expect(headers.get('X-CSRF-Token')).toBe('csrf-token-from-session');
    expect(headers.get('Idempotency-Key')).toBe(
      '00000000-0000-4000-8000-000000000000',
    );
  });
});
