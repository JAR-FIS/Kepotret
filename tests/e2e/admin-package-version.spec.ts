import { expect, test } from '@playwright/test';
import type { PackageVersionCreateRequest } from '@/lib/api/generated/index.schemas';

const packageId = '33333333-3333-4333-8333-333333333333';
const uuidV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('FE-8 package version retries keep the payload key and new intents get a new key', async ({ page }) => {
  const requests: Array<{ key: string; body: unknown; csrf: string }> = [];

  await page.route('**/api/v1/admin/auth/me', route => route.fulfill({ status: 200, json: { data: {
    admin_user_id: '11111111-1111-4111-8111-111111111111', email: 'operator@example.test',
    display_name: 'Operator', mfa_verified: true, session_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), step_up_expires_at: null,
  } } }));
  await page.route('**/api/v1/admin/security/csrf', route => route.fulfill({ status: 200, json: { data: { csrf_token: 'admin-csrf' } } }));
  await page.route(`**/api/v1/admin/packages/${packageId}/versions`, async route => {
    const request = route.request();
    const body: unknown = request.postDataJSON();
    requests.push({
      key: request.headers()['idempotency-key'] ?? '',
      body,
      csrf: request.headers()['x-csrf-token'] ?? '',
    });
    if (requests.length === 1) return route.abort('failed');
    if (requests.length <= 3) return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } });
    const version = body as PackageVersionCreateRequest;
    return route.fulfill({ status: 201, json: { data: {
      package_version_id: '44444444-4444-4444-8444-444444444444',
      price_amount: version.price_amount, currency: version.currency, quota_total: version.quota_total,
      sale_enabled: false, effective_at: new Date().toISOString(), retired_at: null,
    } } });
  });

  await page.goto(`/admin/catalog/packages/${packageId}/versions/new`);
  const price = page.getByLabel(/Harga \(IDR\)|Price \(IDR\)/i);
  const quota = page.getByLabel(/Kuota total|Total quota/i);
  const create = page.getByRole('button', { name: /Buat versi immutable|Create immutable version/i });
  await price.fill('75000');
  await quota.fill('100');

  await create.click();
  await expect.poll(() => requests.length).toBe(1);
  await expect(page.locator('p[role="alert"]')).toBeVisible();
  expect(requests[0].key).toMatch(uuidV7);
  expect(requests[0].body).toEqual({ price_amount: 75000, currency: 'IDR', quota_total: 100 });

  await create.click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(page.getByText(/HTTP 503/)).toBeVisible();
  expect(requests[1].key).toBe(requests[0].key);
  expect(requests[1].body).toEqual(requests[0].body);

  await price.fill('85000');
  await create.click();
  await expect.poll(() => requests.length).toBe(3);
  await expect(page.getByText(/HTTP 503/)).toBeVisible();
  expect(requests[2].key).toMatch(uuidV7);
  expect(requests[2].key).not.toBe(requests[1].key);
  expect(requests[2].body).toEqual({ price_amount: 85000, currency: 'IDR', quota_total: 100 });

  await quota.fill('200');
  await create.click();
  await expect.poll(() => requests.length).toBe(4);
  await expect(page.getByText(/Versi baru dibuat|New version created/i)).toBeVisible();
  expect(requests[3].key).toMatch(uuidV7);
  expect(requests[3].key).not.toBe(requests[2].key);
  expect(requests[3].body).toEqual({ price_amount: 85000, currency: 'IDR', quota_total: 200 });

  await create.click();
  await expect.poll(() => requests.length).toBe(5);
  await expect(page.getByText(/Versi baru dibuat|New version created/i)).toBeVisible();
  expect(requests[4].key).toMatch(uuidV7);
  expect(requests[4].key).not.toBe(requests[3].key);
  expect(requests[4].body).toEqual(requests[3].body);
  expect(requests.every(request => request.csrf === 'admin-csrf')).toBe(true);
});
